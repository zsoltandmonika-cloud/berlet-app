package hu.zsoltmonika.watchpilot

import android.app.Activity
import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.DateFormat
import java.util.Date

/**
 * Standalone family Watch9-first pilot. It CANNOT edit HH One or SH9 preferences.
 * Receiver stays disarmed by default. Each phone owner must manually opt in.
 */
class PhonePilotActivity : Activity() {
    private lateinit var display: TextView
    private val prefs by lazy { getSharedPreferences(WatchPilotReceiver.PREFS, MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val page = ScrollView(this).apply { setBackgroundColor(Color.rgb(14, 22, 39)) }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(30, 42, 30, 40)
        }
        page.addView(column)
        fun caption(value: String, size: Float = 16f): TextView =
            TextView(this).apply {
                text = value
                textSize = size
                setTextColor(Color.rgb(234, 241, 252))
                setPadding(0, 5, 0, 15)
            }
        column.addView(caption("⌚ SH9 · WATCH9 BRIDGE PILOT", 23f))
        column.addView(caption(
            "Külön tesztalkalmazás · HH One és Family Guard érintetlen. " +
            "Kézi vagy külön engedélyezett időszakos akkumulátoradatot fogad. Nincs pulzusfeltöltés, GPS vagy felhőfeltöltés.",
            14f
        ))
        display = caption("", 16f)
        column.addView(display)

        fun button(label: String, action: () -> Unit) {
            column.addView(Button(this).apply { text = label; setOnClickListener { action() } })
        }
        button("🩷 Mónika Watch9 · fogadás engedélyezése") { arm("Mónika") }
        button("💙 Zsolt Watch5 Pro · fogadás engedélyezése") { arm("Zsolt") }
        button("🔄 Legutóbbi órastátusz megjelenítése") { refresh() }
        button("⛔ Fogadás leállítása és tesztadatok törlése") {
            AlertDialog.Builder(this)
                .setTitle("Watch Pilot leállítása")
                .setMessage("A helyi órastátusz és párosítási azonosító törlődik. Az éles HH One nem változik.")
                .setPositiveButton("Leállítás") { _, _ ->
                    prefs.edit().clear().apply()
                    refresh()
                }
                .setNegativeButton("Mégsem", null)
                .show()
        }
        setContentView(page)
        refresh()
    }

    private fun arm(owner: String) {
        AlertDialog.Builder(this)
            .setTitle("Csak helyi Watch Pilot · " + owner)
            .setMessage("Engedélyezed, hogy ez a külön tesztapp a hozzád párosított óra " +
                "kézzel vagy opcionális időzítéssel elküldött akkumulátoradatait és a modell nevét helyben tárolja? " +
                "Csak az első üzenetet küldő, megfelelően aláírt óra csatlakozhat. " +
                "Nem jut adat Dropboxba, Supabase-be vagy SH9-be.")
            .setPositiveButton("Engedélyezem") { _, _ ->
                prefs.edit().clear()
                    .putBoolean(WatchPilotReceiver.KEY_ARMED, true)
                    .putString(WatchPilotReceiver.KEY_OWNER, owner)
                    .apply()
                refresh()
            }
            .setNegativeButton("Most nem", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        if (::display.isInitialized) refresh()
    }

    private fun refresh() {
        val armed = prefs.getBoolean(WatchPilotReceiver.KEY_ARMED, false)
        if (!armed) {
            display.text = "FOGADÁS: KIKAPCSOLVA\n\n" +
                "Először ezen a telefonon engedélyezd a megfelelő profilt. " +
                "Ezután a Watch9 / Watch5 Pro órán nyomd meg a KÜLDÉS gombot."
            return
        }
        val owner = prefs.getString(WatchPilotReceiver.KEY_OWNER, "ismeretlen") ?: "ismeretlen"
        val received = prefs.getLong(WatchPilotReceiver.KEY_RECEIVED_AT, 0L)
        val prefix = "PROFIL: " + owner + "\nFOGADÁS: ENGEDÉLYEZVE\n" +
            "Az első sikeres óraüzenethez kötjük a készüléket.\n\n"
        if (received <= 0L) {
            display.text = prefix + "Órastátusz: MÉG NINCS ADAT\n" +
                "A Watch Pilot alkalmazásban indíts kézi küldést."
            return
        }
        val age = System.currentTimeMillis() - received
        val mode = prefs.getString(WatchPilotReceiver.KEY_MODE, "manual") ?: "manual"
        val interval = prefs.getInt(WatchPilotReceiver.KEY_INTERVAL, 0)
        val validInterval = interval in listOf(30, 60, 120)
        val freshnessMinutes = if (mode == "auto" && validInterval) interval * 2 + 15 else 15
        val fresh = if (mode == "auto" && validInterval) {
            age in 0..(freshnessMinutes * 60 * 1000L)
        } else age in 0..(15 * 60 * 1000L)
        val date = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.MEDIUM)
        val percent = prefs.getInt(WatchPilotReceiver.KEY_BATTERY, -1)
        display.text = prefix +
            "Óra (jelentett modell): " + prefs.getString(WatchPilotReceiver.KEY_MODEL, "ismeretlen") + "\n" +
            "🔋 Akkumulátor: " + (if (percent in 0..100) percent.toString() + "%" else "ismeretlen") + "\n" +
            "⚡ Töltés: " + (if (prefs.getBoolean(WatchPilotReceiver.KEY_CHARGING, false)) "igen" else "nem") + "\n" +
            "📨 Telefonon fogadva: " + date.format(Date(received)) + "\n" +
            "Óra időbélyege: " + date.format(Date(prefs.getLong(WatchPilotReceiver.KEY_SENT_AT, received))) + "\n" +
            "Jelentés: " + (if (mode == "auto" && validInterval) "Automatikus · $interval perc" else "Kézi") + "\n" +
            "Adatfrissesség: " + (if (fresh) "megfelelő" else "ELAVULT") +
            " · határ: $freshnessMinutes perc\n\n" +
            "Ez az utolsó hitelesített órajelentés, nem bizonyít folyamatos Bluetooth/LTE-kapcsolatot."
    }
}
