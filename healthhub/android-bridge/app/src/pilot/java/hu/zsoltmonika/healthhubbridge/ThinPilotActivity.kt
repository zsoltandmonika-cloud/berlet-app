package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.os.Bundle
import android.graphics.Typeface
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.ArrayAdapter
import android.widget.TextView
import android.view.ViewGroup
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Standalone pilot: no Dropbox, no Health Connect, no scheduler, no OTA.
 * Explicit foreground Samsung SDK read only. All results remain on the screen.
 */
class ThinPilotActivity : Activity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var result: TextView
    private lateinit var read: Button
    private lateinit var profile: Spinner

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 40, 28, 28)
        }
        val title = TextView(this).apply {
            text = "HealthHub Thin Collector · TEST v417"
            textSize = 21f
            setTypeface(null, Typeface.BOLD)
        }
        root.addView(title)
        root.addView(TextView(this).apply {
            text = "Külön tesztalkalmazás. Csak kézi Samsung Health-olvasás. Nincs Dropbox, internet, automatikus feltöltés vagy háttérszinkron."
            textSize = 15f
            setPadding(0, 18, 0, 18)
        })
        profile = Spinner(this).apply {
            adapter = ArrayAdapter(this@ThinPilotActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Zsolt", "Mónika"))
        }
        root.addView(profile)
        read = Button(this).apply {
            text = "Samsung Health · 1 nap beolvasása"
            isEnabled = SamsungSdkDailyReader.available
            setOnClickListener { readOneDay() }
        }
        root.addView(read)
        result = TextView(this).apply {
            text = if (SamsungSdkDailyReader.available)
                "Készen áll. A Samsung jogosultságkérés csak a gomb megnyomásakor jelenik meg."
            else "Samsung SDK hiányzik ebből a buildből. Nincs tesztadat."
            textSize = 15f
            setTextIsSelectable(true)
            setPadding(0, 20, 0, 10)
        }
        root.addView(result)
        setContentView(ScrollView(this).apply {
            addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        })
    }

    private fun readOneDay() {
        val owner = if (profile.selectedItemPosition == 1) "monika" else "zsolt"
        read.isEnabled = false
        result.text = "Samsung SDK olvasás folyamatban…"
        scope.launch {
            try {
                val payload = SamsungSdkDailyReader.collect(this@ThinPilotActivity, owner, 1)
                check(payload.optString("profile") == owner &&
                    payload.optString("schemaVersion") == "healthhub.samsung.daily/1") {
                    "Eltérő profil vagy Samsung adatformátum."
                }
                val days = payload.optJSONObject("records")?.optJSONArray("dailySummary")
                if (days == null || days.length() == 0) {
                    result.text = "Nem érkezett Samsung napi rekord. Semmilyen nullát vagy becslést nem mutatunk."
                    return@launch
                }
                val day = days.optJSONObject(days.length() - 1) ?: JSONObject()
                fun field(name: String): String =
                    if (day.has(name) && !day.isNull(name)) day.opt(name).toString() else "nincs adat"
                result.text = "Samsung Health SDK olvasás sikeres (helyi próba)\n" +
                    "Profil: ${if (owner == "monika") "Mónika" else "Zsolt"}\n" +
                    "Nap: ${field("date")}\n" +
                    "Aktív kalória: ${field("activeCaloriesKcal")} kcal\n" +
                    "Aktív idő: ${field("activeMinutes")} perc\n" +
                    "Távolság: ${field("distanceMeters")} méter\n" +
                    "Emeletek: ${field("floorsClimbed")}\n" +
                    "Rekordnapok: ${days.length()}\n\n" +
                    "NEM történt adatfeltöltés. Az eredmény csak ezen a képernyőn látható."
            } catch (e: Exception) {
                result.text = "A Samsung próbaolvasás nem sikerült: " +
                    (e.message ?: e.javaClass.simpleName) +
                    "\nNem történt feltöltés. Jogosultság vagy alkalmazásazonosító-ellenőrzés is szükséges lehet."
            } finally {
                read.isEnabled = true
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
