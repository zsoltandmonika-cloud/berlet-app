package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import hu.zsoltmonika.healthhubbridge.DropboxVaultClient
import hu.zsoltmonika.healthhubbridge.SyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/** Owner-approved numeric observations in the existing private family Dropbox Vault. */
internal object DigitalUsageCloudSync {
    private const val DAY = 86_400_000L
    private const val SCHEMA = "healthhub.digital-wellbeing/1"
    private const val SOURCE = "android.usage-events.observed-app-foreground"

    suspend fun sync(context: Context): Boolean {
        val p = PilotState.prefs(context)
        if (!p.getBoolean(PilotState.ENABLED, false) ||
            !p.getBoolean(PilotState.CLOUD_ENABLED, false)) return false
        val owner = PilotState.owner(context) ?: return false
        val main = context.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        if (main.getString("device_owner_profile", null) != owner) return false
        if (!DropboxVaultClient.hasRefreshToken(main)) return false
        val now = System.currentTimeMillis()
        val rows = LocalLedger.read(context, owner)
            .filter { it.hourStartMs >= now - 30L * DAY && it.hourStartMs < now }
        // No private usage history is sent before explicit user consent.
        val arr = JSONArray()
        rows.sortedBy { it.hourStartMs }.forEach { r ->
            if (r.observedForegroundMs !in 1..UsageSessionizer.HOUR_MS ||
                r.chatGptForegroundMs !in 0..r.observedForegroundMs) return false
            arr.put(JSONObject()
                .put("hourStartMs", r.hourStartMs)
                .put("observedForegroundMs", r.observedForegroundMs)
                .put("chatGptForegroundMs", r.chatGptForegroundMs)
                .put("sessionFragments", r.sessionFragments))
        }
        if (arr.length() == 0) return false
        val data = JSONObject()
            .put("schema", SCHEMA)
            .put("source", SOURCE)
            .put("profileKey", owner)
            .put("collectedAtMs", now)
            .put("retentionDays", 30)
            .put("missingIsUnknown", true)
            .put("hours", arr)
        return try {
            if (PilotState.owner(context) != owner ||
                !p.getBoolean(PilotState.CLOUD_ENABLED, false)) return false
            withContext(Dispatchers.IO) {
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(main, DropboxVaultClient.PROFILES_DIR)
                DropboxVaultClient.uploadText(main,
                    DropboxVaultClient.PROFILES_DIR + "/" + owner + "-digital-wellbeing.json",
                    data.toString(2) + "\n")
            }
            p.edit().putLong(PilotState.LAST_CLOUD_SUCCESS, now)
                .remove(PilotState.LAST_CLOUD_ERROR).apply()
            true
        } catch (e: Exception) {
            p.edit().putString(PilotState.LAST_CLOUD_ERROR, e.javaClass.simpleName).apply()
            false
        }
    }
}
