package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.util.concurrent.TimeUnit

/**
 * Two strictly local, optional triggers:
 * (a) resilient WorkManager periodic baseline (6/12/24h),
 * (b) up to eight local daily wall-clock targets, inexact under Android Doze.
 *
 * No usage uploads, remote commands, alarms or additional Android permissions.
 */
internal object CollectionScheduler {
    private const val PERIODIC = "hh-one-screen-time-periodic-v1"
    private const val ONCE = "hh-one-screen-time-check-once-v1"
    private const val CUSTOM = "hh-one-screen-time-custom-v030"

    private fun enabled(context: Context): Boolean =
        PilotState.prefs(context).getBoolean(PilotState.ENABLED, false) &&
            PilotState.owner(context) != null && UsageAccess.isGranted(context)

    fun reconcile(context: Context) {
        val work = WorkManager.getInstance(context)
        val prefs = PilotState.prefs(context)
        if (!enabled(context)) {
            work.cancelUniqueWork(PERIODIC)
            work.cancelUniqueWork(CUSTOM)
            prefs.edit().remove(PilotState.APPLIED_INTERVAL_HOURS)
                .remove(PilotState.APPLIED_CUSTOM_SLOTS).apply()
            return
        }

        val interval = CollectionSchedule.effectiveIntervalHours(context)
        val periodic = PeriodicWorkRequestBuilder<CollectionWorker>(
            interval.toLong(), TimeUnit.HOURS
        ).setInputData(Data.Builder().putString("origin", "periodic").build()).build()
        val changed = prefs.getInt(PilotState.APPLIED_INTERVAL_HOURS, 0) != interval
        work.enqueueUniquePeriodicWork(
            PERIODIC,
            if (changed) ExistingPeriodicWorkPolicy.UPDATE else ExistingPeriodicWorkPolicy.KEEP,
            periodic
        )
        if (changed) prefs.edit().putInt(PilotState.APPLIED_INTERVAL_HOURS, interval).apply()

        val current = CollectionSchedule.slotStrings(context).joinToString(",")
        if (current.isEmpty()) {
            work.cancelUniqueWork(CUSTOM)
            prefs.edit().remove(PilotState.APPLIED_CUSTOM_SLOTS).apply()
            return
        }
        val previous = prefs.getString(PilotState.APPLIED_CUSTOM_SLOTS, null)
        val next = customRequest(context) ?: return
        work.enqueueUniqueWork(
            CUSTOM,
            if (previous == current) ExistingWorkPolicy.KEEP else ExistingWorkPolicy.REPLACE,
            next
        )
        if (previous != current) prefs.edit().putString(PilotState.APPLIED_CUSTOM_SLOTS, current).apply()
    }

    private fun customRequest(context: Context): androidx.work.OneTimeWorkRequest? {
        val next = CollectionSchedule.nextSlotFromDevice(context) ?: return null
        val delay = Duration.between(java.time.ZonedDateTime.now(next.zone), next)
            .toMillis().coerceAtLeast(15_000L)
        return OneTimeWorkRequestBuilder<CollectionWorker>()
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .setInputData(Data.Builder().putString("origin", "custom").build())
            .build()
    }

    /** Invoked by the custom worker before it finishes successfully.
     * APPEND_OR_REPLACE means the next target follows the active work rather
     * than cancelling a worker that may still be saving its private ledger. */
    fun scheduleFollowingCustomRun(context: Context) {
        if (!enabled(context)) return
        val next = customRequest(context) ?: return
        WorkManager.getInstance(context)
            .enqueueUniqueWork(CUSTOM, ExistingWorkPolicy.APPEND_OR_REPLACE, next)
    }

    /** Initial activation diagnostic. KEEP means repeated taps cannot cause a
     * burst of overlapping collectors. The foreground manual button is
     * separately executed on a private background executor. */
    fun collectNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<CollectionWorker>()
            .setInputData(Data.Builder().putString("origin", "startup").build()).build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(ONCE, ExistingWorkPolicy.KEEP, request)
    }

    fun stop(context: Context) {
        val work = WorkManager.getInstance(context)
        work.cancelUniqueWork(PERIODIC)
        work.cancelUniqueWork(CUSTOM)
        work.cancelUniqueWork(ONCE)
        PilotState.prefs(context).edit().remove(PilotState.APPLIED_INTERVAL_HOURS)
            .remove(PilotState.APPLIED_CUSTOM_SLOTS).apply()
    }
}
