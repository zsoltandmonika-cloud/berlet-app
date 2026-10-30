package hu.zsoltmonika.healthhubbridge

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * One actual owner tap in SH9 -> fresh approved release -> SHA-256 verified APK
 * -> Android system installer. No HH Connect settings screen on the happy path.
 * The non-exported activity cannot be invoked by another app or remote commands.
 */
class OneTapOtaActivity : ComponentActivity() {
    companion object {
        const val EXTRA_FROM_SH9_TAP = "sh9_verified_ota_owner_tap_v1044"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var message: TextView
    private lateinit var retry: Button
    private lateinit var manual: Button
    private var inProgress = false

    private val permissionResult = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (OtaUpdateManager.unknownSourcesAllowed(this)) startUpdate()
        else showProblem("Az Android még nem engedélyezi a HH One frissítését. Koppints az Újrapróbálásra, vagy válaszd a kézi megoldást.")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(28, 38, 28, 38)
            setBackgroundColor(Color.rgb(7, 25, 52))
        }
        val heading = TextView(this).apply {
            text = "📦 SH9 · Frissítés"
            textSize = 24f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, 20)
        }
        layout.addView(heading)
        message = TextView(this).apply {
            text = "Az ellenőrzött frissítés előkészítése…"
            textSize = 16f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        layout.addView(message)
        retry = Button(this).apply {
            text = "↻ Újrapróbálás"
            isAllCaps = false
            minHeight = 52
            setOnClickListener { startUpdate() }
        }
        manual = Button(this).apply {
            text = "🛠 Kézi frissítés"
            isAllCaps = false
            minHeight = 52
            setOnClickListener {
                // Explicit fallback only, never implicit navigation.
                startActivity(Intent(this@OneTapOtaActivity, MainActivity::class.java)
                    .putExtra("openNativeSettings", true))
                finish()
            }
        }
        layout.addView(retry)
        layout.addView(manual)
        val cancel = Button(this).apply {
            text = "Bezárás"
            isAllCaps = false
            minHeight = 48
            setOnClickListener { finish() }
        }
        layout.addView(cancel)
        setContentView(layout)
        // Never interpret a background job, remote request or push as user consent.
        if (savedInstanceState == null && intent?.getBooleanExtra(EXTRA_FROM_SH9_TAP, false) == true) {
            startUpdate()
        } else showProblem("Frissítés indításához nyisd meg az SH9 frissítésjelzőjét.")
    }

    private fun showProblem(text: String) {
        message.text = text
        retry.isEnabled = true
        manual.isEnabled = true
    }

    private fun startUpdate() {
        if (inProgress) return
        if (!OtaUpdateManager.unknownSourcesAllowed(this)) {
            message.text = "Egyszer engedélyezd az Androidban a HH One frissítését."
            try {
                permissionResult.launch(Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:$packageName")
                ))
            } catch (_: Exception) {
                showProblem("Az Android telepítési engedélye nem nyitható meg. Válaszd a kézi frissítést.")
            }
            return
        }
        inProgress = true
        retry.isEnabled = false
        manual.isEnabled = false
        message.text = "Hitelesített frissítés keresése…"
        scope.launch {
            try {
                val candidate = OtaUpdateManager.check(this@OneTapOtaActivity)
                if (candidate == null) {
                    showProblem("A te telefonodhoz jelenleg nincs új, jóváhagyott frissítés.")
                    return@launch
                }
                message.text = "SH9 v${candidate.version} letöltése és biztonsági ellenőrzése…"
                val apk = OtaUpdateManager.downloadVerified(this@OneTapOtaActivity, candidate)
                message.text = "Az APK ellenőrzött. Hagyd jóvá a telepítést az Androidon."
                OtaUpdateManager.openSystemInstaller(this@OneTapOtaActivity, apk)
            } catch (_: Exception) {
                showProblem("A frissítés nem indult el. Próbáld újra, vagy válaszd a kézi frissítést.")
            } finally {
                inProgress = false
                retry.isEnabled = true
                manual.isEnabled = true
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
