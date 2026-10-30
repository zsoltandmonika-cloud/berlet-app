package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.Activity
import android.content.ClipData
import android.content.pm.PackageManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.MediaStore
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

    // Only allow the native Floating Buddy "open task" intent to reach a
    // first-party task URL; never arbitrary external pages or JS bridges.
    private fun floatingTaskUrl(uri: Uri?): String? {
        if (uri?.scheme != "https" || uri.host != HOST ||
            uri.path != "/berlet-app/sh9/family-hub/") return null
        val id = uri.getQueryParameter("task")
        val valid = id != null && Regex(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        ).matches(id)
        return "https://$HOST/berlet-app/sh9/family-hub/" +
            (if (valid) "?task=$id" else "")
    }

    private var web: WebView? = null
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingVideoRequest: PermissionRequest? = null
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingFileParams: WebChromeClient.FileChooserParams? = null
    private var pendingCaptureUri: Uri? = null
    private var pendingCaptureFile: File? = null

    private fun trustedPage(url: Uri?): Boolean =
        url?.scheme == "https" && url.host == HOST && url.path?.startsWith(BASE) == true

    // The HTML Food Scanner uses getUserMedia, NOT an Android native camera
    // button. Grant ONLY the requested video resource to the approved origin.
    private val cameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val request = pendingVideoRequest
        pendingVideoRequest = null
        if (request != null) {
            if (granted && trustedPage(Uri.parse(web?.url ?: "")) &&
                request.origin.scheme == "https" && request.origin.host == HOST &&
                request.resources.contentEquals(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))) {
                request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
            } else request.deny()
        }
    }

    private val capturePermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (pendingFileCallback == null) return@registerForActivityResult
        if (granted) launchPhotoCapture() else finishFileRequest(null)
    }

    private val fileResult = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val captured = pendingCaptureUri
        val captureFile = pendingCaptureFile
        val uris = if (result.resultCode != Activity.RESULT_OK) null
          else if (captured != null) {
            if (captureFile?.isFile == true && captureFile.length() > 0L) arrayOf(captured) else null
          } else {
            val selected = mutableListOf<Uri>()
            result.data?.data?.let { selected.add(it) }
            val clips = result.data?.clipData
            if (clips != null) for (i in 0 until minOf(clips.itemCount, 16))
                clips.getItemAt(i).uri?.let { selected.add(it) }
            // Never pass file:// or the app's own OTA FileProvider to an
            // uploaded web document. Only explicitly user-selected content Uris.
            selected.distinct().filter { it.scheme == "content" &&
                it.authority != packageName + ".ota" }.take(16).toTypedArray()
                .takeIf { it.isNotEmpty() }
          }
        finishFileRequest(uris)
    }

    private fun finishFileRequest(uris: Array<Uri>?) {
        val callback = pendingFileCallback
        val file = pendingCaptureFile
        pendingFileCallback = null
        pendingFileParams = null
        pendingCaptureUri = null
        pendingCaptureFile = null
        if (uris == null) file?.delete()
        callback?.onReceiveValue(uris)
    }

    private fun launchPicker(params: WebChromeClient.FileChooserParams) {
        try {
            pendingCaptureUri = null
            pendingCaptureFile = null
            fileResult.launch(params.createIntent().apply {
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            })
        } catch (_: ActivityNotFoundException) {
            finishFileRequest(null)
        } catch (_: SecurityException) {
            finishFileRequest(null)
        }
    }

    private fun launchPhotoCapture() {
        if (pendingFileCallback == null) return
        val params = pendingFileParams ?: return finishFileRequest(null)
        try {
            val dir = File(cacheDir, "web-camera").also { it.mkdirs() }
            val photoFile = File.createTempFile("hh-photo-", ".jpg", dir)
            val uri = FileProvider.getUriForFile(this, packageName + ".ota", photoFile)
            pendingCaptureUri = uri
            pendingCaptureFile = photoFile
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                clipData = ClipData.newRawUri("HH One camera", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
            fileResult.launch(intent)
        } catch (_: ActivityNotFoundException) {
            pendingCaptureFile?.delete()
            launchPicker(params) // Gallery/document picker remains usable.
        } catch (_: SecurityException) {
            finishFileRequest(null)
        } catch (_: IllegalArgumentException) {
            finishFileRequest(null)
        }
    }

    private fun showFileChooser(
        view: WebView?, callback: ValueCallback<Array<Uri>>?,
        params: WebChromeClient.FileChooserParams?
    ): Boolean {
        if (callback == null) return false
        if (!trustedPage(Uri.parse(view?.url ?: "")) || params == null) {
            callback.onReceiveValue(null)
            return true
        }
        // A second picker cancels the first, rather than leaking callbacks.
        finishFileRequest(null)
        pendingFileCallback = callback
        pendingFileParams = params
        val photoCapture = params.isCaptureEnabled &&
            params.acceptTypes.any { it.startsWith("image/") }
        if (photoCapture) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED) launchPhotoCapture()
            else capturePermission.launch(Manifest.permission.CAMERA)
        } else launchPicker(params)
        return true
    }

    private fun onVideoPermissionRequested(request: PermissionRequest) {
        if (!trustedPage(Uri.parse(web?.url ?: "")) ||
            request.origin.scheme != "https" || request.origin.host != HOST ||
            !request.resources.contentEquals(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) ||
            pendingVideoRequest != null) {
            request.deny()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED) {
            request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
        } else {
            pendingVideoRequest = request
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private val geoPermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val origin = pendingGeoOrigin
        val callback = pendingGeoCallback
        pendingGeoOrigin = null
        pendingGeoCallback = null
        if (origin != null && callback != null) {
            callback.invoke(origin, permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true, false)
        }
    }

    private fun onGeoPermissionRequested(origin: String?, callback: GeolocationPermissions.Callback?) {
        if (origin == null || callback == null) return
        // Only the trusted SH9 first-party origin may ask the native shell for position.
        if (origin != "https://" + HOST) {
            callback.invoke(origin, false, false)
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED) {
            callback.invoke(origin, true, false)
            return
        }
        // Reject concurrent permission prompts instead of swapping callbacks.
        if (pendingGeoCallback != null) {
            callback.invoke(origin, false, false)
            return
        }
        pendingGeoOrigin = origin
        pendingGeoCallback = callback
        geoPermissions.launch(arrayOf(
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_FINE_LOCATION
        ))
    }

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
            // Load the published SH9/HealthHub pages, not a frozen v23 APK
            // snapshot. Avoid stale JS/CSS after central web deployments.
            cacheMode = WebSettings.LOAD_NO_CACHE
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?, callback: GeolocationPermissions.Callback?
            ) {
                onGeoPermissionRequested(origin, callback)
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                onVideoPermissionRequested(request)
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (pendingVideoRequest === request) pendingVideoRequest = null
            }

            override fun onShowFileChooser(
                webView: WebView?, filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean = showFileChooser(webView, filePathCallback, fileChooserParams)
        }
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                // Only a main-frame navigation from our first-party pages can request
                // the native settings screen. The SH9 WebView itself NEVER reopens.
                // REORDER_TO_FRONT resumes the existing HH One settings activity,
                // avoiding a stack of duplicate apps or an SH9 startup loop.
                val source = Uri.parse(view.url ?: "")
                if (request.isForMainFrame && u.scheme == "healthhubconnect" &&
                    u.host == "settings" &&
                    source.scheme == "https" && source.host == HOST &&
                    source.path?.startsWith(BASE) == true) {
                    val settings = Intent(this@Sh9WebActivity, MainActivity::class.java)
                        .putExtra("openNativeSettings", true)
                        // Preserve only our first-party, explicit OTA check/install request.
                        // MainActivity revalidates the signed release and asks Android consent.
                        .apply {
                            if (u.getQueryParameter("ota") in setOf("install", "check")) data = u
                        }
                        .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    startActivity(settings)
                    finish()
                    return true
                }
                if (u.scheme == "https" && u.host == HOST && u.path?.startsWith(BASE) == true) {
                    // Calendar requires a browser-owned Microsoft OAuth session.
                    // Open the SAME SH9 Agenda in the system browser, not a disconnected WebView.
                    if (request.isForMainFrame &&
                        u.path == "/berlet-app/sh9/" &&
                        u.getQueryParameter("sh9external") == "calendar") {
                        val browserAgenda = u.buildUpon().clearQuery()
                            .appendQueryParameter("sh9calendar", "1").build()
                        try { startActivity(Intent(Intent.ACTION_VIEW, browserAgenda)) }
                        catch (_: ActivityNotFoundException) { }
                        return true
                    }
                    return false
                }
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
        // Timestamp affects only the public SH9 entry document. Relative
        // module routes remain the same first-party GitHub Pages paths.
        if (savedInstanceState == null) {
            // Only display metadata, never an authorization token or admin capability.
            // The SH9 status light compares this installed version to the signed OTA
            // manifest; Android still independently verifies every installation.
            val profile = getSharedPreferences(SyncScheduler.PREFS, MODE_PRIVATE)
                .getString("device_owner_profile", null)
                ?.takeIf { it == "zsolt" || it == "monika" }
            val prefs = getSharedPreferences(SyncScheduler.PREFS, MODE_PRIVATE)
            val current = System.currentTimeMillis()
            val expectingGps = FamilyGuardContinuity.enabled(this) &&
                FamilyGuardNativeRelay.enabled(this)
            // This is a momentary, read-only assessment of THIS installed app.
            // Do not expose coordinates, tokens or health records to the web page.
            val gpsPrefs = getSharedPreferences(Sh9GpsService.PREFS, MODE_PRIVATE)
            val lastFix = gpsPrefs.getLong(Sh9GpsService.KEY_LAST_FIX_AT, 0L)
            val lastUpload = prefs.getLong(FamilyGuardNativeRelay.KEY_LAST_UPLOAD, 0L)
            val uploadError = prefs.getString(FamilyGuardNativeRelay.KEY_RESULT, "") ?: ""
            val networkValidated = OneRemoteAdmin.network(this).opt("internetValidated")
            fun stale(stamp: Long): Boolean = stamp > 0 &&
                (stamp > current + 5_000L || current - stamp > 6 * 60_000L)
            val nativeHealth = when {
                profile == null -> "unknown"
                networkValidated == false -> "warning"
                !expectingGps -> "ok"
                !FamilyGuardContinuity.hasBackgroundLocation(this) -> "warning"
                !Sh9GpsService.active -> "warning"
                uploadError.startsWith("network-error:") -> "warning"
                stale(lastFix) || stale(lastUpload) -> "warning"
                lastFix == 0L || lastUpload == 0L -> "unknown"
                else -> "ok"
            }
            val launcher = Uri.parse(HOME).buildUpon()
                .appendQueryParameter("hhBuildCode", BuildConfig.VERSION_CODE.toString())
                .appendQueryParameter("hhOwner", profile ?: "")
                .appendQueryParameter("hhServiceHealth", nativeHealth)
                .appendQueryParameter("hhServiceSeenAt", current.toString())
                .appendQueryParameter("hhfresh", current.toString())
                .build().toString()
            view.loadUrl(floatingTaskUrl(intent?.data) ?: launcher)
        } else view.restoreState(savedInstanceState)
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
        pendingGeoOrigin?.let { pendingGeoCallback?.invoke(it, false, false) }
        pendingGeoOrigin = null
        pendingGeoCallback = null
        pendingVideoRequest?.deny()
        pendingVideoRequest = null
        finishFileRequest(null)
        web = null
        super.onDestroy()
    }
}
