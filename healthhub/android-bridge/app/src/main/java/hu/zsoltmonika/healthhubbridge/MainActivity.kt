package hu.zsoltmonika.healthhubbridge

import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.MessageDigest
import java.security.SecureRandom

class MainActivity : ComponentActivity() {
    companion object {
        private const val DROPBOX_APP_KEY = "o2oe9qclhtoic9s"
        private const val DROPBOX_REDIRECT = "healthhubconnect://dropbox"
        private const val HEALTHHUB_URL = "https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/"
        private const val PREFS = "healthhub_connect"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var status: TextView
    private lateinit var profileSpinner: Spinner
    private lateinit var saveButton: Button
    private var pendingJson: String? = null
    private var client: HealthConnectClient? = null
    private var pendingAutoSync = false

    private val prefs by lazy { getSharedPreferences(PREFS, MODE_PRIVATE) }

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.containsAll(HealthConnectExporter.REQUIRED_PERMISSIONS)) {
            status.text = "✓ Health Connect engedélyek rendben."
            if (pendingAutoSync) {
                pendingAutoSync = false
                syncNow()
            }
        } else {
            pendingAutoSync = false
            status.text = "Hiányzik legalább egy Health Connect engedély."
        }
    }

    private val saveLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        val data = pendingJson
        if (uri != null && data != null) {
            contentResolver.openOutputStream(uri)?.use { it.write(data.toByteArray(Charsets.UTF_8)) }
            status.text = "✓ JSON elmentve. Ez a Plan B kézi importfájl."
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildUi())
        initHealthConnect()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun initHealthConnect() {
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_AVAILABLE -> {
                client = HealthConnectClient.getOrCreate(this)
                status.text = "Health Connect elérhető."
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ->
                status.text = "A Health Connect frissítése szükséges."
            else ->
                status.text = "A Health Connect ezen az eszközön jelenleg nem elérhető."
        }
    }

    private fun handleIntent(i: Intent?) {
        val data = i?.data ?: return
        if (data.scheme != "healthhubconnect") return
        when (data.host) {
            "sync" -> {
                val p = data.getQueryParameter("profile")
                if (p == "monika") profileSpinner.setSelection(1) else profileSpinner.setSelection(0)
                syncNow()
            }
            "dropbox" -> handleDropboxCallback(data)
        }
    }

    private fun buildUi(): View {
        val pad = 30
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(0xFFEEF7FB.toInt())
        }

        root.addView(TextView(this).apply {
            text = "HealthHub Connect"
            textSize = 28f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF0B2D50.toInt())
        })
        root.addView(TextView(this).apply {
            text = "Health Connect → Dropbox → HealthHub\nSYNC NOW = egygombos frissítés"
            textSize = 16f
            setTextColor(0xFF315F98.toInt())
            setPadding(0, 8, 0, 24)
        })

        root.addView(TextView(this).apply { text = "Profil"; textSize = 15f })
        profileSpinner = Spinner(this)
        profileSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Zsolt", "Mónika")
        )
        root.addView(profileSpinner)

        root.addView(Button(this).apply {
            text = "🔄 SYNC NOW"
            setOnClickListener { syncNow() }
        })

        root.addView(Button(this).apply {
            text = "Health Connect engedélyek"
            setOnClickListener {
                permissionLauncher.launch(HealthConnectExporter.REQUIRED_PERMISSIONS)
            }
        })

        root.addView(Button(this).apply {
            text = "Csak beolvasás"
            setOnClickListener { readHealthData() }
        })

        saveButton = Button(this).apply {
            text = "Plan B · JSON mentése"
            isEnabled = false
            setOnClickListener {
                val p = selectedProfile()
                saveLauncher.launch("healthhub-healthconnect-${p}-${System.currentTimeMillis()}.json")
            }
        }
        root.addView(saveButton)

        root.addView(Button(this).apply {
            text = "HealthHub megnyitása"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(HEALTHHUB_URL)))
            }
        })

        status = TextView(this).apply {
            text = "Indítás…"
            textSize = 16f
            setTextColor(0xFF173F62.toInt())
            setPadding(0, 28, 0, 0)
        }
        root.addView(status)
        return root
    }

    private fun selectedProfile() =
        if (profileSpinner.selectedItemPosition == 1) "monika" else "zsolt"

    private fun readHealthData() {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(HealthConnectExporter.REQUIRED_PERMISSIONS)) {
                    status.text = "Előbb add meg a Health Connect engedélyeket."
                    return@launch
                }
                status.text = "Health Connect adatok olvasása…"
                val json = HealthConnectExporter(hc).export(selectedProfile())
                pendingJson = json.toString(2)
                saveButton.isEnabled = true
                val c = json.getJSONObject("counts")
                status.text = "✓ Beolvasva. Pulzusrekord: ${c.getInt("heartRateRecords")}, aktivitásnap: ${c.getInt("activityDays")}, alvás: ${c.getInt("sleepSessions")}."
            } catch (e: Exception) {
                status.text = "Hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private fun syncNow() {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(HealthConnectExporter.REQUIRED_PERMISSIONS)) {
                    pendingAutoSync = true
                    status.text = "Health Connect engedély szükséges…"
                    permissionLauncher.launch(HealthConnectExporter.REQUIRED_PERMISSIONS)
                    return@launch
                }
                if (prefs.getString("dropbox_refresh_token", null).isNullOrBlank()) {
                    status.text = "Első alkalom: Dropbox engedélyezés…"
                    startDropboxAuth(selectedProfile())
                    return@launch
                }
                exportAndUpload(selectedProfile())
            } catch (e: Exception) {
                status.text = "SYNC hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private suspend fun exportAndUpload(profile: String) {
        val hc = client ?: error("Health Connect nem elérhető")
        status.text = "Health Connect friss adatok beolvasása…"
        val json: JSONObject = HealthConnectExporter(hc).export(profile)
        pendingJson = json.toString(2)
        saveButton.isEnabled = true

        status.text = "Dropbox Vault frissítése…"
        val token = getAccessToken()
        withContext(Dispatchers.IO) {
            uploadIncoming(profile, json.toString(), token)
        }
        status.text = "✓ SYNC kész · ${if (profile == "monika") "Mónika" else "Zsolt"} · Dropbox frissítve."

        val back = Uri.parse(HEALTHHUB_URL).buildUpon()
            .appendQueryParameter("bridgeSync", "1")
            .appendQueryParameter("profile", profile)
            .appendQueryParameter("ts", System.currentTimeMillis().toString())
            .build()
        startActivity(Intent(Intent.ACTION_VIEW, back))
    }

    private fun startDropboxAuth(profile: String) {
        val verifier = randomUrlSafe(64)
        val challenge = sha256UrlSafe(verifier)
        val state = randomUrlSafe(24)
        prefs.edit()
            .putString("dropbox_pkce_verifier", verifier)
            .putString("dropbox_oauth_state", state)
            .putString("dropbox_pending_profile", profile)
            .apply()

        val url = Uri.parse("https://www.dropbox.com/oauth2/authorize").buildUpon()
            .appendQueryParameter("client_id", DROPBOX_APP_KEY)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("redirect_uri", DROPBOX_REDIRECT)
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("token_access_type", "offline")
            .appendQueryParameter("state", state)
            .build()
        startActivity(Intent(Intent.ACTION_VIEW, url))
    }

    private fun handleDropboxCallback(uri: Uri) {
        val error = uri.getQueryParameter("error")
        if (error != null) {
            status.text = "Dropbox engedélyezés sikertelen: $error"
            return
        }
        val code = uri.getQueryParameter("code") ?: return
        val state = uri.getQueryParameter("state")
        val expected = prefs.getString("dropbox_oauth_state", null)
        val verifier = prefs.getString("dropbox_pkce_verifier", null)
        val profile = prefs.getString("dropbox_pending_profile", null) ?: selectedProfile()
        if (state.isNullOrBlank() || state != expected || verifier.isNullOrBlank()) {
            status.text = "Dropbox OAuth állapotellenőrzés sikertelen."
            return
        }

        scope.launch {
            try {
                status.text = "Dropbox kapcsolat befejezése…"
                val tokenJson = withContext(Dispatchers.IO) {
                    exchangeCode(code, verifier)
                }
                val refresh = tokenJson.optString("refresh_token")
                val access = tokenJson.optString("access_token")
                val expires = tokenJson.optLong("expires_in", 14400L)
                if (refresh.isBlank()) error("Dropbox refresh token hiányzik")
                prefs.edit()
                    .putString("dropbox_refresh_token", refresh)
                    .putString("dropbox_access_token", access)
                    .putLong("dropbox_access_expires", System.currentTimeMillis() + (expires - 60L) * 1000L)
                    .remove("dropbox_pkce_verifier")
                    .remove("dropbox_oauth_state")
                    .apply()
                if (profile == "monika") profileSpinner.setSelection(1) else profileSpinner.setSelection(0)
                exportAndUpload(profile)
            } catch (e: Exception) {
                status.text = "Dropbox kapcsolat hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private suspend fun getAccessToken(): String {
        val existing = prefs.getString("dropbox_access_token", null)
        val exp = prefs.getLong("dropbox_access_expires", 0L)
        if (!existing.isNullOrBlank() && exp > System.currentTimeMillis() + 60_000L) return existing

        val refresh = prefs.getString("dropbox_refresh_token", null)
            ?: error("Dropbox nincs csatlakoztatva")
        val j = withContext(Dispatchers.IO) { refreshAccessToken(refresh) }
        val access = j.optString("access_token")
        val expires = j.optLong("expires_in", 14400L)
        if (access.isBlank()) error("Dropbox access token hiányzik")
        prefs.edit()
            .putString("dropbox_access_token", access)
            .putLong("dropbox_access_expires", System.currentTimeMillis() + (expires - 60L) * 1000L)
            .apply()
        return access
    }

    private fun exchangeCode(code: String, verifier: String): JSONObject {
        val body = form(
            mapOf(
                "code" to code,
                "grant_type" to "authorization_code",
                "redirect_uri" to DROPBOX_REDIRECT,
                "code_verifier" to verifier,
                "client_id" to DROPBOX_APP_KEY
            )
        )
        return postForm("https://api.dropboxapi.com/oauth2/token", body)
    }

    private fun refreshAccessToken(refresh: String): JSONObject {
        val body = form(
            mapOf(
                "refresh_token" to refresh,
                "grant_type" to "refresh_token",
                "client_id" to DROPBOX_APP_KEY
            )
        )
        return postForm("https://api.dropboxapi.com/oauth2/token", body)
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

    private fun form(values: Map<String, String>): String =
        values.entries.joinToString("&") {
            URLEncoder.encode(it.key, "UTF-8") + "=" + URLEncoder.encode(it.value, "UTF-8")
        }

    private fun randomUrlSafe(bytes: Int): String {
        val b = ByteArray(bytes)
        SecureRandom().nextBytes(b)
        return Base64.encodeToString(b, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    private fun sha256UrlSafe(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
