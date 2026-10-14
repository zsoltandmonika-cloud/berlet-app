package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class OrchestratorWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        private const val ROOT = "/HealthHub/orchestrator"
        private const val DEVICES = ROOT + "/devices"
        private const val COMMANDS = ROOT + "/commands"
        private const val STATUS = ROOT + "/status"
        private const val DEVICE_ID_KEY = "orchestrator_device_id_v1"
        private const val LAST_COMMAND_KEY = "orchestrator_last_command_v1"
    }

    private fun deviceId(prefs: android.content.SharedPreferences): String {
        val existing = prefs.getString(DEVICE_ID_KEY, null)
        if (!existing.isNullOrBlank()) return existing
        val id = "android-" + UUID.randomUUID().toString()
        prefs.edit().putString(DEVICE_ID_KEY, id).apply()
        return id
    }

    private fun ownerProfile(prefs: android.content.SharedPreferences): String? =
        prefs.getString("device_owner_profile", null)?.takeIf { it == "zsolt" || it == "monika" }

    private fun deviceName(): String {
        val maker = Build.MANUFACTURER.orEmpty().trim()
        val model = Build.MODEL.orEmpty().trim()
        return listOf(maker, model).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Android device" }
    }

    private suspend fun ensureFolders(prefs: android.content.SharedPreferences) {
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
        DropboxVaultClient.ensureFolder(prefs, ROOT)
        DropboxVaultClient.ensureFolder(prefs, DEVICES)
        DropboxVaultClient.ensureFolder(prefs, COMMANDS)
        DropboxVaultClient.ensureFolder(prefs, STATUS)
    }

    private suspend fun uploadHeartbeat(
        prefs: android.content.SharedPreferences,
        id: String,
        owner: String?
    ) {
        val profiles = JSONArray()
        if (owner != null) profiles.put(owner)
        val obj = JSONObject()
            .put("schema", "healthhub.orchestrator.device/1")
            .put("deviceId", id)
            .put("deviceType", "android")
            .put("name", deviceName())
            .put("platform", "Android " + Build.VERSION.RELEASE)
            .put("browser", JSONObject.NULL)
            .put("build", BuildConfig.VERSION_NAME)
            .put("buildCode", BuildConfig.VERSION_CODE)
            .put("otaUpdateAvailable", OtaUpdateManager.cached(applicationContext) != null)
            .put("otaCandidateVersion", OtaUpdateManager.cached(applicationContext)?.version ?: JSONObject.NULL)
            .put("otaLastCheckedAt",
                OtaUpdateManager.lastChecked(applicationContext).takeIf { it > 0L }?.let {
                    java.time.Instant.ofEpochMilli(it).toString()
                } ?: JSONObject.NULL)
            .put("otaLastError", OtaUpdateManager.lastError(applicationContext) ?: JSONObject.NULL)
            .put("profileCapability", profiles)
            .put("activeProfile", owner ?: JSONObject.NULL)
            .put("capabilities", JSONArray().put("health").put("daily").put("ota")
                .put("diagnostics").put("retry")
                .also { if (SamsungSdkDailyReader.available && SamsungCollectorScheduler.isEnabled(applicationContext)) it.put("samsung") })
            .put("lastSeenAt", java.time.Instant.now().toString())
            .put("lastHealthSyncAt",
                prefs.getLong(ResilientHealthSync.KEY_LAST_SUCCESS, 0L).takeIf { it > 0L }?.let {
                    java.time.Instant.ofEpochMilli(it).toString()
                } ?: JSONObject.NULL)
            .put("lastHealthSummary", prefs.getString(ResilientHealthSync.KEY_COUNTS, null) ?: JSONObject.NULL)
            .put("lastHealthError", prefs.getString(ResilientHealthSync.KEY_LAST_ERROR, null) ?: JSONObject.NULL)
            // No clinical values: source dates/counts, sync statuses and error categories only.
            .put("collectorTelemetry", CollectorTelemetry.snapshot(applicationContext))
            .put("lastCommandId", prefs.getString(LAST_COMMAND_KEY, null) ?: JSONObject.NULL)
            .put("visible", false)
        DropboxVaultClient.uploadText(prefs, DEVICES + "/" + id + ".json", obj.toString(2) + "\n")
    }

    private suspend fun writeStatus(
        prefs: android.content.SharedPreferences,
        id: String,
        cmd: JSONObject,
        state: String,
        steps: JSONArray,
        message: String,
        startedAt: String?
    ) {
        val scopes = cmd.optJSONArray("scopes") ?: JSONArray()
        val obj = JSONObject()
            .put("schema", "healthhub.orchestrator.status/1")
            .put("deviceId", id)
            .put("deviceType", "android")
            .put("commandId", cmd.optString("commandId"))
            .put("state", state)
            .put("updatedAt", java.time.Instant.now().toString())
            .put("startedAt", startedAt ?: JSONObject.NULL)
            .put("completedAt", if (state in setOf("done", "partial", "failed", "expired")) java.time.Instant.now().toString() else JSONObject.NULL)
            .put("profileScope", cmd.optString("profileScope", "all"))
            .put("scopes", scopes)
            .put("steps", steps)
            .put("message", message)
        DropboxVaultClient.uploadText(prefs, STATUS + "/" + id + ".json", obj.toString(2) + "\n")
    }

    private fun step(id: String, label: String, status: String, error: String? = null): JSONObject =
        JSONObject()
            .put("id", id)
            .put("label", label)
            .put("status", status)
            .put("updatedAt", java.time.Instant.now().toString())
            .also { if (!error.isNullOrBlank()) it.put("error", error.take(220)) }

    private fun scopes(cmd: JSONObject): Set<String> {
        val raw = mutableSetOf<String>()
        val arr = cmd.optJSONArray("scopes")
        if (arr != null) {
            for (i in 0 until arr.length()) raw += arr.optString(i)
        } else {
            raw += cmd.optString("scope", "full")
        }
        if ("full" in raw) return setOf("structured", "profile", "health", "devices", "daily", "lena")
        return raw
    }

    private suspend fun runHealthSync(
        prefs: android.content.SharedPreferences,
        owner: String
    ) {
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
        val json = exporter.export(owner)
        CollectorTelemetry.noteHealthRead(applicationContext, json)
        if (!exporter.hasUsefulData(json)) {
            error("Nincs tényleges Health Connect-adat; az előző Dropbox-fájl érintetlen. " + exporter.countSummary(json))
        }
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
        DropboxVaultClient.uploadText(
            prefs,
            DropboxVaultClient.healthConnectPath(owner),
            json.toString(2) + "\n"
        )
        prefs.edit()
            .putLong(ResilientHealthSync.KEY_LAST_SUCCESS, System.currentTimeMillis())
            .putString(ResilientHealthSync.KEY_COUNTS, exporter.countSummary(json))
            .remove(ResilientHealthSync.KEY_LAST_ERROR)
            .remove(ResilientHealthSync.KEY_NEEDS_ACTION)
            .apply()
        CollectorTelemetry.noteHealthUpload(applicationContext)
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        DropboxVaultClient.ensureCredentialVersion(prefs)
        if (!DropboxVaultClient.hasRefreshToken(prefs)) return Result.success()

        val id = deviceId(prefs)
        val owner = ownerProfile(prefs)

        return try {
            ensureFolders(prefs)
            // Device-initiated, non-privileged remote policy check. Failures here
            // must never prevent existing HC commands and heartbeat monitoring.
            try {
                CollectorRemoteConfig.poll(applicationContext, prefs, id, owner)
            } catch (e: Exception) {
                CollectorRemoteConfig.notePollFailure(applicationContext,
                    e.message ?: e.javaClass.simpleName)
            }
            uploadHeartbeat(prefs, id, owner)

            val text = DropboxVaultClient.downloadTextOrNull(prefs, COMMANDS + "/" + id + ".json")
                ?: return Result.success()
            val cmd = JSONObject(text)
            if (cmd.optString("schema") != "healthhub.orchestrator.command/1") return Result.success()
            if (cmd.optString("targetDeviceId") != id) return Result.success()

            val commandId = cmd.optString("commandId")
            if (commandId.isBlank() || commandId == prefs.getString(LAST_COMMAND_KEY, null)) {
                return Result.success()
            }

            val expiresAt = cmd.optString("expiresAt")
            if (expiresAt.isNotBlank()) {
                val expired = try { java.time.Instant.parse(expiresAt).isBefore(java.time.Instant.now()) } catch (_: Exception) { false }
                if (expired) {
                    prefs.edit().putString(LAST_COMMAND_KEY, commandId).apply()
                    writeStatus(prefs, id, cmd, "expired", JSONArray(), "Parancs lejárt.", null)
                    uploadHeartbeat(prefs, id, owner)
                    return Result.success()
                }
            }

            val startedAt = java.time.Instant.now().toString()
            val steps = JSONArray()
            writeStatus(prefs, id, cmd, "running", steps, "Parancs végrehajtása", startedAt)

            var failed = 0
            val requestedProfile = cmd.optString("profileScope", "all")
            val requestedScopes = scopes(cmd)

            if ("health" in requestedScopes) {
                if (owner == null || (requestedProfile != "all" && requestedProfile != owner)) {
                    steps.put(step("health", "Health + Activity", "skipped"))
                } else {
                    try {
                        runHealthSync(prefs, owner)
                        steps.put(step("health", "Health + Activity", "done"))
                    } catch (e: Exception) {
                        failed++
                        steps.put(step("health", "Health + Activity", "failed", e.message ?: e.javaClass.simpleName))
                    }
                }
            }

            // No permission prompts, shell commands or code injection.
            // Samsung access must already be approved locally on the device.
            val allowedRemote = setOf("health", "samsung", "diagnostics", "retry", "ota",
                "daily", "structured", "profile", "devices", "lena")
            if (requestedScopes.any { it !in allowedRemote }) {
                prefs.edit().putString(LAST_COMMAND_KEY, commandId).apply()
                writeStatus(prefs, id, cmd, "failed", JSONArray(),
                    "Ismeretlen vagy tiltott távoli művelet.", startedAt)
                uploadHeartbeat(prefs, id, owner)
                return Result.success()
            }

            if ("diagnostics" in requestedScopes) {
                // The final heartbeat contains metadata, never measured values.
                steps.put(step("diagnostics", "Collector diagnosztika", "done"))
            }

            if ("retry" in requestedScopes) {
                if (owner == null || requestedProfile != owner) {
                    failed++
                    steps.put(step("retry", "Health Connect újrapróbálás", "failed", "Profil eltér."))
                } else {
                    try {
                        ResilientHealthSync.kick(applicationContext)
                        steps.put(step("retry", "Health Connect újrapróbálás", "queued"))
                    } catch (e: Exception) {
                        failed++
                        steps.put(step("retry", "Health Connect újrapróbálás", "failed",
                            e.message ?: e.javaClass.simpleName))
                    }
                }
            }

            if ("samsung" in requestedScopes) {
                if (owner == null || requestedProfile != owner) {
                    failed++
                    steps.put(step("samsung", "Samsung Health SDK", "failed", "Profil eltér."))
                } else if (!SamsungSdkDailyReader.available) {
                    failed++
                    steps.put(step("samsung", "Samsung Health SDK", "failed", "SDK nincs ebben az APK-ban."))
                } else if (!SamsungCollectorScheduler.isEnabled(applicationContext)) {
                    failed++
                    steps.put(step("samsung", "Samsung Health SDK", "failed",
                        "Samsung nincs a telefonon engedélyezve."))
                } else {
                    try {
                        SamsungCollectorScheduler.runTestNow(applicationContext)
                        steps.put(step("samsung", "Samsung Health SDK", "queued"))
                    } catch (e: Exception) {
                        failed++
                        steps.put(step("samsung", "Samsung Health SDK", "failed",
                            e.message ?: e.javaClass.simpleName))
                    }
                }
            }

            if ("ota" in requestedScopes) {
                try {
                    val candidate = OtaUpdateManager.check(applicationContext)
                    if (candidate != null) OtaUpdateManager.notifyAvailable(applicationContext, candidate)
                    steps.put(step("ota", "Software Update", "done",
                        if (candidate == null) "Nincs engedélyezett új kiadás."
                        else "v${candidate.version} értesítés elküldve; telepítéshez telefonos jóváhagyás szükséges."))
                } catch (e: Exception) {
                    failed++
                    steps.put(step("ota", "Software Update", "failed", e.message ?: e.javaClass.simpleName))
                }
            }

            if ("daily" in requestedScopes) {
                try {
                    DailyContentScheduler.runNow(applicationContext)
                    steps.put(step("daily", "Daily Cloud", "queued"))
                } catch (e: Exception) {
                    failed++
                    steps.put(step("daily", "Daily Cloud", "failed", e.message ?: e.javaClass.simpleName))
                }
            }

            listOf(
                "structured" to "Structured Vault",
                "profile" to "Profile Vault",
                "devices" to "Devices Cloud",
                "lena" to "Léna Context"
            ).forEach { pair ->
                if (pair.first in requestedScopes) steps.put(step(pair.first, pair.second, "skipped"))
            }

            prefs.edit().putString(LAST_COMMAND_KEY, commandId).apply()
            val queued = (0 until steps.length()).any {
                steps.optJSONObject(it)?.optString("status") == "queued"
            }
            val finalState = when {
                failed > 0 -> "partial"
                queued -> "queued"
                else -> "done"
            }
            writeStatus(
                prefs, id, cmd, finalState, steps,
                when {
                    failed > 0 -> "Android orchestrátor részben hibás."
                    queued -> "Háttérfeladat sorba állítva. Az eredményt a következő telemetria igazolja."
                    else -> "Android orchestrátor parancs kész."
                },
                startedAt
            )
            uploadHeartbeat(prefs, id, owner)
            Result.success()
        } catch (e: Exception) {
            prefs.edit()
                .putLong("last_orchestrator_error_ms", System.currentTimeMillis())
                .putString("last_orchestrator_error", e.message ?: e.javaClass.simpleName)
                .apply()
            Result.retry()
        }
    }
}
