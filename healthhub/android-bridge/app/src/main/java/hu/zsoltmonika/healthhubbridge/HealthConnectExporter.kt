package hu.zsoltmonika.healthhubbridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateRequest
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
            HealthPermission.getReadPermission(RestingHeartRateRecord::class),
            HealthPermission.getReadPermission(WeightRecord::class),
            HealthPermission.getReadPermission(BodyFatRecord::class),
            HealthPermission.getReadPermission(BloodGlucoseRecord::class),
            HealthPermission.getReadPermission(OxygenSaturationRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(DistanceRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(Vo2MaxRecord::class),
            HealthPermission.getReadPermission(NutritionRecord::class)
        )
    }

    suspend fun export(profile: String, days: Long = 30): JSONObject {
        val end = Instant.now()
        val start = end.minusSeconds(days * 86400)
        val range = TimeRangeFilter.between(start, end)

        val bp = client.readRecords(ReadRecordsRequest(BloodPressureRecord::class, range)).records
        val weight = client.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records
        val bodyFat = client.readRecords(ReadRecordsRequest(BodyFatRecord::class, range)).records
        val glucose = client.readRecords(ReadRecordsRequest(BloodGlucoseRecord::class, range)).records
        val oxygen = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records
        // Heart rate is high-volume data. ReadRecordsRequest defaults to 1000
        // records, so a 30-day export can otherwise stop well before today.
        // Follow every Health Connect page token and keep the full interval.
        val heart = mutableListOf<HeartRateRecord>()
        var heartPageToken: String? = null
        do {
            val heartPage = client.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = range,
                    pageToken = heartPageToken
                )
            )
            heart.addAll(heartPage.records)
            heartPageToken = heartPage.pageToken
        } while (!heartPageToken.isNullOrEmpty())
        val restingHeart = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records
        val exercise = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records
        val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records
        val vo2 = client.readRecords(ReadRecordsRequest(Vo2MaxRecord::class, range)).records

        val root = JSONObject()
            .put("schemaVersion", "healthhub.healthconnect.bridge/1.1")
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
                    .put("systolic", r.systolic.inMillimetersOfMercury)
                    .put("diastolic", r.diastolic.inMillimetersOfMercury)
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

        records.put("bodyFat", JSONArray().also { arr ->
            bodyFat.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("percent", r.percentage.value)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        records.put("bloodGlucose", JSONArray().also { arr ->
            glucose.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("mmolL", r.level.inMillimolesPerLiter)
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

        records.put("restingHeartRate", JSONArray().also { arr ->
            restingHeart.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("bpm", r.beatsPerMinute)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        records.put("vo2Max", JSONArray().also { arr ->
            vo2.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("time", r.time.toString())
                    .put("mlKgMin", r.vo2MillilitersPerMinuteKilogram)
                    .put("measurementMethod", r.measurementMethod)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        records.put("exerciseSessions", JSONArray().also { arr ->
            exercise.forEach { r ->
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("startTime", r.startTime.toString())
                    .put("endTime", r.endTime.toString())
                    .put("exerciseType", r.exerciseType)
                    .put("title", r.title ?: JSONObject.NULL)
                    .put("notes", r.notes ?: JSONObject.NULL)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        records.put("sleepSessions", JSONArray().also { arr ->
            sleep.forEach { r ->
                val stages = JSONArray()
                r.stages.forEach { s ->
                    stages.put(JSONObject()
                        .put("startTime", s.startTime.toString())
                        .put("endTime", s.endTime.toString())
                        .put("stage", s.stage))
                }
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("startTime", r.startTime.toString())
                    .put("endTime", r.endTime.toString())
                    .put("title", r.title ?: JSONObject.NULL)
                    .put("notes", r.notes ?: JSONObject.NULL)
                    .put("stages", stages)
                    .put("sourcePackage", r.metadata.dataOrigin.packageName))
            }
        })

        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val steps = JSONArray()
        val dailyActivity = JSONArray()
        val dailyNutrition = JSONArray()

        for (i in (days.toInt() - 1) downTo 0) {
            val date = today.minusDays(i.toLong())
            val dayStart = date.atStartOfDay(zone).toInstant()
            val dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant()
            val dayRange = TimeRangeFilter.between(dayStart, dayEnd)

            val activityAgg = client.aggregate(
                AggregateRequest(
                    metrics = setOf(
                        StepsRecord.COUNT_TOTAL,
                        DistanceRecord.DISTANCE_TOTAL,
                        TotalCaloriesBurnedRecord.ENERGY_TOTAL
                    ),
                    timeRangeFilter = dayRange
                )
            )
            val stepTotal = activityAgg[StepsRecord.COUNT_TOTAL] ?: 0L
            val distance = activityAgg[DistanceRecord.DISTANCE_TOTAL]
            val calories = activityAgg[TotalCaloriesBurnedRecord.ENERGY_TOTAL]

            steps.put(JSONObject().put("date", date.toString()).put("count", stepTotal))
            dailyActivity.put(JSONObject()
                .put("date", date.toString())
                .put("steps", stepTotal)
                .put("distanceMeters", distance?.inMeters ?: 0.0)
                .put("caloriesKcal", calories?.inKilocalories ?: 0.0))

            val nutritionAgg = client.aggregate(
                AggregateRequest(
                    metrics = setOf(
                        NutritionRecord.ENERGY_TOTAL,
                        NutritionRecord.PROTEIN_TOTAL,
                        NutritionRecord.TOTAL_CARBOHYDRATE_TOTAL,
                        NutritionRecord.TOTAL_FAT_TOTAL
                    ),
                    timeRangeFilter = dayRange
                )
            )
            dailyNutrition.put(JSONObject()
                .put("date", date.toString())
                .put("energyKcal", nutritionAgg[NutritionRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0)
                .put("proteinGrams", nutritionAgg[NutritionRecord.PROTEIN_TOTAL]?.inGrams ?: 0.0)
                .put("carbsGrams", nutritionAgg[NutritionRecord.TOTAL_CARBOHYDRATE_TOTAL]?.inGrams ?: 0.0)
                .put("fatGrams", nutritionAgg[NutritionRecord.TOTAL_FAT_TOTAL]?.inGrams ?: 0.0))
        }

        records.put("dailySteps", steps)
        records.put("dailyActivity", dailyActivity)
        records.put("dailyNutrition", dailyNutrition)
        root.put("records", records)

        root.put("counts", JSONObject()
            .put("bloodPressure", bp.size)
            .put("weight", weight.size)
            .put("bodyFat", bodyFat.size)
            .put("bloodGlucose", glucose.size)
            .put("oxygenSaturation", oxygen.size)
            .put("heartRateRecords", heart.size)
            .put("restingHeartRate", restingHeart.size)
            .put("vo2Max", vo2.size)
            .put("exerciseSessions", exercise.size)
            .put("sleepSessions", sleep.size)
            .put("stepDays", steps.length())
            .put("activityDays", dailyActivity.length())
            .put("nutritionDays", dailyNutrition.length()))

        return root
    }
}
