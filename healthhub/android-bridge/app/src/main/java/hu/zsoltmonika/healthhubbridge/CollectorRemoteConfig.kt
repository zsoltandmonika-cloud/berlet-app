package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.time.Duration
import java.time.Instant

/**
 * v0.15: SMALL, allowlisted, device-pulled scheduling configuration.
 *
 * Transport: the existing Dropbox OAuth session and per-device orchestrator
 * file. This is NOT a signed management channel. Only a bounded WorkManager
 * INTERVAL may be changed, never permissions, executable code, user profile,
 * OAuth credentials or enabling a collector without its local opt-in.
 *
 * Each new revision is staged in the inactive A/B configuration slot, then
 * observed in the field. A real verified upload promotes it to last-known-good.
 * Repeated errors or a 12-hour trial timeout revert to the prior slot.
 */
object CollectorRemoteConfig {
    private const val DIR = "/HealthHub/orchestrator/config"
    private const val SCHEMA = "healthhub.collector.config/1"
    private const val KEY_ACTIVE = "collector_config_active_slot_v1"
    private const val KEY_A = "collector_config_slot_a_v1"
    private const val KEY_B = "collector_config_slot_b_v1"
    private const val KEY_SEEN = "collector_config_seen_revision_v1"
    private const val KEY_TRIAL = "collector_config_trial_v1"
    private const val KEY_TRIAL_START = "collector_config_trial_started_ms_v1"
    private const val KEY_ERRORS = "collector_config_trial_errors_v1"
    private const val KEY_REJECTED = "collector_config_last_rejected_revision_v1"
    private const val KEY_REASON = "collector_config_last_reason_v1"
    private const val KEY_LAST_ACCEPTED = "collector_config_last_verified_revision_v1"
    private const val DEFAULT_HOURS = 4L
    private const val TRIAL_TIMEOUT_MS = 12L * 60L * 60L * 1000L
    private const val MAX_JSON_CHARS = 4096
    private val allowedHours = setOf(4L, 6L, 8L, 12L, 24L)

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)

    private fun activeSlot(p: SharedPreferences): String =
        if (p.getString(KEY_ACTIVE, "a") == "b") "b" else "a"

    private fun slotKey(slot: String) = if (slot == "b") KEY_B else KEY_A

    private fun revision(obj: JSONObject?): Long = obj?.optLong("revision", 0L) ?: 0L

    private fun readSlot(p: SharedPreferences, slot: String): JSONObject? =
        try {
            p.getString(slotKey(slot), null)?.let { JSONObject(it) }
        } catch (_: Exception) {
            null
        }

    fun intervalHours(context: Context): Long {
        val p = prefs(context)
        val hours = readSlot(p, activeSlot(p))?.optLong("samsungSyncHours", DEFAULT_HOURS)
            ?: DEFAULT_HOURS
        return if (hours in allowedHours) hours else DEFAULT_HOURS
    }

    fun status(context: Context): JSONObject {
        val p = prefs(context)
        val active = readSlot(p, activeSlot(p))
        return JSONObject()
            .put("schema", "healthhub.collector.config.status/1")
            .put("activeRevision", revision(active))
            .put("verifiedRevision", p.getLong(KEY_LAST_ACCEPTED, 0L))
            .put("lastSeenRevision", p.getLong(KEY_SEEN, 0L))
            .put("syncIntervalHours", intervalHours(context))
            .put("trial", p.getBoolean(KEY_TRIAL, false))
            .put("trialErrors", p.getInt(KEY_ERRORS, 0))
            .put("lastRejectedRevision", p.getLong(KEY_REJECTED, 0L))
            .put("lastReason", p.getString(KEY_REASON, "") ?: "")
            .put("configCanOnlyChangeScheduling", true)
    }

    private fun rollback(context: Context, p: SharedPreferences, reason: String) {
        val current = activeSlot(p)
        val previous = if (current == "a") "b" else "a"
        val failedRevision = revision(readSlot(p, current))
        check(p.edit()
            .putString(KEY_ACTIVE, previous)
            .putBoolean(KEY_TRIAL, false)
            .putInt(KEY_ERRORS, 0)
            .putLong(KEY_REJECTED, failedRevision)
            .putString(KEY_REASON, reason.take(130))
            .commit()) { "Nem sikerült a stabil konfiguráció visszaállítása." }
        SamsungCollectorScheduler.schedule(context, forceUpdate = true)
    }

    private fun checkTrialTimeout(context: Context, p: SharedPreferences) {
        if (!p.getBoolean(KEY_TRIAL, false)) return
        val start = p.getLong(KEY_TRIAL_START, 0L)
        if (start > 0L && System.currentTimeMillis() - start > TRIAL_TIMEOUT_MS) {
            rollback(context, p, "A próbakonfiguráció 12 órán belül nem igazolt sikeres feltöltést.")
        }
    }

    /**
     * Invoked from the device-initiated orchestrator check-in.
     * A missing file is a normal state. A broken/untrusted schema is rejected.
     */
    suspend fun poll(
        context: Context,
        p: SharedPreferences,
        deviceId: String,
        owner: String?
    ): String {
        if (owner !in setOf("zsolt", "monika")) return "no-owner"
        checkTrialTimeout(context, p)
        if (!SamsungSdkDailyReader.available || !SamsungCollectorScheduler.isEnabled(context)) {
            return "collector-not-locally-enabled"
        }
        val raw = DropboxVaultClient.downloadTextOrNull(p, "$DIR/$deviceId.json")
            ?: return "no-remote-config"
        require(raw.length in 2..MAX_JSON_CHARS) { "Távoli beállításfájl mérete érvénytelen." }
        val obj = JSONObject(raw)
        require(obj.optString("schema") == SCHEMA) { "Ismeretlen konfigurációs séma." }
        require(obj.optString("deviceId") == deviceId &&
            obj.optString("profile") == owner) { "Konfiguráció másik telefonhoz vagy profilhoz tartozik." }

        val now = Instant.now()
        val issuedAt = Instant.parse(obj.getString("issuedAt"))
        val expiresAt = Instant.parse(obj.getString("expiresAt"))
        require(!issuedAt.isAfter(now.plusSeconds(300)) &&
            expiresAt.isAfter(now) &&
            expiresAt.isAfter(issuedAt) &&
            Duration.between(issuedAt, expiresAt).toDays() <= 30L) {
            "A konfiguráció lejárt, túl hosszú ideig érvényes vagy jövőbeli."
        }
        // Deliberately reject fields outside the tiny, non-privileged schema.
        val allowedKeys = setOf(
            "schema", "deviceId", "profile", "revision", "issuedAt",
            "expiresAt", "samsungSyncHours"
        )
        val keys = obj.keys()
        while (keys.hasNext()) {
            require(keys.next() in allowedKeys) { "Ismeretlen távoli konfigurációs művelet." }
        }
        val next = obj.optLong("revision", 0L)
        val hours = obj.optLong("samsungSyncHours", -1L)
        require(next > 0L && next <= 1_000_000_000L && hours in allowedHours) {
            "Érvénytelen revízió vagy Samsung-szinkron gyakoriság."
        }
        if (next <= p.getLong(KEY_SEEN, 0L)) return "already-seen"
        if (p.getBoolean(KEY_TRIAL, false)) return "previous-config-still-trial"

        // Commit BOTH the inactive config and the pointer atomically.
        val slot = if (activeSlot(p) == "a") "b" else "a"
        check(p.edit()
            .putString(slotKey(slot), obj.toString())
            .putString(KEY_ACTIVE, slot)
            .putLong(KEY_SEEN, next)
            .putBoolean(KEY_TRIAL, true)
            .putLong(KEY_TRIAL_START, System.currentTimeMillis())
            .putInt(KEY_ERRORS, 0)
            .putString(KEY_REASON, "Új időzítés próbaüzemben.")
            .commit()) { "A távoli konfiguráció mentése nem sikerült." }
        SamsungCollectorScheduler.schedule(context, forceUpdate = true)
        return "trial-revision-$next"
    }

    /** Safe, low-cardinality diagnostic reason; no remote payload or token is logged. */
    fun notePollFailure(context: Context, reason: String) {
        val code = when {
            "profil" in reason.lowercase() || "telefon" in reason.lowercase() -> "profile"
            "séma" in reason.lowercase() || "konfiguráció" in reason.lowercase() -> "schema"
            "lejárt" in reason.lowercase() || "jövőbeli" in reason.lowercase() -> "expiration"
            "revízió" in reason.lowercase() || "gyakoriság" in reason.lowercase() -> "policy"
            else -> "network-or-other"
        }
        prefs(context).edit().putString(KEY_REASON, "Távoli konfiguráció: " + code).apply()
    }

    /** Only a VERIFIED uploaded Samsung payload can mark a remote config as stable. */
    fun onVerifiedUpload(context: Context) {
        val p = prefs(context)
        if (!p.getBoolean(KEY_TRIAL, false)) return
        val current = revision(readSlot(p, activeSlot(p)))
        p.edit()
            .putBoolean(KEY_TRIAL, false)
            .putLong(KEY_LAST_ACCEPTED, current)
            .putInt(KEY_ERRORS, 0)
            .putString(KEY_REASON, "Valódi Samsung feltöltéssel igazolva.")
            .apply()
    }

    /** The first two failures are tolerated; 3 consecutive failures trigger rollback. */
    fun onCollectorFailure(context: Context) {
        val p = prefs(context)
        if (!p.getBoolean(KEY_TRIAL, false)) return
        val failures = p.getInt(KEY_ERRORS, 0) + 1
        if (failures >= 3) {
            rollback(context, p, "Három sikertelen Samsung-adatgyűjtés: automatikus visszaállás.")
        } else {
            p.edit().putInt(KEY_ERRORS, failures).apply()
        }
    }
}
