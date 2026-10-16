package hu.zsoltmonika.healthhubbridge

import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONArray
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.Instant
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object DropboxVaultClient {
    // Multiple WorkManager workers and manual sync all write the same owner file.
    // Serializing read/compare/merge/upload in-process prevents routine last-write-wins loss.
    private val healthSnapshotLock = Mutex()
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
            fun metadataExists(): Boolean {
                val body = JSONObject()
                    .put("path", path)
                    .put("include_media_info", false)
                    .put("include_deleted", false)
                    .toString()
                val conn = (URL("https://api.dropboxapi.com/2/files/get_metadata").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 20_000
                    readTimeout = 20_000
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type", "application/json")
                }
                conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                val text = responseText(conn)
                if (conn.responseCode in 200..299) {
                    return try { JSONObject(text).optString(".tag") == "folder" } catch (_: Exception) { false }
                }
                if (conn.responseCode == 409) return false
                error("Dropbox mappa ellenőrzési hiba " + conn.responseCode + ": " + text)
            }

            if (metadataExists()) return@withContext

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
            if (conn.responseCode in 200..299) return@withContext

            if (conn.responseCode == 409) {
                try {
                    if (metadataExists()) return@withContext
                } catch (_: Exception) {
                    // Fall through to the original Dropbox response below.
                }
            }

            error("Dropbox mappa hiba " + path + " · HTTP " + conn.responseCode + ": " + text)
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

    /**
     * All manual, scheduled, self-healing and remote health sync paths use this
     * routine. Never erase a previously valid daily measurement just because
     * one Health Connect provider has a malformed interval today.
     */
    suspend fun uploadHealthConnectSnapshot(
        prefs: SharedPreferences,
        profile: String,
        snapshot: JSONObject
    ) {
        require(profile == "zsolt" || profile == "monika") { "Érvénytelen telefonprofil" }
        require(snapshot.optString("profile") == profile) { "Eltérő exportprofil" }
        val exportedAt = Instant.parse(snapshot.getString("exportedAt"))
        val path = healthConnectPath(profile)
        healthSnapshotLock.withLock {
            val previousText = downloadTextOrNull(prefs, path)
            if (!previousText.isNullOrBlank()) {
                val previous = JSONObject(previousText)
                // If cloud content belongs to the other person or is malformed,
                // refuse the overwrite instead of guessing / silently erasing.
                check(previous.optString("profile") == profile) {
                    "A felhőfájl profilja eltér: feltöltés megállítva"
                }
                val priorAt = Instant.parse(previous.getString("exportedAt"))
                if (priorAt.isAfter(exportedAt)) {
                    // Another worker already delivered fresher data. No overwrite.
                    return@withLock
                }
                val diagnostics = snapshot.optJSONObject("syncDiagnostics")
                val incoming = snapshot.getJSONObject("records")
                val existing = previous.optJSONObject("records")
                if (diagnostics != null && existing != null) {
                    recoverFailedDays(
                        incoming, existing, "dailyActivity",
                        diagnostics.optJSONArray("failedDailyActivityDates")
                    )
                    recoverFailedDays(
                        incoming, existing, "dailySteps",
                        diagnostics.optJSONArray("failedDailyActivityDates")
                    )
                    recoverFailedDays(
                        incoming, existing, "dailyNutrition",
                        diagnostics.optJSONArray("failedDailyNutritionDates")
                    )
                    // These lengths now describe the published snapshot, not just
                    // freshly aggregated dates. The original failure counts remain.
                    val counts = snapshot.optJSONObject("counts")
                    counts?.put("activityDays", incoming.optJSONArray("dailyActivity")?.length() ?: 0)
                    counts?.put("stepDays", incoming.optJSONArray("dailySteps")?.length() ?: 0)
                    counts?.put("nutritionDays", incoming.optJSONArray("dailyNutrition")?.length() ?: 0)
                }
            }
            uploadText(prefs, path, snapshot.toString(2) + "\n")
        }
    }

    private fun recoverFailedDays(
        incoming: JSONObject,
        prior: JSONObject,
        key: String,
        failed: JSONArray?
    ) {
        if (failed == null || failed.length() == 0) return
        val failedDates = (0 until failed.length())
            .mapNotNull { failed.optString(it).takeIf { date ->
                date.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))
            } }.toSet()
        if (failedDates.isEmpty()) return
        val dest = incoming.optJSONArray(key) ?: JSONArray()
        val stored = prior.optJSONArray(key) ?: return
        val byDate = linkedMapOf<String, JSONObject>()
        for (i in 0 until dest.length()) {
            val row = dest.optJSONObject(i) ?: continue
            val date = row.optString("date")
            if (date.isNotBlank()) byDate[date] = row
        }
        for (i in 0 until stored.length()) {
            val row = stored.optJSONObject(i) ?: continue
            val date = row.optString("date")
            if (date in failedDates && date !in byDate) byDate[date] = row
        }
        val merged = JSONArray()
        byDate.toSortedMap().values.forEach { merged.put(it) }
        incoming.put(key, merged)
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
