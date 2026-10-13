package hu.zsoltmonika.healthhubbridge

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * V434 opt-in collector foundation. This class is deliberately NOT invoked by a worker/UI yet.
 *
 * Android UsageStatsManager reports time in foreground per app. This is NOT the
 * Samsung Digital Wellbeing screen-time counter, and it is not ChatGPT message history.
 * Caller must first obtain user consent, bind the physical phone to its owner,
 * and explicitly enable a private Dropbox export. There is no automatic upload.
 */
internal object DigitalWellbeingReader {
    const val SCHEMA = "healthhub.digital-wellbeing/1"
    private val zone = ZoneId.of("Europe/Budapest")

    fun hasUsageAccess(context: Context): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return ops.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        ) == AppOpsManager.MODE_ALLOWED
    }

    /** Explicitly selected 1..7-day read, never a background data transfer. */
    fun readForBoundOwner(context: Context, recentDays: Int = 7): JSONObject {
        require(recentDays in 1..7) { "Maximum seven calendar days per export" }
        check(hasUsageAccess(context)) { "Nincs Android használatiadat-hozzáférési engedély." }

        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val owner = prefs.getString("device_owner_profile", null)
        check(owner == "zsolt" || owner == "monika") {
            "A fizikai telefon tulajdonosi profilja nincs rögzítve."
        }
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val nowMs = System.currentTimeMillis()
        val today = LocalDate.now(zone)
        val days = JSONArray()

        for (offset in 0 until recentDays) {
            val date = today.minusDays(offset.toLong())
            val startMs = date.atStartOfDay(zone).toInstant().toEpochMilli()
            val endMs = minOf(nowMs, date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())
            if (endMs <= startMs) continue
            val usage = manager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startMs, endMs
            ) ?: emptyList()
            val byPackage = linkedMapOf<String, Pair<Long, Long>>()
            for (row in usage) {
                val packageName = row.packageName ?: continue
                if (!Regex("^[a-zA-Z][a-zA-Z0-9_.]{1,150}$").matches(packageName)) continue
                val duration = row.totalTimeInForeground
                // The source can contain OEM/system noise. Never fabricate or clamp.
                if (duration <= 0L || duration > 86_400_000L) continue
                val old = byPackage[packageName]
                val total = (old?.first ?: 0L) + duration
                if (total > 86_400_000L) continue
                byPackage[packageName] = Pair(total, maxOf(old?.second ?: 0L, row.lastTimeUsed))
            }
            if (byPackage.isEmpty()) continue
            val apps = JSONArray()
            byPackage.entries.sortedByDescending { it.value.first }.take(100).forEach { (pkg, stats) ->
                apps.put(JSONObject()
                    .put("packageName", pkg)
                    .put("foregroundMs", stats.first)
                    .apply {
                        if (stats.second in startMs..nowMs)
                            put("lastUsedAt", Instant.ofEpochMilli(stats.second).toString())
                    })
            }
            days.put(JSONObject().put("date", date.toString()).put("apps", apps))
        }

        // No screenOnMs/lateNightMs: aggregate UsageStats alone cannot establish them.
        // A separate explicit-time-window event collector with validation is required.
        return JSONObject()
            .put("schema", SCHEMA)
            .put("profile", owner)
            .put("exportedAt", Instant.ofEpochMilli(nowMs).toString())
            .put("source", "Android UsageStatsManager.INTERVAL_DAILY")
            .put("timezone", zone.id)
            .put("days", days)
    }
}
