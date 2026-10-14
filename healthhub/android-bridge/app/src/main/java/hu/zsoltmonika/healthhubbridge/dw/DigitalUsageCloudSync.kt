package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import hu.zsoltmonika.healthhubbridge.DropboxVaultClient
import hu.zsoltmonika.healthhubbridge.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/** Owner-approved numeric observations in the existing private family Dropbox Vault. */
internal object DigitalUsageCloudSync {
    private const val DAY = 86_400_000L
    private const val SCHEMA = "healthhub.digital-wellbeing/1"
    private const val SOURCE = "android.usage-events.observed-app-foreground"
    private const val WORK = "hh-one-digital-family-cloud-sync"

    fun enqueue(context: Context) {
        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK, ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<DigitalUsageCloudWorker>().build()
        )
    }

    suspend fun sync(context: Context): Boolean {
        val p = PilotState.prefs(context)
        val erase = p.getBoolean(PilotState.CLOUD_ERASE_PENDING, false)
        val approved = p.getBoolean(PilotState.ENABLED, false) &&
            p.getBoolean(PilotState.CLOUD_ENABLED, false)
        if (!approved && !erase) return true
        val owner = PilotState.owner(context) ?: return false
        val main = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (main.getString("device_owner_profile", null) != owner) return false
        if (!DropboxVaultClient.hasRefreshToken(main)) return false
        val now = System.currentTimeMillis()
        val rows = if (erase || !approved) emptyList() else LocalLedger.read(context, owner)
            .filter { it.hourStartMs >= now - 30L * DAY && it.hourStartMs < now }
        // No private usage history is sent before explicit user consent.
        val arr = JSONArray()
        rows.sortedBy { it.hourStartMs }.forEach { r ->
            if (r.observedForegroundMs !in 1..UsageSessionizer.HOUR_MS ||
                r.chatGptForegroundMs !in 0..r.observedForegroundMs) return false
            arr.put(JSONObject()
                .put("hourStartMs", r.hourStartMs)
                .put("observedForegroundMs", r.observedForegroundMs)
                .put("chatGptForegroundMs", r.chatGptForegroundMs)
                .put("sessionFragments", r.sessionFragments))
        }
        // Per-app package identities require a SECOND, separately approved
        // family-cloud consent AND the earlier local detail consent.
        val appArr = JSONArray()
        val appShare = approved && !erase &&
            p.getBoolean(PilotState.APP_DETAIL_ENABLED, false) &&
            p.getBoolean(PilotState.CLOUD_DETAIL_ENABLED, false)
        val localConsent = p.getLong(PilotState.APP_DETAIL_CONSENT_START_MS, 0L)
        val cloudConsent = p.getLong(PilotState.CLOUD_DETAIL_START_MS, 0L)
        if (appShare && localConsent > 0L && cloudConsent > 0L) {
            val since = maxOf(now - 30L * DAY,
                ((maxOf(localConsent, cloudConsent) + UsageSessionizer.HOUR_MS - 1L) /
                  UsageSessionizer.HOUR_MS) * UsageSessionizer.HOUR_MS)
            val observedHourKeys = rows.map { it.hourStartMs }.toSet()
            val appRows = AppDetailLedger.read(context, owner)
                .filter { it.hourStartMs >= since && it.hourStartMs in observedHourKeys }
            val byHour = appRows.groupBy { it.hourStartMs }
            if (byHour.values.any { group ->
                group.sumOf { it.observedForegroundMs } > UsageSessionizer.HOUR_MS
            }) return false
            appRows.forEach { r ->
                appArr.put(JSONObject()
                    .put("hourStartMs", r.hourStartMs)
                    .put("packageName", r.packageName)
                    .put("observedForegroundMs", r.observedForegroundMs)
                    .put("sessionFragments", r.sessionFragments))
            }
        }
        // Empty record is valid: no completed observation OR sharing revoked.
        val data = JSONObject()
            .put("schema", SCHEMA)
            .put("source", SOURCE)
            .put("profileKey", owner)
            .put("collectedAtMs", now)
            .put("retentionDays", 30)
            .put("shared", approved && !erase)
            .put("missingIsUnknown", true)
            .put("hours", arr)
            .put("appDetailShared", appShare && localConsent > 0L && cloudConsent > 0L)
            .put("appHours", appArr)
        return try {
            if (PilotState.owner(context) != owner) return false
            if (!erase && !p.getBoolean(PilotState.CLOUD_ENABLED, false)) return false
            withContext(Dispatchers.IO) {
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.PROFILES_DIR)
                DropboxVaultClient.uploadText(main,
                    DropboxVaultClient.PROFILES_DIR + "/" + owner + "-digital-wellbeing.json",
                    data.toString(2) + "\n")
            }
            p.edit().putLong(PilotState.LAST_CLOUD_SUCCESS, now)
                .putBoolean(PilotState.CLOUD_ERASE_PENDING, false)
                .remove(PilotState.LAST_CLOUD_ERROR).apply()
            true
        } catch (e: Exception) {
            p.edit().putString(PilotState.LAST_CLOUD_ERROR, e.javaClass.simpleName).apply()
            false
        }
    }
}

class DigitalUsageCloudWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        if (DigitalUsageCloudSync.sync(applicationContext)) Result.success() else Result.retry()
}
