package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

/** Consent-gated, local-only scheduled WorkManager observation. */
class CollectionWorker(appContext: Context, params: WorkerParameters) :
    Worker(appContext, params) {

    override fun doWork(): Result {
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
            if (origin == "custom") CollectionScheduler.scheduleFollowingCustomRun(applicationContext)
            Result.success()
        } catch (_: Exception) {
            // CollectionEngine already wrote a status that can be shown locally.
            Result.retry()
        }
    }
}
