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
            .put("profileCapability", profiles)
            .put("activeProfile", owner ?: JSONObject.NULL)
            .put("capabilities", JSONArray().put("health").put("daily"))
            .put("lastSeenAt", java.time.Instant.now().toString())
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
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(SyncScheduler.PREFS, Context.MODE_PRIVATE)
        DropboxVaultClient.ensureCredentialVersion(prefs)
        if (!DropboxVaultClient.hasRefreshToken(prefs)) return Result.success()

        val id = deviceId(prefs)
        val owner = ownerProfile(prefs)

        return try {
            ensureFolders(prefs)
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
            val finalState = if (failed == 0) "done" else "partial"
            writeStatus(
                prefs, id, cmd, finalState, steps,
                if (failed == 0) "Android orchestrátor parancs kész." else "Android orchestrátor részben hibás.",
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
