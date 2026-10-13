package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException

/**
 * OPTIONAL, opt-in, on-device-only detailed usage. App identifiers can reveal
 * sensitive behavior, so retain only 30 days (versus 90 for coarse hour totals).
 * No data ever leaves the pilot: AndroidManifest contains no INTERNET permission.
 */
internal object AppDetailLedger {
    const val SCHEMA = "healthhub.digital-usage.detail-pilot/1"
    const val SOURCE = "android.usage-events.observed-app-foreground"
    private const val RETENTION_DAYS = 30L
    private const val DAY_MS = 86_400_000L
    private val safePackage = Regex("^[a-zA-Z0-9_.:-]{1,180}$")

    private fun file(context: Context, profile: String): AtomicFile {
        require(profile == "zsolt" || profile == "monika") { "Unknown profile" }
        return AtomicFile(File(context.filesDir, "detailed-usage-$profile.json"))
    }

    private fun validate(item: AppUsageHour) {
        require(item.hourStartMs >= 0 && item.hourStartMs % UsageSessionizer.HOUR_MS == 0L)
        require(safePackage.matches(item.packageName))
        require(item.observedForegroundMs in 1..UsageSessionizer.HOUR_MS)
        require(item.sessionFragments in 1..100_000)
    }

    fun read(context: Context, profile: String): List<AppUsageHour> {
        val bytes = try {
            file(context, profile).openRead().use { it.readBytes() }
        } catch (_: FileNotFoundException) {
            return emptyList()
        }
        val root = JSONObject(bytes.toString(Charsets.UTF_8))
        require(root.getString("schema") == SCHEMA) { "Unexpected detail-ledger schema" }
        require(root.getString("profileKey") == profile) { "Profile mismatch" }
        require(root.getString("source") == SOURCE) { "Unrecognized source" }
        val rows = root.getJSONArray("hours")
        require(rows.length() <= 24 * RETENTION_DAYS * 250) { "Unbounded ledger: refusing read" }
        return List(rows.length()) { index ->
            val r = rows.getJSONObject(index)
            AppUsageHour(
                r.getLong("hourStartMs"),
                r.getString("packageName"),
                r.getLong("observedForegroundMs"),
                r.getInt("sessionFragments")
            ).also(::validate)
        }.also(::validateHourTotals)
    }

    private fun validateHourTotals(rows: List<AppUsageHour>) {
        require(rows.distinctBy { it.hourStartMs to it.packageName }.size == rows.size) {
            "Duplicate application-hour keys"
        }
        require(rows.groupBy { it.hourStartMs }.values.all { entries ->
            entries.sumOf { it.observedForegroundMs } <= UsageSessionizer.HOUR_MS
        }) { "App durations exceed clock-hour duration" }
    }

    fun merge(context: Context, profile: String, incoming: List<AppUsageHour>, nowMs: Long): Int {
        require(PilotState.owner(context) == profile) { "Device owner mismatch" }
        require(PilotState.prefs(context).getBoolean(PilotState.APP_DETAIL_ENABLED, false)) {
            "Detailed app collection not explicitly enabled"
        }
        val cutoff = nowMs - RETENTION_DAYS * DAY_MS
        incoming.forEach(::validate)
        val values = AppUsageMerger.merge(read(context, profile), incoming, cutoff, nowMs)
        validateHourTotals(values)
        val hours = JSONArray()
        values.forEach { item ->
            hours.put(JSONObject()
                .put("hourStartMs", item.hourStartMs)
                .put("packageName", item.packageName)
                .put("observedForegroundMs", item.observedForegroundMs)
                .put("sessionFragments", item.sessionFragments))
        }
        val doc = JSONObject()
            .put("schema", SCHEMA)
            .put("source", SOURCE)
            .put("profileKey", profile)
            .put("collectedAtMs", nowMs)
            .put("retentionDays", RETENTION_DAYS)
            .put("hours", hours)
        val atomic = file(context, profile)
        val stream = atomic.startWrite()
        try {
            stream.write(doc.toString().toByteArray(Charsets.UTF_8))
            atomic.finishWrite(stream)
        } catch (error: Exception) {
            atomic.failWrite(stream)
            throw error
        }
        return values.size
    }

    fun clear(context: Context, profile: String) {
        file(context, profile).delete()
    }
}
