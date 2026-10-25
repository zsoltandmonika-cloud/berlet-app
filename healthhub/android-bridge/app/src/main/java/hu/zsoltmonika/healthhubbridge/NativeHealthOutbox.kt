package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.content.SharedPreferences
import android.util.AtomicFile
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Crash-resilient queue for native Health Connect snapshots only.
 *
 * The app-private, credential-encrypted no-backup directory holds the original
 * export until DropboxVaultClient confirms its upload/merge. Android's app
 * sandbox protects these medical records; never copy queue files to logs.
 *
 * Web forms and the separate browser Dropbox session are NOT covered here.
 */
object NativeHealthOutbox {
    private val gate = Mutex()
    private const val FOLDER = "hh-native-health-outbox-v1"
    private const val MAX_PENDING_PER_OWNER = 40

    private fun directory(context: Context, owner: String): File {
        require(owner == "zsolt" || owner == "monika") { "Érvénytelen tulajdonos" }
        return File(context.noBackupFilesDir, FOLDER + "/" + owner)
    }

    private fun entries(context: Context, owner: String): List<File> {
        val dir = directory(context, owner)
        if (!dir.exists()) return emptyList()
        return (dir.listFiles() ?: error("Helyi várakozó mentések nem olvashatók"))
            .filter { it.isFile && it.name.endsWith(".json") }
            .sortedBy { it.name }
    }

    fun pendingCount(context: Context, owner: String): Int = entries(context, owner).size

    private fun persist(context: Context, owner: String, snapshot: JSONObject) {
        require(snapshot.optString("profile") == owner) { "Eltérő exportprofil" }
        check(snapshot.has("exportedAt") && snapshot.has("records")) {
            "Érvénytelen Health Connect adatcsomag"
        }
        val dir = directory(context, owner)
        check(dir.isDirectory || dir.mkdirs()) { "Helyi mentési sor nem hozható létre" }
        check(entries(context, owner).size < MAX_PENDING_PER_OWNER) {
            "A helyi mentési sor megtelt. A meglévő adatok megmaradtak; szükséges szinkronizálni."
        }
        val file = File(dir, System.currentTimeMillis().toString().padStart(13, '0') +
            "-" + UUID.randomUUID().toString() + ".json")
        val atomic = AtomicFile(file)
        val stream = atomic.startWrite()
        try {
            stream.write(snapshot.toString().toByteArray(Charsets.UTF_8))
            atomic.finishWrite(stream)
        } catch (e: Exception) {
            atomic.failWrite(stream)
            throw e
        }
    }

    /** Retry FIFO, keep every failed item; never acknowledge an unconfirmed upload. */
    private suspend fun flushLocked(context: Context, prefs: SharedPreferences, owner: String) {
        val files = entries(context, owner)
        if (files.isEmpty()) return
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.ROOT)
        DropboxVaultClient.ensureFolder(prefs, DropboxVaultClient.PROFILES_DIR)
        for (file in files) {
            val payload = AtomicFile(file).openRead().bufferedReader(Charsets.UTF_8)
                .use { JSONObject(it.readText()) }
            check(payload.optString("profile") == owner) { "Helyi mentés profilja eltér" }
            DropboxVaultClient.uploadHealthConnectSnapshot(prefs, owner, payload)
            // If deletion fails, the item remains and will be safely retried.
            check(file.delete()) { "Megerősített mentés helyi sorból nem távolítható el" }
        }
    }

    suspend fun flush(context: Context, prefs: SharedPreferences, owner: String) {
        gate.withLock { flushLocked(context, prefs, owner) }
    }

    /** Persist first, then attempt network delivery. Errors intentionally propagate. */
    suspend fun submit(context: Context, prefs: SharedPreferences, owner: String, snapshot: JSONObject) {
        gate.withLock {
            persist(context, owner, snapshot)
            flushLocked(context, prefs, owner)
        }
    }
}
