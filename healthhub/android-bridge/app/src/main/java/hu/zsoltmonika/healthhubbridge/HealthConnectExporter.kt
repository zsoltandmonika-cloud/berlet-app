package hu.zsoltmonika.healthhubbridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BloodGlucoseRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.aggregate.AggregateMetric
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
import java.time.Duration
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
            HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(Vo2MaxRecord::class),
            HealthPermission.getReadPermission(NutritionRecord::class)
        )

        // Noncritical: optional terrain records should never block the established
        // BP, weight, heart, steps, sleep and Dropbox background sync paths.
        val OPTIONAL_TERRAIN_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(ElevationGainedRecord::class),
            HealthPermission.getReadPermission(FloorsClimbedRecord::class)
        )

        fun requiredPermissions(@Suppress("UNUSED_PARAMETER") client: HealthConnectClient): Set<String> =
            REQUIRED_PERMISSIONS
    }

    fun hasUsefulData(json: JSONObject): Boolean =
        json.optJSONObject("counts")?.optBoolean("hasSourceData", false) == true

    fun countSummary(json: JSONObject): String {
        val c = json.optJSONObject("counts") ?: return "Hiányzik az adatösszesítő"
        return "pulzus: ${c.optInt("heartRateRecords")} · lépéses napok: ${c.optInt("activeDaysWithData")}" +
            " · súly: ${c.optInt("weight")} · vérnyomás: ${c.optInt("bloodPressure")}" +
            " · alvás: ${c.optInt("sleepSessions")} · edzés: ${c.optInt("exerciseSessions")}" +
            " · emelkedős napok: ${c.optInt("elevationDaysWithData")} · emeletes napok: ${c.optInt("floorsDaysWithData")}"
    }

    private fun mergedActiveMinutes(
        records: List<ActiveCaloriesBurnedRecord>,
        dayStart: Instant,
        dayEnd: Instant
    ): Double {
        val intervals = records.asSequence()
            .filter { it.energy.inKilocalories > 0.0 }
            .mapNotNull { r ->
                val s = if (r.startTime.isAfter(dayStart)) r.startTime else dayStart
                val e = if (r.endTime.isBefore(dayEnd)) r.endTime else dayEnd
                if (e.isAfter(s)) Pair(s, e) else null
            }
            .sortedBy { it.first }
            .toList()

        if (intervals.isEmpty()) return 0.0

        var currentStart = intervals[0].first
        var currentEnd = intervals[0].second
        var totalMillis = 0L

        for (i in 1 until intervals.size) {
            val (s, e) = intervals[i]
            if (!s.isAfter(currentEnd)) {
                if (e.isAfter(currentEnd)) currentEnd = e
            } else {
                totalMillis += Duration.between(currentStart, currentEnd).toMillis()
                currentStart = s
                currentEnd = e
            }
        }
        totalMillis += Duration.between(currentStart, currentEnd).toMillis()
        return totalMillis / 60000.0
    }

    suspend fun export(profile: String, days: Long = 30): JSONObject {
        val end = Instant.now()
        val start = end.minusSeconds(days * 86400)
        val range = TimeRangeFilter.between(start, end)
        val granted = client.permissionController.getGrantedPermissions()
        val elevationAllowed = granted.contains(HealthPermission.getReadPermission(ElevationGainedRecord::class))
        val floorsAllowed = granted.contains(HealthPermission.getReadPermission(FloorsClimbedRecord::class))

        val bp = client.readRecords(ReadRecordsRequest(BloodPressureRecord::class, range)).records
        val weight = client.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records
        val bodyFat = client.readRecords(ReadRecordsRequest(BodyFatRecord::class, range)).records
        val glucose = client.readRecords(ReadRecordsRequest(BloodGlucoseRecord::class, range)).records
        val oxygen = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records

        val activeCaloriesRecords = mutableListOf<ActiveCaloriesBurnedRecord>()
        var activeCaloriesPageToken: String? = null
        do {
            val page = client.readRecords(
                ReadRecordsRequest(
                    recordType = ActiveCaloriesBurnedRecord::class,
                    timeRangeFilter = range,
                    pageToken = activeCaloriesPageToken
                )
            )
            activeCaloriesRecords.addAll(page.records)
            activeCaloriesPageToken = page.pageToken
        } while (!activeCaloriesPageToken.isNullOrEmpty())

        // Heart rate is high-volume data. Follow every Health Connect page token.
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
            .put("schemaVersion", "healthhub.healthconnect.bridge/1.3")
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
                val sessionAgg = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(
                            DistanceRecord.DISTANCE_TOTAL,
                            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
                        ),
                        timeRangeFilter = TimeRangeFilter.between(r.startTime, r.endTime)
                    )
                )
                val sessionDistance = sessionAgg[DistanceRecord.DISTANCE_TOTAL]
                val sessionActiveCalories = sessionAgg[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]
                arr.put(JSONObject()
                    .put("id", r.metadata.id)
                    .put("startTime", r.startTime.toString())
                    .put("endTime", r.endTime.toString())
                    .put("exerciseType", r.exerciseType)
                    .put("title", r.title ?: JSONObject.NULL)
                    .put("notes", r.notes ?: JSONObject.NULL)
                    .put("distanceKm", (sessionDistance?.inMeters ?: 0.0) / 1000.0)
                    .put("caloriesKcal", sessionActiveCalories?.inKilocalories ?: 0.0)
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
        var elevationDaysWithData = 0
        var floorsDaysWithData = 0

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
                        ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                        TotalCaloriesBurnedRecord.ENERGY_TOTAL,
                        ExerciseSessionRecord.EXERCISE_DURATION_TOTAL
                    ),
                    timeRangeFilter = dayRange
                )
            )
            val stepTotal = activityAgg[StepsRecord.COUNT_TOTAL] ?: 0L
            val distance = activityAgg[DistanceRecord.DISTANCE_TOTAL]
            val activeCalories = activityAgg[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]
            val totalCalories = activityAgg[TotalCaloriesBurnedRecord.ENERGY_TOTAL]
            val exerciseMinutes =
                activityAgg[ExerciseSessionRecord.EXERCISE_DURATION_TOTAL]?.toMinutes()?.toDouble() ?: 0.0

            val intervalMinutes = mergedActiveMinutes(activeCaloriesRecords, dayStart, dayEnd)
            val useIntervalMinutes =
                intervalMinutes >= exerciseMinutes && intervalMinutes in 1.0..360.0
            val effectiveActiveMinutes = if (useIntervalMinutes) intervalMinutes else exerciseMinutes

            // Terrain aggregations are optional, and cannot hold the entire sync hostage.
            val terrainMetrics = mutableSetOf<AggregateMetric<*>>()
            if (elevationAllowed) terrainMetrics.add(ElevationGainedRecord.ELEVATION_GAINED_TOTAL)
            if (floorsAllowed) terrainMetrics.add(FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL)
            val terrainAgg = if (terrainMetrics.isNotEmpty()) {
                try {
                    client.aggregate(AggregateRequest(metrics = terrainMetrics, timeRangeFilter = dayRange))
                } catch (_: Exception) { null }
            } else null
            val elevation = if (elevationAllowed) terrainAgg?.get(ElevationGainedRecord.ELEVATION_GAINED_TOTAL)?.inMeters else null
            val floors = if (floorsAllowed) terrainAgg?.get(FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL) else null
            if (elevation != null) elevationDaysWithData++
            if (floors != null) floorsDaysWithData++

            steps.put(JSONObject().put("date", date.toString()).put("count", stepTotal))
            val dayActivity = JSONObject()
                .put("date", date.toString())
                .put("steps", stepTotal)
                .put("distanceMeters", distance?.inMeters ?: 0.0)
                .put("activeCaloriesKcal", activeCalories?.inKilocalories ?: 0.0)
                .put("totalCaloriesKcal", totalCalories?.inKilocalories ?: 0.0)
                .put("caloriesKcal", activeCalories?.inKilocalories ?: 0.0)
                .put("activeMinutes", effectiveActiveMinutes)
                .put("activeMinutesSource", if (useIntervalMinutes) "activeCaloriesIntervals" else "exerciseSessions")
            if (elevation != null) dayActivity.put("elevationGainMeters", elevation.coerceAtLeast(0.0))
            if (floors != null) dayActivity.put("floorsClimbed", floors.coerceAtLeast(0.0))
            dailyActivity.put(dayActivity)

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

        // Aggregation creates a dailyActivity row even when Health Connect contains
        // NO source measurements for that day. These rows are not evidence of a sync.
        var activeDaysWithData = 0
        var nutritionDaysWithData = 0
        for (i in 0 until dailyActivity.length()) {
            val row = dailyActivity.optJSONObject(i) ?: continue
            if (row.optLong("steps", 0) > 0L ||
                row.optDouble("distanceMeters", 0.0) > 0.0 ||
                row.optDouble("activeCaloriesKcal", 0.0) > 0.0 ||
                row.optDouble("activeMinutes", 0.0) > 0.0 ||
                row.optDouble("elevationGainMeters", 0.0) > 0.0 ||
                row.optDouble("floorsClimbed", 0.0) > 0.0) activeDaysWithData++
        }
        for (i in 0 until dailyNutrition.length()) {
            val row = dailyNutrition.optJSONObject(i) ?: continue
            if (row.optDouble("energyKcal", 0.0) > 0.0 ||
                row.optDouble("proteinGrams", 0.0) > 0.0) nutritionDaysWithData++
        }
        val sourceRecordCount =
            bp.size + weight.size + bodyFat.size + glucose.size + oxygen.size +
            heart.size + restingHeart.size + exercise.size + sleep.size + vo2.size +
            activeCaloriesRecords.size + activeDaysWithData + nutritionDaysWithData

        root.put("counts", JSONObject()
            .put("bloodPressure", bp.size)
            .put("weight", weight.size)
            .put("bodyFat", bodyFat.size)
            .put("bloodGlucose", glucose.size)
            .put("oxygenSaturation", oxygen.size)
            .put("heartRateRecords", heart.size)
            .put("activeCaloriesRecords", activeCaloriesRecords.size)
            .put("restingHeartRate", restingHeart.size)
            .put("vo2Max", vo2.size)
            .put("exerciseSessions", exercise.size)
            .put("sleepSessions", sleep.size)
            .put("stepDays", steps.length())
            .put("activityDays", dailyActivity.length())
            .put("nutritionDays", dailyNutrition.length())
            .put("activeDaysWithData", activeDaysWithData)
            .put("nutritionDaysWithData", nutritionDaysWithData)
            .put("elevationPermissionGranted", elevationAllowed)
            .put("floorsPermissionGranted", floorsAllowed)
            .put("elevationDaysWithData", elevationDaysWithData)
            .put("floorsDaysWithData", floorsDaysWithData)
            .put("sourceRecordCount", sourceRecordCount)
            .put("hasSourceData", sourceRecordCount > 0))

        return root
    }
}
