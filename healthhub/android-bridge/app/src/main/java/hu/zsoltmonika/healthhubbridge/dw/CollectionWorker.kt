package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/** Consent-gated, local-only scheduled WorkManager observation. */
class CollectionWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val prefs = PilotState.prefs(applicationContext)
        if (!prefs.getBoolean(PilotState.ENABLED, false)) return Result.success()
        if (PilotState.owner(applicationContext) == null) {
            prefs.edit().putString(PilotState.LAST_NOTE, "Nincs kiválasztott eszköztulajdonos.").apply()
            return Result.failure()
        }
        if (!UsageAccess.isGranted(applicationContext)) {
            prefs.edit().putString(PilotState.LAST_NOTE, "Usage Access hiányzik vagy visszavonták.").apply()
            return Result.success()
        }

        val origin = inputData.getString("origin") ?: "periodic"
        if (origin !in setOf("periodic", "custom", "startup")) return Result.failure()
        return try {
            CollectionEngine.collect(applicationContext, origin)
            if (PilotState.prefs(applicationContext).getBoolean(PilotState.CLOUD_ENABLED, false)) {
                // Upload failure does not invalidate a successfully saved local observation.
                DigitalUsageCloudSync.sync(applicationContext)
            }
            if (origin == "custom") CollectionScheduler.scheduleFollowingCustomRun(applicationContext)
            Result.success()
        } catch (_: Exception) {
            // CollectionEngine already wrote a status that can be shown locally.
            Result.retry()
        }
    }
}
