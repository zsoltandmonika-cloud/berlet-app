package hu.zsoltmonika.healthhubbridge

import org.json.JSONObject
import java.time.Instant

/**
 * Read-only proof of the existing native Orchestrator heartbeat in the exact
 * Dropbox App Folder selected by this HH One instance.
 *
 * Successful manual Health Connect upload is NOT proof of device registration.
 * This validator never creates IDs, changes the owner or selects a main phone.
 */
internal object DeviceRegistrationReceipt {
    data class Verdict(
        val verified: Boolean,
        val message: String,
        val lastSeenAt: String? = null
    )

    fun inspect(
        text: String?,
        expectedId: String,
        expectedOwner: String,
        startedAtMillis: Long,
        nowMillis: Long
    ): Verdict {
        if (text.isNullOrBlank()) {
            return Verdict(false, "A natív Dropboxban nincs visszaolvasható Android-eszközjelentés.")
        }
        val data = try {
            JSONObject(text)
        } catch (_: Exception) {
            return Verdict(false, "A visszaolvasott eszközjelentés nem érvényes JSON.")
        }
        if (data.optString("schema") != "healthhub.orchestrator.device/1" ||
            data.optString("deviceType") != "android" ||
            data.optString("deviceId") != expectedId
        ) {
            return Verdict(false, "A Dropboxban lévő eszközjelentés azonosítója vagy típusa eltér.")
        }
        if (expectedOwner !in setOf("zsolt", "monika") ||
            data.optString("activeProfile") != expectedOwner
        ) {
            return Verdict(false, "A jelentésben másik vagy hiányzó tulajdonosprofil szerepel.")
        }
        val iso = data.optString("lastSeenAt")
        val seenAt = try {
            Instant.parse(iso).toEpochMilli()
        } catch (_: Exception) {
            return Verdict(false, "Az Android-jelentés időbélyege nem ellenőrizhető.")
        }
        // A response from an earlier run is not evidence for this button press.
        if (seenAt < startedAtMillis - 15_000L ||
            seenAt > nowMillis + 5L * 60_000L
        ) {
            return Verdict(false, "Csak korábbi vagy hibás időpontú Android-jelentés található.")
        }
        return Verdict(
            true,
            "Az Android-eszközjelentés feltöltve és ugyanebből a Dropboxból visszaolvasva.",
            iso
        )
    }
}
