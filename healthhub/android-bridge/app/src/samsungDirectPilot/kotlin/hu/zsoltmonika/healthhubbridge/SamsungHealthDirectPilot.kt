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
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Duration

/**
 * PRIVATE VENDOR SDK SOURCE. Compiled only with an explicit Samsung Direct Gradle
 * flag and a locally supplied vendor AAR. The shipping 0.15.20 OTA is unchanged.
 *
 * Explicit button click => separate Samsung ACTIVITY_SUMMARY read permission
 * => actual TOTAL_ACTIVE_TIME from Samsung Health => owner-only Dropbox file.
 * No inferred minutes and no modifications to canonical Health Connect export.
 */
object SamsungHealthDirectPilot {
    // Shared with the optional Samsung WorkManager capture to serialize cloud merges.
    internal val writer = Mutex()
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
            var stage = "SAMSUNG_KAPCSOLAT"
            try {
                val store = HealthDataService.getStore(activity.applicationContext)
                stage = "SAMSUNG_ENGEDELY"
                val required = setOf(Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ))
                if (!store.getGrantedPermissions(required).containsAll(required)) {
                    val granted = store.requestPermissions(required, activity)
                    if (!granted.containsAll(required)) {
                        toast(activity, "Samsung Health külön olvasási engedélye hiányzik.")
                        return@launch
                    }
                }
                stage = "SAMSUNG_ADATOLVASAS"
                // Read today first. Just after midnight Samsung Health can have
                // no ACTIVITY_SUMMARY for the new day, so try yesterday as a
                // *separately dated* fallback. Never relabel yesterday as today.
                val today = LocalDate.now()
                var measuredDay: LocalDate? = null
                var measuredMinutes: Long? = null
                for (candidate in listOf(today, today.minusDays(1))) {
                    val end = if (candidate == today) LocalDateTime.now() else today.atStartOfDay()
                    val filter = LocalTimeFilter.of(candidate.atStartOfDay(), end)
                    val request = DataType.ActivitySummaryType.TOTAL_ACTIVE_TIME.requestBuilder
                        .setLocalTimeFilter(filter)
                        .build()
                    // The SDK returns java.time.Duration, not a step-derived guess.
                    val measured: Duration? = store.aggregateData(request).dataList.firstOrNull()?.value
                    if (measured == null || measured.isNegative || measured.toMinutes() > 1440) {
                        continue
                    }
                    val minutes = measured.toMinutes()
                    measuredDay = candidate
                    measuredMinutes = minutes
                    break
                }
                val day = measuredDay
                val minutes = measuredMinutes
                if (day == null || minutes == null) {
                    toast(activity, "Samsung Health: sem ma, sem tegnap nincs hiteles aktív perc adat.")
                    return@launch
                }
                val dayLabel = if (day == today) "mai" else "tegnapi"
                // Always persist a verified source-only snapshot in the Pilot's
                // private storage. No Dropbox OAuth, browser or manual number entry.
                // Export to an Android-selected document is a separate owner tap.
                stage = "HELYI_MENTÉS"
                writer.withLock {
                    check(prefs.getString("device_owner_profile", null) == profile) {
                        "A készülék tulajdonosa közben megváltozott"
                    }
                    withContext(Dispatchers.IO) {
                        val target = File(activity.filesDir, "samsung-direct-$profile.json")
                        val entries = LinkedHashMap<String, JSONObject>()
                        if (target.isFile) {
                            val old = JSONObject(target.readText(Charsets.UTF_8))
                            check(old.optString("profile") == profile) {
                                "Eltérő tulajdonosú helyi Samsung-export"
                            }
                            check(Regex("^healthhub\\.samsung\\.daily/1(\\.\\d+)?$").matches(old.optString("schemaVersion"))) {
                                "Ismeretlen helyi Samsung-formátum"
                            }
                            val days = old.optJSONObject("records")?.optJSONArray("dailySummary")
                            if (days != null) for (i in 0 until days.length()) {
                                val row = days.optJSONObject(i) ?: continue
                                val key = row.optString("date")
                                val date = runCatching { LocalDate.parse(key) }.getOrNull()
                                if (date != null && !date.isBefore(today.minusDays(29)) &&
                                    !date.isAfter(today) && key != day.toString()) entries[key] = row
                            }
                        }
                        entries[day.toString()] = JSONObject()
                            .put("date", day.toString())
                            .put("activeMinutes", minutes)
                        val payload = JSONObject()
                            .put("schemaVersion", "healthhub.samsung.daily/1")
                            .put("profile", profile)
                            .put("exportedAt", Instant.now().toString())
                            .put("source", "samsung-health-data-sdk-1.1.0")
                            .put("records", JSONObject().put("dailySummary", JSONArray().also { array ->
                                entries.toSortedMap().values.forEach { array.put(it) }
                            }))
                        val tmp = File.createTempFile("samsung-direct-", ".tmp", activity.filesDir)
                        try {
                            tmp.writeText(payload.toString(2) + "\n", Charsets.UTF_8)
                            Files.move(tmp.toPath(), target.toPath(),
                                StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
                        } finally { if (tmp.exists()) tmp.delete() }
                    }
                }
                // The pilot is a separate Android package. It does not inherit
                // the signed HH One app's Dropbox OAuth credentials.
                // Still report verified local SDK data, without claiming an upload.
                if (!DropboxVaultClient.hasRefreshToken(prefs)) {
                    toast(activity, "Samsung Direct: $minutes mért $dayLabel aktív perc. " +
                        "Helyben mentve. Dropbox nélkül; exportálás a külön gombbal.")
                    return@launch
                }
                stage = "DROPBOX_ELŐKÉSZÍTÉS"
                writer.withLock {
                    // Recheck identity immediately before cloud write, after permissions.
                    check(prefs.getString("device_owner_profile", null) == profile) {
                        "A készülék tulajdonosa közben megváltozott"
                    }
                    val path = DropboxVaultClient.PROFILES_DIR + "/" + profile + "-samsung-health.json"
                    stage = "DROPBOX_LETÖLTÉS"
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
                                if (localDate != null && !localDate.isBefore(today.minusDays(29)) &&
                                    !localDate.isAfter(today) && key != day.toString()) {
                                    entries[key] = row
                                }
                            }
                        }
                    }
                    // Do not copy old fields onto the freshly read day's row:
                    // a previously saved calorie snapshot may be stale.
                    entries[day.toString()] = JSONObject()
                        .put("date", day.toString())
                        .put("activeMinutes", minutes)
                    val output = JSONObject()
                        .put("schemaVersion", "healthhub.samsung.daily/1")
                        .put("profile", profile)
                        .put("exportedAt", Instant.now().toString())
                        .put("source", "samsung-health-data-sdk-1.1.0")
                        .put("records", JSONObject().put("dailySummary", JSONArray().also { array ->
                            entries.toSortedMap().values.forEach { array.put(it) }
                        }))
                    stage = "DROPBOX_FELTÖLTÉS"
                    DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
                    DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
                    DropboxVaultClient.uploadText(prefs, path, output.toString(2) + "\n")
                }
                prefs.edit().putBoolean(SamsungDirectBackgroundSync.KEY_MANUAL_CLOUD_VERIFIED, true).apply()
                toast(activity, "Samsung Direct: $minutes mért $dayLabel aktív perc átadva a saját Dropbox-profilnak.")
            } catch (cancel: CancellationException) {
                throw cancel
            } catch (e: Exception) {
                // No health values, file contents or OAuth credentials in logs.
                toast(activity, "Samsung Direct hiba ($stage): " +
                    e.javaClass.simpleName.take(40) +
                    ". A Health Connect szinkron változatlan.")
            }
        }
    }

    private fun toast(activity: MainActivity, message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
        }
    }
}
