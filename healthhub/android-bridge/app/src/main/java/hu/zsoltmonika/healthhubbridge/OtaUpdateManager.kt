package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * A read-only, GitHub-hosted release channel. A server can OFFER an update but
 * cannot execute arbitrary code or silently install anything on a phone.
 * Android verifies the installed package's signing identity when replacing it.
 */
object OtaUpdateManager {
    private const val MANIFEST_URL =
        "https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/data/bridge-ota.json"
    private const val RELEASE_PREFIX =
        "https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/"
    private const val PREFS = SyncScheduler.PREFS
    private const val PREF_CANDIDATE = "ota_signed_candidate_v1"
    private const val PREF_CHECKED_AT = "ota_checked_at_v1"
    private const val PREF_ERROR = "ota_last_error_v1"
    private const val CHANNEL = "healthhub-app-updates-v1"
    private const val MAX_APK_BYTES = 120L * 1024L * 1024L

    data class Candidate(
        val version: String,
        val versionCode: Int,
        val downloadUrl: String,
        val sha256: String
    )

    fun schedule(context: Context) {
        val req = PeriodicWorkRequestBuilder<OtaCheckWorker>(12, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "healthhub-ota-check-v1", ExistingPeriodicWorkPolicy.KEEP, req
        )
    }

    fun lastChecked(context: Context): Long =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong(PREF_CHECKED_AT, 0L)

    fun lastError(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PREF_ERROR, null)

    fun cached(context: Context): Candidate? {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(PREF_CANDIDATE, null) ?: return null
        return try { parseCandidate(context, JSONObject(raw)) } catch (_: Exception) { null }
    }

    private fun parseCandidate(context: Context, obj: JSONObject): Candidate? {
        if (obj.optString("schema") != "healthhub.connect.ota/1") return null
        if (obj.optString("channel") != "signed-release") return null
        if (obj.optString("applicationId") != context.packageName) return null
        val owner = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("device_owner_profile", null) ?: return null
        val profiles = obj.optJSONArray("rolloutProfiles") ?: return null
        if ((0 until profiles.length()).none { profiles.optString(it) == owner }) return null
        val code = obj.optInt("versionCode")
        if (code <= BuildConfig.VERSION_CODE) return null
        val version = obj.optString("version")
        if (!Regex("^[0-9]+\\.[0-9]+\\.[0-9]+$").matches(version)) return null
        val expected = RELEASE_PREFIX +
            "healthhub-connect-ota-v" + version + "/HealthHub-Connect-v" + version + "-ota.apk"
        val url = obj.optString("downloadUrl")
        if (url != expected) return null
        val sha = obj.optString("sha256").lowercase(Locale.ROOT)
        if (!Regex("^[a-f0-9]{64}$").matches(sha)) return null
        return Candidate(version, code, url, sha)
    }

    suspend fun check(context: Context): Candidate? = withContext(Dispatchers.IO) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        try {
            val connection = URL(MANIFEST_URL).openConnection() as HttpURLConnection
            connection.connectTimeout = 12000
            connection.readTimeout = 12000
            connection.setRequestProperty("Cache-Control", "no-cache")
            val raw = connection.useConnection { conn ->
                if (conn.responseCode == 404) return@useConnection null
                if (conn.responseCode != 200) error("Frissítési kiszolgáló: HTTP ${conn.responseCode}")
                val bytes = conn.inputStream.use { input ->
                    val output = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(1024)
                    while (true) {
                        val n = input.read(buffer)
                        if (n < 0) break
                        if (output.size() + n > 8192) error("Túlméretes frissítési leíró.")
                        output.write(buffer, 0, n)
                    }
                    output.toByteArray()
                }
                String(bytes, Charsets.UTF_8)
            }
            val candidate = raw?.let { parseCandidate(context, JSONObject(it)) }
            prefs.edit()
                .putString(PREF_CANDIDATE, if (candidate == null) null else raw)
                .putLong(PREF_CHECKED_AT, System.currentTimeMillis())
                .remove(PREF_ERROR)
                .apply()
            candidate
        } catch (e: Exception) {
            prefs.edit().putString(PREF_ERROR, e.message?.take(170) ?: "Kapcsolati hiba").apply()
            throw e
        }
    }

    // Prefer a private app-cache download with content-URI sharing. Nothing is
    // accepted from a remote command without an explicit tap on the phone.
    suspend fun downloadVerified(context: Context, candidate: Candidate): Uri =
        withContext(Dispatchers.IO) {
            if (candidate.versionCode <= BuildConfig.VERSION_CODE) error("Nem újabb verzió.")
            val url = URL(candidate.downloadUrl)
            if (url.protocol != "https" || url.host != "github.com") error("Nem megbízható letöltési cím.")
            val folder = File(context.cacheDir, "ota").apply { mkdirs() }
            val target = File(folder, "HealthHub-Connect-v${candidate.version}-ota.apk")
            val temp = File(folder, "healthhub-download.part")
            try {
                val digest = MessageDigest.getInstance("SHA-256")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 15000
                conn.readTimeout = 45000
                conn.instanceFollowRedirects = true
                conn.useConnection { connection ->
                    if (connection.responseCode != 200) error("APK letöltési hiba HTTP ${connection.responseCode}")
                    if (connection.url.protocol != "https") error("A letöltés nem biztonságos.")
                    var total = 0L
                    connection.inputStream.use { input ->
                        temp.outputStream().use { output ->
                            val buffer = ByteArray(65536)
                            while (true) {
                                val n = input.read(buffer)
                                if (n < 0) break
                                total += n
                                if (total > MAX_APK_BYTES) error("A csomag mérete meghaladja a biztonsági limitet.")
                                digest.update(buffer, 0, n)
                                output.write(buffer, 0, n)
                            }
                        }
                    }
                    if (total < 10000L) error("Érvénytelen APK-méret.")
                }
                val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
                if (actual != candidate.sha256) error("APK SHA-256 eltérés: telepítés leállítva.")
                if (!temp.renameTo(target)) {
                    temp.copyTo(target, overwrite = true)
                    temp.delete()
                }
                FileProvider.getUriForFile(context, context.packageName + ".ota", target)
            } catch (e: Exception) {
                temp.delete()
                throw e
            }
        }

    fun openSystemInstaller(activity: Activity, uri: Uri) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.startActivity(intent)
    }

    fun unknownSourcesAllowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.packageManager.canRequestPackageInstalls()

    fun notifyAvailable(context: Context, candidate: Candidate) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "HealthHub alkalmazásfrissítések", NotificationManager.IMPORTANCE_DEFAULT)
        )
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val tap = PendingIntent.getActivity(
            context, 140, tapIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = android.app.Notification.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("HealthHub Connect v${candidate.version}")
            .setContentText("Ellenőrzött frissítés elérhető. Koppints a telepítési jóváhagyáshoz.")
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build()
        manager.notify(140, notification)
    }

    private inline fun <T> HttpURLConnection.useConnection(block: (HttpURLConnection) -> T): T {
        try { return block(this) } finally { disconnect() }
    }
}

class OtaCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val candidate = OtaUpdateManager.check(applicationContext)
            if (candidate != null) OtaUpdateManager.notifyAvailable(applicationContext, candidate)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
