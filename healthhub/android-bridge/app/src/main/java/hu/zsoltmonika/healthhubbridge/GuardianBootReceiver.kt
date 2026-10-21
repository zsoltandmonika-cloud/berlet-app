package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.location.LocationManager

/**
 * Optional reboot recovery for a PREVIOUSLY user-approved Guardian collector.
 * Never acquires permission; no restart if missing "Allow all the time" on Android 10+,
 * mismatched owner, disabled location switch, or explicit user STOP/revocation.
 *
 * A reboot resume is best-effort and subject to Android/Samsung power restrictions.
 */
class GuardianBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!GuardianLocationVault.consented(context)) return

        val foreground = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
        if (!foreground) return

        if (Build.VERSION.SDK_INT >= 29 &&
            context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) !=
                PackageManager.PERMISSION_GRANTED) return

        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return
        if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER) &&
            !manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) return

        try {
            val start = Intent(context, GuardianLocationService::class.java)
                .setAction(GuardianLocationService.ACTION_START)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(start)
            else context.startService(start)
        } catch (_: RuntimeException) {
            GuardianLocationVault.markStopped(context)
            // Never bypass Android foreground service restrictions.
        } catch (_: SecurityException) {
            GuardianLocationVault.markStopped(context)
        }
    }
}
