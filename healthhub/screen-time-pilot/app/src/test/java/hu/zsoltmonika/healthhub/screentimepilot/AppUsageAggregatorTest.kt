package hu.zsoltmonika.healthhub.screentimepilot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppUsageAggregatorTest {
    private val hour = UsageSessionizer.HOUR_MS
    private fun open(t: Long, pkg: String) = UsageSignal(t, pkg, UsageKind.OPEN)
    private fun close(t: Long, pkg: String) = UsageSignal(t, pkg, UsageKind.CLOSE)
    private fun off(t: Long) = UsageSignal(t, null, UsageKind.SCREEN_OFF)

    @Test fun appBreakdownAgreesWithCoarseAggregatePerHour() {
        val events = listOf(
            open(1000, "com.openai.chatgpt"),
            open(210_000, "com.microsoft.emmx"),
            close(390_000, "com.microsoft.emmx"),
            open(hour - 60_000, "com.openai.chatgpt"),
            close(hour + 30_000, "com.openai.chatgpt")
        )
        val total = UsageSessionizer.aggregate(events, 0, 2 * hour)
        val apps = AppUsageAggregator.aggregate(events, 0, 2 * hour)
        assertEquals(total.map { it.observedForegroundMs },
            apps.groupBy { it.hourStartMs }.toSortedMap().values.map { rows -> rows.sumOf { it.observedForegroundMs } })
        assertEquals(total.sumOf { it.chatGptForegroundMs },
            apps.filter { it.packageName == UsageSessionizer.CHATGPT_PACKAGE }.sumOf { it.observedForegroundMs })
        assertTrue(apps.any { it.packageName == "com.microsoft.emmx" })
    }

    @Test fun appIdentityHasIndependentBucketWithinSameClockHour() {
        val events = listOf(
            open(1_000, "com.openai.chatgpt"),
            open(4_000, "com.microsoft.emmx"),
            close(7_000, "com.microsoft.emmx")
        )
        val rows = AppUsageAggregator.aggregate(events, 0, hour)
        assertEquals(2, rows.size)
        assertEquals("com.microsoft.emmx", rows.first().packageName)
        assertEquals(3_000L, rows.first().observedForegroundMs)
        assertEquals("com.openai.chatgpt", rows.last().packageName)
        assertEquals(3_000L, rows.last().observedForegroundMs)
    }

    @Test fun incompleteForegroundSessionRemainsUnknown() {
        assertTrue(AppUsageAggregator.aggregate(
            listOf(open(0, "com.openai.chatgpt")), 0, hour
        ).isEmpty())
    }

    @Test fun screenOffStopsAppUsage() {
        val rows = AppUsageAggregator.aggregate(
            listOf(open(1000, "com.microsoft.emmx"), off(9000)),
            0, hour
        )
        assertEquals(8000L, rows.single().observedForegroundMs)
    }

    @Test fun crossHourSplitDoesNotDoubleCount() {
        val events = listOf(
            open(hour - 9000, "com.openai.chatgpt"),
            close(hour + 3000, "com.openai.chatgpt")
        )
        val rows = AppUsageAggregator.aggregate(events, 0, hour * 2)
        assertEquals(2, rows.size)
        assertEquals(9000L, rows[0].observedForegroundMs)
        assertEquals(3000L, rows[1].observedForegroundMs)
        assertEquals(12000L, rows.sumOf { it.observedForegroundMs })
    }

    @Test fun sameEventsProduceDeterministicResult() {
        val events = listOf(
            open(1000, "com.openai.chatgpt"), close(5000, "com.openai.chatgpt")
        )
        assertEquals(
            AppUsageAggregator.aggregate(events, 0, hour),
            AppUsageAggregator.aggregate(events, 0, hour)
        )
    }

    @Test fun unmatchedCloseCannotTruncateOtherApp() {
        val rows = AppUsageAggregator.aggregate(
            listOf(
                open(1000, "com.openai.chatgpt"),
                close(2000, "com.microsoft.emmx"),
                close(8000, "com.openai.chatgpt")
            ), 0, hour
        )
        assertEquals(7000L, rows.single().observedForegroundMs)
    }

    @Test fun onlyObservedClosedSessionsAreReported() {
        val rows = AppUsageAggregator.aggregate(
            listOf(
                open(1000, "com.openai.chatgpt"),
                close(4000, "com.openai.chatgpt"),
                open(5000, "com.example.mail")
            ), 0, hour
        )
        assertEquals(1, rows.size)
        assertFalse(rows.any { it.packageName == "com.example.mail" })
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsZeroLengthWindow() {
        AppUsageAggregator.aggregate(emptyList(), 1000, 1000)
    }
}
