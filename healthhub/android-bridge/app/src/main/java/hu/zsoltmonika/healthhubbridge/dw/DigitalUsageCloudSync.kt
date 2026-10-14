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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject

/** Owner-approved numeric observations in the existing private family Dropbox Vault. */
internal object DigitalUsageCloudSync {
    private const val DAY = 86_400_000L
    private const val SCHEMA = "healthhub.digital-wellbeing/1"
    private const val SOURCE = "android.usage-events.observed-app-foreground"
    private const val WORK = "hh-one-digital-family-cloud-sync"
    private val mutex = Mutex()

    fun enqueue(context: Context) {
        // Do not cancel a potentially in-flight Dropbox HTTP write when the
        // owner revokes consent. Queue the tombstone behind that write instead.
        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK, ExistingWorkPolicy.APPEND_OR_REPLACE,
            OneTimeWorkRequestBuilder<DigitalUsageCloudWorker>().build()
        )
    }

    suspend fun sync(context: Context): Boolean = mutex.withLock {
        try {
            uploadCurrent(context)
        } catch (error: Exception) {
            PilotState.prefs(context).edit()
                .putString(PilotState.LAST_CLOUD_ERROR, error.javaClass.simpleName).apply()
            false
        }
    }

    private suspend fun uploadCurrent(context: Context): Boolean {
        // Resolve and reconcile the canonical device owner BEFORE reading
        // consent. An owner change may invalidate local consent state.
        val owner = PilotState.owner(context) ?: return false
        val p = PilotState.prefs(context)
        val revision = p.getLong(PilotState.CLOUD_REVISION, 0L)
        val erase = p.getBoolean(PilotState.CLOUD_ERASE_PENDING, false)
        val approved = p.getBoolean(PilotState.ENABLED, false) &&
            p.getBoolean(PilotState.CLOUD_ENABLED, false)
        if (!approved && !erase) return true
        val main = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (main.getString("device_owner_profile", null) != owner) return false
        if (!DropboxVaultClient.hasRefreshToken(main)) {
            p.edit().putString(PilotState.LAST_CLOUD_ERROR, "Dropbox nincs csatlakoztatva").apply()
            return false
        }
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
            // Check the consent generation immediately before sending any data.
            if (p.getLong(PilotState.CLOUD_REVISION, 0L) != revision) return false
            val path = DropboxVaultClient.PROFILES_DIR + "/" + owner + "-digital-wellbeing.json"
            val payload = data.toString(2) + "\n"
            withContext(Dispatchers.IO) {
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.PROFILES_DIR)
                if (p.getLong(PilotState.CLOUD_REVISION, 0L) != revision) {
                    error("Consent changed before upload")
                }
                DropboxVaultClient.uploadText(main, path, payload)
                // A completed HTTP upload is not end-to-end proof: verify the
                // exact bytes through the existing authenticated read endpoint.
                val readback = DropboxVaultClient.downloadTextOrNull(main, path)
                require(readback == payload) { "Dropbox readback differs from uploaded snapshot" }
            }
            // Revocation may have happened while Dropbox was responding.
            // Never clear a newly pending erasure or mark a stale upload successful.
            if (p.getLong(PilotState.CLOUD_REVISION, 0L) != revision ||
                PilotState.owner(context) != owner ||
                p.getBoolean(PilotState.CLOUD_ERASE_PENDING, false) != erase) {
                p.edit().putString(PilotState.LAST_CLOUD_ERROR,
                    "Közben módosult a megosztás; új felhőszinkron szükséges").apply()
                return false
            }
            p.edit().putLong(PilotState.LAST_CLOUD_SUCCESS, System.currentTimeMillis())
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
