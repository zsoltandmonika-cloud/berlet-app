package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

/**
 * v418 isolated foreground Samsung Health test: local result and truthful diagnostics only.
 * No network, Dropbox, HC, OTA, scheduler, persistence or background upload.
 */
class ThinPilotActivity : Activity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val hu = Locale("hu", "HU")
    private lateinit var result: TextView
    private lateinit var diagnostic: TextView
    private lateinit var read: Button
    private lateinit var profile: Spinner
    private lateinit var period: Spinner

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.WHITE
        window.navigationBarColor = Color.WHITE
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
            View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(30))
        }
        val title = TextView(this).apply {
            text = "HealthHub Thin Collector"
            textSize = 22f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(31, 49, 68))
        }
        root.addView(title)
        root.addView(TextView(this).apply {
            text = "Samsung Health · helyi teszt v420"
            textSize = 16f
            setTextColor(Color.rgb(55, 97, 127))
            setPadding(0, dp(4), 0, dp(12))
        })
        root.addView(TextView(this).apply {
            text = "Csak kézi adatolvasás. Nincs internet, Dropbox, automatikus feltöltés vagy háttérszinkron. A profilválasztó csak a kijelzett címkét határozza meg, nem vált Samsung Health-fiókot."
            textSize = 14f
            setPadding(0, 0, 0, dp(14))
        })
        profile = Spinner(this).apply {
            adapter = ArrayAdapter(this@ThinPilotActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Zsolt", "Mónika"))
        }
        root.addView(profile)
        period = Spinner(this).apply {
            adapter = ArrayAdapter(this@ThinPilotActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Mai nap", "Utolsó 7 nap"))
        }
        root.addView(period)
        read = Button(this).apply {
            text = "Samsung Health · helyi adatdiagnosztika"
            isEnabled = SamsungSdkDailyReader.available
            setOnClickListener { readOneDay() }
        }
        root.addView(read)
        result = TextView(this).apply {
            text = if (SamsungSdkDailyReader.available)
                "Készen áll. A Samsung hozzáférési képernyő csak a gomb megnyomásakor jelenhet meg."
            else "Samsung SDK nincs ebben a buildben. Nincs tesztadat."
            textSize = 17f
            setTextIsSelectable(true)
            setPadding(0, dp(18), 0, dp(10))
        }
        root.addView(result)
        diagnostic = TextView(this).apply {
            text = "Diagnosztika: az első sikeres olvasás után jelenik meg."
            textSize = 14f
            setTextIsSelectable(true)
            setTextColor(Color.rgb(70, 78, 88))
            setPadding(0, dp(16), 0, 0)
        }
        root.addView(diagnostic)
        val scroll = ScrollView(this).apply {
            clipToPadding = false
            addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        // Target SDK 35 enables edge-to-edge on Android 15. Respect status/navigation insets
        // instead of hardcoding the top gap; no overlap with the phone status bar.
        if (Build.VERSION.SDK_INT >= 30) {
            scroll.setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        } else {
            scroll.fitsSystemWindows = true
        }
        setContentView(scroll)
    }

    private fun number(day: JSONObject, name: String, maxDecimals: Int): String {
        if (!day.has(name) || day.isNull(name)) return "nincs adat"
        val value = day.optDouble(name, Double.NaN)
        if (!value.isFinite()) return "nincs adat"
        return NumberFormat.getNumberInstance(hu).apply {
            minimumFractionDigits = 0
            maximumFractionDigits = maxDecimals
        }.format(value)
    }

    private fun fieldState(day: JSONObject, name: String, label: String): String =
        "$label: " + if (day.has(name) && !day.isNull(name)) "kapott értéket"
        else "nem érkezett érték (oka ebből nem állapítható meg)"

    private fun readOneDay() {
        val owner = if (profile.selectedItemPosition == 1) "monika" else "zsolt"
        val requestedDays = if (period.selectedItemPosition == 1) 7 else 1
        read.isEnabled = false
        result.text = "Samsung SDK olvasás folyamatban…"
        diagnostic.text = "Diagnosztika: feldolgozás alatt."
        scope.launch {
            try {
                val payload = SamsungSdkDailyReader.collect(this@ThinPilotActivity, owner, requestedDays)
                check(payload.optString("profile") == owner &&
                    payload.optString("schemaVersion") == "healthhub.samsung.daily/1") {
                    "Eltérő profil vagy Samsung adatformátum."
                }
                val records = payload.optJSONObject("records")
                val days = records?.optJSONArray("dailySummary")
                if (days == null || days.length() == 0) {
                    result.text = "Nem érkezett Samsung napi rekord. Hiányzó adatot nem helyettesítünk nullával."
                    diagnostic.text = "Napi rekordok: 0. Külön ellenőrizhető a jogosultság és az adatok megléte a Samsung Health-ben."
                    return@launch
                }
                val day = days.optJSONObject(days.length() - 1) ?: JSONObject()
                val calories = number(day, "activeCaloriesKcal", 1)
                val minutes = number(day, "activeMinutes", 1)
                val distance = number(day, "distanceMeters", 0)
                val floors = number(day, "floorsClimbed", 1)
                val gain = number(day, "exerciseElevationGainMeters", 1)
                result.text = "✓ Samsung Health-adatok beolvasva\n" +
                    "Profilcímke: ${if (owner == "monika") "Mónika" else "Zsolt"}\n" +
                    "Nap: ${day.optString("date", "nincs adat")}\n\n" +
                    "Aktív kalória: $calories${if (calories == "nincs adat") "" else " kcal"}\n" +
                    "Aktív idő: $minutes${if (minutes == "nincs adat") "" else " perc"}\n" +
                    "Távolság: $distance${if (distance == "nincs adat") "" else " m"}\n" +
                    "Emeletek: $floors\n" +
                    "Edzésből származó szintemelkedés: $gain${if (gain == "nincs adat") "" else " m"}\n\n" +
                    "Az olvasás helyi, adatfeltöltés nem történt."

                val hourly = records?.optJSONArray("hourlySteps")
                val exercises = records?.optJSONArray("exerciseSessions")
                val debug = payload.optJSONObject("diagnostics")
                fun granted(name: String): String = when {
                    debug == null || !debug.has(name) -> "nem ellenőrizhető"
                    debug.optBoolean(name) -> "engedélyezve"
                    else -> "nincs engedély"
                }
                val floorStatuses = debug?.optJSONObject("floorsByDate")
                fun floorStatus(date: String): String = when (floorStatuses?.optString(date)) {
                    "value_received" -> "adat érkezett"
                    "no_records" -> "lekérdezés sikeres, nincs rekord"
                    "permission_missing" -> "nincs olvasási engedély"
                    "invalid_value" -> "érvénytelen érték"
                    "query_failed" -> "lekérdezési hiba"
                    else -> "nem ellenőrizhető"
                }
                val dates = (0 until days.length()).mapNotNull { i ->
                    days.optJSONObject(i)?.let { entry ->
                        val date = entry.optString("date")
                        "$date: ${floorStatus(date)}; aktív perc: ${number(entry, "activeMinutes", 1)}"
                    }
                }
                val hourRows = (0 until (hourly?.length() ?: 0)).mapNotNull { i ->
                    hourly?.optJSONObject(i)?.let { entry ->
                        val hour = entry.optInt("hour", -1)
                        val steps = entry.optLong("steps", -1)
                        if (hour in 0..23 && steps >= 0)
                            "${hour.toString().padStart(2, '0')}:00 · $steps lépés"
                        else null
                    }
                }
                // Show actual Samsung exercise sessions; never derive pace or ascent from daily totals.
                val exerciseRows = (0 until (exercises?.length() ?: 0)).mapNotNull { i ->
                    exercises?.optJSONObject(i)?.let { item ->
                        val whenDate = item.optString("date", "ismeretlen nap")
                        val exerciseType = item.optString("exerciseType", "ismeretlen edzés")
                        val duration = number(item, "durationMinutes", 1)
                        val meters = number(item, "distanceMeters", 0)
                        val pace = number(item, "paceMinPerKm", 1)
                        val ascent = number(item, "altitudeGainMeters", 1)
                        val startTime = item.optString("startTime", "")
                        val endTime = item.optString("endTime", "")
                        "$whenDate · $exerciseType\n" +
                            "  Idő: ${if (duration == "nincs adat") duration else "$duration perc"}" +
                            " · Táv: ${if (meters == "nincs adat") meters else "$meters m"}\n" +
                            "  Tempó: ${if (pace == "nincs adat") pace else "$pace perc/km"}" +
                            " · Edzés-szintemelkedés: ${if (ascent == "nincs adat") ascent else "$ascent m"}" +
                            (if (startTime.isNotBlank() && endTime.isNotBlank())
                                "\n  Kezdés: $startTime · Vég: $endTime" else "")
                    }
                }
                val exerciseDetails = if (exerciseRows.isEmpty()) {
                    "Nincs elérhető edzésrekord."
                } else {
                    exerciseRows.take(12).joinToString("\n\n") +
                        if (exerciseRows.size > 12) "\n... további ${exerciseRows.size - 12} rekord nincs kibontva." else ""
                }
                diagnostic.text = "ADATDIAGNOSZTIKA · Samsung SDK\n" +
                    "Kért időszak: $requestedDays nap\n" +
                    "Jogosultságok: aktivitás ${granted("activitySummaryPermission")}, emelet ${granted("floorsPermission")}, lépések ${granted("stepsPermission")}, edzés ${granted("exercisePermission")}\n" +
                    "Emeletlekérdezés (naponként):\n${dates.joinToString("\n").ifBlank { "nincs napi rekord" }}\n" +
                    "Mai óránkénti lépések:\n${hourRows.joinToString("\n").ifBlank { "nincs elérhető órás rekord" }}\n\n" +
                    "EDZÉSREKORDOK · tényleges SDK-értékek:\n$exerciseDetails\n\n" +
                    "A tempó csak akkor jelenik meg, ha a Samsung edzésrekordja alkalmas a számításra; az edzés-szintemelkedés nem azonos a napi összes szintemelkedéssel.\n\n" +
                    "Forrás: ${payload.optString("source", "ismeretlen")}\n" +
                    "Napi rekordok: ${days.length()}\n" +
                    "Óránkénti lépésrekordok: ${hourly?.length() ?: 0}\n" +
                    "Edzésrekordok: ${exercises?.length() ?: 0}\n" +
                    fieldState(day, "activeCaloriesKcal", "Aktív kalória") + "\n" +
                    fieldState(day, "activeMinutes", "Aktív idő") + "\n" +
                    fieldState(day, "distanceMeters", "Távolság") + "\n" +
                    fieldState(day, "floorsClimbed", "Emeletek") + "\n" +
                    fieldState(day, "exerciseElevationGainMeters", "Edzés-szintemelkedés") + "\n\n" +
                    "A hiányzó emeletadat önmagában nem bizonyít jogosultsághibát: lehet, hogy az adott napra nincs mérés. Az engedélyek és a forrásrekordok további célzott vizsgálatot igényelhetnek.\n" +
                    "A profilcímke nem választ Samsung-fiókot: az SDK mindig ezen a telefonon engedélyezett Samsung Health-adatokat olvassa."
            } catch (e: Exception) {
                result.text = "Samsung próbaolvasás sikertelen: " +
                    (e.message ?: e.javaClass.simpleName)
                diagnostic.text = "Nem történt feltöltés. Ellenőrizendő: Samsung Health hozzáférési engedély, SDK kompatibilitás vagy SDK-azonosító. Diagnosztikai személyes adat nem került mentésre."
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
