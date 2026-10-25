package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import androidx.core.content.ContextCompat

/**
 * Opt-in foreground location service. Separate explicit native family-sharing
 * consent permits uploading the single latest fix via private Dropbox.
 * Active notification provides immediate STOP; Android and browser restrictions apply.
 */
class Sh9GpsService : Service() {
    companion object {
        const val ACTION_START = "hu.zsoltmonika.healthhubbridge.GPS_START"
        const val ACTION_STOP = "hu.zsoltmonika.healthhubbridge.GPS_STOP"
        const val PREFS = "sh9_native_gps_v1"
        const val KEY_INTERVAL_SECONDS = "interval_seconds"
        const val KEY_LOCATION_ENGINE = "location_engine_v157"
        const val KEY_LOCATION_MODE = "location_mode_v157"
        const val KEY_RECEIVER_STATUS = "location_receiver_status_v158"
        private const val CHANNEL = "sh9-gps-active-v1"
        private const val NOTIFICATION_ID = 9357
        private val ALLOWED_INTERVALS = setOf(15, 30, 60)

        @Volatile var active = false
            private set
        @Volatile var lastFixAtMillis = 0L
            private set

        fun interval(context: Context): Int {
            val n = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_INTERVAL_SECONDS, 30)
            return if (n in ALLOWED_INTERVALS) n else 30
        }
        fun setInterval(context: Context, seconds: Int) {
            require(seconds in ALLOWED_INTERVALS)
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putInt(KEY_INTERVAL_SECONDS, seconds).apply()
        }
        fun start(context: Context) {
            ContextCompat.startForegroundService(context,
                Intent(context, Sh9GpsService::class.java).setAction(ACTION_START))
        }
        fun stop(context: Context) {
            context.startService(Intent(context, Sh9GpsService::class.java).setAction(ACTION_STOP))
        }
    }

    private var manager: LocationManager? = null
    private var listener: LocationListener? = null
    private val smartPolicy = SmartLocationPolicy()
    private var fused: FusedLocationProviderClient? = null
    private var fusedCallback: LocationCallback? = null
    private var previousFix: Location? = null
    private var callbackGeneration = 0
    private var engine = "starting"
    // Main-looper only: no CPU wake lock and no second tracking service.
    private val watchdog = Handler(Looper.getMainLooper())
    private var watchdogTick: Runnable? = null
    private var subscriptionStartedAt = 0L
    private var lastAcceptedFixAt = 0L
    private var lastRecoveryAt = 0L
    private var recoveryAttempts = 0
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            // This explicit stop may come from the phone notification or the
            // registered emergency controller. It must prevent silent reboot restart.
            FamilyGuardContinuity.setApproved(this, false)
            finishService()
            return START_NOT_STICKY
        }
        if (intent?.action != ACTION_START &&
            !(intent == null && FamilyGuardContinuity.canRestart(this))) {
            finishService()
            return START_NOT_STICKY
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            finishService()
            return START_NOT_STICKY
        }
        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val enabled = if (android.os.Build.VERSION.SDK_INT >= 28) lm.isLocationEnabled
                else lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                    lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            if (!enabled) {
                finishService()
                return START_NOT_STICKY
            }
            clearSubscriptions()
            createChannel()
            startForeground(NOTIFICATION_ID, notification())
            active = true
            startWatchdog(callbackGeneration)
            startFused(callbackGeneration)
        } catch (_: SecurityException) {
            finishService()
        } catch (_: RuntimeException) {
            finishService()
        }
        return if (FamilyGuardContinuity.canRestart(this)) START_STICKY
            else START_NOT_STICKY
    }

    private fun updateEngine(name: String) {
        engine = name
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_LOCATION_ENGINE, name)
            .putString(KEY_LOCATION_MODE, smartPolicy.mode.name).apply()
    }

    private fun receiverStatus(value: String) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_RECEIVER_STATUS, value).apply()
    }

    /**
     * Receiver silence and Dropbox upload failures are separate states.
     * After 150 seconds without an accepted fix, retry FLP once and then
     * use Android fallback. No wakelock or infinite restart loop.
     * Handler callbacks can be delayed by Android power management.
     */
    private fun startWatchdog(generation: Int) {
        watchdogTick?.let { watchdog.removeCallbacks(it) }
        subscriptionStartedAt = SystemClock.elapsedRealtime()
        lastAcceptedFixAt = 0L
        lastRecoveryAt = 0L
        recoveryAttempts = 0
        // A previous service session's fix must never make a fresh start look healthy.
        lastFixAtMillis = 0L
        receiverStatus("acquiring")
        val tick = object : Runnable {
            override fun run() {
                if (!active || callbackGeneration != generation) return
                val now = SystemClock.elapsedRealtime()
                val reference = maxOf(subscriptionStartedAt, lastAcceptedFixAt, lastRecoveryAt)
                if (now - reference >= 150_000L) {
                    when {
                        ContextCompat.checkSelfPermission(
                            this@Sh9GpsService, Manifest.permission.ACCESS_FINE_LOCATION
                        ) != PackageManager.PERMISSION_GRANTED -> {
                            receiverStatus("permission-revoked")
                            finishService()
                            return
                        }
                        !FamilyGuardContinuity.gpsAvailable(this@Sh9GpsService) ->
                            receiverStatus("location-disabled")
                        engine == "fused" && recoveryAttempts == 0 -> {
                            recoveryAttempts++
                            lastRecoveryAt = now
                            receiverStatus("fused-retry")
                            val client = fused
                            val callback = fusedCallback
                            if (client != null && callback != null) {
                                requestFused(client, callback, generation)
                            } else {
                                startLegacy(generation)
                            }
                        }
                        engine == "fused" -> {
                            recoveryAttempts++
                            lastRecoveryAt = now
                            receiverStatus("fused-timeout-fallback")
                            startLegacy(generation)
                        }
                        else -> receiverStatus("no-fresh-fix")
                    }
                }
                if (active && callbackGeneration == generation) {
                    watchdog.postDelayed(this, 30_000L)
                }
            }
        }
        watchdogTick = tick
        watchdog.postDelayed(tick, 30_000L)
    }

    private fun stopFusedUpdates() {
        val callback = fusedCallback
        val client = fused
        fusedCallback = null
        fused = null
        if (callback != null && client != null) {
            try { client.removeLocationUpdates(callback) }
            catch (_: RuntimeException) { /* Android may already have dropped it. */ }
        }
    }

    private fun startFused(generation: Int) {
        if (!active || callbackGeneration != generation) return
        try {
            val client = LocationServices.getFusedLocationProviderClient(this)
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    // A cancelled FLP callback must not publish after fallback.
                    if (!active || callbackGeneration != generation ||
                        fusedCallback !== this) return
                    result.lastLocation?.let { processFix(it, generation) }
                }
            }
            fused = client
            fusedCallback = callback
            updateEngine("fused")
            requestFused(client, callback, generation)
        } catch (_: RuntimeException) {
            startLegacy(generation)
        } catch (_: LinkageError) {
            startLegacy(generation)
        }
    }

    private fun requestFused(
        client: FusedLocationProviderClient, callback: LocationCallback, generation: Int
    ) {
        if (!active || callbackGeneration != generation || fusedCallback !== callback) return
        val ms = smartPolicy.intervalMillis(interval(this))
        val priority = if (smartPolicy.highAccuracy()) Priority.PRIORITY_HIGH_ACCURACY
            else Priority.PRIORITY_BALANCED_POWER_ACCURACY
        val request = LocationRequest.Builder(priority, ms)
            .setMinUpdateIntervalMillis(maxOf(10_000L, ms / 2))
            .setMaxUpdateDelayMillis(0L)
            .setWaitForAccurateLocation(false)
            .build()
        try {
            client.requestLocationUpdates(request, callback, Looper.getMainLooper())
                .addOnFailureListener {
                    if (active && generation == callbackGeneration &&
                        fusedCallback === callback) {
                        client.removeLocationUpdates(callback)
                        fusedCallback = null
                        fused = null
                        startLegacy(generation)
                    }
                }
        } catch (_: SecurityException) {
            finishService()
        } catch (_: RuntimeException) {
            fusedCallback = null
            fused = null
            startLegacy(generation)
        }
    }

    private fun startLegacy(generation: Int) {
        if (!active || callbackGeneration != generation) return
        stopFusedUpdates()
        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val provider = when {
                lm.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> {
                    updateEngine("no-provider")
                    return
                }
            }
            val callback = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    if (active && generation == callbackGeneration) processFix(location, generation)
                }
                override fun onProviderDisabled(provider: String) {
                    if (active && generation == callbackGeneration) updateEngine("provider-unavailable")
                }
            }
            manager = lm
            listener = callback
            lm.requestLocationUpdates(provider, interval(this) * 1000L, 0f,
                callback, Looper.getMainLooper())
            updateEngine("android-fallback")
        } catch (_: SecurityException) {
            finishService()
        } catch (_: IllegalArgumentException) {
            updateEngine("provider-unavailable")
        } catch (_: RuntimeException) {
            updateEngine("provider-unavailable")
        }
    }

    private fun processFix(location: Location, generation: Int) {
        if (!active || callbackGeneration != generation) return
        val age = System.currentTimeMillis() - location.time
        if (age < -5_000L || age > 20_000L || location.isFromMockProvider ||
            !location.hasAccuracy() || !location.accuracy.isFinite() ||
            location.accuracy !in 0f..100f ||
            !location.latitude.isFinite() || location.latitude !in -90.0..90.0 ||
            !location.longitude.isFinite() || location.longitude !in -180.0..180.0 ||
            (previousFix != null &&
                location.elapsedRealtimeNanos <= previousFix!!.elapsedRealtimeNanos)) return
        val distance = previousFix?.takeIf {
            it.hasAccuracy() && it.accuracy <= 25f &&
            location.hasAccuracy() && location.accuracy <= 25f &&
            location.time >= it.time
        }?.distanceTo(location)
        val speed = if (location.hasSpeed() && location.speed >= 0f) location.speed else null
        val oldMode = smartPolicy.mode
        smartPolicy.observe(speed, distance,
            if (location.hasAccuracy()) location.accuracy else Float.POSITIVE_INFINITY,
            SystemClock.elapsedRealtime())
        previousFix = location
        lastAcceptedFixAt = SystemClock.elapsedRealtime()
        recoveryAttempts = 0
        lastRecoveryAt = 0L
        receiverStatus("receiving")
        lastFixAtMillis = System.currentTimeMillis()
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_LOCATION_MODE, smartPolicy.mode.name).apply()
        // The existing consent, owner registry, freshness and Dropbox gates remain unchanged.
        FamilyGuardNativeRelay.publish(this, location)
        val cb = fusedCallback
        val client = fused
        if (engine == "fused" && cb != null && client != null &&
            oldMode != smartPolicy.mode) requestFused(client, cb, generation)
    }

    private fun clearSubscriptions() {
        watchdogTick?.let { watchdog.removeCallbacks(it) }
        watchdogTick = null
        callbackGeneration++
        stopFusedUpdates()
        try { listener?.let { manager?.removeUpdates(it) } } catch (_: SecurityException) {}
        listener = null
        manager = null
        previousFix = null
    }

    private fun notification(): Notification {
        val content = PendingIntent.getActivity(this, 0,
            Intent(this, MainActivity::class.java).putExtra("openNativeSettings", true),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1,
            Intent(this, Sh9GpsService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, CHANNEL)
            .setContentTitle("SH9 · Smart Location aktív")
            .setContentText(if (FamilyGuardNativeRelay.enabled(this))
                "Családi helymegosztás · Smart Location · leállítható"
                else "Natív helymeghatározás: " + interval(this) + " mp · leállítható")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(content)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "GPS leállítása", stop)
            .build()
    }

    private fun createChannel() {
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "SH9 GPS aktív utazás",
                NotificationManager.IMPORTANCE_LOW).apply {
                description = "Családi helymeghatározás, bármikor leállítható"
            })
    }

    private fun finishService() {
        active = false
        clearSubscriptions()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        active = false
        clearSubscriptions()
        super.onDestroy()
    }
}
