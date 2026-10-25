package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import android.location.Location
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * HH One -> private Dropbox App Folder -> Family Guard. Single latest fix only,
 * no track/history. Never runs without THIS phone owner's separate native sharing
 * consent, established Dropbox credentials and a foreground location service.
 * Uses existing Dropbox OAuth only: no keys, GPS data or tokens in public GitHub.
 */
object FamilyGuardNativeRelay {
    const val KEY_SHARE = "family_guard_native_share_v156"
    const val KEY_RESULT = "family_guard_native_upload_status_v156"
    const val KEY_LAST_UPLOAD = "family_guard_native_last_upload_v156"
    private const val DIRECTORY = "/HealthHub/guardian"
    private const val LIVE_DIRECTORY = "/HealthHub/guardian/native-live"
    private const val REVOKE_WORK = "hh-one-guardian-native-revoke"
    private val io = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val uploadLock = Mutex()
    @Volatile private var lastQueuedAt = 0L

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)

    fun owner(context: Context): String? =
        prefs(context).getString("device_owner_profile", null)?.takeIf {
            it == "zsolt" || it == "monika"
        }

    fun enabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_SHARE, false) &&
        FamilyGuardContinuity.enabled(context) && owner(context) != null &&
        DropboxVaultClient.hasRefreshToken(prefs(context))

    fun enable(context: Context): Boolean {
        if (owner(context) == null || !DropboxVaultClient.hasRefreshToken(prefs(context)) ||
            !FamilyGuardContinuity.hasBackgroundLocation(context)) return false
        prefs(context).edit().putBoolean(KEY_SHARE, true).apply()
        WorkManager.getInstance(context).cancelUniqueWork(REVOKE_WORK)
        return true
    }

    fun latestPath(profile: String): String {
        require(profile == "zsolt" || profile == "monika")
        return "$LIVE_DIRECTORY/$profile.json"
    }

    private suspend fun ensureFolder(context: Context) {
        val p = prefs(context)
        DropboxVaultClient.ensureFolder(p, DropboxVaultClient.ROOT)
        DropboxVaultClient.ensureFolder(p, DIRECTORY)
        DropboxVaultClient.ensureFolder(p, LIVE_DIRECTORY)
    }

    fun publish(context: Context, location: Location) {
        if (!enabled(context) || !Sh9GpsService.active) return
        val ageMs = System.currentTimeMillis() - location.time
        if (ageMs < -5_000 || ageMs > 20_000 || !location.hasAccuracy() ||
            location.accuracy < 0f || location.accuracy > 100f ||
            location.latitude !in -90.0..90.0 ||
            location.longitude !in -180.0..180.0) return
        val now = System.currentTimeMillis()
        // 30-second upload minimum. GPS measurements may remain every 15 sec.
        if (now - lastQueuedAt < maxOf(30_000L, Sh9GpsService.interval(context) * 1_000L)) return
        lastQueuedAt = now
        val app = context.applicationContext
        val profile = owner(app) ?: return
        val speed = if (location.hasSpeed() && location.speed >= 0f)
            (location.speed * 3.6).toDouble() else null
        val payload = JSONObject()
            .put("schema", "healthhub.guardian.native/1")
            .put("source", "HH One Native GPS")
            .put("profile", profile)
            .put("active", true)
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("accuracy_m", location.accuracy.toDouble())
            .put("speed_kmh", speed ?: JSONObject.NULL)
            .put("updated_at", Instant.ofEpochMilli(location.time).toString())
            .toString()
        io.launch {
            uploadLock.lock()
            try {
                if (!enabled(app) || owner(app) != profile || !Sh9GpsService.active) return@launch
                ensureFolder(app)
                if (!enabled(app) || owner(app) != profile || !Sh9GpsService.active) return@launch
                DropboxVaultClient.uploadText(prefs(app), latestPath(profile), payload)
                prefs(app).edit().putLong(KEY_LAST_UPLOAD, System.currentTimeMillis())
                    .putString(KEY_RESULT, "uploaded").apply()
            } catch (e: Exception) {
                lastQueuedAt = 0L
                prefs(app).edit().putString(KEY_RESULT,
                    "network-error:" + e.javaClass.simpleName.take(40)).apply()
            } finally {
                uploadLock.unlock()
            }
        }
    }

    /** Immediate stop of further updates plus durable tombstone when online. */
    fun disable(context: Context) {
        val app = context.applicationContext
        prefs(app).edit().putBoolean(KEY_SHARE, false).putString(KEY_RESULT, "stopping").apply()
        lastQueuedAt = 0L
        val req = OneTimeWorkRequestBuilder<GuardianNativeRevokeWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(app).enqueueUniqueWork(REVOKE_WORK, ExistingWorkPolicy.REPLACE, req)
    }

    suspend fun revokeIfStopped(context: Context): Boolean {
        uploadLock.lock()
        try {
            if (enabled(context)) return true // Later consent takes priority.
            val profile = owner(context) ?: return true
            if (!DropboxVaultClient.hasRefreshToken(prefs(context))) return false
            return try {
                ensureFolder(context)
                DropboxVaultClient.uploadText(prefs(context), latestPath(profile),
                    JSONObject().put("schema", "healthhub.guardian.native/1")
                        .put("source", "HH One Native GPS")
                        .put("profile", profile)
                        .put("active", false)
                        .put("updated_at", Instant.now().toString()).toString())
                prefs(context).edit().putString(KEY_RESULT, "revoked").apply()
                true
            } catch (e: Exception) {
                prefs(context).edit().putString(KEY_RESULT,
                    "revoke-pending:" + e.javaClass.simpleName.take(40)).apply()
                false
            }
        } finally {
            uploadLock.unlock()
        }
    }
}

class GuardianNativeRevokeWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result =
        if (FamilyGuardNativeRelay.revokeIfStopped(applicationContext)) Result.success()
        else Result.retry()
}
