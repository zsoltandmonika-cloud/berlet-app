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
import android.os.IBinder
import android.os.Looper
import androidx.core.content.ContextCompat

/**
 * Opt-in location foreground service for a user-initiated journey.
 * No uploaded/saved GPS coordinates. Notification has an immediate STOP action.
 * Cannot bypass Android GPS location or another app's own background limits.
 */
class Sh9GpsService : Service() {
    companion object {
        const val ACTION_START = "hu.zsoltmonika.healthhubbridge.GPS_START"
        const val ACTION_STOP = "hu.zsoltmonika.healthhubbridge.GPS_STOP"
        const val PREFS = "sh9_native_gps_v1"
        const val KEY_INTERVAL_SECONDS = "interval_seconds"
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
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != ACTION_START) {
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
            if (!lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                finishService()
                return START_NOT_STICKY
            }
            createChannel()
            startForeground(NOTIFICATION_ID, notification())
            listener?.let { lm.removeUpdates(it) }
            val updates = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    // Keep only a non-sensitive activity timestamp; never persist positions.
                    lastFixAtMillis = System.currentTimeMillis()
                }
                override fun onProviderDisabled(provider: String) {
                    if (provider == LocationManager.GPS_PROVIDER) finishService()
                }
            }
            manager = lm
            listener = updates
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, interval(this) * 1000L, 0f,
                updates, Looper.getMainLooper())
            active = true
        } catch (_: SecurityException) {
            finishService()
        } catch (_: IllegalArgumentException) {
            finishService()
        } catch (_: IllegalStateException) {
            finishService()
        }
        return START_NOT_STICKY
    }

    private fun notification(): Notification {
        val content = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1,
            Intent(this, Sh9GpsService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, CHANNEL)
            .setContentTitle("SH9 · GPS aktív")
            .setContentText("Helymeghatározás: " + interval(this) + " mp · leállítható")
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
                description = "Utazási helymeghatározás, mindig leállítható"
            })
    }

    private fun finishService() {
        active = false
        try { listener?.let { manager?.removeUpdates(it) } } catch (_: SecurityException) { }
        listener = null
        manager = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        active = false
        try { listener?.let { manager?.removeUpdates(it) } } catch (_: SecurityException) { }
        listener = null
        manager = null
        super.onDestroy()
    }
}
