package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.widget.Toast
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Duration

/**
 * PRIVATE DEVICE-ONLY PILOT. Compiled only with -PhhSamsungDirectPilot=true and
 * a locally supplied vendor AAR. Not included in signed production OTA.
 *
 * Explicit button click => separate Samsung ACTIVITY_SUMMARY read permission
 * => actual TOTAL_ACTIVE_TIME from Samsung Health => owner-only Dropbox file.
 * No inferred minutes and no modifications to canonical Health Connect export.
 */
object SamsungHealthDirectPilot {
    private val writer = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    @JvmStatic
    fun launch(activity: MainActivity, profile: String) {
        if (profile != "zsolt" && profile != "monika") return
        val prefs = activity.getSharedPreferences("healthhub_connect", Context.MODE_PRIVATE)
        if (prefs.getString("device_owner_profile", null) != profile) {
            toast(activity, "Samsung Direct: a telefon tulajdonosa nincs ehhez a profilhoz rögzítve.")
            return
        }
        scope.launch {
            try {
                val store = HealthDataService.getStore(activity.applicationContext)
                val required = setOf(Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ))
                if (!store.getGrantedPermissions(required).grantedPermissions.containsAll(required)) {
                    store.requestPermissions(required, activity)
                    if (!store.getGrantedPermissions(required).grantedPermissions.containsAll(required)) {
                        toast(activity, "Samsung Health külön olvasási engedélye hiányzik.")
                        return@launch
                    }
                }
                val day = LocalDate.now()
                val filter = LocalTimeFilter.of(day.atStartOfDay(), LocalDateTime.now())
                val request = DataType.ActivitySummaryType.TOTAL_ACTIVE_TIME.requestBuilder
                    .setLocalTimeFilter(filter)
                    .build()
                // The SDK returns java.time.Duration, not a step-derived guess.
                val measured: Duration? = store.aggregateData(request).dataList.firstOrNull()?.value
                if (measured == null || measured.isNegative || measured.toMinutes() > 1440) {
                    toast(activity, "Samsung Health: mára nincs hiteles aktív perc adat.")
                    return@launch
                }
                val minutes = measured.toMinutes()
                writer.withLock {
                    // Recheck identity immediately before cloud write, after permissions.
                    check(prefs.getString("device_owner_profile", null) == profile) {
                        "A készülék tulajdonosa közben megváltozott"
                    }
                    val path = DropboxVaultClient.PROFILES_DIR + "/" + profile + "-samsung-health.json"
                    val oldText = DropboxVaultClient.downloadTextOrNull(prefs, path)
                    val entries = LinkedHashMap<String, JSONObject>()
                    if (!oldText.isNullOrBlank()) {
                        val old = JSONObject(oldText)
                        check(old.optString("profile") == profile) {
                            "Más profilú Samsung-fájl, feltöltés leállítva"
                        }
                        check(Regex("^healthhub\\.samsung\\.daily/1(\\.\\d+)?$").matches(old.optString("schemaVersion"))) {
                            "Ismeretlen Samsung napi séma, feltöltés leállítva"
                        }
                        val existing = old.optJSONObject("records")?.optJSONArray("dailySummary")
                        if (existing != null) {
                            for (i in 0 until existing.length()) {
                                val row = existing.optJSONObject(i) ?: continue
                                val key = row.optString("date")
                                val localDate = runCatching { LocalDate.parse(key) }.getOrNull()
                                if (localDate != null && !localDate.isBefore(day.minusDays(29)) &&
                                    !localDate.isAfter(day) && key != day.toString()) {
                                    entries[key] = row
                                }
                            }
                        }
                    }
                    // Never copy other fields into today's row. A previous Samsung
                    // calorie snapshot could be old even if this minute reading is new.
                    entries[day.toString()] = JSONObject()
                        .put("date", day.toString())
                        .put("activeMinutes", minutes)
                    val output = JSONObject()
                        .put("schemaVersion", "healthhub.samsung.daily/1")
                        .put("profile", profile)
                        .put("exportedAt", Instant.now().toString())
                        .put("source", "Samsung Health Data SDK - ACTIVITY_SUMMARY")
                        .put("records", JSONObject().put("dailySummary", JSONArray().also { array ->
                            entries.toSortedMap().values.forEach { array.put(it) }
                        }))
                    DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
                    DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
                    DropboxVaultClient.uploadText(prefs, path, output.toString(2) + "\n")
                }
                toast(activity, "Samsung Direct: $minutes mért aktív perc átadva a saját Dropbox-profilnak.")
            } catch (cancel: CancellationException) {
                throw cancel
            } catch (e: Exception) {
                // No health values, file contents or OAuth credentials in logs.
                toast(activity, "Samsung Direct nem sikerült: " +
                    (e.javaClass.simpleName.take(60)) +
                    ". A normál Health Connect szinkron változatlan.")
            }
        }
    }

    private fun toast(activity: MainActivity, message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
        }
    }
}
