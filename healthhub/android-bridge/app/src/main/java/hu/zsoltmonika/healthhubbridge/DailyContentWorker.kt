package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class DailyContentWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        DropboxVaultClient.ensureCredentialVersion(prefs)

        if (!DropboxVaultClient.hasRefreshToken(prefs)) {
            prefs.edit()
                .putString("last_daily_cloud_error", "Dropbox nincs csatlakoztatva a HealthHub Connectben.")
                .apply()
            return Result.success()
        }

        val mode = inputData.getString("mode") ?: "both"

        return try {
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.DAILY_DIR)

            if (mode == "spark" || mode == "both") refreshSpark(prefs)
            if (mode == "briefing" || mode == "both") refreshBriefing(prefs)

            prefs.edit()
                .putLong("last_daily_cloud_ms", System.currentTimeMillis())
                .remove("last_daily_cloud_error")
                .apply()

            Result.success()
        } catch (e: Exception) {
            prefs.edit()
                .putLong("last_daily_cloud_error_ms", System.currentTimeMillis())
                .putString("last_daily_cloud_error", e.message ?: e.javaClass.simpleName)
                .apply()
            Result.retry()
        }
    }

    private suspend fun refreshSpark(prefs: android.content.SharedPreferences) {
        val current = try {
            DropboxVaultClient.downloadTextOrNull(prefs, DropboxVaultClient.DAILY_SPARK)
        } catch (_: Exception) {
            null
        }
        if (DailyContentGenerator.isToday(current)) return

        val json = DailyContentGenerator.generateSpark().toString(2) + "\n"
        DropboxVaultClient.uploadText(prefs, DropboxVaultClient.DAILY_SPARK, json)
        prefs.edit().putLong("last_daily_spark_ms", System.currentTimeMillis()).apply()
    }

    private suspend fun refreshBriefing(prefs: android.content.SharedPreferences) {
        val current = try {
            DropboxVaultClient.downloadTextOrNull(prefs, DropboxVaultClient.DAILY_BRIEFING)
        } catch (_: Exception) {
            null
        }
        if (DailyContentGenerator.isToday(current)) return

        val json = withContext(Dispatchers.IO) {
            DailyContentGenerator.generateBriefing().toString(2) + "\n"
        }
        DropboxVaultClient.uploadText(prefs, DropboxVaultClient.DAILY_BRIEFING, json)
        prefs.edit().putLong("last_daily_briefing_ms", System.currentTimeMillis()).apply()
    }
}
