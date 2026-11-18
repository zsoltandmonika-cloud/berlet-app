package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * Explicit opt-in Samsung Data SDK background canary, compiled ONLY with a
 * locally supplied proprietary AAR. Never enabled by the stock 0.15.20 OTA.
 *
 * This worker NEVER requests permissions or opens a UI. Samsung SDK data and
 * HC data remain in separate owner-scoped files. The local cache is updated
 * before Dropbox; uploads require the already-connected HH One Dropbox token.
 */
object SamsungDirectBackgroundSync {
    const val KEY_ENABLED = "samsung_direct_background_enabled"
    const val KEY_MANUAL_CLOUD_VERIFIED_OWNER = "samsung_direct_manual_cloud_verified_owner"
    const val KEY_LAST_SUCCESS = "samsung_direct_background_last_success_ms"
    const val KEY_LAST_ERROR = "samsung_direct_background_last_error"
    private const val PERIODIC = "hh-samsung-direct-periodic-v1"
    private const val ONCE = "hh-samsung-direct-once-v1"

    @JvmStatic
    fun setEnabled(context: Context, owner: String, enabled: Boolean) {
        check(BuildConfig.HH_SAMSUNG_DIRECT_CANDIDATE) {
            "Samsung Direct automata szinkron csak a privát 0.15.21 tesztverzióban érhető el"
        }
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        check(owner in setOf("zsolt", "monika") &&
            prefs.getString("device_owner_profile", null) == owner) {
            "A telefon tulajdonosi profilja nem egyezik"
        }
        if (enabled) {
            check(prefs.getString(KEY_MANUAL_CLOUD_VERIFIED_OWNER, null) == owner) {
                "Előbb teszteld a Samsung Direct kézi olvasását és sikeres Dropbox-feltöltését"
            }
            check(DropboxVaultClient.hasRefreshToken(prefs)) {
                "A meglévő Dropbox-kapcsolat nem érhető el"
            }
        }
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply()
        val wm = WorkManager.getInstance(context.applicationContext)
        if (!enabled) {
            wm.cancelUniqueWork(PERIODIC)
            wm.cancelUniqueWork(ONCE)
            return
        }
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val periodic = PeriodicWorkRequestBuilder<SamsungDirectBackgroundWorker>(3, TimeUnit.HOURS)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .addTag("samsung-direct-canary")
            .build()
        wm.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.UPDATE, periodic)
        // First run on consent, then at most every three hours. Both are guarded
        // by the shared Samsung writer and profile checks before remote writes.
        val once = OneTimeWorkRequestBuilder<SamsungDirectBackgroundWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .addTag("samsung-direct-canary")
            .build()
        wm.enqueueUniqueWork(ONCE, ExistingWorkPolicy.KEEP, once)
    }

    @JvmStatic
    fun status(context: Context): String {
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) return "Samsung automatikus szinkron: KI"
        val error = prefs.getString(KEY_LAST_ERROR, null)
        val last = prefs.getLong(KEY_LAST_SUCCESS, 0L)
        return when {
            !error.isNullOrBlank() -> "Samsung automatikus szinkron: ellenőrzendő ($error)"
            last > 0 -> "Samsung automatikus szinkron: BE, korábban sikeres"
            else -> "Samsung automatikus szinkron: BE, első mérésre vár"
        }
    }
}

class SamsungDirectBackgroundWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        if (!BuildConfig.HH_SAMSUNG_DIRECT_CANDIDATE) return Result.success()
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(SamsungDirectBackgroundSync.KEY_ENABLED, false)) return Result.success()
        val owner = prefs.getString("device_owner_profile", null)
        if (owner != "zsolt" && owner != "monika") {
            note(prefs, "Tulajdonosprofil hiányzik")
            return Result.success()
        }
        if (prefs.getString(SamsungDirectBackgroundSync.KEY_MANUAL_CLOUD_VERIFIED_OWNER, null) != owner ||
            !DropboxVaultClient.hasRefreshToken(prefs)) {
            note(prefs, "Samsung vagy Dropbox kézi előteszt hiányzik")
            return Result.success()
        }

        var stage = "Samsung olvasás"
        try {
            val readStartedAt = Instant.now()
            val store = HealthDataService.getStore(applicationContext)
            val needed = setOf(Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ))
            if (!store.getGrantedPermissions(needed).containsAll(needed)) {
                note(prefs, "Samsung Health hozzáférés visszavonva; kézi engedély szükséges")
                return Result.success() // Never show a permission dialog from WorkManager.
            }

            val today = LocalDate.now()
            var day: LocalDate? = null
            var minutes: Long? = null
            for (date in listOf(today, today.minusDays(1))) {
                val end = if (date == today) LocalDateTime.now() else today.atStartOfDay()
                val request = DataType.ActivitySummaryType.TOTAL_ACTIVE_TIME.requestBuilder
                    .setLocalTimeFilter(LocalTimeFilter.of(date.atStartOfDay(), end))
                    .build()
                val measured: Duration? = store.aggregateData(request).dataList.firstOrNull()?.value
                if (measured == null || measured.isNegative || measured.toMinutes() > 1440) continue
                day = date
                minutes = measured.toMinutes()
                break
            }
            if (day == null || minutes == null) {
                note(prefs, "Samsung Health: ma és tegnap sincs mérhető aktív idő")
                return Result.success() // No zero-filled synthetic records.
            }

            stage = "Dropbox"
            val measuredDay = day
            val activeMinutes = minutes
            SamsungHealthDirectPilot.writer.withLock {
                check(prefs.getBoolean(SamsungDirectBackgroundSync.KEY_ENABLED, false) &&
                    prefs.getString("device_owner_profile", null) == owner) {
                    "Szinkron letiltva vagy tulajdonos megváltozott"
                }
                val localFile = File(applicationContext.filesDir, "samsung-direct-$owner.json")
                val entries = linkedMapOf<String, JSONObject>()
                if (localFile.isFile) {
                    val local = JSONObject(withContext(Dispatchers.IO) {
                        localFile.readText(Charsets.UTF_8)
                    })
                    validateOwner(local, owner)
                    addPrevious(entries, local, today, measuredDay)
                }

                // Save every real measurement locally before network operations.
                entries[measuredDay.toString()] = JSONObject()
                    .put("date", measuredDay.toString())
                    .put("activeMinutes", activeMinutes)
                val localSnapshot = snapshot(owner, entries, Instant.now())
                withContext(Dispatchers.IO) {
                    val temp = File.createTempFile("samsung-direct-", ".tmp", applicationContext.filesDir)
                    try {
                        temp.writeText(localSnapshot.toString(2) + "\n", Charsets.UTF_8)
                        Files.move(temp.toPath(), localFile.toPath(),
                            StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
                    } finally { if (temp.exists()) temp.delete() }
                }

                val cloudPath = DropboxVaultClient.PROFILES_DIR + "/$owner-samsung-health.json"
                val cloudText = DropboxVaultClient.downloadTextOrNull(prefs, cloudPath)
                if (!cloudText.isNullOrBlank()) {
                    val cloud = JSONObject(cloudText)
                    validateOwner(cloud, owner)
                    val cloudTime = Instant.parse(cloud.getString("exportedAt"))
                    if (cloudTime.isAfter(readStartedAt)) {
                        // Another writer (e.g. web manual import) published fresher
                        // data after this measurement began. Do not overwrite it.
                        return@withLock
                    }
                    // Cloud wins for previously completed days; this device
                    // only overwrites its newly measured date.
                    val historical = linkedMapOf<String, JSONObject>()
                    historical.putAll(entries)
                    addPrevious(historical, cloud, today, measuredDay)
                    entries.clear()
                    entries.putAll(historical)
                }
                check(prefs.getBoolean(SamsungDirectBackgroundSync.KEY_ENABLED, false) &&
                    prefs.getString("device_owner_profile", null) == owner) {
                    "Szinkron letiltva vagy tulajdonos megváltozott"
                }
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
                DropboxVaultClient.uploadText(prefs, cloudPath,
                    snapshot(owner, entries, Instant.now()).toString(2) + "\n")
                prefs.edit()
                    .putLong(SamsungDirectBackgroundSync.KEY_LAST_SUCCESS, System.currentTimeMillis())
                    .remove(SamsungDirectBackgroundSync.KEY_LAST_ERROR)
                    .apply()
            }
            return Result.success()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Never log measurement values, file contents or OAuth tokens.
            note(prefs, "$stage: " + e.javaClass.simpleName.take(50))
            return if (stage == "Dropbox" && runAttemptCount < 2) Result.retry() else Result.success()
        }
    }

    private fun validateOwner(raw: JSONObject, owner: String) {
        check(raw.optString("profile") == owner &&
            Regex("^healthhub\\.samsung\\.daily/1(\\.\\d+)?$").matches(raw.optString("schemaVersion"))) {
            "Eltérő vagy ismeretlen Samsung-profilfájl; felülírás letiltva"
        }
    }

    private fun addPrevious(
        out: MutableMap<String, JSONObject>,
        raw: JSONObject,
        today: LocalDate,
        measuredDay: LocalDate
    ) {
        val list = raw.optJSONObject("records")?.optJSONArray("dailySummary") ?: return
        for (index in 0 until list.length()) {
            val row = list.optJSONObject(index) ?: continue
            val date = runCatching { LocalDate.parse(row.optString("date")) }.getOrNull()
            if (date != null && !date.isBefore(today.minusDays(29)) &&
                !date.isAfter(today) && date != measuredDay) {
                out[date.toString()] = row
            }
        }
    }

    private fun snapshot(owner: String, days: Map<String, JSONObject>, time: Instant): JSONObject {
        return JSONObject()
            .put("schemaVersion", "healthhub.samsung.daily/1")
            .put("profile", owner)
            .put("exportedAt", time.toString())
            .put("source", "samsung-health-data-sdk-1.1.0")
            .put("records", JSONObject().put("dailySummary", JSONArray().also { array ->
                days.toSortedMap().values.forEach { array.put(it) }
            }))
    }

    private fun note(prefs: SharedPreferences, detail: String) {
        prefs.edit().putString(SamsungDirectBackgroundSync.KEY_LAST_ERROR, detail.take(120)).apply()
    }
}
