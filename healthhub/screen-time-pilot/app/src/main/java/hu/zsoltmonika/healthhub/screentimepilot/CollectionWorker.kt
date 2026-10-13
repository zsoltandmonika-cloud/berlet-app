package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

/** Offline, local-only six-hour periodic collection, explicitly opt-in. */
class CollectionWorker(appContext: Context, params: WorkerParameters) :
    Worker(appContext, params) {
    override fun doWork(): Result {
        val prefs = PilotState.prefs(applicationContext)
        if (!prefs.getBoolean(PilotState.ENABLED, false)) return Result.success()
        val owner = PilotState.owner(applicationContext)
        if (owner == null) {
            prefs.edit().putString(PilotState.LAST_NOTE, "Nincs kiválasztott eszköztulajdonos.").apply()
            return Result.failure()
        }
        if (!UsageAccess.isGranted(applicationContext)) {
            prefs.edit().putString(PilotState.LAST_NOTE, "Usage Access hiányzik vagy visszavonták.").apply()
            return Result.success()
        }
        return try {
            val outcome = UsageCollector.collect(applicationContext, owner)
            prefs.edit()
                .putLong(PilotState.LAST_RUN, System.currentTimeMillis())
                .putString(
                    PilotState.LAST_NOTE,
                    "Megfigyelt óra: ${outcome.hoursObserved}; privátan tárolt óra: ${outcome.storedHours}; Android esemény: ${outcome.signals}; részletes app-óra: ${outcome.detailedAppHours}."
                ).apply()
            Result.success()
        } catch (e: Exception) {
            prefs.edit().putString(
                PilotState.LAST_NOTE,
                "Sikertelen mintavétel (${e.javaClass.simpleName})."
            ).apply()
            Result.retry()
        }
    }
}
