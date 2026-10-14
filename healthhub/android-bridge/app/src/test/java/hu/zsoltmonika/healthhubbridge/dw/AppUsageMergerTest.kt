package hu.zsoltmonika.healthhubbridge.dw

import org.junit.Assert.assertEquals
import org.junit.Test

class AppUsageMergerTest {
    private val hour = UsageSessionizer.HOUR_MS
    private fun a(t: Long, pkg: String, ms: Long) = AppUsageHour(t, pkg, ms, 1)

    @Test fun newHourSnapshotReplacesOldAppsInsteadOfInflatingTotals() {
        val old = listOf(a(hour, "com.old.app", 600_000))
        val fresh = listOf(a(hour, "com.new.app", 1_200_000))
        val result = AppUsageMerger.merge(old, fresh, 0, 2 * hour)
        assertEquals(1, result.size)
        assertEquals("com.new.app", result.single().packageName)
        assertEquals(1_200_000L, result.single().observedForegroundMs)
    }

    @Test fun rescanningSameHoursIsIdempotent() {
        val incoming = listOf(a(hour, "com.openai.chatgpt", 600_000),
            a(hour, "com.microsoft.emmx", 300_000))
        val first = AppUsageMerger.merge(emptyList(), incoming, 0, 2 * hour)
        val again = AppUsageMerger.merge(first, incoming, 0, 2 * hour)
        assertEquals(first, again)
    }

    @Test fun nonOverlappingHoursAreRetained() {
        val old = listOf(a(hour, "com.old.app", 300_000))
        val fresh = listOf(a(2*hour, "com.openai.chatgpt", 500_000))
        assertEquals(2, AppUsageMerger.merge(old, fresh, 0, 3*hour).size)
    }

    @Test fun pastRetentionCutoffDropsOldApps() {
        val old = listOf(a(hour, "com.old.app", 300_000))
        val new = listOf(a(2*hour, "com.openai.chatgpt", 500_000))
        val merged = AppUsageMerger.merge(old,new,2*hour,3*hour)
        assertEquals(1,merged.size)
        assertEquals("com.openai.chatgpt",merged.single().packageName)
    }

    @Test(expected = IllegalArgumentException::class)
    fun combinedHourGreaterThanOneHourIsRejected() {
        AppUsageMerger.merge(emptyList(), listOf(
            a(hour,"com.openai.chatgpt",2_000_000),
            a(hour,"com.microsoft.emmx",2_000_000)
        ),0,2*hour)
    }

    @Test(expected = IllegalArgumentException::class)
    fun duplicateAppHourKeysRejected() {
        AppUsageMerger.merge(emptyList(), listOf(
            a(hour,"com.openai.chatgpt",200_000),
            a(hour,"com.openai.chatgpt",300_000)
        ),0,2*hour)
    }
}
