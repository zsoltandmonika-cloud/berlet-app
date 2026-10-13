package hu.zsoltmonika.healthhubbridge

import androidx.activity.ComponentActivity
import android.os.Build
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.Duration
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.reflect.KClass

/**
 * v422 read-only, no-network Health Connect pilot.
 * Never writes data, exports files, binds a user profile or schedules background work.
 */
class HcPilotActivity : ComponentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var status: TextView
    private lateinit var details: TextView
    private lateinit var period: Spinner
    private lateinit var readButton: Button
    private val types = linkedMapOf(
        "Alvás" to SleepSessionRecord::class,
        "Pulzus" to HeartRateRecord::class,
        "Nyugalmi pulzus" to RestingHeartRateRecord::class,
        "Vérnyomás" to BloodPressureRecord::class,
        "Véroxigén" to OxygenSaturationRecord::class
    )
    private val requested = types.values.map { HealthPermission.getReadPermission(it) }.toSet()
    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        status.text = if (granted.isEmpty()) "Nem kaptunk új Health Connect-engedélyt."
        else "Jogosultságkezelés kész. Most nyomd meg az Adatok olvasása gombot."
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.WHITE
        window.navigationBarColor = Color.WHITE
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
            View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(24))
        }
        root.addView(TextView(this).apply {
            text = "HealthHub · Health TEST v423"
            textSize = 21f
            setTextColor(Color.rgb(26, 49, 73))
            setTypeface(null, Typeface.BOLD)
        })
        root.addView(TextView(this).apply {
            text = "Helyi, csak olvasó teszt. Nincs internet, Dropbox, profilváltás vagy háttérszinkron. A telefon Health Connect-tárát vizsgálja, nem Mónika/Zsolt profilját kapcsolja át."
            textSize = 14f
            setPadding(0, dp(12), 0, dp(12))
        })
        period = Spinner(this).apply {
            adapter = ArrayAdapter(this@HcPilotActivity, android.R.layout.simple_spinner_dropdown_item,
                listOf("Utolsó 24 óra", "Utolsó 30 nap"))
        }
        root.addView(period)
        root.addView(Button(this).apply {
            text = "Health Connect-jogosultságok kérése"
            setOnClickListener { requestMissingPermissions() }
        })
        readButton = Button(this).apply {
            text = "Egészségadatok helyi olvasása"
            setOnClickListener { readRecords() }
        }
        root.addView(readButton)
        status = TextView(this).apply {
            text = "Készen áll. A jogosultságokat külön, a gombbal kérjük."
            textSize = 15f
            setPadding(0, dp(18), 0, dp(8))
        }
        root.addView(status)
        details = TextView(this).apply {
            text = "Alvás · pulzus · nyugalmi pulzus · vérnyomás · SpO₂"
            textSize = 16f
            setTextIsSelectable(true)
            setPadding(0, dp(8), 0, dp(12))
        }
        root.addView(details)
        val scroll = ScrollView(this).apply {
            addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            clipToPadding = false
        }
        if (Build.VERSION.SDK_INT >= 30) {
            scroll.setOnApplyWindowInsetsListener { v, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        } else scroll.fitsSystemWindows = true
        setContentView(scroll)
    }

    private fun clientOrNull(): HealthConnectClient? {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            status.text = "Health Connect nem érhető el vagy frissítést igényel."
            return null
        }
        return HealthConnectClient.getOrCreate(this)
    }

    private fun requestMissingPermissions() {
        val client = clientOrNull() ?: return
        scope.launch {
            try {
                val missing = requested - client.permissionController.getGrantedPermissions()
                if (missing.isEmpty()) status.text = "Mind az öt adattípus olvasási engedélye megvan."
                else permissionLauncher.launch(missing)
            } catch (e: Exception) {
                status.text = "Jogosultságellenőrzési hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private suspend fun <T : Record> readAll(
        client: HealthConnectClient,
        cls: KClass<T>,
        filter: TimeRangeFilter
    ): List<T> {
        val result = mutableListOf<T>()
        var token: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = cls,
                    timeRangeFilter = filter,
                    pageToken = token
                )
            )
            result.addAll(response.records)
            token = response.pageToken
        } while (!token.isNullOrEmpty())
        return result
    }

    /**
     * Local chronological sleep diagnostics. Never infer sleep scores or missing stages.
     * Attribute overnight sessions to local wake date; do not sum overlapping sessions
     * into a single duration without a deduplication policy.
     */
    private fun sleepDetail(records: List<SleepSessionRecord>, days: Long): List<String> {
        if (records.isEmpty()) return listOf("ALVÁSIDŐVONAL · nincs alvásrekord", "")
        val zone = ZoneId.systemDefault()
        val clock = DateTimeFormatter.ofPattern("MM.dd. HH:mm")
        val ordered = records.sortedWith(compareByDescending<SleepSessionRecord> { it.endTime }
            .thenBy { it.metadata.id })
        val grouped = ordered.groupBy { it.endTime.atZone(zone).toLocalDate() }.toSortedMap(reverseOrder())
        val summary = mutableListOf(
            "ALVÁSIDŐVONAL · helyi idő: $zone",
            "Az alvások az ébredés helyi napjához tartoznak.",
            "Ébredési napok: ${grouped.size} · munkamenetek: ${ordered.size}",
            "Az átfedő rekordokat nem adjuk össze és nem tekintjük külön éjszakának.",
            ""
        )
        // Show up to 30 wake days, but cap per-session details to keep the test screen responsive.
        for ((date, sessions) in grouped.entries.take(30)) {
            summary.add("$date · ${sessions.size} alvásrekord")
        }
        summary.add("")
        summary.add("RÉSZLETES ALVÁSREKORDOK · legutóbbi ${minOf(14, ordered.size)}")
        ordered.take(14).forEachIndexed { index, session ->
            val wake = session.endTime.atZone(zone)
            val start = session.startTime.atZone(zone)
            val elapsed = Duration.between(session.startTime, session.endTime).toMinutes().coerceAtLeast(0)
            val stageMinutes = session.stages.filter { it.endTime.isAfter(it.startTime) }
                .groupBy { it.stage }
                .toSortedMap()
                .mapValues { (_, values) -> values.sumOf {
                    Duration.between(it.startTime, it.endTime).toMinutes().coerceAtLeast(0)
                } }
            summary.add("${index + 1}. Ébredés napja: ${wake.toLocalDate()} · forrás: ${session.metadata.dataOrigin.packageName}")
            summary.add("  ${start.format(clock)} → ${wake.format(clock)} · ${elapsed} perc időintervallum")
            summary.add("  Alvásfázis-szakaszok: ${session.stages.size}; nyers fáziskódok / rögzített percek: " +
                if (stageMinutes.isEmpty()) "nincs fázisadat" else stageMinutes.entries.joinToString { "${it.key}: ${it.value} perc" })
        }
        if (ordered.size > 14) summary.add("További ${ordered.size - 14} rekord nincs részletezve a tesztképernyőn.")
        if (days == 1L) summary.add("24 órás lekérdezés: a kezdés előtti alvásrészekhez külön átfedésvizsgálat szükséges.")
        summary.add("A fáziskódok nem alváspontszámok; a hiányzó fázis nem nulla perc.")
        summary.add("")
        return summary
    }

    private fun readRecords() {
        val client = clientOrNull() ?: return
        val days = if (period.selectedItemPosition == 1) 30L else 1L
        readButton.isEnabled = false
        status.text = "Health Connect-olvasás folyamatban…"
        details.text = ""
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val end = Instant.now()
                val start = end.minusSeconds(days * 86400)
                val filter = TimeRangeFilter.between(start, end)
                val output = mutableListOf("Időszak: utolsó ${if (days == 1L) "24 óra" else "30 nap"}",
                    "Csak az adott telefon Health Connect-tárából; felhőfeltöltés nincs.", "")
                for ((label, cls) in types) {
                    val permission = HealthPermission.getReadPermission(cls)
                    if (!granted.contains(permission)) {
                        output.add("$label: nincs olvasási engedély")
                        continue
                    }
                    try {
                        val records = readAll(client, cls, filter)
                        val origin = records.map { it.metadata.dataOrigin.packageName }.distinct().sorted()
                        val extra = when (label) {
                            "Alvás" -> {
                                val sessions = records.filterIsInstance<SleepSessionRecord>()
                                " · fázisszakaszok: ${sessions.sumOf { it.stages.size }}"
                            }
                            "Pulzus" -> {
                                val hr = records.filterIsInstance<HeartRateRecord>()
                                " · pulzusminták: ${hr.sumOf { it.samples.size }}"
                            }
                            else -> ""
                        }
                        output.add("$label: ${records.size} rekord$extra")
                        output.add("  Források: ${origin.ifEmpty { listOf("nincs rekord") }.joinToString(", ")}")
                        if (label == "Alvás") {
                            output.add("")
                            output.addAll(sleepDetail(records.filterIsInstance<SleepSessionRecord>(), days))
                        }
                    } catch (e: Exception) {
                        output.add("$label: lekérdezési hiba (${e.javaClass.simpleName})")
                    }
                    output.add("")
                }
                details.text = output.joinToString("\n")
                status.text = "A helyi diagnosztika befejeződött. Nem történt adatfeltöltés."
            } catch (e: Exception) {
                status.text = "Health Connect-ellenőrzési hiba: ${e.message ?: e.javaClass.simpleName}"
                details.text = "Nem történt adatfeltöltés."
            } finally {
                readButton.isEnabled = true
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
