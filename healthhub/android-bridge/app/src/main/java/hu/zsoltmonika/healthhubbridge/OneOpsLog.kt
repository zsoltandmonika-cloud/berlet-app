package hu.zsoltmonika.healthhubbridge

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

/**
 * Minimal on-device HH One operation log, intentionally metadata-only.
 * No free-form exception messages, health values, app names, tokens or URLs.
 * Keeps only the last 24 entries until app data is cleared.
 */
internal object OneOpsLog {
    private const val KEY = "hh_one_operational_events_v1"
    private val OPERATIONS = setOf("orchestrator", "health", "ota", "diagnostics", "daily")
    private val STATES = setOf("running", "done", "partial", "failed", "expired", "rejected", "retry")
    private const val MAX = 24

    @Synchronized
    fun record(prefs: SharedPreferences, operation: String, state: String, code: String = "") {
        if (operation !in OPERATIONS || state !in STATES) return
        val previous = try { JSONArray(prefs.getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }
        val entry = JSONObject().put("at", Instant.now().toString())
            .put("operation", operation).put("state", state)
            .put("errorClass", code.take(50).replace(Regex("[^A-Za-z0-9_]"), ""))
        val compact = JSONArray().put(entry)
        for (i in 0 until minOf(previous.length(), MAX - 1)) {
            val old = previous.optJSONObject(i) ?: continue
            compact.put(old)
        }
        prefs.edit().putString(KEY, compact.toString()).apply()
    }

    @Synchronized
    fun recent(prefs: SharedPreferences): JSONArray =
        try { JSONArray(prefs.getString(KEY, "[]")) } catch (_: Exception) { JSONArray() }
}
