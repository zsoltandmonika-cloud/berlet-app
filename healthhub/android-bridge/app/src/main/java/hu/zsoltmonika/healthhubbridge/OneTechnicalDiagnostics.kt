package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import org.json.JSONObject
import java.time.Instant

/**
 * HH One: only small technical values, no personal health observations,
 * usage history, app identities, auth tokens or stack traces.
 * Permission state is explicitly owner-consented in the existing Connect UI.
 */
internal object OneTechnicalDiagnostics {
    const val KEY_CONSENT = "hh_one_remote_technical_diagnostics_v1"

    fun consent(prefs: SharedPreferences): Boolean = prefs.getBoolean(KEY_CONSENT, false)

    suspend fun snapshot(context: Context, prefs: SharedPreferences): JSONObject {
        check(consent(prefs)) { "Távoli műszaki diagnosztika nincs engedélyezve ezen a telefonon" }
        val available = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        val granted = if (available) {
            try { HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions() }
            catch (_: Exception) { emptySet<String>() }
        } else emptySet()
        fun time(key: String): Any =
            prefs.getLong(key, 0L).takeIf { it > 0 }?.let { Instant.ofEpochMilli(it).toString() }
                ?: JSONObject.NULL
        return JSONObject()
            .put("schema", "healthhub.one.technical-diagnostics/1")
            .put("capturedAt", Instant.now().toString())
            .put("agentVersion", BuildConfig.VERSION_NAME)
            .put("buildCode", BuildConfig.VERSION_CODE)
            .put("androidSdk", Build.VERSION.SDK_INT)
            .put("healthConnectAvailable", available)
            .put("healthReadPermissionCount", granted.size)
            .put("backgroundHealthReadGranted", granted.contains(
                "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"))
            .put("scheduledSyncEnabled", prefs.getBoolean(SyncScheduler.KEY_ENABLED, false))
            .put("resilientSyncEnabled", ResilientHealthSync.isEnabled(prefs))
            .put("lastHealthSyncAt", time(ResilientHealthSync.KEY_LAST_SUCCESS))
            .put("lastHealthAttemptAt", time(ResilientHealthSync.KEY_LAST_ATTEMPT))
            .put("lastOtaCheckAt", time("ota_checked_at_v1"))
            .put("hasDropboxRefreshToken", DropboxVaultClient.hasRefreshToken(prefs))
    }
}
