package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * SH9 Browser V2: standards-compliant in-app Custom Tab, not a second WebView.
 *
 * The installed browser owns its authentication/cookie/IndexedDB/PDF storage;
 * native HH One owns GPS, device owner, Health Connect and signed OTA settings.
 * No coordinates or credentials are appended to navigation URLs.
 *
 * In-app Custom Tabs are browser-provider UI. A verified full-screen TWA is NOT
 * available on a github.io project subpath without an origin-level asset link.
 */
object Sh9BrowserHost {
    const val MODE_PREF = "hh_one_browser_mode_v2"
    const val MODE_CUSTOM_TABS = "tabs"
    const val MODE_LEGACY_WEBVIEW = "legacy"

    private const val BASE = "https://zsoltandmonika-cloud.github.io/berlet-app/"
    private val HOME = Uri.parse(BASE + "sh9/")

    fun mode(activity: Activity): String =
        activity.getSharedPreferences(SyncScheduler.PREFS, Activity.MODE_PRIVATE)
            .getString(MODE_PREF, MODE_CUSTOM_TABS)
            ?.takeIf { it == MODE_CUSTOM_TABS || it == MODE_LEGACY_WEBVIEW }
            ?: MODE_CUSTOM_TABS

    fun setMode(activity: Activity, mode: String) {
        require(mode == MODE_CUSTOM_TABS || mode == MODE_LEGACY_WEBVIEW)
        activity.getSharedPreferences(SyncScheduler.PREFS, Activity.MODE_PRIVATE)
            .edit().putString(MODE_PREF, mode).apply()
    }

    fun launch(activity: Activity, path: String = "sh9/"): Boolean {
        // Never expose arbitrary URL launching or allow remote navigation input.
        if (path !in setOf("sh9/", "healthhub/", "healthhub/guardian/")) return false
        val uri = if (path == "sh9/") HOME else Uri.parse(BASE + path)
        return try {
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .build()
                .launchUrl(activity, uri)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: SecurityException) {
            false
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    fun launchLegacy(activity: Activity) {
        activity.startActivity(Intent(activity, Sh9WebActivity::class.java))
    }
}
