package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.net.Uri
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.text.DateFormat
import java.util.Date

/**
 * Separate opt-in UI: no GPS permission request when HH One launches, no
 * remote control, no automatic location sharing, no user profile guessing.
 */
class GuardianSettingsActivity : ComponentActivity() {
    private lateinit var state: TextView
    private lateinit var lastFix: TextView
    private lateinit var start: Button
    private lateinit var stop: Button

    private val permissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val allowed = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (allowed) confirmAndStart()
        else {
            state.text = "A GPS-hozzáférést nem engedélyezted. Nincs helyzetkövetés."
            render()
        }
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false) =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setPadding(6, 9, 6, 9)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scroll = ScrollView(this).apply { setBackgroundColor(0xFF091629.toInt()) }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(27, 33, 27, 25)
        }
        scroll.addView(root)
        root.addView(text("HEALTHHUB · FAMILY GUARD", 12f, 0xFF8ED3FF.toInt(), true))
        root.addView(text("A család biztonságáért", 23f, 0xFFEDF8FF.toInt(), true))
        root.addView(text(
            "A követés csak a te külön jóváhagyásoddal indul. A háttérben futó Android GPS-szolgáltatás " +
                "képernyőzár mellett is gyűjthet helyadatot, és értesítésből azonnal leállítható.",
            14f, 0xFFC6DCEE.toInt()
        ))
        state = text("GPS kikapcsolva", 15f, 0xFF92DAFF.toInt(), true)
        root.addView(state)
        lastFix = text("Nincs helyadat", 13f, 0xFFC5D9EC.toInt())
        root.addView(lastFix)
        root.addView(text(
            "ELSŐ KIADÁS · a legutóbbi GPS-pontot titkosítva, csak ezen a telefonon őrizzük. " +
                "A családi felhőmegosztás és a teljes 24/7 helyreállítás még nincs bekötve. " +
                "Az Android energiatakarékossága megszakíthatja a szolgáltatást.",
            12f, 0xFFB3C7DB.toInt()
        ))
        start = Button(this).apply {
            text = "📍 GPS-követés indítása"
            setOnClickListener { begin() }
        }
        root.addView(start)
        stop = Button(this).apply {
            text = "■ Leállítás és helyadat törlése"
            setOnClickListener {
                GuardianLocationService.stop(this@GuardianSettingsActivity)
                render()
            }
        }
        root.addView(stop)
        root.addView(Button(this).apply {
            text = "Android helyhozzáférési beállítások"
            setOnClickListener {
                startActivity(Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName")
                ))
            }
        })
        root.addView(Button(this).apply {
            text = "← Vissza a HH One-ba"
            setOnClickListener { finish() }
        })
        setContentView(scroll)
        render()
    }

    private fun hasLocation(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun begin() {
        val owner = GuardianLocationVault.owner(this)
        if (owner == null) {
            state.text = "Előbb rendeld hozzá a készüléket Zsolt vagy Mónika profiljához a HH One-ban."
            return
        }
        if (!hasLocation()) {
            permissions.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            return
        }
        confirmAndStart()
    }

    private fun confirmAndStart() {
        val profile = GuardianLocationVault.owner(this) ?: return
        val display = if (profile == "monika") "Mónika" else "Zsolt"
        AlertDialog.Builder(this)
            .setTitle("Family Guard GPS · $display")
            .setMessage(
                "Engedélyezed, hogy a HH One a telefonod helyzetét a háttérben, lezárt képernyő " +
                    "mellett is mérje? Az Android értesítést mutat, ott bármikor leállíthatod. " +
                    "Az adatok ebben a fejlesztési lépésben nem kerülnek felhőbe."
            )
            .setNegativeButton("Mégsem", null)
            .setPositiveButton("GPS bekapcsolása") { _, _ ->
                try {
                    GuardianLocationVault.markStarted(this)
                    val intent = Intent(this, GuardianLocationService::class.java)
                        .setAction(GuardianLocationService.ACTION_START)
                    if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent)
                    else startService(intent)
                    state.text = "GPS-követés indítása kérve. A tényleges méréshez GPS-jel szükséges."
                } catch (error: Exception) {
                    GuardianLocationService.stop(this)
                    state.text = "Nem indult el a szolgáltatás: ellenőrizd a helyengedélyeket és a beállításokat."
                }
                render()
            }.show()
    }

    private fun render() {
        val owner = GuardianLocationVault.owner(this)
        val consented = GuardianLocationVault.consented(this)
        val display = when (owner) {
            "zsolt" -> "Zsolt"
            "monika" -> "Mónika"
            else -> "Nincs hozzárendelt tulajdonos"
        }
        state.text = "Profil: $display · " +
            if (consented) "GPS engedélyezve, Android-állapot ellenőrizendő"
            else "GPS kikapcsolva"
        val fix = GuardianLocationVault.readFix(this)
        val at = fix?.optLong("atMs", 0L) ?: 0L
        val accuracy = fix?.optDouble("accuracyM", -1.0) ?: -1.0
        lastFix.text = if (at > 0 && accuracy >= 0.0) {
            "Utolsó mért pont: " + DateFormat.getDateTimeInstance().format(Date(at)) +
                " · pontosság: " + accuracy.toInt() + " m"
        } else "Nincs érvényes, ehhez a profilhoz kötött GPS-mérés."
        start.isEnabled = owner != null && !consented
        stop.isEnabled = consented || at > 0L
    }

    override fun onResume() {
        super.onResume()
        if (::state.isInitialized) render()
    }
}
