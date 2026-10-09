package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.TimeUnit

/**
 * HealthHub Connect v0.11: WorkManager manages reconnection to transiently lost
 * networks and Dropbox access-token expiry. Health Connect permissions and a
 * revoked Dropbox refresh token must still be approved again by the phone owner.
 * The phone-owner profile never changes in the background.
 */
object ResilientHealthSync {
    const val KEY_ENABLED = "resilient_health_sync_enabled"
    const val KEY_LAST_SUCCESS = "resilient_health_sync_last_success_ms"
    const val KEY_LAST_ATTEMPT = "resilient_health_sync_last_attempt_ms"
    const val KEY_LAST_ERROR = "resilient_health_sync_last_error"
    const val KEY_NEEDS_ACTION = "resilient_health_sync_needs_action"
    const val KEY_COUNTS = "resilient_health_sync_record_summary"
    private const val PERIODIC = "healthhub-resilient-health-periodic-v1"
    private const val ON_DEMAND = "healthhub-resilient-health-once-v1"

    fun isEnabled(prefs: SharedPreferences): Boolean = prefs.getBoolean(KEY_ENABLED, true)

    fun setEnabled(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply()
        schedule(context, false)
    }

    fun schedule(context: Context, kickIfStale: Boolean = true) {
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val owner = prefs.getString("device_owner_profile", null)
        val configured = (owner == "zsolt" || owner == "monika") &&
            DropboxVaultClient.hasRefreshToken(prefs)
        val wm = WorkManager.getInstance(context)
        if (!isEnabled(prefs) || !configured) {
            wm.cancelUniqueWork(PERIODIC)
            wm.cancelUniqueWork(ON_DEMAND)
            return
        }
        val network = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val periodic = PeriodicWorkRequestBuilder<ResilientHealthWorker>(3, TimeUnit.HOURS)
            .setConstraints(network)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .addTag("healthhub-resilient-connector")
            .build()
        // KEEP preserves the schedule even if the user opens the app frequently.
        wm.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, periodic)
        val previous = prefs.getLong(KEY_LAST_SUCCESS, 0L)
        if (kickIfStale && (previous == 0L || System.currentTimeMillis() - previous > 2 * 60 * 60 * 1000L)) {
            kick(context)
        }
    }

    fun kick(context: Context) {
        val prefs = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (!isEnabled(prefs) || !DropboxVaultClient.hasRefreshToken(prefs)) return
        if (prefs.getString("device_owner_profile", null) !in listOf("zsolt", "monika")) return
        val request = OneTimeWorkRequestBuilder<ResilientHealthWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
            .addTag("healthhub-resilient-connector")
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(ON_DEMAND, ExistingWorkPolicy.KEEP, request)
    }
}

class ResilientHealthWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    companion object {
        // Serializes the periodic and catch-up WorkManager tasks in the same process.
        private val lock = Mutex()
    }

    override suspend fun doWork(): Result = lock.withLock {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (!ResilientHealthSync.isEnabled(prefs)) return@withLock Result.success()
        DropboxVaultClient.ensureCredentialVersion(prefs)
        val owner = prefs.getString("device_owner_profile", null)
        if (owner != "monika" && owner != "zsolt") {
            requiresAction(prefs, "Nincs megadva a telefon saját profilja.")
            return@withLock Result.success()
        }
        if (!DropboxVaultClient.hasRefreshToken(prefs)) {
            requiresAction(prefs, "Dropbox kapcsolat engedélyezése szükséges az alkalmazásban.")
            return@withLock Result.success()
        }
        // Do not repeat a successful sync while both jobs are queued.
        if (System.currentTimeMillis() - prefs.getLong(ResilientHealthSync.KEY_LAST_SUCCESS, 0L) < 20 * 60_000L)
            return@withLock Result.success()

        prefs.edit().putLong(ResilientHealthSync.KEY_LAST_ATTEMPT, System.currentTimeMillis()).apply()
        try {
            if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
                requiresAction(prefs, "Health Connect nem elérhető ezen a telefonon.")
                return@withLock Result.success()
            }
            val hc = HealthConnectClient.getOrCreate(applicationContext)
            val grants = hc.permissionController.getGrantedPermissions()
            val needed = HealthConnectExporter.requiredPermissions(hc)
            if (!grants.containsAll(needed)) {
                requiresAction(prefs, "Health Connect olvasási engedélyt kell megadni a HealthHub Connect alkalmazásnak.")
                return@withLock Result.success()
            }
            if (HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND !in grants) {
                requiresAction(prefs, "Health Connect háttérben olvasás engedély szükséges.")
                return@withLock Result.success()
            }

            val exporter = HealthConnectExporter(hc)
            val payload = exporter.export(owner)
            if (!exporter.hasUsefulData(payload)) {
                // Retain existing cloud file. No 'success' for artificial zero-filled dates.
                requiresAction(prefs, "Nincs tényleges mérési rekord az elmúlt 30 napban. Ellenőrizd a Samsung Health adatmegosztást.")
                return@withLock Result.success()
            }
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
            DropboxVaultClient.uploadText(
                prefs, DropboxVaultClient.healthConnectPath(owner), payload.toString(2) + "\n"
            )
            prefs.edit()
                .putLong(ResilientHealthSync.KEY_LAST_SUCCESS, System.currentTimeMillis())
                .putString(ResilientHealthSync.KEY_COUNTS, exporter.countSummary(payload))
                .remove(ResilientHealthSync.KEY_LAST_ERROR)
                .remove(ResilientHealthSync.KEY_NEEDS_ACTION)
                .apply()
            Result.success()
        } catch (e: Exception) {
            val msg = (e.message ?: e.javaClass.simpleName).take(200)
            val unrecoverable = msg.contains("invalid_grant", true) ||
                msg.contains("revoked", true) ||
                msg.contains("not_allowed", true) ||
                msg.contains("PERMISSION_DENIED", true)
            prefs.edit()
                .putString(ResilientHealthSync.KEY_LAST_ERROR, msg)
                .putBoolean(ResilientHealthSync.KEY_NEEDS_ACTION, unrecoverable)
                .apply()
            if (unrecoverable) Result.success() else Result.retry()
        }
    }

    private fun requiresAction(prefs: SharedPreferences, message: String) {
        prefs.edit()
            .putString(ResilientHealthSync.KEY_LAST_ERROR, message)
            .putBoolean(ResilientHealthSync.KEY_NEEDS_ACTION, true)
            .apply()
    }
}
