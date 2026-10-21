package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Family Guard native local vault. Only the most recent validated location fix is kept.
 * No Dropbox, GitHub Pages, Supabase, network request or cross-owner reads.
 *
 * The ciphertext uses an Android Keystore AES/GCM key that never leaves the phone.
 * Profile unbinding, user STOP, missing consent, or decryption failure purges the fix.
 */
internal object GuardianLocationVault {
    const val PREFS = "hh_guardian_location_v1"
    const val KEY_ENABLED = "service_requested"
    const val KEY_CONSENT = "owner_opted_in"
    const val KEY_OWNER = "tracking_owner"
    const val KEY_LAST_TIME = "last_fix_at_ms"
    const val KEY_LAST_ACCURACY = "last_accuracy_m"
    private const val KEY_FIX = "last_fix_aes_gcm"
    private const val KEY_ALIAS = "hh_one_family_guard_fix_v1"

    fun owner(context: Context): String? =
        context.getSharedPreferences("healthhub_connect", Context.MODE_PRIVATE)
            .getString("device_owner_profile", null)
            ?.takeIf { it == "zsolt" || it == "monika" }

    fun consented(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val profile = owner(context)
        return profile != null && prefs.getBoolean(KEY_CONSENT, false) &&
            prefs.getString(KEY_OWNER, null) == profile
    }

    fun markStarted(context: Context) {
        val profile = owner(context) ?: error("Family Guard requires a verified phone owner")
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_CONSENT, true).putBoolean(KEY_ENABLED, true)
            .putString(KEY_OWNER, profile).apply()
    }

    private fun secret(): SecretKey {
        val keystore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = keystore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    fun saveFix(context: Context, latitude: Double, longitude: Double, accuracy: Float, atMs: Long): Boolean {
        if (!consented(context) || !latitude.isFinite() || !longitude.isFinite() ||
            latitude !in -90.0..90.0 || longitude !in -180.0..180.0 ||
            !accuracy.isFinite() || accuracy < 0f || atMs <= 0L) return false
        return try {
            val plain = JSONObject()
                .put("owner", owner(context))
                .put("lat", latitude).put("lng", longitude)
                .put("accuracyM", accuracy.toDouble()).put("atMs", atMs)
                .toString().toByteArray(Charsets.UTF_8)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, secret()) }
            val bytes = cipher.iv + cipher.doFinal(plain)
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_FIX, Base64.encodeToString(bytes, Base64.NO_WRAP))
                .putLong(KEY_LAST_TIME, atMs).putFloat(KEY_LAST_ACCURACY, accuracy)
                .apply()
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Never return a fix for a different owner profile or after consent revocation. */
    fun readFix(context: Context): JSONObject? {
        if (!consented(context)) return null
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val encoded = prefs.getString(KEY_FIX, null) ?: return null
        return try {
            val bytes = Base64.decode(encoded, Base64.DEFAULT)
            if (bytes.size < 29) return null // 12-byte GCM IV + ciphertext + tag
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secret(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            val decoded = JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
            if (decoded.optString("owner") == owner(context)) decoded else null
        } catch (_: Exception) {
            purge(context)
            null
        }
    }

    /** Revoking access removes local coordinate ciphertext and service permission state. */
    fun purge(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    /** A service can stop unexpectedly. An old consent flag must not claim LIVE without a running service. */
    fun isServiceRequested(context: Context): Boolean =
        consented(context) && context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false)

    fun markStopped(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ENABLED, false).apply()
    }
}
