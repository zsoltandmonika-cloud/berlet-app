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
        val result = JSONArray()
        val usedHours = HashSet<Int>()
        for (record in store.aggregateData(request).dataList) {
            val count = record.value ?: continue
            val local = record.startTime.atZone(ZoneId.systemDefault())
            if (local.toLocalDate() != day || count < 0L || count > 100000L ||
                !usedHours.add(local.hour)) continue
            result.put(JSONObject()
                .put("date", day.toString())
                .put("hour", local.hour)
                .put("steps", count))
        }
        return result.takeIf { it.length() > 0 }
    }

    /** Replace only genuinely measured hours of the selected day.
     * On denial, missing result, or source error, preserve all prior records.
     */
    fun mergeHourly(old: JSONArray?, fresh: JSONArray?, day: LocalDate): JSONArray? {
        if (fresh == null || fresh.length() == 0) return old
        val out = JSONArray()
        if (old != null) for (i in 0 until old.length()) {
            val item = old.optJSONObject(i) ?: continue
            if (item.optString("date") != day.toString()) out.put(item)
        }
        for (i in 0 until fresh.length()) {
            val item = fresh.optJSONObject(i) ?: continue
            if (item.optString("date") == day.toString()) out.put(item)
        }
        return out
    }
}
