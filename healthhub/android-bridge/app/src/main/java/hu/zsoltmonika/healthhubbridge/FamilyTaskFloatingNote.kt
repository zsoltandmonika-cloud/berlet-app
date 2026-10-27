package hu.zsoltmonika.healthhubbridge

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

/**
 * HH One · Family Tasks Floating Sticky Note · native opt-in renderer pilot.
 *
 * Identical CSS is embedded from family-notifier-v880.css (v908) and the approved
 * Buddy webp is loaded only when a note is shown (WebView HTTP cache).
 * No timer, polling, GPS, Supabase connection, extra background process or FGS.
 *
 * Trigger is deliberately local and explicit until authenticated FCM event
 * delivery is configured. Do NOT claim background push is already deployed.
 */
object FamilyTaskFloatingNote {
    private const val PREFS = "hh_family_tasks_floating_v1"
    private const val KEY_ENABLED = "consent"
    private const val HOME = "https://zsoltandmonika-cloud.github.io/berlet-app/sh9/family-hub/"
    private const val BUDDY = "https://zsoltandmonika-cloud.github.io/berlet-app/sh9/family-hub/assets/family-success-buddy-v881.webp"
    private var active: WebView? = null
    private var wm: WindowManager? = null

    fun enabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

    fun permitted(context: Context): Boolean =
        Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(context)

