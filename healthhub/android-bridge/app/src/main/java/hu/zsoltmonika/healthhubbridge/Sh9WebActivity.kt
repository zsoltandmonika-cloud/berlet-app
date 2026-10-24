package hu.zsoltmonika.healthhubbridge

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

/**
 * The same HH One signed APK now offers the SH9 launcher as a live web surface.
 *
 * Navigation stays within the GitHub Pages project. Other sites (including
 * Microsoft sign-in and Outlook) open in the user's regular browser, which
 * owns its own authorization session. No JS-native privilege bridge is exposed.
 *
 * Native Health Connect + OTA + opt-in GPS controls remain in MainActivity,
 * reached using Android Back. SH9's visual design is served unchanged.
 */
class Sh9WebActivity : ComponentActivity() {
    companion object {
        private const val HOME =
            "https://zsoltandmonika-cloud.github.io/berlet-app/sh9/?sh9native=1"
        private const val HOST = "zsoltandmonika-cloud.github.io"
        private const val BASE = "/berlet-app/"
    }

    private var web: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 28) {
            val p = window.attributes
            p.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            window.attributes = p
        }
        hideBars()
        val view = WebView(this)
        view.setBackgroundColor(Color.rgb(11, 20, 37))
        view.isVerticalScrollBarEnabled = false
        view.isHorizontalScrollBarEnabled = false
        view.overScrollMode = View.OVER_SCROLL_NEVER
        view.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            textZoom = 100
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        view.webChromeClient = WebChromeClient()
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                if (u.scheme == "https" && u.host == HOST && u.path?.startsWith(BASE) == true) return false
                if (request.isForMainFrame && u.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, u)) }
                    catch (_: ActivityNotFoundException) { }
                }
                // Reject unknown schemes, external http and local file URLs in our WebView.
                return true
            }
        }
        web = view
        setContentView(view)
        if (savedInstanceState == null) view.loadUrl(HOME)
        else view.restoreState(savedInstanceState)
    }

    private fun hideBars() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.apply {
                hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideBars()
    }

    @Deprecated("Use Android back callback once fully migrated")
    override fun onBackPressed() {
        val page = web
        if (page?.canGoBack() == true) page.goBack()
        else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        web?.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        web?.let {
            it.stopLoading()
            it.destroy()
        }
        web = null
        super.onDestroy()
    }
}
