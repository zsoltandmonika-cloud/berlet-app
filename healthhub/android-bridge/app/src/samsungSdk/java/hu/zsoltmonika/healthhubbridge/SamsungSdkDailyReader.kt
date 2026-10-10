package hu.zsoltmonika.healthhubbridge

import android.app.Activity
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

    suspend fun collect(activity: Activity, profile: String, days: Int = 30): JSONObject {
        require(profile == "zsolt" || profile == "monika") { "Ismeretlen HealthHub-profil." }
        require(days in 1..30) { "Legfeljebb 30 nap kérhető." }
        require(android.os.Build.VERSION.SDK_INT >= 29) {
            "A Samsung Health Data SDK használatához Android 10 vagy újabb szükséges."
        }

        val store = HealthDataService.getStore(activity.applicationContext)
        val required = setOf(
            Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
            Permission.of(DataTypes.FLOORS_CLIMBED, AccessType.READ)
        )
        var granted = store.getGrantedPermissions(required)
        if (!granted.containsAll(required)) {
            // Samsung-owned permission UI; the user can deny one or both types.
            store.requestPermissions(required - granted, activity)
            granted = store.getGrantedPermissions(required)
        }
        if (!granted.containsAll(required)) {
            throw SecurityException("Samsung Health adathozzáférés nincs engedélyezve.")
        }

        val today = LocalDate.now()
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
                val values = store.aggregateData(req).dataList
                if (values.isNotEmpty()) {
                    val kcal = values.sumOf { it.value.toDouble() }
                    if (kcal.isFinite() && kcal in 0.0..25000.0) {
                        row.put("activeCaloriesKcal", kcal)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            try {
                val req = DataType.ActivitySummaryType.TOTAL_ACTIVE_TIME
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList
                if (values.isNotEmpty()) {
                    val minutes = values.sumOf { it.value.toMillis().toDouble() } / 60000.0
                    if (minutes.isFinite() && minutes in 0.0..1440.0) {
                        row.put("activeMinutes", minutes)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            try {
                val req = DataType.ActivitySummaryType.TOTAL_DISTANCE
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList
                if (values.isNotEmpty()) {
                    val meters = values.sumOf { it.value.toDouble() }
                    if (meters.isFinite() && meters in 0.0..250000.0) {
                        row.put("distanceMeters", meters)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

            try {
                val req = DataType.FloorsClimbedType.TOTAL
                    .requestBuilder.setLocalTimeFilter(filter).build()
                val values = store.aggregateData(req).dataList
                if (values.isNotEmpty()) {
                    val total = values.sumOf { it.value.toDouble() }
                    if (total.isFinite() && total in 0.0..1000.0) {
                        row.put("floorsClimbed", total)
                        hasAnySourceField = true
                    }
                }
            } catch (_: Exception) { /* Unavailable field is omitted. */ }

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
            .put("records", JSONObject().put("dailySummary", records))
    }
}
