package hu.zsoltmonika.healthhubbridge

import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.Ordering
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime

/**
 * Read-only, optional Samsung Health SDK exercise session collector.
 *
 * This is compiled only with an explicitly supplied private Samsung SDK AAR.
 * Never read exercise routes, GPS coordinates, raw logs or user comments.
 * A missing permission or an SDK error is represented by null, never by an
 * empty authoritative archive. Original Beta history remains intact.
 */
internal object SamsungExerciseCollector {
    val readPermission: Set<Permission> =
        setOf(Permission.of(DataTypes.EXERCISE, AccessType.READ))

    suspend fun readRecent(
        store: HealthDataStore,
        sinceInclusive: LocalDateTime,
        untilExclusive: LocalDateTime
    ): JSONArray? {
        if (!untilExclusive.isAfter(sinceInclusive)) return null
        val request = DataTypes.EXERCISE.readDataRequestBuilder
            .setLocalTimeFilter(LocalTimeFilter.of(sinceInclusive, untilExclusive))
            .setOrdering(Ordering.DESC)
            .build()
        val newest = linkedMapOf<String, JSONObject>()
        val now = Instant.now().plusSeconds(300)
        for (point in store.readData(request).dataList) {
            val sessions = point.getValue(DataType.ExerciseType.SESSIONS) ?: continue
            for (session in sessions) {
                val start = session.startTime
                val end = session.endTime
                val minutes = Duration.between(start, end).toMinutes()
                if (minutes < 1 || minutes > 24 * 60 ||
                    end.isAfter(now) || start.isAfter(now)) continue
                val exerciseType = session.exerciseType.name
                if (!Regex("^[A-Z_]{2,50}$").matches(exerciseType)) continue
                val key = start.toString() + "|" + end.toString() + "|" + exerciseType
                if (newest.containsKey(key)) continue
                val item = JSONObject()
                    .put("startTime", start.toString())
                    .put("endTime", end.toString())
                    .put("exerciseType", exerciseType)
                session.distance?.let { value ->
                    if (value.isFinite() && value >= 0f && value <= 250000f)
                        item.put("distanceMeters", value.toDouble())
                }
                session.altitudeGain?.let { value ->
                    if (value.isFinite() && value >= 0f && value <= 12000f)
                        item.put("altitudeGainMeters", value.toDouble())
                }
                newest[key] = item
            }
        }
        if (newest.isEmpty()) return null
        return JSONArray().also { out ->
            newest.values.sortedByDescending { it.optString("endTime") }
                .take(600).forEach { out.put(it) }
        }
    }

    /**
     * No deletion on an empty/failed read. A new session replaces only an exact
     * start+end+type match, all other Beta and SDK sessions remain available.
     * The UI independently deduplicates overlapping Health Connect sessions.
     */
    fun mergeSessions(previous: JSONArray?, fresh: JSONArray?): JSONArray? {
        if (fresh == null || fresh.length() == 0) return previous
        val combined = linkedMapOf<String, JSONObject>()
        fun add(values: JSONArray?) {
            if (values == null) return
            for (i in 0 until values.length()) {
                val row = values.optJSONObject(i) ?: continue
                val start = runCatching { Instant.parse(row.optString("startTime")) }.getOrNull() ?: continue
                val end = runCatching { Instant.parse(row.optString("endTime")) }.getOrNull() ?: continue
                val typ = row.optString("exerciseType", "OTHER").uppercase()
                if (!end.isAfter(start) || Duration.between(start, end).toHours() > 24 ||
                    !Regex("^[A-Z_]{2,50}$").matches(typ)) continue
                combined[start.toString() + "|" + end.toString() + "|" + typ] = row
            }
        }
        add(previous)
        add(fresh)
        return JSONArray().also { out ->
            combined.values.sortedByDescending { it.optString("endTime") }
                .forEach { out.put(it) }
        }
    }
}
