package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import org.json.JSONObject

/**
 * Explicitly owner-approved administration of this app's OWN native services.
 * No shell, remote code execution, screen access, permission granting, or APK install.
 * Each supported setting has a fixed, validated allowlist.
 */
internal object OneRemoteAdmin {
    const val KEY_CONSENT = "hh_one_remote_admin_consent_v1041"
    const val KEY_LAST_ACTION = "hh_one_remote_admin_last_action_v1041"
    const val KEY_LAST_ACTION_AT = "hh_one_remote_admin_last_action_at_v1041"

    fun consent(prefs: SharedPreferences): Boolean = prefs.getBoolean(KEY_CONSENT, false)

    fun revoke(prefs: SharedPreferences) {
        prefs.edit().putBoolean(KEY_CONSENT, false).apply()
    }

    fun network(context: Context): JSONObject {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val capabilities = runCatching {
            manager?.getNetworkCapabilities(manager.activeNetwork)
        }.getOrNull()
        val kind = when {
            capabilities == null -> "unknown"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "mobile"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }
        val validated = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        return JSONObject().put("transport", kind)
            .put("internetValidated", validated ?: JSONObject.NULL)
    }

    /** Battery is never uploaded unless the owner separately opted into family battery sharing. */
    fun battery(context: Context): Any {
        if (!FamilyGuardNativeRelay.batteryEnabled(context)) return JSONObject.NULL
        val data = runCatching {
            context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        }.getOrNull() ?: return JSONObject.NULL
        val level = data.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = data.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        return if (level in 0..100 && scale > 0 && level <= scale)
            ((level * 100) / scale).coerceIn(0, 100)
        else JSONObject.NULL
    }

    /** Exhaustive administrative settings: no arbitrary parameter maps or script execution. */
    fun configure(context: Context, prefs: SharedPreferences, options: JSONObject?): String {
        require(consent(prefs)) { "A Remote Admin nincs engedélyezve." }
        require(options != null) { "Hiányzó konfiguráció." }
        val keys = options.keys().asSequence().toList()
        require(keys.size == 1 && keys[0] == "gpsIntervalSeconds") {
            "Csak a jóváhagyott GPS-intervallum módosítható."
        }
        val seconds = options.optInt("gpsIntervalSeconds", -1)
        require(options.opt("gpsIntervalSeconds") is Int && seconds in setOf(15, 30, 60)) {
            "GPS intervallum: csak 15, 30 vagy 60 másodperc."
        }
        Sh9GpsService.setInterval(context, seconds)
        // A running, previously approved foreground GPS service may reconfigure itself.
        if (Sh9GpsService.active && FamilyGuardContinuity.canRestart(context)) {
            Sh9GpsService.reconfigureActive()
        }
        record(prefs, "gps-config")
        return "GPS intervallum helyben alkalmazva: $seconds mp; az új mérések tényleges beérkezése külön ellenőrzendő."
    }

    fun repairGps(context: Context, prefs: SharedPreferences): String {
        require(consent(prefs)) { "A Remote Admin nincs engedélyezve." }
        val result = when {
            !FamilyGuardContinuity.canRestart(context) ->
                "blocked-no-prior-consent-or-android-permission"
            Sh9GpsService.active -> Sh9GpsService.recoverActive()
            else -> FamilyGuardContinuity.restartApprovedGps(context)
        }
        record(prefs, "gps-repair:$result")
        // start-requested / repair-queued are NOT verified fresh fixes.
        return result
    }

    fun reconcileJobs(context: Context, prefs: SharedPreferences): String {
        require(consent(prefs)) { "A Remote Admin nincs engedélyezve." }
        FamilyGuardContinuity.restoreJobs(context)
        record(prefs, "jobs-reconcile")
        return "Reconcile ütemezve. A következő tényleges futást külön kell ellenőrizni."
    }

    private fun record(prefs: SharedPreferences, code: String) {
        prefs.edit().putString(KEY_LAST_ACTION, code.take(90))
            .putLong(KEY_LAST_ACTION_AT, System.currentTimeMillis()).apply()
    }
}
