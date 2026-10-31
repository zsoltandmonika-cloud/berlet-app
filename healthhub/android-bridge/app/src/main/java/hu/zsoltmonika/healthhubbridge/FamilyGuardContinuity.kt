package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Boot recovery of PREVIOUSLY APPROVED native GPS continuity and resilient sync.
 * Never grants permissions, starts camera/microphone, or changes phone owner.
 * Native coordinate sharing requires a separate visible consent and Dropbox auth.
 * Android background launch restrictions are checked before attempting location FGS.
 */
object FamilyGuardContinuity {
    const val KEY_AUTO_GPS = "family_guard_auto_gps_v156"
    const val KEY_REMOTE_STOP = "family_guard_remote_stop_v156"
    const val KEY_RESTORED_AT = "family_guard_last_restore_v156"
    const val KEY_BOOT_RESULT = "family_guard_boot_result_v156"
    const val KEY_FOREGROUND_RESTORE_RESULT = "family_guard_foreground_restore_result_v041"
    private const val KEY_FOREGROUND_RESTORE_ATTEMPT = "family_guard_foreground_restore_attempt_v041"
    private const val FOREGROUND_RETRY_MS = 2 * 60_000L

    private fun prefs(context: Context) =
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)

    fun enabled(context: Context): Boolean = prefs(context).getBoolean(KEY_AUTO_GPS, false)
    fun remoteStopAllowed(context: Context): Boolean =
        prefs(context).getBoolean(KEY_REMOTE_STOP, false)

    fun hasOwner(context: Context): Boolean =
        prefs(context).getString("device_owner_profile", null) in listOf("zsolt", "monika")

    fun hasBackgroundLocation(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        val background = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        return fine && background
    }

    fun gpsAvailable(context: Context): Boolean = runCatching {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) manager.isLocationEnabled
        else manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }.getOrDefault(false)

    fun canRestart(context: Context): Boolean =
        enabled(context) && hasOwner(context) && hasBackgroundLocation(context) && gpsAvailable(context)

    /** Called only by a visible user consent action on their actual phone. */
    fun setApproved(context: Context, allow: Boolean) {
        prefs(context).edit().putBoolean(KEY_AUTO_GPS, allow)
            .putBoolean(KEY_REMOTE_STOP, allow).apply()
        if (!allow) FamilyGuardNativeRelay.disable(context)
    }

    /** Explicit owner stop, local notification stop, or owner-approved remote STOP. */
    fun disable(context: Context) {
        // A STOP permanently cancels automatic GPS, but an explicitly approved
        // future SOS/resume *request* can still notify the owner until revoked.
        prefs(context).edit().putBoolean(KEY_AUTO_GPS, false).apply()
        FamilyGuardNativeRelay.disable(context)
        context.stopService(Intent(context, Sh9GpsService::class.java))
    }

    fun restartApprovedGps(context: Context): String {
        val result = when {
            !enabled(context) -> "disabled"
            !hasOwner(context) -> "missing-owner"
            !hasBackgroundLocation(context) -> "background-permission-missing"
            !gpsAvailable(context) -> "location-disabled"
            else -> try {
                Sh9GpsService.start(context)
                "start-requested"
            } catch (e: Exception) {
                "android-restricted-" + e.javaClass.simpleName.take(40)
            }
        }
        prefs(context).edit().putString(KEY_BOOT_RESULT, result)
            .putLong(KEY_RESTORED_AT, System.currentTimeMillis()).apply()
        return result
    }

    fun restoreJobs(context: Context) {
        // WorkManager normally persists jobs across boot; idempotent reconciliation
        // also repairs jobs missing after a package replacement.
        SyncScheduler.scheduleAll(context)
        ResilientHealthSync.schedule(context)
        DailyContentScheduler.schedule(context)
        OrchestratorScheduler.schedule(context)
        OtaUpdateManager.schedule(context)
    }
}

class GuardianBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED &&
            intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        // No location service or microphone/camera access without prior device-owner consent.
        try { FamilyGuardContinuity.restoreJobs(context) }
        catch (_: Exception) { /* WorkManager will also reschedule its durable jobs. */ }
        FamilyGuardContinuity.restartApprovedGps(context)
    }
}
