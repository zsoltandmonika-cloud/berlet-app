package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/**
 * Watch5 Pro / Watch9: explicit one-tap LOCAL discovery pilot.
 * A Bluetooth bond is NOT a live connection and never yields a verified watch battery value.
 * No scans, pairing, MAC addresses, identifiers, persistence, cloud writes, GPS or background work.
 */
internal object WatchPairedProbeV1 {
    data class Snapshot(
        val state: String,
        val candidateNames: List<String> = emptyList(),
        val totalPaired: Int = 0
    ) {
        fun statusText(): String = when (state) {
            "permission" -> "⌚ Watch pilot: a Közeli eszközök (Bluetooth) engedély hiányzik."
            "bluetooth_off" -> "⌚ Watch pilot: a telefon Bluetooth funkciója ki van kapcsolva."
            "unavailable" -> "⌚ Watch pilot: a párosított eszközlista nem olvasható."
            "ok" -> if (candidateNames.isEmpty()) {
                "⌚ Watch pilot: nem találtam Watch nevű párosított eszközt. " +
                    "Ha az óra át van nevezve, ez nem jelenti azt, hogy nincs kapcsolat. " +
                    "Párosított Bluetooth-eszközök: $totalPaired. " +
                    "Óra online állapot: ismeretlen · akkumulátor: ismeretlen."
            } else {
                "⌚ Watch pilot: lehetséges párosított óra: " +
                    candidateNames.joinToString(", ") +
                    ". Ez csak párosítás, NEM élő kapcsolat. " +
                    "Óra online állapot: ismeretlen · akkumulátor: ismeretlen."
            }
            else -> "⌚ Watch pilot: nincs hitelesített óraadat."
        }
    }

    fun inspect(context: Context): Snapshot {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) !=
            PackageManager.PERMISSION_GRANTED) return Snapshot("permission")

        val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)
            ?.adapter ?: return Snapshot("unavailable")
        val enabled = runCatching { adapter.isEnabled }.getOrNull()
            ?: return Snapshot("unavailable")
        if (!enabled) return Snapshot("bluetooth_off")

        return runCatching {
            // Device names are best-effort hints, not validated model IDs.
            val all = adapter.bondedDevices.toList()
            val names = all.mapNotNull { d ->
                runCatching { d.name?.trim()?.takeIf(String::isNotBlank) }.getOrNull()
            }.filter { it.contains("watch", ignoreCase = true) }
                .distinct().sorted()
            Snapshot("ok", names, all.size)
        }.getOrElse { Snapshot("unavailable") }
    }
}
