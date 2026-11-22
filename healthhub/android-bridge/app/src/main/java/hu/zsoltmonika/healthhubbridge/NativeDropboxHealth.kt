package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.time.Instant

/**
 * Minimal authenticated, independent Dropbox health telemetry.
 * No access/refresh tokens, account IDs, battery readings, GPS coordinates,
 * device contents, exception messages or location history are exposed.
 * This is diagnostics, NOT a replacement Family Guard location feed.
 */
internal object NativeDropboxHealth {
    const val LAST_ATTEMPT = "hh_orchestrator_last_attempt_v1200"
    const val LAST_SUCCESS = "hh_orchestrator_last_success_v1200"
    const val LAST_RESULT = "hh_orchestrator_last_result_v1200"
    const val LAST_ERROR_CLASS = "hh_orchestrator_error_class_v1200"
    const val LAST_GPS_RESTART_ATTEMPT = "hh_native_gps_restart_attempt_v1200"
    private const val REPAIR_INTERVAL_MS = 30 * 60_000L

    private fun timestamp(ms: Long): Any =
        if (ms > 0L && ms <= System.currentTimeMillis() + 5_000L)
            Instant.ofEpochMilli(ms).toString() else JSONObject.NULL

    fun begin(prefs: SharedPreferences) {
        prefs.edit().putLong(LAST_ATTEMPT, System.currentTimeMillis())
            .putString(LAST_RESULT, "attempt")
            .remove(LAST_ERROR_CLASS).apply()
    }

    fun success(prefs: SharedPreferences) {
        prefs.edit().putLong(LAST_SUCCESS, System.currentTimeMillis())
            .putString(LAST_RESULT, "uploaded")
            .remove(LAST_ERROR_CLASS).apply()
    }

    fun missingGrant(prefs: SharedPreferences) {
        prefs.edit().putString(LAST_RESULT, "missing-grant")
            .remove(LAST_ERROR_CLASS).apply()
    }

    fun failed(prefs: SharedPreferences, e: Exception) {
        // Never persist e.message: Dropbox HTTP bodies could contain account data.
        val type = e.javaClass.simpleName.take(40).takeIf {
            it.matches(Regex("^[A-Za-z][A-Za-z0-9]{0,39}$"))
        } ?: "Exception"
        prefs.edit().putString(LAST_RESULT, "failed")
            .putString(LAST_ERROR_CLASS, type).apply()
    }

    fun uploadBucket(raw: String?): String = when {
        raw == "uploaded" -> "uploaded"
        raw == "revoked" -> "revoked"
        raw == "stopping" -> "stopping"
        raw == "not-selected-in-device-registry" -> "owner-mismatch"
        raw == "blocked-no-dropbox-grant" -> "missing-grant"
        raw?.startsWith("network-error:") == true -> "failed"
        raw?.startsWith("revoke-pending:") == true -> "revoke-pending"
        else -> "not-confirmed"
    }

    /** Safe to send only inside the existing device-secret-authenticated heartbeat. */
    fun snapshot(prefs: SharedPreferences, context: Context? = null): JSONObject {
        val result = prefs.getString(LAST_RESULT, null)
            ?.takeIf { it in setOf("attempt", "uploaded", "missing-grant", "failed") }
            ?: "unknown"
        val cloudStatus = prefs.getString(FamilyGuardNativeRelay.KEY_RESULT, null)
        val allowed = prefs.getBoolean(FamilyGuardNativeRelay.KEY_SHARE, false)
        val continuous = prefs.getBoolean(FamilyGuardContinuity.KEY_AUTO_GPS, false)
        val nativePrefs = context?.getSharedPreferences(
            Sh9GpsService.PREFS, Context.MODE_PRIVATE)
        return JSONObject()
            .put("schema", "healthhub.native_dropbox_health/1")
            .put("grant", if (DropboxVaultClient.hasRefreshToken(prefs)) "present" else "missing")
            .put("orchestrator", result)
            .put("error_class", if (result == "failed")
                prefs.getString(LAST_ERROR_CLASS, "Exception")?.take(40) ?: "Exception"
                else JSONObject.NULL)
            .put("last_orchestrator_attempt", timestamp(prefs.getLong(LAST_ATTEMPT, 0L)))
            .put("last_orchestrator_upload", timestamp(prefs.getLong(LAST_SUCCESS, 0L)))
            .put("gps_consent", allowed && continuous)
            .put("gps_active", if (context == null) JSONObject.NULL else Sh9GpsService.active)
            .put("gps_last_fix", timestamp(nativePrefs?.getLong(Sh9GpsService.KEY_LAST_FIX_AT, 0L) ?: 0L))
            .put("gps_upload", uploadBucket(cloudStatus))
            .put("gps_last_upload", timestamp(prefs.getLong(FamilyGuardNativeRelay.KEY_LAST_UPLOAD, 0L)))
            .put("gps_recovery", prefs.getString(FamilyGuardContinuity.KEY_BOOT_RESULT, null)
                ?.take(70)?.replace(Regex("[^a-zA-Z0-9_-]"), "") ?: "unknown")
            .put("observed_at", Instant.now().toString())
    }

    /**
     * WorkManager performs only a best-effort restart of the SAME previously
     * owner-approved foreground GPS service, at most once per 30 minutes.
     * No new sharing, Android permissions, identity or Dropbox grant changes.
     */
    fun repairPreviouslyApproved(context: Context, prefs: SharedPreferences): String {
        if (!prefs.getBoolean(FamilyGuardNativeRelay.KEY_SHARE, false) ||
            !FamilyGuardContinuity.canRestart(context)) return "not-approved"
        if (Sh9GpsService.active) return "already-active"
        val now = System.currentTimeMillis()
        if (now - prefs.getLong(LAST_GPS_RESTART_ATTEMPT, 0L) < REPAIR_INTERVAL_MS)
            return "throttled"
        prefs.edit().putLong(LAST_GPS_RESTART_ATTEMPT, now).apply()
        return FamilyGuardContinuity.restartApprovedGps(context)
    }
}
