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
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper

/**
 * Owner-initiated foreground location collection. Android keeps this service
 * eligible to receive GPS updates after the UI is closed or the screen locks.
 * This is NOT guaranteed 24/7: OS power controls, force-stop, disabled location,
 * revoked permissions and hardware/network failures may interrupt it.
 *
 * Stage 1: encrypted most-recent fix stored only on-device, no network uplink.
 */
class GuardianLocationService : Service(), LocationListener {
    companion object {
        const val ACTION_START = "hu.zsoltmonika.healthhubbridge.GUARDIAN_START"
        const val ACTION_STOP = "hu.zsoltmonika.healthhubbridge.GUARDIAN_STOP"
        private const val CHANNEL = "hh_guardian_location"
        private const val NOTIFICATION = 7602
        private const val MIN_TIME_MS = 20_000L
        private const val MIN_DISTANCE_M = 20f

        fun stop(context: Context) {
            context.stopService(Intent(context, GuardianLocationService::class.java))
            GuardianLocationVault.purge(context)
        }
    }

    private val lm by lazy { getSystemService(Context.LOCATION_SERVICE) as LocationManager }
    private var listening = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stop(this)
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action != ACTION_START || !GuardianLocationVault.consented(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (!hasLocationPermission() || !locationEnabled()) {
            GuardianLocationVault.markStopped(this)
            stopSelf()
            return START_NOT_STICKY
        }
        if (listening) return START_NOT_STICKY
        try {
            createChannel()
            val note = notification("GPS bekapcsolva · helyben titkosított mérés")
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFICATION, note, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(NOTIFICATION, note)
            }
            var sources = 0
            for (provider in arrayOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
                if (lm.isProviderEnabled(provider)) {
                    lm.requestLocationUpdates(provider, MIN_TIME_MS, MIN_DISTANCE_M, this, Looper.getMainLooper())
                    sources++
                }
            }
            if (sources == 0) {
                GuardianLocationVault.markStopped(this)
                stopSelf()
                return START_NOT_STICKY
            }
            listening = true
        } catch (_: SecurityException) {
            GuardianLocationVault.markStopped(this)
            stopSelf()
        } catch (_: RuntimeException) {
            GuardianLocationVault.markStopped(this)
            stopSelf()
        }
        return START_NOT_STICKY // Never revive a permission-sensitive service silently.
    }

    private fun hasLocationPermission(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun locationEnabled(): Boolean =
        (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER))

    private fun createChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(CHANNEL, "HH One · Family Guard GPS", NotificationManager.IMPORTANCE_LOW)
        channel.description = "Engedélyezett Family Guard helyzetkövetés, bármikor leállítható"
        manager.createNotificationChannel(channel)
    }

    private fun notification(message: String): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, GuardianSettingsActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, GuardianLocationService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Family Guard · HH One")
            .setContentText(message)
            .setContentIntent(open)
            .addAction(android.R.drawable.ic_media_pause, "Követés leállítása", stop)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build()
    }

    override fun onLocationChanged(location: Location) {
        if (!GuardianLocationVault.consented(this) || !hasLocationPermission()) {
            stop(this); stopSelf(); return
        }
        // Reject mock, ancient or low-quality readings. This is never an emergency locator.
        val atMs = location.time
        if (atMs < System.currentTimeMillis() - 120_000L ||
            atMs > System.currentTimeMillis() + 30_000L ||
            !location.hasAccuracy() || location.accuracy > 200f) return
        GuardianLocationVault.saveFix(
            this, location.latitude, location.longitude, location.accuracy, atMs
        )
    }

    override fun onProviderDisabled(provider: String) {
        if (!locationEnabled()) {
            GuardianLocationVault.markStopped(this)
            stopSelf()
        }
    }

    override fun onDestroy() {
        if (listening) {
            try { lm.removeUpdates(this) } catch (_: SecurityException) { }
        }
        listening = false
        GuardianLocationVault.markStopped(this)
        super.onDestroy()
    }
}
