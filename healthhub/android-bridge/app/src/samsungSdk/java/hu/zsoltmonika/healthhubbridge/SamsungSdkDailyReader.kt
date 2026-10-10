package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.content.Context
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Samsung Health Data SDK v1.1.0: read-only native daily summaries.
 *
 * This source is compiled only when the vendor's .aar is privately supplied.
 * The Samsung Health consent screen is presented on an EXPLICIT user click,
 * never during an automatic Health Connect sync. A refusal must not affect HC.
 *
 * No SDK data is sent to a server until the MainActivity caller verifies its
 * owner binding and separately uploads the profile-scoped JSON to Dropbox.
 */
object SamsungSdkDailyReader {
    const val available = true

    suspend fun collect(activity: Activity, profile: String, days: Int = 30): JSONObject =
        collectInternal(activity.applicationContext, profile, days, activity)

    /** WorkManager may only use previously GRANTED permissions. It must never
     * show an authorization dialog or borrow permissions from another app.
     */
    suspend fun collectBackground(context: Context, profile: String, days: Int = 30): JSONObject =
        collectInternal(context.applicationContext, profile, days, null)

    private suspend fun collectInternal(
        context: Context, profile: String, days: Int, permissionActivity: Activity?
    ): JSONObject {
        require(profile == "zsolt" || profile == "monika") { "Ismeretlen HealthHub-profil." }
        require(days in 1..30) { "Legfeljebb 30 nap kérhető." }
        require(android.os.Build.VERSION.SDK_INT >= 29) {
            "A Samsung Health Data SDK használatához Android 10 vagy újabb szükséges."
        }

        val store = HealthDataService.getStore(context)
        val required = setOf(
            Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
            Permission.of(DataTypes.FLOORS_CLIMBED, AccessType.READ),
            Permission.of(DataTypes.STEPS, AccessType.READ),
            Permission.of(DataTypes.EXERCISE, AccessType.READ)
        )
        var granted = store.getGrantedPermissions(required)
        if (!granted.containsAll(required) && permissionActivity != null) {
            // Never request permissions from background or surprise the user.
            store.requestPermissions(required - granted, permissionActivity)
            granted = store.getGrantedPermissions(required)
        }
        // Activity summary is required for the primary kcal/time metrics.
        // Floors are optional: refusal must not block daily energy/time export.
        val hasActivitySummary = granted.contains(
            Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ)
        )
        val hasFloorsPermission = granted.contains(
            Permission.of(DataTypes.FLOORS_CLIMBED, AccessType.READ)
        )
        if (!hasActivitySummary) {
            throw SecurityException("A Samsung napi aktivitási összesítő olvasása nincs engedélyezve.")
        }

        val today = LocalDate.now()
        val nowLocal = LocalDateTime.now()
        // Optional readouts may be unavailable without interrupting the
        // proven Samsung calories/time/floors background pipeline.
        val hasStepsPermission = granted.contains(Permission.of(DataTypes.STEPS, AccessType.READ))
        val hasExercisePermission = granted.contains(Permission.of(DataTypes.EXERCISE, AccessType.READ))

        val hourlySteps = JSONArray()
        if (hasStepsPermission) {
            // Actual hourly STEPS aggregates for today, never daily totals
            // distributed across invented time slots.
            for (hour in 0..23) {
                val from = today.atTime(hour, 0)
                if (!from.isBefore(nowLocal)) break
                val until = from.plusHours(1).let { if (it.isAfter(nowLocal)) nowLocal else it }
                try {
                    val request = DataType.StepsType.TOTAL.requestBuilder
                        .setLocalTimeFilter(LocalTimeFilter.of(from, until)).build()
                    val values = store.aggregateData(request).dataList.mapNotNull { it.value }
                    if (values.isNotEmpty()) {
                        val count = values.sumOf { it.toLong() }
                        if (count in 0L..100000L) {
                            hourlySteps.put(JSONObject()
                                .put("date", today.toString())
                                .put("hour", hour)
                                .put("steps", count))
                        }
                    }
                } catch (_: Exception) { /* Missing bucket is unavailable. */ }
            }
        }

