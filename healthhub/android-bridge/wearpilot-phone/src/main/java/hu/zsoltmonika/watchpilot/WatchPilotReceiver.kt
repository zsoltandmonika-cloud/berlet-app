package hu.zsoltmonika.watchpilot

import android.content.Context
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject
import kotlin.math.abs

/**
 * Only accepts the Wear Data Layer's same-package, same-signature messages.
 * Explicit phone owner opt-in + first-watch pinning; no cloud, health or GPS writes.
 */
class WatchPilotReceiver : WearableListenerService() {
    companion object {
        const val PREFS = "sh9_watch9_bridge_local_v1"
        const val KEY_ARMED = "armed"
        const val KEY_OWNER = "owner"
        const val KEY_NODE = "paired_node"
        const val KEY_MODEL = "reported_watch_model"
        const val KEY_BATTERY = "battery"
        const val KEY_CHARGING = "charging"
        const val KEY_SENT_AT = "watch_sent_at"
        const val KEY_RECEIVED_AT = "phone_received_at"
        const val PATH_REPORT = "/sh9/watch/pilot/v1"
        const val PATH_ACK = "/sh9/watch/pilot/ack/v1"
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path != PATH_REPORT || messageEvent.data.size !in 2..2048) return

        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ARMED, false)) return
        val owner = prefs.getString(KEY_OWNER, null)
        if (owner != "Zsolt" && owner != "Mónika") return
        val node = messageEvent.sourceNodeId
        if (node.isBlank()) return
        val existingNode = prefs.getString(KEY_NODE, null)
        if (!existingNode.isNullOrBlank() && node != existingNode) return

        val payload = runCatching { JSONObject(String(messageEvent.data, Charsets.UTF_8)) }.getOrNull()
            ?: return
        if (payload.optInt("v", -1) != 1 || payload.optString("type") != "battery_snapshot") return
        val percent = payload.optInt("batteryPercent", -1)
        if (percent !in 0..100 || !payload.has("charging")) return
        val charging = payload.opt("charging")
        if (charging !is Boolean) return

        val sentAt = payload.optLong("sentAtMillis", 0L)
        val now = System.currentTimeMillis()
        if (sentAt <= 0L || abs(now - sentAt) > 10 * 60 * 1000L) return
        val nonce = payload.optString("nonce", "")
        if (!Regex("[0-9a-fA-F-]{36}").matches(nonce)) return
        val rawModel = payload.optString("model", "")
        if (rawModel.isBlank() || rawModel.length > 100) return
        val model = rawModel.filter { !it.isISOControl() }.take(80)

        // commit() provides persistence before ACK is sent to the watch.
        val saved = prefs.edit()
            .putString(KEY_NODE, node)
            .putString(KEY_MODEL, model)
            .putInt(KEY_BATTERY, percent)
            .putBoolean(KEY_CHARGING, charging)
            .putLong(KEY_SENT_AT, sentAt)
            .putLong(KEY_RECEIVED_AT, now)
            .commit()
        if (!saved) return

        val ack = JSONObject()
            .put("v", 1)
            .put("nonce", nonce)
            .put("receivedAtMillis", now)
            .toString().toByteArray(Charsets.UTF_8)
        Wearable.getMessageClient(this).sendMessage(node, PATH_ACK, ack)
    }
}
