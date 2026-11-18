package hu.zsoltmonika.healthhubbridge

import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import com.samsung.android.sdk.health.data.request.LocalTimeGroup
import com.samsung.android.sdk.health.data.request.LocalTimeGroupUnit
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Samsung's consolidated hourly steps, including Watch + phone without double
 * counting. This vendor SDK source is compiled only for explicit private
 * Samsung builds, NEVER for the public/standard Health Connect-only APK.
 * Missing/denied/error results are null, not fabricated zero-step hours.
 */
internal object SamsungStepCollector {
    val readPermission: Set<Permission> =
        setOf(Permission.of(DataTypes.STEPS, AccessType.READ))

    suspend fun readHourly(
        store: HealthDataStore,
        day: LocalDate,
        endExclusive: LocalDateTime
    ): JSONArray? {
        if (!endExclusive.isAfter(day.atStartOfDay())) return null
        val filter = LocalTimeFilter.of(day.atStartOfDay(), endExclusive)
        val group = LocalTimeGroup.of(LocalTimeGroupUnit.HOURLY, 1)
        val request = DataType.StepsType.TOTAL.requestBuilder
            .setLocalTimeFilterWithGroup(filter, group)
            .build()
        // On the autumn DST change, 02:00 can occur twice in Budapest.
        // Our v1 cloud schema has only date+hour, so combine both measured
        // intervals instead of silently discarding the second observation.
        val byLocalHour = linkedMapOf<Int, Long>()
        for (record in store.aggregateData(request).dataList) {
            val count = record.value ?: continue
            val local = record.startTime.atZone(ZoneId.systemDefault())
            if (local.toLocalDate() != day || count < 0L || count > 100000L) continue
            val total = (byLocalHour[local.hour] ?: 0L) + count
            if (total <= 100000L) byLocalHour[local.hour] = total
        }
        val result = JSONArray()
        byLocalHour.toSortedMap().forEach { (hour, count) ->
            result.put(JSONObject()
                .put("date", day.toString())
                .put("hour", hour)
                .put("steps", count))
        }
        return result.takeIf { it.length() > 0 }
    }

    /** Replace only genuinely measured hours of the selected day.
     * On denial, missing result, or source error, preserve all prior records.
     */
    fun mergeHourly(old: JSONArray?, fresh: JSONArray?, day: LocalDate): JSONArray? {
        if (fresh == null || fresh.length() == 0) return old
        // Samsung may return only a subset of today's hours. Replace each
        // observed hour individually, retaining all other measured Beta hours.
        val replacementHours = HashSet<Int>()
        for (i in 0 until fresh.length()) {
            val item = fresh.optJSONObject(i) ?: continue
            val hour = item.optInt("hour", -1)
            if (item.optString("date") == day.toString() && hour in 0..23) {
                replacementHours.add(hour)
            }
        }
        val out = JSONArray()
        if (old != null) for (i in 0 until old.length()) {
            val item = old.optJSONObject(i) ?: continue
            if (item.optString("date") == day.toString() &&
                item.optInt("hour", -1) in replacementHours) continue
            out.put(item)
        }
        for (i in 0 until fresh.length()) {
            val item = fresh.optJSONObject(i) ?: continue
            if (item.optString("date") == day.toString() &&
                item.optInt("hour", -1) in replacementHours) out.put(item)
        }
        return out
    }
}
