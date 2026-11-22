package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Only diagnostic text is tested here. Never log Dropbox OAuth data,
 * server responses, GPS fixes, paths or complete exception messages.
 */
class FamilyGuardNativeUploadFailureTest {
    @Test fun http401IsScopedAndRedacted() {
        val ex = IllegalStateException(
            "Dropbox upload HTTP 401: refresh_token=private-secret latitude=47.5"
        )
        val result = FamilyGuardNativeRelay.safeFailure("GPS feltöltés", ex)
        assertEquals("GPS feltöltés · HTTP 401", result)
        assertFalse(result.contains("private-secret"))
        assertFalse(result.contains("47.5"))
        assertFalse(result.contains("refresh_token"))
    }

    @Test fun folderPermissionIsDistinguishedFromUpload() {
        val ex = IllegalStateException(
            "Dropbox mappa művelet sikertelen: HTTP 403 · insufficient_scope"
        )
        assertEquals("Dropbox-mappa · HTTP 403",
            FamilyGuardNativeRelay.safeFailure("Dropbox-mappa", ex))
    }

    @Test fun timeoutsAndDnsAreSeparateSafeStatuses() {
        val timeout = FamilyGuardNativeRelay.safeFailure("GPS feltöltés",
            java.net.SocketTimeoutException("https://sensitive/path?token=bad"))
        assertEquals("GPS feltöltés · Időtúllépés", timeout)
        val dns = FamilyGuardNativeRelay.safeFailure("Eszközellenőrzés",
            java.net.UnknownHostException("sensitive.example"))
        assertEquals("Eszközellenőrzés · DNS hiba", dns)
        assertTrue(dns.length < 80)
    }
}