    fun setEnabled(context: Context, value: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ENABLED, value).apply()
        if (!value) dismiss()
    }

    fun permissionIntent(context: Context): Intent =
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}"))

    private fun dp(context: Context, n: Int): Int =
        (context.resources.displayMetrics.density * n + .5f).toInt()

    private fun esc(value: String): String =
        TextUtils.htmlEncode(value.take(600))

    /** Caller may supply a validated task UUID from a future authenticated FCM event. */
    fun show(
        context: Context,
        title: String,
        actor: String,
        details: String,
        timestamp: String,
        taskId: String? = null,
        playSound: Boolean = true
    ): Boolean {
        if (!enabled(context) || !permitted(context)) return false
        val app = context.applicationContext
        dismiss()
        val safeId = taskId?.takeIf {
            Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
                .matches(it)
        }
        val safeTitle = esc(title)
        val safeActor = esc(actor)
        val safeDetails = esc(details)
        val safeTimestamp = esc(timestamp)
        val page = """
          <!doctype html><html lang="hu"><head>
          <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
          <style>
          html,body{margin:0;padding:0;background:transparent;overflow:hidden;font-family:system-ui}
          *,*::before,*::after{box-sizing:border-box}
          .fh-notice-anchor{position:fixed;z-index:2147483000;top:calc(env(safe-area-inset-top,0px) + 9px);left:9px;max-width:calc(100vw - 18px);pointer-events:none}
.fh-notice{position:relative;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;width:min(264px,75vw);min-height:225px;padding:18px 15px 15px;pointer-events:auto;cursor:pointer;border:1px solid #d9ad4c;border-radius:3px 3px 12px 6px;color:#4c3315;background:linear-gradient(130deg,#fff9c9 0%,#fff0a1 55%,#ebd272 100%);box-shadow:3px 8px 2px #d2b55422,0 14px 35px #0008;transform:rotate(-1.5deg);animation:fh-drop .32s ease-out;font-family:"Segoe Print","Comic Sans MS",cursive}
.fh-notice:before{position:absolute;content:"";left:0;right:0;top:0;height:21px;background:linear-gradient(180deg,#fff9ea72,transparent);pointer-events:none}
.fh-notice .fh-note-top{display:flex;align-items:center;justify-content:space-between;gap:3px}
.fh-notice .fh-note-top strong{font-size:15px}
.fh-notice h3{font:750 16px/1.25 "Segoe Print","Comic Sans MS",cursive;margin:6px 0 1px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.fh-notice p{font-size:12px;line-height:1.32;margin:2px 0;overflow-wrap:anywhere}
.fh-notice .fh-note-link{margin-top:auto;font-weight:800;font-size:12px;color:#765118}
.fh-notice-close{border:0;background:#fff2a6;color:#715221;font:900 19px/1 system-ui;padding:6px 9px;border-radius:50%;cursor:pointer}
.fh-notice:focus-visible,.fh-notice-close:focus-visible,.fh-badge:focus-visible{outline:3px solid #73c9ff;outline-offset:4px}
.fh-badge{position:fixed;z-index:899;top:calc(env(safe-area-inset-top,0px) + 12px);right:13px;display:flex;align-items:center;gap:6px;border:1px solid #edcc7999;border-radius:999px;padding:7px 10px;color:#fff8e3;background:linear-gradient(145deg,#12345b,#281c3c);box-shadow:0 3px 12px #0009;font:800 13px/1 system-ui;cursor:pointer}
.hero .fh-badge,.guardian-hero .fh-badge{position:absolute;top:8px;right:8px;z-index:8}
.fh-badge .fh-badge-count{min-width:18px;text-align:center;border-radius:999px;background:#efbd62;color:#142038;padding:3px 5px;font-size:11px}
@keyframes fh-drop{from{opacity:0;transform:translateY(-110%) rotate(-4deg)}to{opacity:1;transform:translateY(0) rotate(-1.5deg)}}
@media(prefers-reduced-motion:reduce){.fh-notice{animation:none}}


.fh-notice .fh-note-buddy{
 display:block;align-self:center;
 width:86px;height:86px;object-fit:contain;
 margin:0 auto -2px;
 filter:drop-shadow(0 3px 5px rgba(101,62,18,.26));
}
.fh-notice .fh-note-buddy[hidden]{display:none}


.fh-notice-anchor{top:calc(env(safe-area-inset-top,0px) + 42px);left:8px;max-height:calc(100dvh - 54px);overflow-y:auto}
.fh-notice{box-sizing:border-box;width:min(292px,83vw);min-height:220px;max-height:calc(100dvh - 70px);overflow-y:auto;cursor:default;gap:8px;padding:13px 12px 15px}
.fh-notice .fh-note-top strong{font-size:17px}
.fh-notice h3{font-size:19px;line-height:1.23;margin:4px 0}
.fh-notice .fh-notice-action{font:700 13px/1.35 system-ui;margin:0}
.fh-notice .fh-notice-meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:3px;font:650 12px/1.35 system-ui;color:#62410f}
.fh-notice .fh-notice-details{font:600 12px/1.4 system-ui;margin:0;color:#604318}
.fh-notice .fh-notice-custom{font:600 12px/1.4 system-ui;white-space:pre-wrap}
.fh-notice .fh-note-buddy{width:72px;height:72px}
.fh-notice .fh-note-edit{margin-left:auto}
.fh-notice .fh-note-edit,.fh-notice .fh-notice-close{min-width:36px;min-height:36px;display:grid;place-items:center;border:1px solid #d5ab4b;border-radius:9px;background:#fff2ad;color:#684314;font:750 19px/1 system-ui}
.fh-notice-editor[hidden]{display:none!important}
.fh-notice-editor{display:grid;gap:5px}
.fh-notice-editor textarea{box-sizing:border-box;width:100%;border:1px solid #caa552;border-radius:8px;padding:7px;background:#fffde5;color:#4d3210;font:13px/1.3 system-ui}
.fh-notice .fh-notice-note-save{min-height:36px;border:1px solid #b58c3a;border-radius:8px;background:#f4db87;color:#54320e;font:750 13px/1 system-ui}
.fh-notice .fh-note-link{border:0;background:transparent;text-align:left;min-height:35px;padding:6px 0;cursor:pointer;font:800 12px/1.2 system-ui;color:#765118}


.fh-notice .fh-note-sync-status{display:block;font:700 11px/1.35 system-ui;color:#596e3a;overflow-wrap:anywhere}
.fh-notice .fh-note-sync-status:empty{display:none}
.fh-notice .fh-notice-note-save:disabled{opacity:.6;cursor:progress}
.fh-notice .fh-notice-custom:empty{display:none}
          .fh-notice-anchor{position:static!important;left:auto!important;top:auto!important;
            max-height:none!important;overflow:visible!important;width:100%!important}
          .fh-notice{width:calc(100% - 10px)!important;max-height:345px!important;
            min-height:210px!important;margin:6px 5px 12px!important;animation:none!important}
          .fh-note-edit,.fh-notice-close{display:grid;place-items:center;text-decoration:none;
            min-width:36px;min-height:36px}
          .fh-note-link{display:block;text-decoration:none;min-height:35px;cursor:pointer}
          </style></head><body>
          <div class="fh-notice-anchor"><article class="fh-notice" aria-label="Buddy Family Tasks">
          <div class="fh-note-top"><strong>Buddy üzenete</strong>
            <a class="fh-note-edit" href="hhsticky://open" aria-label="Szerkesztés">✎</a>
            <a class="fh-notice-close" href="hhsticky://close" aria-label="Láttamozás">×</a>
          </div>
          <img class="fh-note-buddy" src="$BUDDY" alt="Buddy mókus" />
          <h3>$safeTitle</h3><p class="fh-notice-action">Új Family Tasks értesítés</p>
          <div class="fh-notice-meta"><span>Feladó: $safeActor</span><time>$safeTimestamp</time></div>
          <p class="fh-notice-details">$safeDetails</p>
          <small class="fh-note-sync-status">☁ Közös Family Tasks</small>
          <a class="fh-note-link" href="hhsticky://open">Feladat megnyitása ›</a>
          </article></div></body></html>
        """.trimIndent()
        val web = WebView(app)
        web.setBackgroundColor(Color.TRANSPARENT)
        web.settings.javaScriptEnabled = false
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.domStorageEnabled = false
        web.settings.setSupportZoom(false)
        web.settings.loadsImagesAutomatically = true
        web.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                when (request.url.scheme) {
                    "hhsticky" -> when (request.url.host) {
                        "close" -> dismiss()
                        "open" -> {
                            dismiss()
                            val path = if (safeId != null) "?task=$safeId" else ""
                            val intent = Intent(app, Sh9WebActivity::class.java).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                                data = Uri.parse(HOME + path)
                            }
                            app.startActivity(intent)
                        }
                    }
                }
                return true  // No other outbound navigation allowed in a floating overlay.
            }
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (request.url.toString() == BUDDY) return null
                if (request.isForMainFrame) return null
                return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
            }
        }
        val manager = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val params = WindowManager.LayoutParams(
            dp(app, 300),
            dp(app, 375),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            android.graphics.PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(app, 3)
            y = dp(app, 36)
        }
        return try {
            manager.addView(web, params)
            wm = manager
            active = web
            web.loadDataWithBaseURL(HOME, page, "text/html", "UTF-8", null)
            if (playSound) chime(app)
            true
        } catch (_: SecurityException) {
            web.destroy()
            false
        } catch (_: WindowManager.BadTokenException) {
            web.destroy()
            false
        } catch (_: IllegalStateException) {
            web.destroy()
            false
        }
    }

    fun dismiss() {
        val view = active ?: return
        active = null
        try { wm?.removeViewImmediate(view) } catch (_: Exception) { }
        wm = null
        try { view.stopLoading(); view.destroy() } catch (_: Exception) { }
    }

    // The original v907 two-note sine ping:
    // 784Hz @ 0 ms + 1046Hz @ 85ms, 15ms attack and 160ms fade,
    // each peaking at 0.035, played once only for a new event.
    private fun chime(context: Context) {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) return
        thread(name = "hh-one-sticky-chime", isDaemon = true) {
            try {
                val rate = 44100
                val count = (rate * .30).toInt()
                val samples = ByteArray(count * 2)
                for (i in 0 until count) {
                    val t = i.toDouble() / rate
                    var amp = 0.0
                    for ((frequency, start) in listOf(784.0 to 0.0, 1046.0 to .085)) {
                        val dt = t - start
                        if (dt < 0.0 || dt >= .17) continue
                        val env = if (dt < .015) dt / .015 else exp(-(dt - .015) * 39.0)
                        amp += sin(2.0 * PI * frequency * dt) * .035 * env
                    }
                    val sample = (amp.coerceIn(-1.0, 1.0) * Short.MAX_VALUE).toInt()
                    samples[i * 2] = sample.toByte()
                    samples[i * 2 + 1] = (sample shr 8).toByte()
                }
                val buffer = maxOf(samples.size, AudioTrack.getMinBufferSize(
                    rate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT))
                val track = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setBufferSizeInBytes(buffer)
                    .setTransferMode(AudioTrack.MODE_STATIC).build()
                try {
                    track.write(samples, 0, samples.size)
                    track.play()
                    Thread.sleep(350)  // Finite playback, no recurring timer.
                } finally { track.stop(); track.release() }
            } catch (_: Exception) { /* Silent mode or unavailable audio never blocks UI. */ }
        }
    }
}