        // Samsung ExerciseSession has actual duration, distance and optional
        // altitudeGain. Altitude is exercise-only, not full-day elevation.
        val exerciseSessions = JSONArray()
        val exerciseElevationByDate = mutableMapOf<String, Double>()
        if (hasExercisePermission) {
            try {
                val request = DataTypes.EXERCISE.readDataRequestBuilder
                    .setLocalTimeFilter(
                        LocalTimeFilter.of(today.minusDays(days.toLong() - 1).atStartOfDay(), nowLocal)
                    ).setLimit(300).build()
                val seen = mutableSetOf<String>()
                val zone = ZoneId.systemDefault()
                for (item in store.readData(request).dataList) {
                    val sessions = item.getValue(DataType.ExerciseType.SESSIONS).orEmpty()
                    for (session in sessions) {
                        val key = session.startTime.toString() + "|" +
                            session.endTime.toString() + "|" + session.exerciseType.name
                        if (!seen.add(key)) continue
                        val durationMin = session.duration.toMillis().toDouble() / 60000.0
                        if (!durationMin.isFinite() || durationMin !in 0.0..1440.0) continue
                        val day = session.startTime.atZone(zone).toLocalDate().toString()
                        if (day < today.minusDays(days.toLong() - 1).toString() ||
                            day > today.toString()) continue
                        val row = JSONObject()
                            .put("startTime", session.startTime.toString())
                            .put("endTime", session.endTime.toString())
                            .put("date", day)
                            .put("exerciseType", session.exerciseType.name)
                            .put("durationMinutes", durationMin)
                        val distance = session.distance?.toDouble()
                        if (distance != null && distance.isFinite() && distance in 0.0..250000.0) {
                            row.put("distanceMeters", distance)
                            if (distance >= 50.0 && durationMin > 0.0 &&
                                session.exerciseType.name in setOf("WALKING","RUNNING","TRACK_RUNNING","HIKING","TREADMILL")) {
                                val pace = durationMin / (distance / 1000.0)
                                if (pace.isFinite() && pace in 1.0..60.0) row.put("paceMinPerKm", pace)
                            }
                        }
                        val ascent = session.altitudeGain?.toDouble()
                        if (ascent != null && ascent.isFinite() && ascent in 0.0..12000.0) {
                            row.put("altitudeGainMeters", ascent)
                            exerciseElevationByDate[day] =
                                (exerciseElevationByDate[day] ?: 0.0) + ascent
                        }
                        exerciseSessions.put(row)
                    }
                }
            } catch (_: Exception) { /* Optional exercise metadata unavailable. */ }
        }
        val records = JSONArray()

        // Read day-by-day because Samsung's daily Activity Tracker and the
        // Health Connect exercise records do not represent the same aggregates.
        for (index in (days - 1) downTo 0) {
            val date = today.minusDays(index.toLong())
            val from = date.atStartOfDay()
            val until = if (date == today) LocalDateTime.now() else date.plusDays(1).atStartOfDay()
            val filter = LocalTimeFilter.of(from, until)
            val row = JSONObject().put("date", date.toString())
            var hasAnySourceField = false

            // A missing dataList is NOT a measured zero; do not emit the field.
            // Individual fields may be absent and must never stop the HC pipeline.
            try {
                val req = DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList.mapNotNull { it.value }
                if (values.isNotEmpty()) {
                    val kcal = values.sumOf { it.toDouble() }
                    if (kcal.isFinite() && kcal in 0.0..25000.0) {
                        row.put("activeCaloriesKcal", kcal)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            try {
                val req = DataType.ActivitySummaryType.TOTAL_ACTIVE_TIME
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList.mapNotNull { it.value }
                if (values.isNotEmpty()) {
                    val minutes = values.sumOf { it.toMillis().toDouble() } / 60000.0
                    if (minutes.isFinite() && minutes in 0.0..1440.0) {
                        row.put("activeMinutes", minutes)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            try {
                val req = DataType.ActivitySummaryType.TOTAL_DISTANCE
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList.mapNotNull { it.value }
                if (values.isNotEmpty()) {
                    val meters = values.sumOf { it.toDouble() }
                    if (meters.isFinite() && meters in 0.0..250000.0) {
                        row.put("distanceMeters", meters)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            if (hasFloorsPermission) try {
                val req = DataType.FloorsClimbedType.TOTAL
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList.mapNotNull { it.value }
                if (values.isNotEmpty()) {
                    val total = values.sumOf { it.toDouble() }
                    if (total.isFinite() && total in 0.0..1000.0) {
                        row.put("floorsClimbed", total)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            exerciseElevationByDate[date.toString()]?.let {
                if (it.isFinite() && it in 0.0..12000.0) {
                    row.put("exerciseElevationGainMeters", it)
                    hasAnySourceField = true
                }
            }
            if (hasAnySourceField) records.put(row)
        }

        require(records.length() > 0) {
            "A Samsung Health SDK nem adott át napi aktivitásadatot. Ellenőrizd a hozzáférést és a Samsung Health verzióját."
        }

        return JSONObject()
            .put("schemaVersion", "healthhub.samsung.daily/1")
            .put("profile", profile)
            .put("exportedAt", Instant.now().toString())
            .put("source", "samsung-health-data-sdk-1.1.0")
            .put("records", JSONObject()
                .put("dailySummary", records)
                .put("hourlySteps", hourlySteps)
                .put("exerciseSessions", exerciseSessions))
    }
}
