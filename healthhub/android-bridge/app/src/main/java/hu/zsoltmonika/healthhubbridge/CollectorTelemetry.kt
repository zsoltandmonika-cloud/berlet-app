package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate

/**
 * HealthHub Collector Diagnostics v0.15.1.
 *
 * Metadata ONLY. No personal measurements, biometrics, names, documents,
 * OAuth tokens, passwords or detailed exception text are exported here.
 * Raw data stays in the existing profile-specific private health-data files.
 *
 * Device-initiated orchestrator heartbeat publishes this summary to the
 * authenticated existing Dropbox vault for the HealthHub Admin Center.
 * lastExportedAt != lastDataDay != lastVerifiedUploadAt.
 */
object CollectorTelemetry {
    private const val SAMSUNG_QUALITY = "collector_telemetry_samsung_quality_v1"
    private const val HEALTH_QUALITY = "collector_telemetry_health_quality_v1"
    private const val SAMSUNG_READ = "samsung_collector_last_read_ms"
    private const val SAMSUNG_UPLOAD = "samsung_collector_last_success_ms"
    private const val HEALTH_READ = "collector_telemetry_health_read_ms"
    private const val HEALTH_UPLOAD = "collector_telemetry_health_upload_ms"

    private fun p(context: Context): SharedPreferences =
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)

    private fun instant(ms: Long): Any =
        if (ms > 0L) Instant.ofEpochMilli(ms).toString() else JSONObject.NULL

    private fun quality(raw: String?): JSONObject =
        try { if (raw.isNullOrBlank()) JSONObject() else JSONObject(raw) }
        catch (_: Exception) { JSONObject() }

    private fun array(records: JSONObject?, key: String): JSONArray? =
        records?.optJSONArray(key)

    /** Record metadata even if Dropbox upload fails, so stale cloud vs fresh read is visible. */
    fun noteSamsungRead(context: Context, payload: JSONObject) {
        val records = payload.optJSONObject("records") ?: return
        val days = array(records, "dailySummary") ?: return
        var lastDay: String? = null
        var valid = 0
        var activeCalories = 0
        var activeTime = 0
        var floors = 0
        var distance = 0
        for (i in 0 until days.length()) {
            val row = days.optJSONObject(i) ?: continue
            val date = row.optString("date", "")
            if (runCatching { LocalDate.parse(date) }.isFailure) continue
            valid++
            if (lastDay == null || date > lastDay) lastDay = date
            if (row.has("activeCaloriesKcal") && !row.isNull("activeCaloriesKcal")) activeCalories++
            if (row.has("activeMinutes") && !row.isNull("activeMinutes")) activeTime++
            if (row.has("floorsClimbed") && !row.isNull("floorsClimbed")) floors++
            if (row.has("distanceMeters") && !row.isNull("distanceMeters")) distance++
        }
        val q = JSONObject()
            .put("source", "samsung-data-sdk")
            .put("schema", payload.optString("schemaVersion", "unknown").take(48))
            .put("dailyRecordCount", valid)
            .put("latestDataDay", lastDay ?: JSONObject.NULL)
            .put("lastExportedAt", payload.optString("exportedAt", "").take(36))
            .put("daysWithActiveCalories", activeCalories)
            .put("daysWithActiveMinutes", activeTime)
            .put("daysWithFloors", floors)
            .put("daysWithDistance", distance)
        p(context).edit()
            .putLong(SAMSUNG_READ, System.currentTimeMillis())
            .putString(SAMSUNG_QUALITY, q.toString())
            .apply()
    }

    fun noteHealthRead(context: Context, payload: JSONObject) {
        val records = payload.optJSONObject("records") ?: return
        val days = array(records, "dailyActivity")
        val dates = mutableListOf<String>()
        if (days != null) {
            for (i in 0 until days.length()) {
                val date = days.optJSONObject(i)?.optString("date", "").orEmpty()
                if (runCatching { LocalDate.parse(date) }.isSuccess) dates.add(date)
            }
        }
        // Count arrays, not medical values. A file update timestamp can advance
        // while the latest actual daily measurement remains an older date.
        val q = JSONObject()
            .put("source", "health-connect")
            .put("dailyRecordCount", dates.size)
            .put("latestDataDay", dates.maxOrNull() ?: JSONObject.NULL)
            .put("heartRateRecordCount", array(records, "heartRate")?.length() ?: 0)
            .put("exerciseRecordCount", array(records, "exerciseSessions")?.length() ?: 0)
            .put("weightRecordCount", array(records, "weight")?.length() ?: 0)
            .put("lastExportedAt", payload.optString("exportedAt", "").take(36))
        p(context).edit()
            .putLong(HEALTH_READ, System.currentTimeMillis())
            .putString(HEALTH_QUALITY, q.toString())
            .apply()
    }

    fun noteHealthUpload(context: Context) {
        p(context).edit().putLong(HEALTH_UPLOAD, System.currentTimeMillis()).apply()
    }

    /** Only call after confirmed Dropbox upload + readback. */
    fun noteSamsungUpload(context: Context) {
        p(context).edit().putLong(SAMSUNG_UPLOAD, System.currentTimeMillis()).apply()
        CollectorRemoteConfig.onVerifiedUpload(context)
    }

    /**
     * Deterministic, low-cardinality diagnostic code. Never write exception
     * messages or raw medical measurements into orchestrator telemetry.
     */
    private fun errorKind(message: String?): String {
        val m = message.orEmpty().lowercase()
        return when {
            m.isBlank() -> "none"
            "permission" in m || "engedély" in m -> "permission"
            "invalid_grant" in m || "oauth" in m || "token" in m || "dropbox" in m -> "authorization"
            "profile" in m || "profil" in m || "tulajdonos" in m -> "profile"
            "schema" in m || "formátum" in m || "json" in m -> "schema"
            "timeout" in m || "network" in m || "connect" in m || "kapcsolat" in m -> "network"
            "sdk" in m || "samsung" in m -> "sdk"
            else -> "other"
        }
    }

    fun snapshot(context: Context): JSONObject {
        val prefs = p(context)
        val hLast = prefs.getLong(ResilientHealthSync.KEY_LAST_SUCCESS, 0L)
        val sLast = prefs.getLong(SAMSUNG_UPLOAD, 0L)
        val sError = prefs.getString("samsung_collector_last_error", null)
        val hError = prefs.getString(ResilientHealthSync.KEY_LAST_ERROR, null)
        val samsung = quality(prefs.getString(SAMSUNG_QUALITY, null))
            .put("sdkIncluded", SamsungSdkDailyReader.available)
            .put("autoEnabled", SamsungCollectorScheduler.isEnabled(context))
            .put("lastReadAt", instant(prefs.getLong(SAMSUNG_READ, 0L)))
            .put("lastVerifiedUploadAt", instant(sLast))
            .put("lastNoChangeAt", instant(prefs.getLong("samsung_collector_last_skip_ms", 0L)))
            .put("lastErrorAt", instant(prefs.getLong("samsung_collector_last_error_ms", 0L)))
            .put("errorKind", errorKind(sError))
            .put("alert", sError != null || (SamsungCollectorScheduler.isEnabled(context) &&
                (sLast <= 0L || System.currentTimeMillis() - sLast > 8L * 60L * 60L * 1000L)))
        val health = quality(prefs.getString(HEALTH_QUALITY, null))
            .put("autoEnabled", ResilientHealthSync.isEnabled(prefs))
            .put("lastReadAt", instant(prefs.getLong(HEALTH_READ, 0L)))
            .put("lastUploadAt", instant(prefs.getLong(HEALTH_UPLOAD, hLast).coerceAtLeast(hLast)))
            .put("lastAttemptAt", instant(prefs.getLong(ResilientHealthSync.KEY_LAST_ATTEMPT, 0L)))
            .put("errorKind", errorKind(hError))
            .put("needsUserAction", prefs.getBoolean(ResilientHealthSync.KEY_NEEDS_ACTION, false))
            .put("alert", hError != null || (ResilientHealthSync.isEnabled(prefs) &&
                (hLast <= 0L || System.currentTimeMillis() - hLast > 8L * 60L * 60L * 1000L)))
        return JSONObject()
            .put("schema", "healthhub.collector.telemetry/1")
            .put("reportedAt", Instant.now().toString())
            .put("connectedToDropbox", DropboxVaultClient.hasRefreshToken(prefs))
            .put("healthConnect", health)
            .put("samsung", samsung)
            .put("remotePolicy", CollectorRemoteConfig.status(context))
    }
}
