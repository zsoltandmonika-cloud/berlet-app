package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/** Remote requests are visible, tap-to-review notifications; never remote sensor activation. */
object GuardianEmergencyNotification {
    const val ACTION_GPS_RESUME = "gps-resume-review"
    const val ACTION_SOS_CONTACT = "sos-contact-review"
    private const val CHANNEL = "hh-family-guard-requests-v156"

    fun request(context: Context, kind: String, commandId: String): Boolean {
        if (kind !in listOf(ACTION_GPS_RESUME, ACTION_SOS_CONTACT)) return false
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED) return false
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL,
            "Family Guard · vészhelyzeti kérések", NotificationManager.IMPORTANCE_HIGH))
        val click = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("openNativeSettings", true)
            putExtra("guardianEmergencyRequest", kind)
        }
        val pending = PendingIntent.getActivity(context, commandId.hashCode(), click,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val gps = kind == ACTION_GPS_RESUME
        val n = Notification.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(if (gps) "🛡️ Family Guard · GPS helyreállítási kérés" else
                "🆘 Family Guard · Vészhelyzeti kapcsolatot kérnek")
            .setContentText(if (gps) "Érintsd meg, és saját telefonodon hagyd jóvá a GPS újraindítását."
                else "Érintsd meg az értesítést a segítségkérés megtekintéséhez.")
            .setStyle(Notification.BigTextStyle().bigText(if (gps)
                "Nem kapcsoltuk be távolról a GPS-t. A megnyitás után te döntesz a helymeghatározásról."
                else "A kamera és a mikrofon NINCS bekapcsolva. Válaszolj a készüléken; valódi híváskapcsolat még nincs kiépítve."))
            .setContentIntent(pending).setAutoCancel(true).build()
        manager.notify(if (gps) 9156 else 9157, n)
        return true
    }
}
