package hu.healthhub.connector

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.*
import kotlin.reflect.KClass

const val PRIVACY = "A HealthHub Connector kizárólag az általad engedélyezett vérnyomás-, pulzus-, testsúly-, vércukor-, véroxigén- és lépésadatokat olvassa ki a Health Connectből. Nem módosítja és nem törli a forrásadatokat. Nincs internet-hozzáférése, nincs analitika, nincs háttérszinkron. Az utolsó 7 vagy 30 nap adatait kérésedre JSON-fájlba menti. A fájl egészségügyi adatokat tartalmaz: a telefon Letöltések mappáját válaszd, ha helyben szeretnéd tartani. Felhős mappa választásával annak szolgáltatójához kerülhet. A fájlt a HealthHub Eszközök oldalán importálhatod, ellenőrzött célprofilba. Az engedélyek a Health Connectben bármikor visszavonhatók. A fájlokat te kezelheted vagy törölheted. Ez a 0.1-es verzió kézi adatátadást végez; a forrásból törölt rekordokat nem törli a HealthHubból."

class PrivacyActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(ScrollView(this).apply { addView(TextView(context).apply { text = "HealthHub · Adatkezelés\n\n$PRIVACY"; textSize = 18f; setPadding(28, 40, 28, 40) }) })
    }
}

