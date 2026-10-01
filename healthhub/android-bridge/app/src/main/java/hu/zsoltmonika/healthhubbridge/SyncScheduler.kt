package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

object SyncScheduler {
    const val PREFS = "healthhub_connect"
    const val KEY_ENABLED = "scheduled_sync_enabled"
    const val KEY_TIMES = "scheduled_sync_times"
    const val TAG = "healthhub-scheduled-sync"

    fun times(context: Context): List<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return (prefs.getStringSet(KEY_TIMES, emptySet()) ?: emptySet())
            .filter { Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(it) }
            .sorted()
    }

    fun setEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ENABLED, enabled).apply()
        scheduleAll(context)
    }

    fun addTime(context: Context, value: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val set = (prefs.getStringSet(KEY_TIMES, emptySet()) ?: emptySet()).toMutableSet()
        set.add(value)
        prefs.edit().putStringSet(KEY_TIMES, set).apply()
        scheduleAll(context)
    }

    fun removeTime(context: Context, value: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val set = (prefs.getStringSet(KEY_TIMES, emptySet()) ?: emptySet()).toMutableSet()
        set.remove(value)
        prefs.edit().putStringSet(KEY_TIMES, set).apply()
        scheduleAll(context)
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().remove(KEY_TIMES).apply()
        scheduleAll(context)
    }

    fun scheduleAll(context: Context) {
        val wm = WorkManager.getInstance(context)
        wm.cancelAllWorkByTag(TAG)

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) return

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        times(context).forEach { hhmm ->
            val delay = initialDelayMillis(hhmm)
            val req = PeriodicWorkRequestBuilder<ScheduledSyncWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setConstraints(constraints)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "healthhub-auto-sync-${hhmm.replace(":", "")}",
                ExistingPeriodicWorkPolicy.UPDATE,
                req
            )
        }
    }

    private fun initialDelayMillis(hhmm: String): Long {
        val targetTime = LocalTime.parse(hhmm)
        val now = LocalDateTime.now()
        var target = now.toLocalDate().atTime(targetTime)
        if (!target.isAfter(now)) target = target.plusDays(1)
        return Duration.between(now, target).toMillis().coerceAtLeast(0L)
    }
}
