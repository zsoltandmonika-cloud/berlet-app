package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException

/**
 * Local-only, replace-by-hour ledger. No raw usage-event content, other app names,
 * or message text is retained. Uploads to the existing family vault require explicit separate consent.
 */
internal object LocalLedger {
    private const val SCHEMA = "healthhub.screentime.pilot/1"
    private const val RETENTION_DAYS = 30
    private const val DAY_MS = 86_400_000L

    private fun requireOwner(owner: String) {
        require(owner == "zsolt" || owner == "monika") { "Invalid owner profile" }
    }
    private fun file(context: Context, owner: String): AtomicFile {
        requireOwner(owner)
        return AtomicFile(File(context.filesDir, "usage-$owner.json"))
    }

    fun read(context: Context, owner: String): List<UsageHour> {
        val bytes = try {
            file(context, owner).openRead().use { it.readBytes() }
        } catch (_: FileNotFoundException) {
            return emptyList()
        }
        val root = JSONObject(bytes.toString(Charsets.UTF_8))
        require(root.getString("schema") == SCHEMA) { "Unknown usage ledger schema" }
        require(root.getString("profileKey") == owner) { "Profile mismatch: read stopped" }
        val rows = root.getJSONArray("hours")
        val result = ArrayList<UsageHour>(rows.length())
        for (i in 0 until rows.length()) {
            val o = rows.getJSONObject(i)
            val hour = UsageHour(
                o.getLong("hourStartMs"),
                o.getLong("observedForegroundMs"),
                o.getLong("chatGptForegroundMs"),
                o.getInt("sessionFragments")
            )
            require(hour.hourStartMs >= 0 && hour.observedForegroundMs in 1..UsageSessionizer.HOUR_MS) {
                "Corrupt usage bucket"
            }
            require(hour.chatGptForegroundMs in 0..hour.observedForegroundMs) {
                "Corrupt ChatGPT total"
            }
            result.add(hour)
        }
        return result
    }

    @Synchronized
    fun merge(
        context: Context,
        owner: String,
        incoming: List<UsageHour>,
        nowMs: Long
    ): Int {
        requireOwner(owner)
        require(PilotState.owner(context) == owner) { "Device owner mismatch" }
        require(PilotState.prefs(context).getBoolean(PilotState.ENABLED, false)) {
            "Collection consent is no longer active"
        }
        val byHour = sortedMapOf<Long, UsageHour>()
        val cutoff = nowMs - RETENTION_DAYS * DAY_MS
        read(context, owner).forEach { if (it.hourStartMs >= cutoff) byHour[it.hourStartMs] = it }
        for (item in incoming) {
            require(item.hourStartMs % UsageSessionizer.HOUR_MS == 0L)
            require(item.observedForegroundMs in 1..UsageSessionizer.HOUR_MS)
            require(item.chatGptForegroundMs in 0..item.observedForegroundMs)
            if (item.hourStartMs >= cutoff && item.hourStartMs < nowMs) {
                // Re-running the same window replaces the same hour, no double count.
                byHour[item.hourStartMs] = item
            }
        }
        val rows = JSONArray()
        byHour.values.forEach { entry ->
            rows.put(JSONObject()
                .put("hourStartMs", entry.hourStartMs)
                .put("observedForegroundMs", entry.observedForegroundMs)
                .put("chatGptForegroundMs", entry.chatGptForegroundMs)
                .put("sessionFragments", entry.sessionFragments))
        }
        val root = JSONObject()
            .put("schema", SCHEMA)
            .put("profileKey", owner)
            .put("collectedAtMs", nowMs)
            .put("retentionDays", RETENTION_DAYS)
            .put("hours", rows)
        val atomic = file(context, owner)
        val stream = atomic.startWrite()
        try {
            stream.write(root.toString().toByteArray(Charsets.UTF_8))
            atomic.finishWrite(stream)
        } catch (e: Exception) {
            atomic.failWrite(stream)
            throw e
        }
        return byHour.size
    }

    @Synchronized
    fun clear(context: Context, owner: String) {
        file(context, owner).delete()
    }
}
