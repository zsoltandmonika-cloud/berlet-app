package hu.zsoltmonika.healthhubbridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ScheduledSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        private const val APP_KEY = DropboxVaultClient.APP_KEY
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        DropboxVaultClient.ensureCredentialVersion(prefs)
        if (!prefs.getBoolean(SyncScheduler.KEY_ENABLED, false)) return Result.success()

        val profile = prefs.getString("device_owner_profile", null)
        if (profile != "zsolt" && profile != "monika") {
            prefs.edit().putString("last_auto_sync_error", "Nincs rögzített telefon-tulajdonos profil.").apply()
            return Result.success()
        }

        if (prefs.getString("dropbox_refresh_token", null).isNullOrBlank()) {
            prefs.edit().putString("last_auto_sync_error", "Dropbox nincs csatlakoztatva.").apply()
            return Result.success()
        }

        return try {
            if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
                error("Health Connect nem elérhető")
            }

            val client = HealthConnectClient.getOrCreate(applicationContext)
            val granted = client.permissionController.getGrantedPermissions()
            if (!granted.containsAll(HealthConnectExporter.requiredPermissions(client))) {
                error("Hiányzó Health Connect adatengedély")
            }
            if (HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND !in granted) {
                error("Hiányzik a háttérben olvasás engedélye")
            }

            val exporter = HealthConnectExporter(client)
            val json: JSONObject = exporter.export(profile)
            if (!exporter.hasUsefulData(json)) {
                error("Nem érkezett tényleges Health Connect-mérés az elmúlt 30 napban: " + exporter.countSummary(json))
            }
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
            DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
            DropboxVaultClient.uploadText(
                prefs,
                DropboxVaultClient.healthConnectPath(profile),
                json.toString(2) + "\n"
            )

            prefs.edit()
                .putLong("last_auto_sync_ms", System.currentTimeMillis())
                .remove("last_auto_sync_error")
                .apply()
            Result.success()
        } catch (e: Exception) {
            prefs.edit()
                .putLong("last_auto_sync_error_ms", System.currentTimeMillis())
                .putString("last_auto_sync_error", e.message ?: e.javaClass.simpleName)
                .apply()
            Result.retry()
        }
    }

    private suspend fun getAccessToken(): String {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString("dropbox_access_token", null)
        val exp = prefs.getLong("dropbox_access_expires", 0L)
        if (!existing.isNullOrBlank() && exp > System.currentTimeMillis() + 60_000L) return existing

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

    private fun uploadIncoming(profile: String, json: String, token: String) {
        val arg = JSONObject()
            .put("path", "/incoming-$profile.json")
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
        conn.outputStream.use { it.write(json.toByteArray(Charsets.UTF_8)) }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val text = stream.bufferedReader().use { it.readText() }
        if (conn.responseCode !in 200..299) error("Dropbox upload HTTP ${conn.responseCode}: $text")
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
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val text = stream.bufferedReader().use { it.readText() }
        if (conn.responseCode !in 200..299) error("Dropbox HTTP ${conn.responseCode}: $text")
        return JSONObject(text)
    }

    private fun form(values: Map<String, String>): String =
        values.entries.joinToString("&") {
            URLEncoder.encode(it.key, "UTF-8") + "=" + URLEncoder.encode(it.value, "UTF-8")
        }
}
