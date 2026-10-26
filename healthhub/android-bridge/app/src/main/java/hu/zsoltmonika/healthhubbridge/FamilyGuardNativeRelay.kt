package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
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
    // Battery Safety is a separate, revocable user choice. Old GPS-only
    // approvals must never silently start publishing battery telemetry.
    const val KEY_BATTERY_SHARE = "family_guard_battery_share_v842"
    const val KEY_RESULT = "family_guard_native_upload_status_v156"
    const val KEY_LAST_UPLOAD = "family_guard_native_last_upload_v156"
    private const val DIRECTORY = "/HealthHub/guardian"
    private const val LIVE_DIRECTORY = "/HealthHub/guardian/native-live"
    private const val REVOKE_WORK = "hh-one-guardian-native-revoke"
    private const val REGISTRY_PATH = "/HealthHub/orchestrator/device-registry-v401.json"
    private const val DEVICE_ID_KEY = "orchestrator_device_id_v1"
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

    fun batteryEnabled(context: Context): Boolean =
        enabled(context) && prefs(context).getBoolean(KEY_BATTERY_SHARE, false)

    fun setBatterySharing(context: Context, granted: Boolean): Boolean {
        if (granted && !enabled(context)) return false
        prefs(context).edit().putBoolean(KEY_BATTERY_SHARE, granted).apply()
        // Suppress any previous in-memory snapshot; next GPS fix must reflect
        // the newly consented/withdrawn state, not a queued old value.
        lastQueuedAt = 0L
        return true
    }

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

    private suspend fun isSelectedPhysicalPhone(context: Context, profile: String): Boolean {
        val id = prefs(context).getString(DEVICE_ID_KEY, null)
            ?.takeIf { it.startsWith("android-") && it.length <= 96 } ?: return false
        val text = DropboxVaultClient.downloadTextOrNull(prefs(context), REGISTRY_PATH)
            ?: return false
        val registry = JSONObject(text)
        if (registry.optString("schema") != "healthhub.device_registry/1") return false
        if (registry.optJSONObject("activePhones")?.optString(profile) != id) return false
        val archived = registry.optJSONArray("archived") ?: return false
        for (i in 0 until archived.length()) if (archived.optString(i) == id) return false
        return true
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
        // Battery is sampled on THIS approved physical device at the same
        // instant as the one existing consented live GPS snapshot.
        // No extra permission, writer, endpoint or location sharing is started.
        val battery = if (batteryEnabled(app)) try {
            app.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        } catch (_: RuntimeException) { null } else null
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val percent = if (level >= 0 && scale > 0 && level <= scale)
            ((level * 100.0 / scale).toInt()).coerceIn(0, 100) else null
        val status = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val charging: Boolean? = when (status) {
            BatteryManager.BATTERY_STATUS_CHARGING,
            BatteryManager.BATTERY_STATUS_FULL -> true
            BatteryManager.BATTERY_STATUS_DISCHARGING,
            BatteryManager.BATTERY_STATUS_NOT_CHARGING -> false
            else -> null
        }
        val payload = JSONObject()
            .put("schema", "healthhub.guardian.native/1")
            .put("source", "HH One Native GPS")
            .put("profile", profile)
            .put("active", true)
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("accuracy_m", location.accuracy.toDouble())
            .put("speed_kmh", speed ?: JSONObject.NULL)
            .put("battery_pct", percent ?: JSONObject.NULL)
            .put("battery_charging", charging ?: JSONObject.NULL)
            .put("updated_at", Instant.ofEpochMilli(location.time).toString())
            .toString()
        io.launch {
            uploadLock.lock()
            try {
                if (!enabled(app) || owner(app) != profile || !Sh9GpsService.active) return@launch
                if (!isSelectedPhysicalPhone(app, profile)) {
                    prefs(app).edit().putString(KEY_RESULT, "not-selected-in-device-registry").apply()
                    return@launch
                }
                ensureFolder(app)
                if (!enabled(app) || owner(app) != profile || !Sh9GpsService.active) return@launch
                // Consent can be withdrawn while an earlier GPS snapshot is
                // waiting on the upload lock. Remove battery fields again at
                // the last possible moment to prevent privacy race conditions.
                val finalPayload = JSONObject(payload)
                if (!batteryEnabled(app)) {
                    finalPayload.put("battery_pct", JSONObject.NULL)
                        .put("battery_charging", JSONObject.NULL)
                }
                DropboxVaultClient.uploadText(prefs(app), latestPath(profile), finalPayload.toString())
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
        prefs(app).edit().putBoolean(KEY_SHARE, false)
            .putBoolean(KEY_BATTERY_SHARE, false)
            .putString(KEY_RESULT, "stopping").apply()
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
                // A retired phone must never revoke the selected phone's
                // shared record even when it has the same local profile label.
                if (!isSelectedPhysicalPhone(context, profile)) {
                    prefs(context).edit().putString(KEY_RESULT, "not-selected-in-device-registry").apply()
                    return true
                }
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
