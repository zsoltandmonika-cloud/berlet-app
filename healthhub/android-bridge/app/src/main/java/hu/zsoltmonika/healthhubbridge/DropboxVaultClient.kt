package hu.zsoltmonika.healthhubbridge

import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object DropboxVaultClient {
    const val APP_KEY = "t68rmhh5f1l8d85"
    const val WEB_REDIRECT = "https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/"
    const val ROOT = "/HealthHub"
    const val DAILY_DIR = "/HealthHub/daily"
    const val PROFILES_DIR = "/HealthHub/profiles"
    const val DAILY_SPARK = "/HealthHub/daily/daily-spark.json"
    const val DAILY_BRIEFING = "/HealthHub/daily/daily-briefing.json"

    fun healthConnectPath(profile: String): String = PROFILES_DIR + "/" + profile + "-health-connect.json"

    private const val CLIENT_MARKER = "dropbox_client_id_v2"

    fun ensureCredentialVersion(prefs: SharedPreferences) {
        val marker = prefs.getString(CLIENT_MARKER, null)
        if (marker == APP_KEY) return
        prefs.edit()
            .remove("dropbox_refresh_token")
            .remove("dropbox_access_token")
            .remove("dropbox_access_expires")
            .remove("dropbox_pkce_verifier")
            .remove("dropbox_oauth_state")
            .remove("dropbox_pending_profile")
            .putString(CLIENT_MARKER, APP_KEY)
            .apply()
    }

    fun hasRefreshToken(prefs: SharedPreferences): Boolean =
        !prefs.getString("dropbox_refresh_token", null).isNullOrBlank()

    suspend fun accessToken(prefs: SharedPreferences): String {
        ensureCredentialVersion(prefs)
        val existing = prefs.getString("dropbox_access_token", null)
        val exp = prefs.getLong("dropbox_access_expires", 0L)
        if (!existing.isNullOrBlank() && exp > System.currentTimeMillis() + 60_000L) {
            return existing
        }

        val refresh = prefs.getString("dropbox_refresh_token", null)
            ?: error("Dropbox nincs csatlakoztatva")

        val body = form(
            mapOf(
                "refresh_token" to refresh,
                "grant_type" to "refresh_token",
                "client_id" to APP_KEY
            )
        )
        val j = withContext(Dispatchers.IO) {
            postForm("https://api.dropboxapi.com/oauth2/token", body)
        }
        val access = j.optString("access_token")
        val expires = j.optLong("expires_in", 14400L)
        if (access.isBlank()) error("Dropbox access token hiányzik")

        prefs.edit()
            .putString("dropbox_access_token", access)
            .putLong("dropbox_access_expires", System.currentTimeMillis() + (expires - 60L) * 1000L)
            .apply()
        return access
    }

    suspend fun ensureFolder(prefs: SharedPreferences, path: String) {
        val token = accessToken(prefs)
        withContext(Dispatchers.IO) {
            val body = JSONObject().put("path", path).put("autorename", false).toString()
            val conn = (URL("https://api.dropboxapi.com/2/files/create_folder_v2").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 20_000
                readTimeout = 20_000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
            }
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val text = responseText(conn)
            if (conn.responseCode !in 200..299 && !(conn.responseCode == 409 && text.contains("conflict", ignoreCase = true))) {
                error("Dropbox mappa hiba " + conn.responseCode + ": " + text)
            }
        }
    }

    suspend fun uploadText(prefs: SharedPreferences, path: String, text: String) {
        val token = accessToken(prefs)
        withContext(Dispatchers.IO) {
            val arg = JSONObject()
                .put("path", path)
                .put("mode", "overwrite")
                .put("autorename", false)
                .put("mute", true)
                .toString()
            val conn = (URL("https://content.dropboxapi.com/2/files/upload").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 30_000
                readTimeout = 30_000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/octet-stream")
                setRequestProperty("Dropbox-API-Arg", arg)
            }
            conn.outputStream.use { it.write(text.toByteArray(Charsets.UTF_8)) }
            val response = responseText(conn)
            if (conn.responseCode !in 200..299) {
                error("Dropbox upload HTTP " + conn.responseCode + ": " + response)
            }
        }
    }

    suspend fun downloadTextOrNull(prefs: SharedPreferences, path: String): String? {
        val token = accessToken(prefs)
        return withContext(Dispatchers.IO) {
            val arg = JSONObject().put("path", path).toString()
            val conn = (URL("https://content.dropboxapi.com/2/files/download").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 30_000
                readTimeout = 30_000
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Dropbox-API-Arg", arg)
            }
            val text = responseText(conn)
            if (conn.responseCode == 409) return@withContext null
            if (conn.responseCode !in 200..299) {
                error("Dropbox download HTTP " + conn.responseCode + ": " + text)
            }
            text
        }
    }

    private fun responseText(conn: HttpURLConnection): String {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return stream?.bufferedReader()?.use { it.readText() } ?: ""
    }

    private fun postForm(url: String, body: String): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 20_000
            readTimeout = 20_000
            setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        }
        conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val text = responseText(conn)
        if (conn.responseCode !in 200..299) error("Dropbox HTTP " + conn.responseCode + ": " + text)
        return JSONObject(text)
    }

    private fun form(values: Map<String, String>): String =
        values.entries.joinToString("&") {
            URLEncoder.encode(it.key, "UTF-8") + "=" + URLEncoder.encode(it.value, "UTF-8")
        }
}
