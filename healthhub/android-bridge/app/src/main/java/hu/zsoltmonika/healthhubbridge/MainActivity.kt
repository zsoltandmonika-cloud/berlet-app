package hu.zsoltmonika.healthhubbridge

import android.app.TimePickerDialog
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
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    companion object {
        private const val DROPBOX_APP_KEY = DropboxVaultClient.APP_KEY
        private const val DROPBOX_REDIRECT = DropboxVaultClient.WEB_REDIRECT
        private const val HEALTHHUB_URL = DropboxVaultClient.WEB_REDIRECT
        private const val PREFS = "healthhub_connect"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var status: TextView
    private lateinit var profileSpinner: Spinner
    private lateinit var saveButton: Button
    private var betaAutoButton: Button? = null
    private var betaConnectionLabel: TextView? = null
    private lateinit var ownerLabel: TextView
    private lateinit var ownerButton: Button
    private lateinit var scheduleSummary: TextView
    private lateinit var scheduleToggleButton: Button
    private var pendingJson: String? = null
    private var client: HealthConnectClient? = null
    private var pendingAutoSync = false
    private var pendingScheduleEnable = false
    private var resilientSummary: TextView? = null

    private val prefs by lazy { getSharedPreferences(PREFS, MODE_PRIVATE) }

    private fun requiredPermissions(): Set<String> =
        client?.let { HealthConnectExporter.requiredPermissions(it) }
            ?: HealthConnectExporter.REQUIRED_PERMISSIONS

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (granted.containsAll(requiredPermissions())) {
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

    // Optional terrain access has its own launcher so refusal cannot disable ordinary sync.
    private val terrainPermissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        val obtained = granted.intersect(HealthConnectExporter.OPTIONAL_TERRAIN_PERMISSIONS)
        status.text = if (obtained.size == HealthConnectExporter.OPTIONAL_TERRAIN_PERMISSIONS.size) {
            "✓ Szintemelkedés és megmászott emeletek hozzáférése engedélyezve. Indíts SYNC NOW-t."
        } else {
            "ℹ️ A szintemelkedés és emeletadatok opcionálisak. A normál Health Connect szinkron változatlanul működik."
        }
    }

    private val backgroundPermissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        val ok = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND in granted
        if (ok && pendingScheduleEnable) {
            pendingScheduleEnable = false
            if (SyncScheduler.times(this).isEmpty()) SyncScheduler.addTime(this, "07:30")
            SyncScheduler.setEnabled(this, true)
            status.text = "✓ Automatikus sync engedélyezve."
            updateScheduleUi()
        } else if (!ok) {
            pendingScheduleEnable = false
            status.text = "A háttérben olvasás engedélye nélkül az ütemezett sync nem kapcsolható be."
            updateScheduleUi()
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
        if (SamsungSdkDailyReader.available) {
            // Beta has independent settings/tokens and a separate periodic worker.
            // The production Health Connect app and its workers are not touched.
            DropboxVaultClient.ensureCredentialVersion(prefs)
            setContentView(buildSamsungBetaUi())
            SamsungBetaScheduler.schedule(this)
            status.text = "Samsung Health Direct Beta · külön Dropbox Sync teszt. Az éles Connect érintetlen."
            updateSamsungBetaUi()
            handleSamsungBetaIntent(intent)
            return
        }
        setContentView(buildUi())
        DropboxVaultClient.ensureCredentialVersion(prefs)
        initHealthConnect()
        SyncScheduler.scheduleAll(this)
        ResilientHealthSync.schedule(this)
        DailyContentScheduler.schedule(this)
        OrchestratorScheduler.schedule(this)
        OrchestratorScheduler.runNow(this)
        updateScheduleUi()
        handleIntent(intent)
        updateResilientStatus()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (SamsungSdkDailyReader.available) {
            handleSamsungBetaIntent(intent)
            return
        }
        handleIntent(intent)
        OrchestratorScheduler.runNow(this)
        ResilientHealthSync.schedule(this)
        updateResilientStatus()
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

    private fun runHealthConnectDiagnostic() {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                val missing = requiredPermissions() - granted
                if (missing.isNotEmpty()) {
                    status.text = "Hiányzik ${missing.size} Health Connect olvasási engedély."
                    permissionLauncher.launch(missing)
                    return@launch
                }

                status.text = "Health Connect adatok ellenőrzése…"
                val json = HealthConnectExporter(hc).export(selectedProfile(), 7)
                val records = json.getJSONObject("records")
                val daily = records.optJSONArray("dailyActivity")
                val heart = records.optJSONArray("heartRate")
                val exercise = records.optJSONArray("exerciseSessions")
                val weight = records.optJSONArray("weight")

                fun lastArrayObject(arr: org.json.JSONArray?): org.json.JSONObject? =
                    if (arr != null && arr.length() > 0) arr.optJSONObject(arr.length() - 1) else null

                val todayActivity = lastArrayObject(daily)
                var latestHeartTime: String? = null
                if (heart != null) {
                    for (i in 0 until heart.length()) {
                        val hr = heart.optJSONObject(i) ?: continue
                        val samples = hr.optJSONArray("samples") ?: continue
                        for (j in 0 until samples.length()) {
                            val s = samples.optJSONObject(j) ?: continue
                            val t = s.optString("time")
                            if (t.isNotBlank() && (latestHeartTime == null || t > latestHeartTime!!)) latestHeartTime = t
                        }
                    }
                }

                var latestExercise: String? = null
                if (exercise != null) {
                    for (i in 0 until exercise.length()) {
                        val e = exercise.optJSONObject(i) ?: continue
                        val t = e.optString("endTime")
                        if (t.isNotBlank() && (latestExercise == null || t > latestExercise!!)) latestExercise = t
                    }
                }

                var latestWeight: String? = null
                if (weight != null) {
                    for (i in 0 until weight.length()) {
                        val w = weight.optJSONObject(i) ?: continue
                        val t = w.optString("time")
                        if (t.isNotBlank() && (latestWeight == null || t > latestWeight!!)) latestWeight = t
                    }
                }

                val steps = todayActivity?.optLong("steps", 0L) ?: 0L
                val date = todayActivity?.optString("date").orEmpty()
                val exerciseCount = exercise?.length() ?: 0
                val heartCount = heart?.length() ?: 0

                val summary = buildString {
                    append("Health Connect közvetlen adat\n")
                    append("Mai/legutóbbi aktivitás: ").append(if (date.isBlank()) "nincs" else date + " · " + steps + " lépés").append("\n")
                    append("Pulzusrekordok (7 nap): ").append(heartCount).append("\n")
                    append("Legutóbbi pulzus: ").append(latestHeartTime ?: "nincs").append("\n")
                    append("Edzések (7 nap): ").append(exerciseCount).append("\n")
                    append("Legutóbbi edzés: ").append(latestExercise ?: "nincs").append("\n")
                    append("Legutóbbi testsúly: ").append(latestWeight ?: "nincs")
                }
                prefs.edit()
                    .putString("last_health_diagnostic", summary)
                    .putLong("last_health_diagnostic_ms", System.currentTimeMillis())
                    .apply()
                status.text = summary
            } catch (e: Exception) {
                status.text = "Health Connect ellenőrzési hiba: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private fun openHealthConnectSettings() {
        val sdk = HealthConnectClient.getSdkStatus(this)
        if (sdk != HealthConnectClient.SDK_AVAILABLE) {
            status.text = if (sdk == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                "A Health Connect frissítése szükséges."
            } else {
                "A Health Connect ezen az eszközön jelenleg nem elérhető."
            }
            return
        }

        try {
            status.text = "Health Connect megnyitása…"
            startActivity(Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS))
        } catch (_: Exception) {
            scope.launch {
                val hc = client ?: HealthConnectClient.getOrCreate(this@MainActivity)
                val granted = hc.permissionController.getGrantedPermissions()
                val missing = requiredPermissions() - granted
                if (missing.isNotEmpty()) {
                    status.text = "Health Connect engedélyek megadása…"
                    permissionLauncher.launch(missing)
                } else {
                    status.text = "✓ Minden szükséges Health Connect engedély megvan."
                }
            }
        }
    }


    private fun handleIntent(i: Intent?) {
        val data = i?.data ?: return
        if (data.scheme != "healthhubconnect") return
        when (data.host) {
            "sync" -> {
                val requested = if (data.getQueryParameter("profile") == "monika") "monika" else "zsolt"
                if (deviceOwnerProfile() == null) {
                    if (requested == "monika") profileSpinner.setSelection(1) else profileSpinner.setSelection(0)
                }
                syncNow(requested)
            }
            "dropbox" -> handleDropboxCallback(data)
        }
    }

    /** Minimal Samsung-only test interface. Does not touch existing Health Connect data,
     * Dropbox tokens, scheduled sync, or the production HealthHub Connect package.
     */
    private fun buildSamsungBetaUi(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(30, 30, 30, 30)
            setBackgroundColor(0xFFEEF7FB.toInt())
        }
        root.addView(TextView(this).apply {
            text = "📱 HH Samsung Beta"
            textSize = 24f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF123C62.toInt())
        })
        root.addView(TextView(this).apply {
            text = "Samsung Health Data SDK · külön fejlesztői próba\n" +
                "Az éles HealthHub Connect és Dropbox szinkron nincs módosítva."
            textSize = 13f
            setPadding(0, 12, 0, 26)
        })
        ownerLabel = TextView(this).apply { textSize = 15f; setPadding(0, 10, 0, 10) }
        root.addView(ownerLabel)
        profileSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item,
                listOf("Zsolt", "Mónika"))
        }
        root.addView(profileSpinner)
        ownerButton = Button(this).apply {
            text = "Telefon tulajdonosának módosítása"
            setOnClickListener {
                SamsungBetaScheduler.setEnabled(this@MainActivity, false)
                prefs.edit()
                    .remove("device_owner_profile")
                    .remove("dropbox_refresh_token")
                    .remove("dropbox_access_token")
                    .remove("dropbox_access_expires")
                    .remove("dropbox_pkce_verifier")
                    .remove("dropbox_oauth_state")
                    .remove("dropbox_pending_profile")
                    .remove("samsung_beta_last_read_ms")
                    .remove("samsung_beta_last_read_profile")
                    .remove("samsung_beta_last_success_ms")
                    .remove("samsung_beta_last_success_profile")
                    .apply()
                pendingJson = null
                saveButton.isEnabled = false
                updateOwnerUi()
                updateSamsungBetaUi()
                status.text = "A profil rögzítését és a Dropbox kapcsolatot töröltük a BETA alkalmazásból. Az éles Connect nem érintett."
            }
        }
        root.addView(ownerButton)
        root.addView(Button(this).apply {
            text = "🔎 Samsung Health napi adatok beolvasása"
            setOnClickListener { readSamsungBetaNow() }
        })
        saveButton = Button(this).apply {
            text = "💾 Samsung eredmény mentése saját JSON-fájlba"
            isEnabled = false
            setOnClickListener {
                val owner = deviceOwnerProfile() ?: return@setOnClickListener
                if (pendingJson != null) {
                    saveLauncher.launch("healthhub-samsung-${owner}-daily.json")
                }
            }
        }
        root.addView(saveButton)
        root.addView(Button(this).apply {
            text = "☁️ Dropbox Vault engedélyezése a Samsung Betához"
            setOnClickListener { connectSamsungBetaDropbox() }
        })
        root.addView(Button(this).apply {
            text = "📤 Samsung adatok feltöltése MOST"
            setOnClickListener { uploadSamsungBetaNow() }
        })
        betaAutoButton = Button(this).apply {
            text = "🔄 Automatikus Samsung-szinkron: KI"
            setOnClickListener { toggleSamsungBetaAutomatic() }
        }
        root.addView(betaAutoButton)
        root.addView(Button(this).apply {
            text = "🧪 Háttérszinkron próbafuttatás MOST"
            setOnClickListener {
                if (SamsungBetaScheduler.isEnabled(this@MainActivity)) {
                    SamsungBetaScheduler.runTestNow(this@MainActivity)
                    status.text = "🧪 WorkManager tesztütemezés elindítva. Várj 1–2 percet, nyisd meg újra az alkalmazást az eredményért."
                    updateSamsungBetaUi()
                } else {
                    status.text = "Előbb kapcsold be az automatikus Samsung Beta szinkront."
                }
            }
        })
        betaConnectionLabel = TextView(this).apply {
            textSize = 12f
            setTextColor(0xFF234E73.toInt())
            setPadding(0, 12, 0, 12)
        }
        root.addView(betaConnectionLabel)
        status = TextView(this).apply {
            text = "Fejlesztői teszt. A Samsung adatok olvasásához külön engedély kell."
            textSize = 14f
            setTextColor(0xFF234E73.toInt())
            setPadding(0, 16, 0, 12)
        }
        root.addView(status)
        updateOwnerUi()
        updateSamsungBetaUi()
        return ScrollView(this).apply {
            addView(root)
            clipToPadding = false
            // Android 15 targetSdk=35 defaults to edge-to-edge. Respect real
            // status/navigation bar insets so the beta heading is not hidden.
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                setOnApplyWindowInsetsListener { view, insets ->
                    val bars = insets.getInsets(android.view.WindowInsets.Type.systemBars())
                    view.setPadding(0, bars.top, 0, bars.bottom)
                    insets
                }
            }
        }
    }

    private fun readSamsungBetaNow() {
        if (!SamsungSdkDailyReader.available) {
            status.text = "Samsung SDK nem érhető el."
            return
        }
        val profile = bindOwnerIfNeeded()
        scope.launch {
            try {
                saveButton.isEnabled = false
                pendingJson = null
                status.text = "Samsung Health Data SDK olvasás, külön engedélykérés…"
                val data = SamsungSdkDailyReader.collect(this@MainActivity, profile)
                check(data.optString("profile") == profile &&
                    data.optString("schemaVersion") == "healthhub.samsung.daily/1") {
                    "Profil vagy Samsung exportformátum hiba."
                }
                val days = data.optJSONObject("records")?.optJSONArray("dailySummary")
                check(days != null && days.length() > 0) { "Nincs kiolvasható Samsung napösszesítő." }
                pendingJson = data.toString(2)
                saveButton.isEnabled = true
                val today = java.time.LocalDate.now().toString()
                val summary = (0 until days.length()).mapNotNull { days.optJSONObject(it) }
                    .firstOrNull { it.optString("date") == today }
                prefs.edit()
                    .putLong("samsung_beta_last_read_ms", System.currentTimeMillis())
                    .putString("samsung_beta_last_read_profile", profile)
                    .apply()
                updateSamsungBetaUi()
                val hourlyCount = data.optJSONObject("records")?.optJSONArray("hourlySteps")?.length() ?: 0
                val exerciseCount = data.optJSONObject("records")?.optJSONArray("exerciseSessions")?.length() ?: 0
                status.text = "✅ Samsung SDK sikeres · ${profileName(profile)} · " +
                    "${days.length()} aktivitásnap · ${hourlyCount} valódi órás lépésblokk · ${exerciseCount} edzés. Ma: " +
                    (summary?.let {
                        "${it.optString("activeCaloriesKcal", "—")} kcal, " +
                        "${it.optString("activeMinutes", "—")} perc, " +
                        "${it.optString("floorsClimbed", "—")} emelet"
                    } ?: "nincs napi összesítő") +
                    "\nEz csak helyi olvasás. A Dropboxba feltöltés külön gombbal vagy engedélyezett ütemezéssel történik."
            } catch (e: Exception) {
                pendingJson = null
                saveButton.isEnabled = false
                status.text = "Samsung közvetlen olvasás nem sikerült: " +
                    (e.message ?: e.javaClass.simpleName) +
                    "\nAz éles HealthHub Connect továbbra is működik."
            }
        }
    }


    /** The only OAuth callback accepted by the isolated beta identity. */
    private fun handleSamsungBetaIntent(i: Intent?) {
        val uri = i?.data ?: return
        if (uri.scheme != "healthhubsamsungbeta" || uri.host != "dropbox") return
        val errorCode = uri.getQueryParameter("error")
        if (!errorCode.isNullOrBlank()) {
            status.text = "Dropbox engedélyezés elutasítva: $errorCode"
            return
        }
        val code = uri.getQueryParameter("code") ?: return
        val state = uri.getQueryParameter("state")
        val expectedState = prefs.getString("dropbox_oauth_state", null)
        val verifier = prefs.getString("dropbox_pkce_verifier", null)
        val pendingOwner = prefs.getString("dropbox_pending_profile", null)
        if (state.isNullOrBlank() || state != expectedState || verifier.isNullOrBlank() ||
            pendingOwner == null || pendingOwner != deviceOwnerProfile()) {
            status.text = "Dropbox BETA: hibás OAuth állapot vagy telefon-tulajdonos. Nincs kapcsolat."
            return
        }
        // Reject duplicate callback while the code is exchanged.
        prefs.edit().remove("dropbox_oauth_state").apply()
        scope.launch {
            try {
                status.text = "Dropbox engedélyezés befejezése…"
                val token = withContext(Dispatchers.IO) { exchangeCode(code, verifier) }
                val refresh = token.optString("refresh_token")
                check(refresh.isNotBlank()) { "Dropbox nem adott vissza frissítő tokent." }
                check(deviceOwnerProfile() == pendingOwner) { "Közben megváltozott a telefon-tulajdonos." }
                prefs.edit()
                    .putString("dropbox_refresh_token", refresh)
                    .putString("dropbox_access_token", token.optString("access_token"))
                    .putLong("dropbox_access_expires",
                        System.currentTimeMillis() + (token.optLong("expires_in", 14400L) - 60L) * 1000L)
                    .remove("dropbox_pkce_verifier")
                    .remove("dropbox_pending_profile")
                    .apply()
                status.text = "✅ Dropbox kapcsolat kész a HH Samsung Betában. A háttérszinkron továbbra is KI, amíg külön be nem kapcsolod."
                updateSamsungBetaUi()
            } catch (e: Exception) {
                status.text = "Dropbox BETA kapcsolat nem sikerült: ${e.message ?: e.javaClass.simpleName}"
            }
        }
    }

    private fun connectSamsungBetaDropbox() {
        val owner = bindOwnerIfNeeded()
        if (!SamsungSdkDailyReader.available) return
        val verifier = randomUrlSafe(64)
        val challenge = sha256UrlSafe(verifier)
        val state = "hhbeta_" + randomUrlSafe(24)
        prefs.edit()
            .putString("dropbox_pkce_verifier", verifier)
            .putString("dropbox_oauth_state", state)
            .putString("dropbox_pending_profile", owner)
            .apply()
        // Same HTTPS redirect already registered for the shared Dropbox app.
        // Only hhbeta_ states are relayed to healthhubsamsungbeta://dropbox.
        val url = Uri.parse("https://www.dropbox.com/oauth2/authorize").buildUpon()
            .appendQueryParameter("client_id", DROPBOX_APP_KEY)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("redirect_uri", DROPBOX_REDIRECT)
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("token_access_type", "offline")
            .appendQueryParameter("scope", "files.metadata.write files.content.read files.content.write")
            .appendQueryParameter("state", state)
            .build()
        status.text = "A Dropbox engedélyezőoldala nyílik. Csak a Samsung Beta saját tokenjét érinti."
        startActivity(Intent(Intent.ACTION_VIEW, url))
    }

    private fun updateSamsungBetaUi() {
        if (!SamsungSdkDailyReader.available) return
        val hasVault = DropboxVaultClient.hasRefreshToken(prefs)
        val enabled = SamsungBetaScheduler.isEnabled(this)
        betaAutoButton?.text = "🔄 Automatikus Samsung-szinkron: " +
            (if (enabled) "BE (kb. 4 óránként)" else "KI")
        val success = prefs.getLong("samsung_beta_last_success_ms", 0L)
        val failure = prefs.getString("samsung_beta_last_error", null)
        val stamp = if (success > 0L) {
            java.text.SimpleDateFormat("yyyy.MM.dd. HH:mm", Locale.getDefault()).format(Date(success))
        } else "még nem volt"
        betaConnectionLabel?.text = (if (hasVault) "✅ Dropbox BETA csatlakozva" else "⚠️ Dropbox BETA még nincs összekötve") +
            "\nLegutóbbi automatikus siker: $stamp" +
            (if (failure.isNullOrBlank()) "" else "\n⚠️ Utolsó háttérhiba: " + failure) +
            "\nAz ütemezés nem pontos időpont: Android energiatakarékosság késleltetheti."
    }

    /** Optional toggle only after authenticated vault AND a successful local read. */
    private fun toggleSamsungBetaAutomatic() {
        val owner = deviceOwnerProfile()
        if (!SamsungBetaScheduler.isEnabled(this)) {
            if (owner != "zsolt" && owner != "monika") {
                status.text = "Előbb rögzítsd a telefon tulajdonosát egy Samsung beolvasással."
                return
            }
            if (!DropboxVaultClient.hasRefreshToken(prefs)) {
                status.text = "Előbb engedélyezd a BETA Dropbox kapcsolatát."
                return
            }
            if (prefs.getLong("samsung_beta_last_read_ms", 0L) == 0L ||
                prefs.getString("samsung_beta_last_read_profile", null) != owner) {
                status.text = "Először teszteld a Samsung SDK olvasását és az engedélykérést."
                return
            }
            // Explicit user tap opt-in; background permissions are never prompted automatically.
            SamsungBetaScheduler.setEnabled(this, true)
            status.text = "✅ Samsung BETA háttérfrissítés BE (kb. 4 óránként). A Samsung SDK háttérhozzáférését még készüléken kell ellenőrizni."
        } else {
            SamsungBetaScheduler.setEnabled(this, false)
            status.text = "Samsung BETA háttérfrissítés kikapcsolva."
        }
        updateSamsungBetaUi()
    }

    private fun uploadSamsungBetaNow() {
        val owner = deviceOwnerProfile()
        if (owner != "zsolt" && owner != "monika") {
            status.text = "Előbb rögzítsd a saját telefonprofilt."
            return
        }
        val text = pendingJson
        if (text.isNullOrBlank()) {
            status.text = "Először nyomd meg a Samsung Health napi adatok beolvasása gombot."
            return
        }
        if (!DropboxVaultClient.hasRefreshToken(prefs)) {
            status.text = "Előbb engedélyezd a Dropbox Vaultot a HH Samsung Betában."
            return
        }
        scope.launch {
            try {
                val data = JSONObject(text)
                val days = data.optJSONObject("records")?.optJSONArray("dailySummary")
                check(data.optString("profile") == owner &&
                    data.optString("source") == "samsung-health-data-sdk-1.1.0" &&
                    data.optString("schemaVersion") == "healthhub.samsung.daily/1" &&
                    days != null && days.length() > 0) { "Samsung JSON profilja / forrása nem megfelelő." }
                status.text = "☁️ Samsung adatok feltöltése a külön profilfájlba…"
                val path = DropboxVaultClient.PROFILES_DIR + "/" + owner + "-samsung-health.json"
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
                DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
                val previous = DropboxVaultClient.downloadTextOrNull(prefs, path)
                if (!previous.isNullOrBlank()) {
                    val old = JSONObject(previous)
                    check(old.optString("profile") == owner &&
                        old.optString("schemaVersion") == "healthhub.samsung.daily/1") {
                        "A Dropboxban ismeretlen Samsung-fájl található; nem írtuk felül."
                    }
                    val oldTime = java.time.Instant.parse(old.getString("exportedAt"))
                    val newTime = java.time.Instant.parse(data.getString("exportedAt"))
                    if (!newTime.isAfter(oldTime)) {
                        status.text = "ℹ️ A Dropboxban már azonos vagy frissebb Samsung-export van."
                        return@launch
                    }
                }
                check(deviceOwnerProfile() == owner) { "Közben megváltozott a profil." }
                DropboxVaultClient.uploadText(prefs, path, data.toString(2) + "\n")
                val verify = DropboxVaultClient.downloadTextOrNull(prefs, path)
                check(verify != null && JSONObject(verify).optString("exportedAt") == data.optString("exportedAt")) {
                    "Az export visszaellenőrzése sikertelen."
                }
                prefs.edit()
                    .putLong("samsung_beta_last_success_ms", System.currentTimeMillis())
                    .putString("samsung_beta_last_success_profile", owner)
                    .remove("samsung_beta_last_error")
                    .apply()
                status.text = "✅ Samsung Direct → Dropbox sikeres · ${profileName(owner)} · ${days.length()} nap. Az éles Health Connect változatlan."
                updateSamsungBetaUi()
            } catch (e: Exception) {
                status.text = "Samsung BETA Dropbox hiba: ${e.message ?: e.javaClass.simpleName}. Kézi JSON-import továbbra is használható."
            }
        }
    }

    private fun buildUi(): View {
        val pad = 30
        val scroll = ScrollView(this).apply {
            setBackgroundColor(0xFFEEF7FB.toInt())
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        scroll.addView(root)

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

        root.addView(TextView(this).apply { text = "Telefon tulajdonosa"; textSize = 15f })
        ownerLabel = TextView(this).apply {
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF173F62.toInt())
            setPadding(0, 6, 0, 6)
        }
        root.addView(ownerLabel)

        profileSpinner = Spinner(this)
        profileSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Zsolt", "Mónika")
        )
        root.addView(profileSpinner)

        ownerButton = Button(this).apply {
            text = "Tulajdonos módosítása"
            setOnClickListener {
                prefs.edit().remove("device_owner_profile").apply()
                updateOwnerUi()
                status.text = "A telefon tulajdonosa feloldva. A következő SYNC NOW rögzíti az aktuális profilt."
            }
        }
        root.addView(ownerButton)

        root.addView(Button(this).apply {
            text = "🔄 SYNC NOW"
            setOnClickListener { syncNow() }
        })

        // Samsung Health's daily Activity Tracker aggregates can be unavailable
        // from Health Connect. Show a separate, opt-in action only in SDK builds.
        if (SamsungSdkDailyReader.available) {
            root.addView(Button(this).apply {
                text = "📱 Samsung Health napi adatok → Dropbox"
                setOnClickListener { syncSamsungDailyNow() }
            })
        }

        root.addView(Button(this).apply {
            text = "☀ Daily Cloud frissítés"
            setOnClickListener {
                DailyContentScheduler.runNow(this@MainActivity)
                status.text = "Daily Spark + Morning Briefing frissítés elindítva…"
            }
        })

        root.addView(Button(this).apply {
            text = "❤️ Health Connect megnyitása"
            setOnClickListener {
                openHealthConnectSettings()
            }
        })
        root.addView(Button(this).apply {
            text = "🔎 Health Connect adatellenőrzés"
            setOnClickListener {
                runHealthConnectDiagnostic()
            }
        })

        root.addView(Button(this).apply {
            text = "⛰️ Szintemelkedés + emeletek engedélyezése"
            setOnClickListener {
                scope.launch {
                    val hc = client ?: run {
                        status.text = "Health Connect nem elérhető."
                        return@launch
                    }
                    try {
                        val granted = hc.permissionController.getGrantedPermissions()
                        val missing = HealthConnectExporter.OPTIONAL_TERRAIN_PERMISSIONS - granted
                        if (missing.isEmpty()) {
                            status.text = "✓ Szintemelkedés és emelet engedélyek már megvannak. Indíts SYNC NOW-t."
                        } else {
                            terrainPermissionLauncher.launch(missing)
                        }
                    } catch (e: Exception) {
                        status.text = "Opcionális adatengedély hiba: ${e.message ?: e.javaClass.simpleName}"
                    }
                }
            }
        })


        root.addView(TextView(this).apply {
            text = "🛡️ Self-Healing Connect · automatikus újracsatlakozás"
            textSize = 18f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF0B2D50.toInt())
            setPadding(0, 20, 0, 6)
        })
        resilientSummary = TextView(this).apply {
            textSize = 14f
            setTextColor(0xFF315F98.toInt())
            setPadding(0, 2, 0, 8)
        }
        root.addView(resilientSummary)
        root.addView(Button(this).apply {
            text = "🔄 Kapcsolat ellenőrzése / Újrapróbálás"
            setOnClickListener {
                ResilientHealthSync.kick(this@MainActivity)
                updateResilientStatus()
                status.text = "Az újrapróbálás háttérben elindult. Az eredményt a státusz mutatja."
            }
        })
        root.addView(Button(this).apply {
            text = "⏯ Self-Healing BE/KI"
            setOnClickListener {
                ResilientHealthSync.setEnabled(this@MainActivity,!ResilientHealthSync.isEnabled(prefs))
                updateResilientStatus()
            }
        })

        root.addView(TextView(this).apply {
            text = "Automatikus sync"
            textSize = 18f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(0xFF0B2D50.toInt())
            setPadding(0, 22, 0, 4)
        })
        scheduleSummary = TextView(this).apply {
            textSize = 14f
            setTextColor(0xFF315F98.toInt())
            setPadding(0, 2, 0, 8)
        }
        root.addView(scheduleSummary)

        scheduleToggleButton = Button(this).apply {
            setOnClickListener {
                val enabled = prefs.getBoolean(SyncScheduler.KEY_ENABLED, false)
                if (enabled) {
                    SyncScheduler.setEnabled(this@MainActivity, false)
                    status.text = "Automatikus sync kikapcsolva."
                    updateScheduleUi()
                } else {
                    enableScheduledSync()
                }
            }
        }
        root.addView(scheduleToggleButton)

        root.addView(Button(this).apply {
            text = "Időpont hozzáadása"
            setOnClickListener { pickScheduleTime() }
        })
        root.addView(Button(this).apply {
            text = "Ütemezett időpontok törlése"
            setOnClickListener {
                SyncScheduler.clear(this@MainActivity)
                status.text = "Ütemezett időpontok törölve."
                updateScheduleUi()
            }
        })
        root.addView(TextView(this).apply {
            text = "Az Android a megadott idő környékén futtatja a háttérszinkront; energiatakarékosság miatt lehet kisebb késés."
            textSize = 12f
            setTextColor(0xFF6A7F91.toInt())
            setPadding(0, 4, 0, 10)
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
        updateOwnerUi()
        updateScheduleUi()
        return scroll
    }

    private fun deviceOwnerProfile(): String? {
        val p = prefs.getString("device_owner_profile", null)
        return if (p == "zsolt" || p == "monika") p else null
    }

    private fun profileName(profile: String) = if (profile == "monika") "Mónika" else "Zsolt"

    private fun updateOwnerUi() {
        if (!::profileSpinner.isInitialized || !::ownerLabel.isInitialized || !::ownerButton.isInitialized) return
        val owner = deviceOwnerProfile()
        if (owner == null) {
            ownerLabel.text = "Nincs még rögzítve"
            profileSpinner.isEnabled = true
            profileSpinner.visibility = View.VISIBLE
            ownerButton.visibility = View.GONE
        } else {
            ownerLabel.text = "✓ ${profileName(owner)} telefonja"
            if (owner == "monika") profileSpinner.setSelection(1) else profileSpinner.setSelection(0)
            profileSpinner.isEnabled = false
            profileSpinner.visibility = View.GONE
            ownerButton.visibility = View.VISIBLE
        }
    }

    private fun bindOwnerIfNeeded(requestedProfile: String? = null): String {
        val existing = deviceOwnerProfile()
        if (existing != null) return existing
        val chosen = requestedProfile ?: if (profileSpinner.selectedItemPosition == 1) "monika" else "zsolt"
        prefs.edit().putString("device_owner_profile", chosen).apply()
        updateOwnerUi()
        return chosen
    }

    private fun selectedProfile() =
        deviceOwnerProfile() ?: if (profileSpinner.selectedItemPosition == 1) "monika" else "zsolt"

    private fun enableScheduledSync() {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        val feature = hc.features.getFeatureStatus(
            HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
        )
        if (feature != HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) {
            status.text = "Ezen az eszközön a Health Connect háttérolvasás jelenleg nem elérhető."
            return
        }
        scope.launch {
            val granted = hc.permissionController.getGrantedPermissions()
            if (HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND in granted) {
                if (SyncScheduler.times(this@MainActivity).isEmpty()) SyncScheduler.addTime(this@MainActivity, "07:30")
                SyncScheduler.setEnabled(this@MainActivity, true)
                status.text = "✓ Automatikus sync engedélyezve."
                updateScheduleUi()
            } else {
                pendingScheduleEnable = true
                status.text = "Háttérben olvasás engedélyezése…"
                backgroundPermissionLauncher.launch(setOf(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND))
            }
        }
    }

    private fun pickScheduleTime() {
        TimePickerDialog(this, { _, hour, minute ->
            val value = String.format(Locale.ROOT, "%02d:%02d", hour, minute)
            SyncScheduler.addTime(this, value)
            status.text = "✓ Ütemezett sync hozzáadva: $value"
            updateScheduleUi()
        }, 7, 30, true).show()
    }

    private fun updateResilientStatus() {
        val last = prefs.getLong(ResilientHealthSync.KEY_LAST_SUCCESS, 0L)
        val error = prefs.getString(ResilientHealthSync.KEY_LAST_ERROR, null)
        val enabled = ResilientHealthSync.isEnabled(prefs)
        val stamp = if (last > 0L) SimpleDateFormat("yyyy.MM.dd HH:mm", Locale.getDefault()).format(Date(last)) else "még nincs"
        val t = if (enabled) "BE · 3 óránként + automatikus újrapróbálás" else "KI"
        val txt = "🔄 Automatikus kapcsolattartás: $t\nUtolsó sikeres Health Connect → Dropbox feltöltés: $stamp" +
            (if (!error.isNullOrBlank()) "\n⚠️ Utolsó probléma: $error" else "") +
            "\n" + prefs.getString(ResilientHealthSync.KEY_COUNTS, "Még nincs rekordösszesítő")
        resilientSummary?.text = txt
    }

    private fun updateScheduleUi() {
        if (!::scheduleSummary.isInitialized || !::scheduleToggleButton.isInitialized) return
        val enabled = prefs.getBoolean(SyncScheduler.KEY_ENABLED, false)
        val times = SyncScheduler.times(this)
        val last = prefs.getLong("last_auto_sync_ms", 0L)
        val err = prefs.getString("last_auto_sync_error", null)
        val fmt = SimpleDateFormat("MM.dd HH:mm", Locale.getDefault())
        val lastText = if (last > 0L) fmt.format(Date(last)) else "még nem futott"
        scheduleToggleButton.text = if (enabled) "Scheduled Sync: BE ✓" else "Scheduled Sync: KI"
        scheduleSummary.text =
            "Időpontok: " + (if (times.isEmpty()) "nincs" else times.joinToString(", ")) +
            "\nUtolsó automatikus sync: $lastText" +
            (if (!err.isNullOrBlank()) "\nUtolsó hiba: $err" else "")
    }

    private fun readHealthData() {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(requiredPermissions())) {
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

    /**
     * Independent, explicitly user-triggered Samsung SDK import.
     * This never replaces or blocks the established HC / Dropbox scheduled sync.
     * User consent is collected by SamsungSdkDailyReader on the device.
     */
    private fun syncSamsungDailyNow() {
        if (!SamsungSdkDailyReader.available) {
            status.text = "A közvetlen Samsung SDK nincs benne ebben az APK-ban."
            return
        }
        val profile = bindOwnerIfNeeded()
        if (!DropboxVaultClient.hasRefreshToken(prefs)) {
            status.text = "Előbb csatlakoztasd a Dropbox Vaultot a szokásos SYNC NOW gombbal."
            return
        }
        scope.launch {
            try {
                status.text = "Samsung Health hozzáférés és napi adatok ellenőrzése…"
                val payload = SamsungSdkDailyReader.collect(this@MainActivity, profile)
                val outProfile = payload.optString("profile")
                val schema = payload.optString("schemaVersion")
                val rows = payload.optJSONObject("records")?.optJSONArray("dailySummary")
                val rowCount = rows?.length() ?: 0
                check(outProfile == profile && schema == "healthhub.samsung.daily/1" && rowCount > 0) {
                    "A Samsung napi export nem teljes vagy másik profilhoz tartozik."
                }
                status.text = "Samsung Health: ${rowCount} nap beolvasva · külön Dropbox-feltöltés…"
                val remote = DropboxVaultClient.PROFILES_DIR + "/" + profile + "-samsung-health.json"
                DropboxVaultClient.uploadText(prefs, remote, payload.toString(2) + "\n")
                status.text = "✓ Samsung Health közvetlen napi export kész · ${profileName(profile)} · " +
                    "${rowCount} nap · Dropbox feltöltve. Nyisd meg a HealthHub Activity-t."
            } catch (e: Exception) {
                status.text = "Samsung SDK külön import nem sikerült: ${e.message ?: e.javaClass.simpleName}\n" +
                    "A szokásos Health Connect és Dropbox szinkron változatlanul működik."
            }
        }
    }

    private fun syncNow(requestedProfile: String? = null) {
        val hc = client ?: run {
            status.text = "Health Connect nem elérhető."
            return
        }
        val owner = bindOwnerIfNeeded(requestedProfile)
        if (requestedProfile != null && requestedProfile != owner) {
            status.text = "⛔ Ez ${profileName(owner)} telefonja. A ${profileName(requestedProfile)} profil szinkronja ezen az eszközön letiltva."
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(requiredPermissions())) {
                    pendingAutoSync = true
                    status.text = "Health Connect engedély szükséges…"
                    permissionLauncher.launch(requiredPermissions())
                    return@launch
                }
                if (prefs.getString("dropbox_refresh_token", null).isNullOrBlank()) {
                    status.text = "Első alkalom: Dropbox engedélyezés…"
                    startDropboxAuth(owner)
                    return@launch
                }
                exportAndUpload(owner)
                DailyContentScheduler.runNow(this@MainActivity)
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
        val exporter = HealthConnectExporter(hc)
        val summary = exporter.countSummary(json)
        if (!exporter.hasUsefulData(json)) {
            status.text = "⚠️ ${profileName(profile)}: nincs kiolvasható mérés az utolsó 30 napban. " +
                "A Dropbox-fájlt NEM írtam felül.\n" + summary +
                "\nEllenőrizd: Samsung Health → Health Connect adatmegosztás és HealthHub Connect olvasási engedélyek."
            return
        }

        val recs = json.getJSONObject("records")
        val daily = recs.optJSONArray("dailyActivity")
        val latestDay = if (daily != null && daily.length() > 0) daily.optJSONObject(daily.length() - 1) else null
        val hcDate = latestDay?.optString("date").orEmpty()
        val hcSteps = latestDay?.optLong("steps", 0L) ?: 0L
        status.text = "Health Connect beolvasva · " +
            (if (hcDate.isBlank()) "nincs napi aktivitás" else hcDate + " · " + hcSteps + " lépés") +
            " · Dropbox feltöltés…"
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
        DropboxVaultClient.uploadText(
            prefs,
            DropboxVaultClient.healthConnectPath(profile),
            json.toString(2) + "\n"
        )
        prefs.edit()
            .putLong(ResilientHealthSync.KEY_LAST_SUCCESS, System.currentTimeMillis())
            .putString(ResilientHealthSync.KEY_COUNTS, summary)
            .remove(ResilientHealthSync.KEY_LAST_ERROR)
            .remove(ResilientHealthSync.KEY_NEEDS_ACTION)
            .apply()
        ResilientHealthSync.schedule(this)
        status.text = "✓ Dropbox feltöltés kész · ${profileName(profile)} · " + summary +
            "\nForrásértékek ellenőrizve; ez a feltöltést igazolja, nem a webes megjelenítést."
        updateScheduleUi()
        OrchestratorScheduler.runNow(this@MainActivity)

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
        val state = "hhbridge_" + randomUrlSafe(24)
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
            .appendQueryParameter("scope", "files.metadata.write files.content.read files.content.write")
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
                val owner = bindOwnerIfNeeded(profile)
                if (profile != owner) error("Ez ${profileName(owner)} telefonja; a másik profil szinkronja letiltva.")
                DailyContentScheduler.runNow(this@MainActivity)
                OrchestratorScheduler.schedule(this@MainActivity)
                OrchestratorScheduler.runNow(this@MainActivity)
                exportAndUpload(owner)
                ResilientHealthSync.schedule(this@MainActivity)
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

    override fun onResume() {
        super.onResume()
        if (!::status.isInitialized) return
        if (SamsungSdkDailyReader.available) {
            updateSamsungBetaUi()
        } else {
            ResilientHealthSync.schedule(this)
            updateResilientStatus()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
