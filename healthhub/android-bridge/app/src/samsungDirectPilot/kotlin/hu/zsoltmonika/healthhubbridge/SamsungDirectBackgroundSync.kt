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
    const val KEY_INTERVAL_HOURS = "samsung_direct_interval_hours"
    private const val KEY_HOURLY_SCHEDULE_MIGRATED = "samsung_direct_hourly_schedule_migrated_v1"
    private const val PERIODIC = "hh-samsung-direct-periodic-v1"
    private const val ONCE = "hh-samsung-direct-once-v1"


    /** Owner-scoped interval. Both phones default to hourly Samsung-only synchronization. */
    @JvmStatic
    fun intervalHours(context: Context, owner: String): Int {
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        check(owner in setOf("zsolt", "monika") &&
            prefs.getString("device_owner_profile", null) == owner) {
            "Csak a saját telefon szinkronja állítható"
        }
        val saved = prefs.getInt("${KEY_INTERVAL_HOURS}_$owner", 1)
        return if (saved in 1..3) saved else 1
    }

    /** Changes the frequency without replacing owner data, Dropbox tokens or Health Connect. */
    @JvmStatic
    fun setIntervalHours(context: Context, owner: String, hours: Int) {
        require(hours in 1..3) { "Csak 1, 2 vagy 3 óra választható" }
        val previous = intervalHours(context, owner)
        if (previous == hours) return
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val key = "${KEY_INTERVAL_HOURS}_$owner"
        prefs.edit().putInt(key, hours).apply()
        try {
            if (prefs.getBoolean(KEY_ENABLED, false)) setEnabled(context, owner, true)
        } catch (e: Exception) {
            prefs.edit().putInt(key, previous).apply()
            throw e
        }
    }

    /** On upgrade, update an existing 3-hour WorkManager request once to the hourly default. */
    @JvmStatic
    fun reconcileHourlyDefault(context: Context) {
        if (!BuildConfig.HH_SAMSUNG_DIRECT_CANDIDATE) return
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val owner = prefs.getString("device_owner_profile", null) ?: return
        if (owner !in setOf("zsolt", "monika") || !prefs.getBoolean(KEY_ENABLED, false)) return
        if (prefs.getString(KEY_HOURLY_SCHEDULE_MIGRATED, null) == owner) return
        setEnabled(context, owner, true)
        prefs.edit().putString(KEY_HOURLY_SCHEDULE_MIGRATED, owner).apply()
    }

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
        val interval = intervalHours(context, owner)
        val periodic = PeriodicWorkRequestBuilder<SamsungDirectBackgroundWorker>(interval.toLong(), TimeUnit.HOURS)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .addTag("samsung-direct-canary")
            .build()
        wm.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.UPDATE, periodic)
        // First run on consent, then configured 1/2/3-hour cadence. Both are guarded
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
        val owner = prefs.getString("device_owner_profile", null)
        if (owner !in setOf("zsolt", "monika")) return "Samsung szinkron: tulajdonos hiányzik"
        val hours = intervalHours(context, owner!!)
        val error = prefs.getString(KEY_LAST_ERROR, null)
        val last = prefs.getLong(KEY_LAST_SUCCESS, 0L)
        val lastText = if (last > 0L) {
            java.time.Instant.ofEpochMilli(last)
                .atZone(java.time.ZoneId.systemDefault())
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy.MM.dd. HH:mm"))
        } else null
        return when {
            !error.isNullOrBlank() -> "Samsung szinkron: BE, $hours óránként; hiba: $error"
            lastText != null -> "Samsung szinkron: BE, $hours óránként; utolsó sikeres: $lastText"
            else -> "Samsung szinkron: BE, $hours óránként; első mérésre vár"
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
            // The old Samsung Beta exports active kcal and distance as well.
            // Read real Samsung aggregates; never infer them from steps or minutes.
            val until = if (measuredDay == today) LocalDateTime.now() else today.atStartOfDay()
            val dayFilter = LocalTimeFilter.of(measuredDay.atStartOfDay(), until)
            val activeCalories = runCatching {
                val request = DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED.requestBuilder
                    .setLocalTimeFilter(dayFilter).build()
                val value: Float? = store.aggregateData(request).dataList.firstOrNull()?.value
                value?.takeIf { it.isFinite() && it >= 0f && it <= 25000f }
            }.getOrNull()
            val distance = runCatching {
                val request = DataType.ActivitySummaryType.TOTAL_DISTANCE.requestBuilder
                    .setLocalTimeFilter(dayFilter).build()
                val value: Float? = store.aggregateData(request).dataList.firstOrNull()?.value
                value?.takeIf { it.isFinite() && it >= 0f && it <= 250000f }
            }.getOrNull()
            // WorkManager never opens a permission dialog. Missing consent or
            // a Samsung SDK error leaves any already-known hourly steps intact.
            val freshHourlySteps = runCatching {
                val stepPermission = SamsungStepCollector.readPermission
                if (store.getGrantedPermissions(stepPermission).containsAll(stepPermission)) {
                    SamsungStepCollector.readHourly(store, measuredDay, until)
                } else null
            }.getOrNull()
            // No permission UI in WorkManager. Opt-in exercise access is
            // independent and never blocks daily metrics or steps.
            val freshExerciseSessions = runCatching {
                val exercisePermission = SamsungExerciseCollector.readPermission
                if (store.getGrantedPermissions(exercisePermission).containsAll(exercisePermission)) {
                    SamsungExerciseCollector.readRecent(
                        store, today.minusDays(7).atStartOfDay(), LocalDateTime.now()
                    )
                } else null
            }.getOrNull()
            // Additional Samsung Watch9 sources refresh at most every six hours.
            // Activity sync remains hourly and independent of optional permission failures.
            val wellnessNow = System.currentTimeMillis()
            val wellnessKey = "samsung_direct_wellness_last_attempt_ms_$owner"
            val lastWellness = prefs.getLong(wellnessKey, 0L)
            val freshWellness = if (wellnessNow - lastWellness >= 6L * 60L * 60L * 1000L) {
                prefs.edit().putLong(wellnessKey, wellnessNow).apply()
                runCatching { SamsungWellnessCollector.read(store, today) }.getOrNull()
            } else null
            val freshRow = JSONObject()
                .put("date", measuredDay.toString())
                .put("activeMinutes", activeMinutes)
                .apply {
                    if (activeCalories != null) put("activeCaloriesKcal", activeCalories.toDouble())
                    if (distance != null) put("distanceMeters", distance.toDouble())
                }
            SamsungHealthDirectPilot.writer.withLock {
                check(prefs.getBoolean(SamsungDirectBackgroundSync.KEY_ENABLED, false) &&
                    prefs.getString("device_owner_profile", null) == owner) {
                    "Szinkron letiltva vagy tulajdonos megváltozott"
                }
                val localFile = File(applicationContext.filesDir, "samsung-direct-$owner.json")
                val entries = linkedMapOf<String, JSONObject>()
                var supplemental: JSONObject? = null
                if (localFile.isFile) {
                    val local = JSONObject(withContext(Dispatchers.IO) {
                        localFile.readText(Charsets.UTF_8)
                    })
                    validateOwner(local, owner)
                    supplemental = local
                    addPrevious(entries, local, today, measuredDay)
                    entries[measuredDay.toString()] = mergeDay(sameDay(local, measuredDay), freshRow)
                } else {
                    entries[measuredDay.toString()] = freshRow
                }

                // Save the verified reading before network activity, keeping any
                // previously collected Samsung Beta supplementary records.
                val localSnapshot = snapshot(
                    owner, entries, Instant.now(), supplemental, freshHourlySteps,
                    freshExerciseSessions, freshWellness, measuredDay
                )
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
                    historical[measuredDay.toString()] = mergeDay(
                        sameDay(cloud, measuredDay),
                        entries.getValue(measuredDay.toString())
                    )
                    entries.clear()
                    entries.putAll(historical)
                    supplemental = cloud
                }
                check(prefs.getBoolean(SamsungDirectBackgroundSync.KEY_ENABLED, false) &&
                    prefs.getString("device_owner_profile", null) == owner) {
                    "Szinkron letiltva vagy tulajdonos megváltozott"
                }
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
                val uploaded = snapshot(
                    owner, entries, Instant.now(), supplemental, freshHourlySteps,
                    freshExerciseSessions, freshWellness, measuredDay
                )
                DropboxVaultClient.uploadText(prefs, cloudPath, uploaded.toString(2) + "\n")
                // Upload acceptance is not a success: verify the persisted owner
                // and exact snapshot before recording a green status.
                val readBack = DropboxVaultClient.downloadTextOrNull(prefs, cloudPath)
                    ?: error("Samsung Dropbox visszaolvasás hiányzik")
                val confirmed = JSONObject(readBack)
                validateOwner(confirmed, owner)
                check(confirmed.optString("exportedAt") == uploaded.optString("exportedAt")) {
                    "Samsung Dropbox feltöltés nem igazolt"
                }
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

    private fun sameDay(raw: JSONObject, day: LocalDate): JSONObject? {
        val days = raw.optJSONObject("records")?.optJSONArray("dailySummary") ?: return null
        for (i in 0 until days.length()) {
            val row = days.optJSONObject(i) ?: continue
            if (row.optString("date") == day.toString()) return row
        }
        return null
    }

    private fun mergeDay(existing: JSONObject?, update: JSONObject): JSONObject {
        val result = if (existing != null) JSONObject(existing.toString()) else JSONObject()
        val keys = update.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            result.put(key, update.get(key))
        }
        return result
    }

    private fun snapshot(
        owner: String,
        days: Map<String, JSONObject>,
        time: Instant,
        carry: JSONObject?,
        freshHourlySteps: JSONArray?,
        freshExerciseSessions: JSONArray?,
        freshWellness: SamsungWellnessCollector.Snapshot?,
        measuredDay: LocalDate
    ): JSONObject {
        val records = JSONObject().put("dailySummary", JSONArray().also { array ->
            days.toSortedMap().values.forEach { array.put(it) }
        })
        // Retain Beta's hourly steps and exercise sessions until the unified
        // collector has proven parity. A new daily reading must not delete them.
        val oldRecords = carry?.optJSONObject("records")
        SamsungStepCollector.mergeHourly(
            oldRecords?.optJSONArray("hourlySteps"), freshHourlySteps, measuredDay
        )?.let { records.put("hourlySteps", it) }
        SamsungExerciseCollector.mergeSessions(
            oldRecords?.optJSONArray("exerciseSessions"), freshExerciseSessions
        )?.let { records.put("exerciseSessions", it) }
        SamsungWellnessCollector.mergeInto(records, oldRecords, freshWellness)
        return JSONObject()
            .put("schemaVersion", "healthhub.samsung.daily/1")
            .put("profile", owner)
            .put("exportedAt", time.toString())
            .put("source", "samsung-health-data-sdk-1.1.0")
            .put("records", records)
    }

    private fun note(prefs: SharedPreferences, detail: String) {
        prefs.edit().putString(SamsungDirectBackgroundSync.KEY_LAST_ERROR, detail.take(120)).apply()
    }
}
