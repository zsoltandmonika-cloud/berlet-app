package hu.zsoltmonika.healthhubbridge.dw

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UsageSessionizerTest {
    private val hour = UsageSessionizer.HOUR_MS
    private fun open(t: Long, pkg: String) = UsageSignal(t, pkg, UsageKind.OPEN)
    private fun close(t: Long, pkg: String) = UsageSignal(t, pkg, UsageKind.CLOSE)
    private fun off(t: Long) = UsageSignal(t, null, UsageKind.SCREEN_OFF)

    @Test fun crossHourChatGptIntervalSplitsPrecisely() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(hour - 300_000, "com.openai.chatgpt"),
                   close(hour + 300_000, "com.openai.chatgpt")),
            0L, 2 * hour
        )
        assertEquals(2, rows.size)
        assertEquals(300_000L, rows[0].observedForegroundMs)
        assertEquals(300_000L, rows[0].chatGptForegroundMs)
        assertEquals(300_000L, rows[1].observedForegroundMs)
        assertEquals(300_000L, rows[1].chatGptForegroundMs)
    }

    @Test fun switchingAppsEndsOldSessionWithoutDoubleCounting() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.openai.chatgpt"), open(4000, "com.example.video"),
                   close(6000, "com.openai.chatgpt"), close(9000, "com.example.video")),
            0, hour
        )
        assertEquals(1, rows.size)
        assertEquals(8000L, rows.single().observedForegroundMs)
        assertEquals(3000L, rows.single().chatGptForegroundMs)
    }

    @Test fun screenOffClosesForeground() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.openai.chatgpt"), off(4000)),
            0, hour
        )
        assertEquals(3000L, rows.single().observedForegroundMs)
    }

    @Test fun unclosedEventMustNeverBecomeFabricatedScreenTime() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.openai.chatgpt")),
            0, hour
        )
        assertTrue(rows.isEmpty())
    }

    @Test fun missingEventsAreNotMeasuredZeroBuckets() {
        assertTrue(UsageSessionizer.aggregate(emptyList(), 0, hour).isEmpty())
    }

    @Test fun sourceEventStartBeforeWindowIsClipped() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(-1000, "com.openai.chatgpt"), close(5000, "com.openai.chatgpt")),
            0, hour
        )
        assertEquals(5000L, rows.single().observedForegroundMs)
    }

    @Test fun appNotChatGptDoesNotPolluteChatGptTotal() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.example.chat"), close(7000, "com.example.chat")),
            0, hour
        )
        assertEquals(6000L, rows.single().observedForegroundMs)
        assertEquals(0L, rows.single().chatGptForegroundMs)
    }

    @Test fun unmatchedCloseIsIgnored() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.openai.chatgpt"),
                   close(2000, "com.example.other"),
                   close(6000, "com.openai.chatgpt")),
            0, hour
        )
        assertEquals(5000L, rows.single().observedForegroundMs)
    }

    @Test fun consecutiveDuplicateOpenDoesNotResetStart() {
        val rows = UsageSessionizer.aggregate(
            listOf(open(1000, "com.openai.chatgpt"),
                   open(3000, "com.openai.chatgpt"),
                   close(8000, "com.openai.chatgpt")),
            0, hour
        )
        assertEquals(7000L, rows.single().chatGptForegroundMs)
    }

    @Test fun unsortedInputDoesNotMatterAndStartAtEndIsExcluded() {
        val rows = UsageSessionizer.aggregate(
            listOf(close(5000, "com.openai.chatgpt"),
                   open(hour, "com.example.other"),
                   open(1000, "com.openai.chatgpt")),
            0, hour
        )
        assertEquals(4000L, rows.single().observedForegroundMs)
    }

    @Test(expected = IllegalArgumentException::class)
    fun emptyTimeRangeIsRejected() {
        UsageSessionizer.aggregate(emptyList(), hour, hour)
    }

    @Test fun doesNotDoubleCountAcrossDifferentRunsForSameHour() {
        val records = listOf(
            open(1000, "com.openai.chatgpt"),
            close(5000, "com.openai.chatgpt")
        )
        val first = UsageSessionizer.aggregate(records, 0, hour)
        val second = UsageSessionizer.aggregate(records, 0, hour)
        assertEquals(first, second)
        assertEquals(4000L, first.single().observedForegroundMs)
    }
}
