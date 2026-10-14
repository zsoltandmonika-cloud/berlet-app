package hu.zsoltmonika.healthhubbridge.dw

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class CollectionScheduleTest {
    private val budapest = ZoneId.of("Europe/Budapest")

    @Test fun validatesClockStringsAndBoundedIntervalOptions() {
        assertEquals(LocalTime.of(6, 5), CollectionSchedule.parseSlot("06:05"))
        assertNull(CollectionSchedule.parseSlot("24:00"))
        assertNull(CollectionSchedule.parseSlot("06:75"))
        assertNull(CollectionSchedule.parseSlot("6:05"))
        assertTrue(CollectionSchedule.INTERVALS.contains(6))
        assertFalse(CollectionSchedule.INTERVALS.contains(3))
        assertEquals(8, CollectionSchedule.MAX_SLOTS)
    }

    @Test fun selectsEarliestLaterSameDaySlot() {
        val now = ZonedDateTime.of(2026, 10, 14, 6, 40, 0, 0, budapest)
        val times = listOf(LocalTime.of(18, 0), LocalTime.of(6, 0), LocalTime.of(12, 0))
        assertEquals(LocalTime.of(12, 0), CollectionSchedule.nextSlot(now, times)?.toLocalTime())
    }

    @Test fun nextDayForPassedSlots() {
        val now = ZonedDateTime.of(2026, 10, 14, 23, 30, 0, 0, budapest)
        val next = CollectionSchedule.nextSlot(now, listOf(LocalTime.of(6, 0)))
        assertEquals("2026-10-15", next?.toLocalDate().toString())
        assertEquals(LocalTime.of(6, 0), next?.toLocalTime())
    }

    @Test fun handlesSpringForwardWithAndroidValidLocalTime() {
        // Hungary jumps from 02:00 to 03:00 on this date.
        val now = ZonedDateTime.of(2026, 3, 29, 1, 45, 0, 0, budapest)
        val next = CollectionSchedule.nextSlot(now, listOf(LocalTime.of(2, 30)))
        assertEquals(LocalTime.of(3, 30), next?.toLocalTime())
        assertEquals("2026-03-29", next?.toLocalDate().toString())
    }

    @Test fun noDuplicateDuringAutumnRepeatedHour() {
        val first = ZonedDateTime.of(2026, 10, 25, 2, 35, 0, 0, budapest)
        val second = first.withLaterOffsetAtOverlap()
        val next = CollectionSchedule.nextSlot(second, listOf(LocalTime.of(2, 30)))
        assertEquals("2026-10-26", next?.toLocalDate().toString())
    }

    @Test fun emptySlotsAreNotInvented() {
        val now = ZonedDateTime.of(2026, 10, 14, 6, 40, 0, 0, budapest)
        assertNull(CollectionSchedule.nextSlot(now, emptyList()))
    }
}
