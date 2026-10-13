package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Stable KEEP schedule; never cancels/re-enqueues on every Activity resume.
 * No network constraint, because the pilot has NO network permission.
 */
internal object CollectionScheduler {
    private const val PERIODIC = "hh-screen-time-pilot-periodic-v1"
    private const val ONCE = "hh-screen-time-pilot-check-once-v1"

    fun reconcile(context: Context) {
        val work = WorkManager.getInstance(context)
        val ok = PilotState.prefs(context).getBoolean(PilotState.ENABLED, false) &&
            PilotState.owner(context) != null && UsageAccess.isGranted(context)
        if (!ok) {
            work.cancelUniqueWork(PERIODIC)
            return
        }
        val request = PeriodicWorkRequestBuilder<CollectionWorker>(6, TimeUnit.HOURS).build()
        work.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun collectNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<CollectionWorker>().build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(ONCE, ExistingWorkPolicy.KEEP, request)
    }

    fun stop(context: Context) {
        val work = WorkManager.getInstance(context)
        work.cancelUniqueWork(PERIODIC)
        work.cancelUniqueWork(ONCE)
    }
}
