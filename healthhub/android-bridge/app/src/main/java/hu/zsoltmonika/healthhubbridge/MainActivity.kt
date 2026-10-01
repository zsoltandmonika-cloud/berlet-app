package hu.zsoltmonika.healthhubbridge

import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var status: TextView
    private lateinit var profileSpinner: Spinner
    private var pendingJson: String? = null
    private var client: HealthConnectClient? = null

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        status.text = if (granted.containsAll(HealthConnectExporter.REQUIRED_PERMISSIONS))
            "✓ Health Connect engedélyek rendben. Most olvashatjuk az adatokat."
        else
            "Hiányzik legalább egy engedély. A HealthHub csak a megadott adattípusokat fogja tudni olvasni."
    }

    private val saveLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        val data = pendingJson
        if (uri != null && data != null) {
            contentResolver.openOutputStream(uri)?.use { it.write(data.toByteArray(Charsets.UTF_8)) }
            status.text = "✓ HealthHub importfájl elmentve. Nyisd meg a HealthHubot és importáld a Health Connect JSON fájlt."
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildUi())
        initHealthConnect()
    }

    private fun initHealthConnect() {
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_AVAILABLE -> {
                client = HealthConnectClient.getOrCreate(this)
                status.text = "Health Connect elérhető. 1) válassz profilt, 2) adj engedélyt, 3) olvasd ki az adatokat."
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                status.text = "A Health Connect frissítése szükséges."
            }
            else -> status.text = "A Health Connect ezen az eszközön jelenleg nem elérhető."
        }
    }

    private fun buildUi(): View {
        val pad = 30
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(0xFFEEF7FB.toInt())
        }
        root.addView(TextView(this).apply {
            text = "HealthHub Connect"
            textSize = 28f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF0B2D50.toInt())
        })
        root.addView(TextView(this).apply {
            text = "Samsung Health → Health Connect → HealthHub\nMVP: helyi, szerver nélküli import"
            textSize = 16f
            setTextColor(0xFF315F98.toInt())
            setPadding(0, 8, 0, 24)
        })

        root.addView(TextView(this).apply { text = "Profil"; textSize = 15f })
        profileSpinner = Spinner(this)
        val profiles = listOf("Zsolt", "Mónika")
        profileSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, profiles)
        root.addView(profileSpinner)

        root.addView(Button(this).apply {
            text = "1. Health Connect engedélyek"
            setOnClickListener { permissionLauncher.launch(HealthConnectExporter.REQUIRED_PERMISSIONS) }
        })
        root.addView(Button(this).apply {
            text = "2. Utolsó 30 nap beolvasása"
            setOnClickListener { readHealthData() }
        })
        root.addView(Button(this).apply {
            text = "3. JSON mentése"
            isEnabled = false
            tag = "save"
            setOnClickListener {
                val p = selectedProfile()
                saveLauncher.launch("healthhub-healthconnect-${p}-${System.currentTimeMillis()}.json")
            }
        })
        root.addView(Button(this).apply {
            text = "HealthHub megnyitása"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/")))
            }
        })
        status = TextView(this).apply {
            text = "Indítás…"
            textSize = 16f
            setTextColor(0xFF173F62.toInt())
            setPadding(0, 28, 0, 0)
        }
        root.addView(status)
        return root
    }

    private fun selectedProfile() = if (profileSpinner.selectedItemPosition == 1) "monika" else "zsolt"

    private fun readHealthData() {
        val hc = client ?: run { status.text = "Health Connect nem elérhető."; return }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(HealthConnectExporter.REQUIRED_PERMISSIONS)) {
                    status.text = "Előbb add meg a Health Connect engedélyeket."
                    return@launch
                }
                status.text = "Health Connect adatok olvasása…"
                val json: JSONObject = HealthConnectExporter(hc).export(selectedProfile())
                pendingJson = json.toString(2)
                findViewWithTag<Button>("save")?.isEnabled = true
                val c = json.getJSONObject("counts")
                status.text = "✓ Kész. Vérnyomás: ${c.getInt("bloodPressure")}, súly: ${c.getInt("weight")}, vércukor: ${c.getInt("bloodGlucose")}, SpO₂: ${c.getInt("oxygenSaturation")}, pulzusrekord: ${c.getInt("heartRateRecords")}, lépésnap: ${c.getInt("stepDays")}."
            } catch (e: Exception) {
                status.text = "Hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
