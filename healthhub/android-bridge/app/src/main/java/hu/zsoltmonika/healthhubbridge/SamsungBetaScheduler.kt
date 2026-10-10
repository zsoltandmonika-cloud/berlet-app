package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Completely isolated Samsung Beta scheduler.
 * OFF by default. The ordinary HealthHub Connect never starts this worker.
 *
 * WorkManager schedules opportunistically (not exact clock times). A 4-hour
 * request may run later under Doze, power or Samsung SDK restrictions.
 */
object SamsungBetaScheduler {
    const val KEY_ENABLED = "samsung_beta_auto_enabled"
    private const val UNIQUE_WORK = "hh-samsung-beta-direct-periodic"
    private const val TAG = "hh-samsung-beta-only"

    fun isEnabled(context: Context): Boolean =
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        val safe = enabled && SamsungSdkDailyReader.available
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ENABLED, safe).apply()
        schedule(context)
    }

    fun schedule(context: Context) {
        val work = WorkManager.getInstance(context)
        if (!SamsungSdkDailyReader.available || !isEnabled(context)) {
            work.cancelUniqueWork(UNIQUE_WORK)
            return
        }
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val req = PeriodicWorkRequestBuilder<SamsungBetaSyncWorker>(4, TimeUnit.HOURS)
            .setConstraints(constraints)
            .addTag(TAG)
            .build()
        work.enqueueUniquePeriodicWork(UNIQUE_WORK, ExistingPeriodicWorkPolicy.KEEP, req)
    }
}
