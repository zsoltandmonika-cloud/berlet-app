package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.time.Instant

/**
 * WorkManager job for the separate Samsung SDK beta app only.
 *
 * No permission prompt, no Health Connect fallback, no access to the other
 * profile, and never touches <profile>-health-connect.json.
 * Samsung Health may block background SDK calls: that outcome is recorded,
 * not concealed as success or replaced with estimated values.
 */
class SamsungBetaSyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        if (!SamsungSdkDailyReader.available || !SamsungBetaScheduler.isEnabled(applicationContext)) {
            return Result.success()
        }
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val owner = prefs.getString("device_owner_profile", null)
        if (owner != "zsolt" && owner != "monika") {
            fail(prefs, "Telefon-tulajdonos nincs rögzítve.")
            return Result.success()
        }
        if (!DropboxVaultClient.hasRefreshToken(prefs)) {
            fail(prefs, "Dropbox nincs összekötve a Samsung Betával.")
            return Result.success()
        }
        return try {
            // Explicit Samsung permissions must have been granted interactively first.
            // The background reader must NEVER display a Samsung permission dialog.
            val data: JSONObject = SamsungSdkDailyReader.collectBackground(applicationContext, owner)
            val records = data.optJSONObject("records")?.optJSONArray("dailySummary")
            check(data.optString("schemaVersion") == "healthhub.samsung.daily/1" &&
                data.optString("source") == "samsung-health-data-sdk-1.1.0" &&
                data.optString("profile") == owner &&
                records != null && records.length() > 0) {
                "Samsung export formátuma/profilja eltér vagy nincs valódi adat."
            }
            val stamp = Instant.parse(data.getString("exportedAt"))
            require(!stamp.isAfter(Instant.now().plusSeconds(300))) { "Samsung dátuma hibás." }
            val path = DropboxVaultClient.PROFILES_DIR + "/" + owner + "-samsung-health.json"
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
            // Never replace a newer upload that the user put into the Vault manually.
            val old = DropboxVaultClient.downloadTextOrNull(prefs, path)
            if (!old.isNullOrBlank()) {
                val prev = JSONObject(old)
                require(prev.optString("profile") == owner &&
                    prev.optString("schemaVersion") == "healthhub.samsung.daily/1") {
                    "A célfájl másik profilhoz tartozik / ismeretlen formátumú; nem írjuk felül."
                }
                val previousStamp = Instant.parse(prev.getString("exportedAt"))
                if (!stamp.isAfter(previousStamp)) {
                    prefs.edit()
                        .putLong("samsung_beta_last_skip_ms", System.currentTimeMillis())
                        .remove("samsung_beta_last_error")
                        .apply()
                    return Result.success()
                }
            }
            // Check owner again after all remote async calls, before overwrite.
            require(prefs.getString("device_owner_profile", null) == owner &&
                SamsungBetaScheduler.isEnabled(applicationContext)) {
                "Közben megváltozott a profil vagy kikapcsolták az automatikus szinkront."
            }
            DropboxVaultClient.uploadText(prefs, path, data.toString(2) + "\n")
            prefs.edit()
                .putLong("samsung_beta_last_success_ms", System.currentTimeMillis())
                .putString("samsung_beta_last_success_profile", owner)
                .remove("samsung_beta_last_error")
                .apply()
            Result.success()
        } catch (e: Exception) {
            fail(prefs, e.message ?: e.javaClass.simpleName)
            // Transient network failures retry, but never hot-loop.
            if (runAttemptCount < 2) Result.retry() else Result.success()
        }
    }

    private fun fail(prefs: android.content.SharedPreferences, message: String) {
        prefs.edit()
            .putLong("samsung_beta_last_error_ms", System.currentTimeMillis())
            .putString("samsung_beta_last_error", message.take(180))
            .apply()
    }
}
