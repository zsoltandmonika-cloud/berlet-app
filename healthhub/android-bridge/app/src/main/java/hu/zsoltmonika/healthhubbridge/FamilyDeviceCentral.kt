package hu.zsoltmonika.healthhubbridge

import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom

/**
 * Independent, opt-in central phone registry. Never touches Dropbox credentials,
 * owner profile, native device ID, Family Guard location or Health Connect data.
 * Pairing requires the same device ID and a 256-bit secret approved through the
 * already authenticated Health Vault web session.
 */
internal object FamilyDeviceCentral {
    private const val ENDPOINT = "https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-family-device-heartbeat-v1"
    private const val SECRET = "family_registry_device_secret_v1"
    private const val ENROLLED = "family_registry_enrollment_started_v1"
    const val RESULT = "family_registry_last_result_v1"
    const val LAST_VERIFIED = "family_registry_last_verified_v1"
    private val devicePattern = Regex("^android-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$")

    fun prepared(prefs: SharedPreferences): Boolean =
        prefs.getBoolean(ENROLLED, false) && !prefs.getString(SECRET, null).isNullOrBlank()

    /** Called ONLY by explicit owner tap. Never generate a different Android ID. */
    fun prepare(prefs: SharedPreferences, owner: String?, deviceId: String?): String? {
        if (owner != "zsolt" || deviceId == null || !devicePattern.matches(deviceId)) return null
        var secret = prefs.getString(SECRET, null)
        if (secret.isNullOrBlank()) {
            val bytes = ByteArray(32)
            SecureRandom().nextBytes(bytes)
            secret = bytes.joinToString("") { "%02x".format(it.toInt() and 255) }
            prefs.edit().putString(SECRET, secret).apply()
        }
        prefs.edit().putBoolean(ENROLLED, true).apply()
        return "$deviceId:$secret"
    }

    suspend fun heartbeat(prefs: SharedPreferences, owner: String?, deviceId: String?,
                          build: String): String {
        if (owner != "zsolt" || deviceId == null || !devicePattern.matches(deviceId) || !prepared(prefs))
            return "not_enrolled"
        val secret = prefs.getString(SECRET, null) ?: return "not_enrolled"
        if (!Regex("^[a-f0-9]{64}$").matches(secret)) return "invalid_local_secret"
        return withContext(Dispatchers.IO) {
            val connection = URL(ENDPOINT).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = 10_000
                connection.readTimeout = 12_000
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")
                val request = JSONObject().put("profile_key", owner)
                    .put("device_id", deviceId)
                    .put("device_secret", secret)
                    .put("build", build).toString()
                connection.outputStream.use { it.write(request.toByteArray(Charsets.UTF_8)) }
                val responseCode = connection.responseCode
                val response = try {
                    val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
                    stream?.bufferedReader()?.use { it.readText().take(1500) } ?: "{}"
                } catch (_: Exception) { "{}" }
                val data = try { JSONObject(response) } catch (_: Exception) { JSONObject() }
                val result = when {
                    responseCode == 200 && data.optBoolean("ok") &&
                        data.optString("device_id") == deviceId && data.optString("profile_key") == owner ->
                        "verified"
                    responseCode == 403 && data.optString("error") == "pairing_not_approved" ->
                        "awaiting_owner_approval"
                    responseCode == 403 -> "identity_rejected"
                    else -> "unavailable_$responseCode"
                }
                prefs.edit().putString(RESULT, result).also {
                    if (result == "verified") it.putLong(LAST_VERIFIED, System.currentTimeMillis())
                }.apply()
                result
            } finally { connection.disconnect() }
        }
    }
}
