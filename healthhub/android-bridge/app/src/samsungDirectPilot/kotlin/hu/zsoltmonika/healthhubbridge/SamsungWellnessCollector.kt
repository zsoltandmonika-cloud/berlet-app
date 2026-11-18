package hu.zsoltmonika.healthhubbridge

import com.samsung.android.sdk.health.data.HealthDataStore
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.IdFilter
import com.samsung.android.sdk.health.data.request.LocalDateFilter
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Optional Samsung Health Data SDK 1.1.0, owner-only, read-only wellness capture.
 * Records come directly from Samsung Health; not inferred from steps or heart rate.
 * Absence, denial or any source failure is null: NO synthetic score/temperature.
 * This source is compiled only with the private, verified Samsung SDK.
 */
internal object SamsungWellnessCollector {
    val readPermissions: Set<Permission> = setOf(
        Permission.of(DataTypes.SLEEP, AccessType.READ),
        Permission.of(DataTypes.ENERGY_SCORE, AccessType.READ),
        Permission.of(DataTypes.BLOOD_OXYGEN, AccessType.READ),
        Permission.of(DataTypes.SKIN_TEMPERATURE, AccessType.READ)
    )
    private val sleepPermission = Permission.of(DataTypes.SLEEP, AccessType.READ)
    private val energyPermission = Permission.of(DataTypes.ENERGY_SCORE, AccessType.READ)
    private val oxygenPermission = Permission.of(DataTypes.BLOOD_OXYGEN, AccessType.READ)
    private val skinPermission = Permission.of(DataTypes.SKIN_TEMPERATURE, AccessType.READ)

    data class Snapshot(
        val sleepSessions: JSONArray?,
        val energyScores: JSONArray?,
        val nightOxygen: JSONArray?,
        val nightSkinTemperature: JSONArray?
    )

