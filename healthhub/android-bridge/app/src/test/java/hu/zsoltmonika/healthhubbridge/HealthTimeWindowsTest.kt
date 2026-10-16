package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

class HealthTimeWindowsTest {
    private val from = Instant.parse("2026-09-16T07:00:00Z")
    private val until = Instant.parse("2026-10-16T07:00:00Z")

    @Test fun normalExercisePreservesWindow() {
        val s = Instant.parse("2026-10-15T08:00:00Z")
        val e = Instant.parse("2026-10-15T09:00:00Z")
        assertEquals(s to e, HealthTimeWindows.boundedSession(s, e, from, until))
    }

    @Test fun zeroLengthExerciseIsRejected() {
        val t = Instant.parse("2026-10-15T08:00:00Z")
        assertNull(HealthTimeWindows.boundedSession(t, t, from, until))
    }

    @Test fun reversedExerciseIsRejected() {
        val s = Instant.parse("2026-10-15T09:00:00Z")
        val e = Instant.parse("2026-10-15T08:00:00Z")
        assertNull(HealthTimeWindows.boundedSession(s, e, from, until))
    }

    @Test fun exerciseCrossingExportEndIsClamped() {
        val s = Instant.parse("2026-10-16T06:50:00Z")
        val e = Instant.parse("2026-10-16T08:20:00Z")
        assertEquals(s to until, HealthTimeWindows.boundedSession(s, e, from, until))
    }

    @Test fun exerciseOutsideExportIsRejected() {
        val s = Instant.parse("2026-10-16T07:00:00Z")
        val e = Instant.parse("2026-10-16T08:00:00Z")
        assertNull(HealthTimeWindows.boundedSession(s, e, from, until))
    }

    @Test fun zeroLengthExportIsRejected() {
        val s = Instant.parse("2026-10-15T08:00:00Z")
        val e = Instant.parse("2026-10-15T09:00:00Z")
        assertNull(HealthTimeWindows.boundedSession(s, e, until, until))
    }
}
