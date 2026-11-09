package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import java.util.UUID
import androidx.work.workDataOf

object OrchestratorScheduler {
    private const val PERIODIC = "healthhub-orchestrator-command-watch"
    private const val NOW = "healthhub-orchestrator-command-now"
    const val TAG = "healthhub-orchestrator"

    fun schedule(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val req = PeriodicWorkRequestBuilder<OrchestratorWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .addTag(TAG)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            req
        )
    }

    fun runNow(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val req = OneTimeWorkRequestBuilder<OrchestratorWorker>()
            .setConstraints(constraints)
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            NOW,
            ExistingWorkPolicy.REPLACE,
            req
        )
    }

    /** Device heartbeat only, without processing any remotely queued commands. */
    fun checkRegistration(context: Context): UUID {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val req = OneTimeWorkRequestBuilder<OrchestratorWorker>()
            .setConstraints(constraints)
            .setInputData(workDataOf("hh_registry_diagnostic_only" to true))
            .addTag(TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "healthhub-orchestrator-device-registration-check",
            ExistingWorkPolicy.REPLACE,
            req
        )
        return req.id
    }
}
