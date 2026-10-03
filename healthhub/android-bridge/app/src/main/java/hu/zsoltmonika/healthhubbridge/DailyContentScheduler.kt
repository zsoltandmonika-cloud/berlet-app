package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

object DailyContentScheduler {
    private const val TAG = "healthhub-daily-cloud"

    fun schedule(context: Context) {
        scheduleMode(context, "spark", "06:05")
        scheduleMode(context, "briefing", "07:05")
    }

    fun runNow(context: Context) {
        val req = OneTimeWorkRequestBuilder<DailyContentWorker>()
            .setInputData(Data.Builder().putString("mode", "both").build())
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "healthhub-daily-cloud-now",
            ExistingWorkPolicy.REPLACE,
            req
        )
    }

    private fun scheduleMode(context: Context, mode: String, hhmm: String) {
        val req = PeriodicWorkRequestBuilder<DailyContentWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(initialDelayMillis(hhmm), TimeUnit.MILLISECONDS)
            .setInputData(Data.Builder().putString("mode", mode).build())
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .addTag(TAG)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "healthhub-daily-cloud-" + mode,
            ExistingPeriodicWorkPolicy.UPDATE,
            req
        )
    }

    private fun initialDelayMillis(hhmm: String): Long {
        val targetTime = LocalTime.parse(hhmm)
        val now = LocalDateTime.now()
        var target = now.toLocalDate().atTime(targetTime)
        if (!target.isAfter(now)) target = target.plusDays(1)
        return Duration.between(now, target).toMillis().coerceAtLeast(0L)
    }
}