    /** No permission UI from WorkManager. Caller may separately request consent. */
    suspend fun read(store: HealthDataStore, today: LocalDate = LocalDate.now()): Snapshot {
        val granted = store.getGrantedPermissions(readPermissions)
        val sleeps = if (sleepPermission in granted) runCatching {
            store.readData(
                DataTypes.SLEEP.readDataRequestBuilder
                    .setLocalTimeFilter(LocalTimeFilter.of(
                        today.minusDays(8).atStartOfDay(), LocalDateTime.now()
                    )).build()
            ).dataList
        }.getOrNull() else null
        val sleepRows = JSONArray()
        val oxygenRows = JSONArray()
        val skinRows = JSONArray()
        val now = java.time.Instant.now().plusSeconds(300)

        sleeps?.sortedByDescending { it.endTime }?.take(18)?.forEach { point ->
            val begin = point.startTime
            val end = point.endTime
            if (!end.isAfter(begin) || end.isAfter(now) ||
                Duration.between(begin, end).toHours() > 24) return@forEach
            val uid = point.uid
            if (uid.isBlank()) return@forEach
            val row = JSONObject()
                .put("uid", uid)
                .put("startTime", begin.toString())
                .put("endTime", end.toString())
                .put("date", end.atZone(ZoneId.systemDefault()).toLocalDate().toString())
            point.getValue(DataType.SleepType.DURATION)?.toMinutes()
                ?.takeIf { it in 1..1440 }?.let { row.put("sleepMinutes", it) }
            point.getValue(DataType.SleepType.SLEEP_SCORE)
                ?.takeIf { it in 0..100 }?.let { row.put("sleepScore", it) }
            val intervals = JSONArray()
            point.getValue(DataType.SleepType.SESSIONS)?.forEach { session ->
                if (!session.endTime.isAfter(session.startTime)) return@forEach
                val stages = JSONArray()
                session.stages.forEach { stage ->
                    if (stage.endTime.isAfter(stage.startTime)) stages.put(JSONObject()
                        .put("startTime", stage.startTime.toString())
                        .put("endTime", stage.endTime.toString())
                        .put("stage", stage.stage.name))
                }
                intervals.put(JSONObject()
                    .put("startTime", session.startTime.toString())
                    .put("endTime", session.endTime.toString())
                    .put("stages", stages))
            }
            if (intervals.length() > 0) row.put("sessions", intervals)
            sleepRows.put(row)

            if (oxygenPermission in granted) runCatching {
                val request = DataTypes.SLEEP.associatedReadRequestBuilder
                    .setIdFilter(IdFilter.fromDataUid(uid))
                    .addAssociatedDataType(DataType.SleepType.Associates.BLOOD_OXYGEN)
                    .build()
                store.readAssociatedData(request).dataList.forEach { associated ->
                    associated.getDataPointOf(DataTypes.BLOOD_OXYGEN)?.forEach { measurement ->
                        val min = measurement.getValue(DataType.BloodOxygenType.MIN_OXYGEN_SATURATION)
                            ?.takeIf { it.isFinite() && it in 50f..100f }
                        val max = measurement.getValue(DataType.BloodOxygenType.MAX_OXYGEN_SATURATION)
                            ?.takeIf { it.isFinite() && it in 50f..100f }
                        val single = measurement.getValue(DataType.BloodOxygenType.OXYGEN_SATURATION)
                            ?.takeIf { it.isFinite() && it in 50f..100f }
                        if (min != null || max != null || single != null) {
                            val item = JSONObject().put("sleepUid", uid)
                                .put("startTime", measurement.startTime.toString())
                                .put("endTime", measurement.endTime.toString())
                            if (min != null) item.put("minPercent", min)
                            if (max != null) item.put("maxPercent", max)
                            if (single != null) item.put("percent", single)
                            oxygenRows.put(item)
                        }
                    }
                }
            }

            if (skinPermission in granted) runCatching {
                val request = DataTypes.SLEEP.associatedReadRequestBuilder
                    .setIdFilter(IdFilter.fromDataUid(uid))
                    .addAssociatedDataType(DataType.SleepType.Associates.SKIN_TEMPERATURE)
                    .build()
                store.readAssociatedData(request).dataList.forEach { associated ->
                    associated.getDataPointOf(DataTypes.SKIN_TEMPERATURE)?.forEach { measurement ->
                        val min = measurement.getValue(DataType.SkinTemperatureType.MIN_SKIN_TEMPERATURE)
                            ?.takeIf { it.isFinite() && it in 10f..45f }
                        val max = measurement.getValue(DataType.SkinTemperatureType.MAX_SKIN_TEMPERATURE)
                            ?.takeIf { it.isFinite() && it in 10f..45f }
                        val single = measurement.getValue(DataType.SkinTemperatureType.SKIN_TEMPERATURE)
                            ?.takeIf { it.isFinite() && it in 10f..45f }
                        if (min != null || max != null || single != null) {
                            val item = JSONObject().put("sleepUid", uid)
                                .put("startTime", measurement.startTime.toString())
                                .put("endTime", measurement.endTime.toString())
                            if (min != null) item.put("minCelsius", min)
                            if (max != null) item.put("maxCelsius", max)
                            if (single != null) item.put("celsius", single)
                            skinRows.put(item)
                        }
                    }
                }
            }
        }

        val energyRows = JSONArray()
        if (energyPermission in granted) runCatching {
            val request = DataTypes.ENERGY_SCORE.readDataRequestBuilder
                .setLocalDateFilter(LocalDateFilter.of(today.minusDays(8), today.plusDays(1)))
                .build()
            store.readData(request).dataList.forEach { point ->
                val score = point.getValue(DataType.EnergyScoreType.ENERGY_SCORE)
                    ?.takeIf { it.isFinite() && it in 0f..100f } ?: return@forEach
                val date = point.startTime.atZone(point.zoneOffset)
                    .toLocalDate()
                if (date.isBefore(today.minusDays(8)) || date.isAfter(today)) return@forEach
                energyRows.put(JSONObject()
                    .put("date", date.toString())
                    .put("energyScore", score)
                    .put("measuredAt", point.startTime.toString()))
            }
        }

        return Snapshot(
            sleepRows.takeNonEmpty(), energyRows.takeNonEmpty(),
            oxygenRows.takeNonEmpty(), skinRows.takeNonEmpty()
        )
    }

    /** Historical merge is non-destructive for denied/missing/revoked sources. */
    fun mergeInto(records: JSONObject, previous: JSONObject?, snapshot: Snapshot?) {
        for (field in listOf("samsungSleepSessions", "samsungEnergyScores",
            "samsungNightOxygen", "samsungNightSkinTemperature")) {
            val fresh = when (field) {
                "samsungSleepSessions" -> snapshot?.sleepSessions
                "samsungEnergyScores" -> snapshot?.energyScores
                "samsungNightOxygen" -> snapshot?.nightOxygen
                else -> snapshot?.nightSkinTemperature
            }
            val old = previous?.optJSONArray(field)
            mergeArray(old, fresh, field)?.let { records.put(field, it) }
        }
    }

    private fun JSONArray.takeNonEmpty() = takeIf { length() > 0 }

    private fun mergeArray(old: JSONArray?, fresh: JSONArray?, field: String): JSONArray? {
        if (fresh == null || fresh.length() == 0) return old
        val result = linkedMapOf<String, JSONObject>()
        fun accept(values: JSONArray?) {
            if (values == null) return
            for (i in 0 until values.length()) {
                val row = values.optJSONObject(i) ?: continue
                val key = when (field) {
                    "samsungEnergyScores" -> row.optString("date")
                    "samsungSleepSessions" -> row.optString("uid")
                    else -> row.optString("sleepUid") + "|" + row.optString("startTime")
                }
                if (key.isNotBlank() && key != "|") result[key] = row
            }
        }
        accept(old)
        accept(fresh)
        return JSONArray().also { arr ->
            result.values.sortedByDescending {
                it.optString(if (field == "samsungEnergyScores") "date" else "endTime")
            }.take(120).forEach { arr.put(it) }
        }
    }
}
