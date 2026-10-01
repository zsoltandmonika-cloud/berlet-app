package hu.zsoltmonika.healthhubbridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class HealthConnectExporter(private val client: HealthConnectClient) {
    companion object {
        val REQUIRED_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(BloodPressureRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(BloodGlucoseRecord::class),
            HealthPermission.getReadPermission(OxygenSaturationRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class)
        )
    }

    suspend fun export(profile: String, days: Long = 30): JSONObject {
        val end = Instant.now()
        val start = end.minusSeconds(days * 86400)
        val range = TimeRangeFilter.between(start, end)

        val bp = client.readRecords(ReadRecordsRequest(BloodPressureRecord::class, range)).records
        val weight = client.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records
        val glucose = client.readRecords(ReadRecordsRequest(BloodGlucoseRecord::class, range)).records
        val oxygen = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records
        val heart = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records

        val root = JSONObject()
            .put("schemaVersion", "healthhub.healthconnect.bridge/1.0")
            .put("profile", profile)
            .put("exportedAt", end.toString())
            .put("rangeStart", start.toString())
            .put("rangeEnd", end.toString())

        val records = JSONObject()
        records.put("bloodPressure", JSONArray().also { arr ->
            bp.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("systolic", r.systolic.millimetersOfMercury)
                    .put("diastolic", r.diastolic.millimetersOfMercury)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })
        records.put("weight", JSONArray().also { arr ->
            weight.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("kg", r.weight.inGrams / 1000.0)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })
        records.put("bloodGlucose", JSONArray().also { arr ->
            glucose.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("mmolL", r.level.millimolesPerLiter)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })
        records.put("oxygenSaturation", JSONArray().also { arr ->
            oxygen.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("percent", r.percentage.value)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })
        records.put("heartRate", JSONArray().also { arr ->
            heart.forEach { r ->
                val samples = JSONArray()
                r.samples.forEach { s ->
                    samples.put(JSONObject().put("time", s.time.toString()).put("bpm", s.beatsPerMinute))
                }
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("startTime", r.startTime.toString())
                    .put("endTime", r.endTime.toString())
                    .put("samples", samples)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val steps = JSONArray()
        for (i in (days.toInt() - 1) downTo 0) {
            val date = today.minusDays(i.toLong())
            val dayStart = date.atStartOfDay(zone).toInstant()
            val dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant()
            val total = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd)
                )
            )[StepsRecord.COUNT_TOTAL] ?: 0L
            steps.put(JSONObject().put("date", date.toString()).put("count", total))
        }
        records.put("dailySteps", steps)
        root.put("records", records)
        root.put("counts", JSONObject()
            .put("bloodPressure", bp.size)
            .put("weight", weight.size)
            .put("bloodGlucose", glucose.size)
            .put("oxygenSaturation", oxygen.size)
            .put("heartRateRecords", heart.size)
            .put("stepDays", steps.length()))
        return root
    }
}
