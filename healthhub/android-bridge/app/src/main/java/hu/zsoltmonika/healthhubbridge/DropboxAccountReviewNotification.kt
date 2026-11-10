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
import java.time.Instant

/**
 * A remote request can ONLY ask the phone owner to review a Dropbox account.
 * It never opens OAuth in the background, switches tokens or changes settings.
 */
internal object DropboxAccountReviewNotification {
    const val EXTRA_TARGET_SUFFIX = "dropboxAccountReviewSuffix"
    const val EXTRA_EXPIRES_AT = "dropboxAccountReviewExpiresAt"
    private const val CHANNEL = "hh-dropbox-review-v1"

    fun request(context: Context, commandId: String, targetSuffix: String, expiresAt: String): Boolean {
        if (!DropboxAccountMatch.validExpected(targetSuffix)) return false
        val expiry = runCatching { Instant.parse(expiresAt) }.getOrNull() ?: return false
        if (!expiry.isAfter(Instant.now()) || commandId.isBlank()) return false
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED) return false

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL,
            "HH One · Dropbox ellenőrzés", NotificationManager.IMPORTANCE_HIGH))
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("openNativeSettings", true)
            putExtra(EXTRA_TARGET_SUFFIX, targetSuffix)
            putExtra(EXTRA_EXPIRES_AT, expiresAt)
        }
        val pending = PendingIntent.getActivity(context, commandId.hashCode(), intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val note = Notification.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("📦 Dropbox ellenőrzése")
            .setContentText("Kérés érkezett a közös Dropbox ellenőrzésére. Te döntesz.")
            .setStyle(Notification.BigTextStyle().bigText(
                "Koppints ide az egyszerű útmutatóhoz. Nem változik semmi, amíg jóvá nem hagyod."))
            .setContentIntent(pending).setAutoCancel(true).build()
        manager.notify(commandId.hashCode(), note)
        return true
    }
}