class MainActivity : ComponentActivity() {
    private lateinit var status: TextView
    private lateinit var profile: Spinner
    private lateinit var period: Spinner
    private lateinit var save: Button
    private lateinit var read: Button
    private var pending: String? = null
    private var pendingProfile = ""
    private val types = listOf(BloodPressureRecord::class, HeartRateRecord::class, WeightRecord::class, BloodGlucoseRecord::class, OxygenSaturationRecord::class, StepsRecord::class)
    private val permissions = types.map { HealthPermission.getReadPermission(it) }.toSet()
    private val permissionLauncher = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        status.text = "Engedélyezett adattípusok: ${granted.intersect(permissions).size}/6. Most indítható a kiolvasás."
    }
    private val saveLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = pending
        if (uri != null && text != null) lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray(Charsets.UTF_8)) } ?: error("A fájl nem nyitható meg.") }
                status.text = "Fájl elmentve. HealthHub → HealthRadar → Eszközök → Health Connect fájl importálása."
                pending = null; save.isEnabled = false
            } catch (e: Exception) { status.text = "Mentés sikertelen: ${e.localizedMessage}" }
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 36, 24, 28) }
        fun label(value: String, size: Float = 17f) = TextView(this).apply { text = value; textSize = size; setTextColor(Color.rgb(24, 60, 80)); setPadding(0, 10, 0, 12); layout.addView(this) }
        fun button(value: String, action: () -> Unit) = Button(this).apply { text = value; isAllCaps = false; minHeight = 56; layout.addView(this); setOnClickListener { action() } }
        label("♥ HealthHub Connector", 27f)
        label("Helyi adatátadás · 0.1.0", 15f)
        label("1. Kié a telefon Health Connect-adatállománya?")
        profile = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Válassz profilt…", "Zsolt", "Mónika")); layout.addView(this) }
        label("Csak a kiválasztott személy saját telefonjának adatait exportáld. A Health Connect nem választja szét a családtagokat.", 14f)
        label("2. Időszak (a mai nappal együtt)")
        period = Spinner(this).apply { adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("7 nap", "30 nap")); setSelection(1); layout.addView(this) }
        button("3. Olvasási engedélyek") { if (available()) permissionLauncher.launch(permissions) }
        read = button("4. Adatok kiolvasása") {
            val p = when (profile.selectedItemPosition) { 1 -> "zsolt"; 2 -> "monika"; else -> "" }
            if (p.isEmpty()) status.text = "Először válaszd ki a profil tulajdonosát."
            else if (available()) AlertDialog.Builder(this).setTitle("${if (p == "zsolt") "Zsolt" else "Mónika"} saját adatai?")
                .setMessage("A telefon Health Connect-adatainak egésze ehhez a személyhez fog tartozni az exportban.")
                .setNegativeButton("Mégse", null).setPositiveButton("Igen, kiolvasás") { _, _ -> load(p, if (period.selectedItemPosition == 0) 7 else 30) }.show()
        }
        save = button("5. JSON mentése a telefonra") { if (pending != null) saveLauncher.launch("HealthHub_HealthConnect_${pendingProfile}_${LocalDate.now()}.json") }.apply { isEnabled = false }
        button("HealthHub megnyitása") { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/"))) }
        button("Adatkezelés és korlátok") { startActivity(Intent(this, PrivacyActivity::class.java)) }
        status = label("Nincs automatikus szinkron. Kiolvasás → mentés → import a HealthHubban. A lépéseket a Health Connect napi összesítéséből vesszük át.", 16f)
        setContentView(ScrollView(this).apply { addView(layout) })
    }
    private fun available(): Boolean {
        val result = HealthConnectClient.getSdkStatus(this)
        if (result != HealthConnectClient.SDK_AVAILABLE) {
            status.text = if (result == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) "Frissítsd a Health Connectet a Play Áruházban, majd próbáld újra." else "Ezen az eszközön a Health Connect nem érhető el."
            return false
        }
        return true
    }
    private fun load(p: String, days: Int) {
        pending = null; save.isEnabled = false; read.isEnabled = false; profile.isEnabled = false; period.isEnabled = false
        status.text = "Adatok kiolvasása…"
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) { export(p, days) }
                pending = result.toString(); pendingProfile = p
                val counts = result.getJSONObject("counts")
                status.text = "Kiolvasva: ${result.getJSONArray("measurements").length()} rekord.\n" + counts.keys().asSequence().joinToString("\n") { "$it: ${counts.getInt(it)}" } + "\n\n" + result.getJSONArray("warnings").let { (0 until it.length()).joinToString("\n") { i -> it.getString(i) } }
                save.isEnabled = result.getJSONArray("measurements").length() > 0
            } catch (e: CancellationException) { throw e }
              catch (e: Exception) { status.text = "A kiolvasás nem készült el: ${e.localizedMessage}. Nem mentettünk részleges fájlt. Ellenőrizd az engedélyeket, vagy próbáld 7 nappal." }
            finally { read.isEnabled = true; profile.isEnabled = true; period.isEnabled = true }
        }
    }
    private suspend fun export(profile: String, days: Int): JSONObject {
        val client = HealthConnectClient.getOrCreate(this)
        val granted = client.permissionController.getGrantedPermissions()
        check(granted.intersect(permissions).isNotEmpty()) { "Nincs olvasási engedély" }
        val zone = ZoneId.systemDefault()
        val end = Instant.now()
        val startLocal = LocalDate.now(zone).minusDays((days - 1).toLong()).atStartOfDay()
        val start = startLocal.atZone(zone).toInstant()
        val rows = JSONArray(); val counts = JSONObject(); val warnings = JSONArray()
        fun add(row: JSONObject) {
            check(rows.length() < 200000) { "Túl sok adat; válassz 7 napot" }
            rows.put(row)
            val type = row.getString("recordType"); counts.put(type, counts.optInt(type) + 1)
        }
        fun base(type: String, id: String, origin: String, at: Instant, modified: Instant) = JSONObject().put("recordType", type).put("recordId", id).put("origin", origin).put("measuredAt", at.toString()).put("lastModifiedAt", modified.toString())
        suspend fun <T : Record> records(type: KClass<T>, convert: (T) -> Unit) {
            if (HealthPermission.getReadPermission(type) !in granted) { warnings.put("Nincs engedély: ${type.simpleName}"); return }
            var page: String? = null
            do {
                val r = client.readRecords(ReadRecordsRequest(type, TimeRangeFilter.between(start, end), pageSize = 1000, pageToken = page))
                r.records.forEach(convert); page = r.pageToken
            } while (page != null)
        }
        records(BloodPressureRecord::class) { r -> add(base("bloodPressure", r.metadata.id, r.metadata.dataOrigin.packageName, r.time, r.metadata.lastModifiedTime).put("systolic", r.systolic.inMillimetersOfMercury).put("diastolic", r.diastolic.inMillimetersOfMercury)) }
        records(WeightRecord::class) { r -> add(base("weight", r.metadata.id, r.metadata.dataOrigin.packageName, r.time, r.metadata.lastModifiedTime).put("weightKg", r.weight.inKilograms)) }
        records(BloodGlucoseRecord::class) { r -> add(base("bloodGlucose", r.metadata.id, r.metadata.dataOrigin.packageName, r.time, r.metadata.lastModifiedTime).put("bloodGlucose", r.level.inMillimolesPerLiter)) }
        records(OxygenSaturationRecord::class) { r -> add(base("oxygenSaturation", r.metadata.id, r.metadata.dataOrigin.packageName, r.time, r.metadata.lastModifiedTime).put("oxygenSaturation", r.percentage.value)) }
        records(HeartRateRecord::class) { r -> r.samples.forEachIndexed { index, sample ->
            if (!sample.time.isBefore(start) && sample.time.isBefore(end)) add(base("heartRate", "${r.metadata.id}:$index", r.metadata.dataOrigin.packageName, sample.time, r.metadata.lastModifiedTime).put("pulse", sample.beatsPerMinute))
        } }
        if (HealthPermission.getReadPermission(StepsRecord::class) in granted) {
            val groups = client.aggregateGroupByPeriod(AggregateGroupByPeriodRequest(metrics = setOf(StepsRecord.COUNT_TOTAL), timeRangeFilter = TimeRangeFilter.between(startLocal, LocalDateTime.ofInstant(end, zone)), timeRangeSlicer = Period.ofDays(1)))
            for (g in groups) {
                val steps = g.result[StepsRecord.COUNT_TOTAL] ?: continue
                val date = g.startTime.toLocalDate().toString()
                add(base("stepsDaily", "$date@${zone.id}", "health-connect-aggregate", g.startTime.atZone(zone).toInstant(), end).put("steps", steps).put("localDate", date).put("zoneId", zone.id))
            }
        } else warnings.put("Nincs engedély: StepsRecord")
        return JSONObject().put("format", "healthhub-health-connect").put("schemaVersion", 1).put("connectorVersion", "0.1.0").put("profile", profile).put("exportedAt", end.toString()).put("periodStart", start.toString()).put("periodEnd", end.toString()).put("zoneId", zone.id).put("measurements", rows).put("counts", counts).put("warnings", warnings)
    }
}
