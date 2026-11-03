package hu.zsoltmonika.watchpilot

import android.app.Activity
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject
import java.util.UUID
import kotlin.math.roundToInt

/**
 * Watch9-first manual snapshot sender; works with Watch5 Pro as fallback.
 * NO health sensor, no GPS, no automatic sampling, no background process.
 */
class WatchPilotActivity : Activity() {
    companion object {
        private const val PATH_REPORT = "/sh9/watch/pilot/v1"
        private const val PATH_ACK = "/sh9/watch/pilot/ack/v1"
    }
    private lateinit var status: TextView
    private var pendingNonce: String? = null
    private val listener = MessageClient.OnMessageReceivedListener { event ->
        if (event.path != PATH_ACK || pendingNonce == null) return@OnMessageReceivedListener
        val payload = runCatching { JSONObject(String(event.data, Charsets.UTF_8)) }.getOrNull()
            ?: return@OnMessageReceivedListener
        if (payload.optInt("v") == 1 && payload.optString("nonce") == pendingNonce) {
            pendingNonce = null
            runOnUiThread {
                status.text = "✅ Telefon igazolta a fogadást és helyi mentést.\n" +
                    "Önálló Watch9 pilot; nincs éles SH9-adatírás."
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scroll = ScrollView(this).apply { setBackgroundColor(Color.rgb(12, 20, 36)) }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(14, 22, 14, 18)
        }
        scroll.addView(content)
        val title = TextView(this).apply {
            text = "🩷 SH9 Watch9 Pilot"
            textSize = 19f
            setTextColor(Color.WHITE)
        }
        content.addView(title)
        val info = TextView(this).apply {
            text = "Watch9 elsődleges · Watch5 Pro kompatibilis.\n" +
                "Csak kézi akkumulátor-küldés. Nincs GPS vagy egészségmérés."
            textSize = 12f
            setTextColor(Color.LTGRAY)
        }
        content.addView(info)
        status = TextView(this).apply {
            text = "A telefonos pilot appban engedélyezd a fogadást, majd küldj tesztjelet."
            textSize = 14f
            setTextColor(Color.WHITE)
            setPadding(0, 14, 0, 14)
        }
        content.addView(status)
        content.addView(Button(this).apply {
            text = "🔋 ÁLLAPOT KÜLDÉSE"
            setOnClickListener { sendSnapshot() }
        })
        setContentView(scroll)
    }

    override fun onStart() {
        super.onStart()
        Wearable.getMessageClient(this).addListener(listener)
    }

    override fun onStop() {
        Wearable.getMessageClient(this).removeListener(listener)
        super.onStop()
    }

    private fun sendSnapshot() {
        val battery = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        if (level < 0 || scale <= 0) {
            status.text = "Az óra akkumulátoradata most nem érhető el. Nem küldünk hamis értéket."
            return
        }
        val percent = (level * 100.0 / scale).roundToInt().coerceIn(0, 100)
        val code = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val charging = code == BatteryManager.BATTERY_STATUS_CHARGING ||
            code == BatteryManager.BATTERY_STATUS_FULL

        // No automatic sends, no device IDs, no health sensor records.
        status.text = "Párosított telefon keresése…"
        Wearable.getNodeClient(this).connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.size != 1) {
                    status.text = if (nodes.isEmpty()) {
                        "A Data Layer most nem lát elérhető telefoneszközt.\n" +
                            "Ellenőrizd a két app telepítését és azonos aláírását."
                    } else {
                        "Több kapcsolat elérhető. Biztonságból nem küldünk automatikusan mindenkinek."
                    }
                    return@addOnSuccessListener
                }
                val node = nodes.single()
                val nonce = UUID.randomUUID().toString()
                pendingNonce = nonce
                val payload = JSONObject()
                    .put("v", 1)
                    .put("type", "battery_snapshot")
                    .put("nonce", nonce)
                    .put("sentAtMillis", System.currentTimeMillis())
                    .put("batteryPercent", percent)
                    .put("charging", charging)
                    .put("model", Build.MODEL)
                    .toString().toByteArray(Charsets.UTF_8)
                Wearable.getMessageClient(this).sendMessage(node.id, PATH_REPORT, payload)
                    .addOnSuccessListener {
                        if (pendingNonce == nonce) {
                            status.text = "🔋 " + percent + "% · üzenet továbbítva.\n" +
                                "Várjuk a telefon fogadási visszaigazolását.\n" +
                                "Adatút: " + if (node.isNearby) "közeli" else "hálózati kapcsolat"
                        }
                    }
                    .addOnFailureListener { ex ->
                        if (pendingNonce == nonce) pendingNonce = null
                        status.text = "A küldés sikertelen: " + (ex.localizedMessage ?: "Data Layer hiba")
                    }
            }
            .addOnFailureListener { ex ->
                status.text = "Telefon keresése sikertelen: " + (ex.localizedMessage ?: "ismeretlen hiba")
            }
    }
}
