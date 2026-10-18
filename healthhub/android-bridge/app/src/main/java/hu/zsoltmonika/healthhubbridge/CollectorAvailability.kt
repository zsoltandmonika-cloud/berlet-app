package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.pm.PackageManager
import androidx.health.connect.client.HealthConnectClient

/**
 * v0.15 foundation: source availability is not source freshness.
 *
 * This registry deliberately does not attempt Samsung SDK reads. The native
 * Samsung Data SDK is not yet linked to this Connect module, and the Beta
 * implementation/package approval has not been migrated. A successful HC
 * upload MUST NOT change the Samsung status.
 */
internal object CollectorAvailability {
    enum class State { AVAILABLE, PERMISSION_REQUIRED, NOT_INTEGRATED, UNAVAILABLE }

    data class SourceStatus(
        val sourceId: String,
        val state: State,
        val summary: String,
        val lastReadAtMs: Long? = null,
        val lastUploadAtMs: Long? = null
    )

    fun healthConnect(context: Context): SourceStatus {
        val supported = try {
            HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        } catch (_: Exception) {
            false
        }
        return SourceStatus(
            sourceId = "health-connect",
            state = if (supported) State.AVAILABLE else State.UNAVAILABLE,
            summary = if (supported)
                "A Health Connect szolgáltatás elérhető. Az adatolvasás és a jogosultság külön ellenőrzendő."
            else "A Health Connect jelenleg nem elérhető ezen az eszközön."
        )
    }

    fun samsungSdk(): SourceStatus = SourceStatus(
        sourceId = "samsung-health-sdk",
        state = State.NOT_INTEGRATED,
        summary = "A Samsung Health Data SDK még nincs beépítve ebbe a Connect APK-ba. " +
            "A HH Samsung Beta alkalmazást továbbra is meg kell tartani."
    )

    fun userStatus(context: Context): String {
        val hc = healthConnect(context)
        val samsung = samsungSdk()
        return "Health Connect · ${hc.state.name}\n${hc.summary}\n\n" +
            "Samsung Health SDK · ${samsung.state.name}\n${samsung.summary}"
    }
}
