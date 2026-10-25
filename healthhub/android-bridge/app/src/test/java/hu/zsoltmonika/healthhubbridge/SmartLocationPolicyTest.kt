package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SmartLocationPolicyTest {
    @Test fun movementSwitchesToHighAccuracy() {
        val p = SmartLocationPolicy()
        assertEquals(SmartLocationPolicy.Mode.MOVING,
            p.observe(2.3f, 25f, 6f, 10_000L))
        assertTrue(p.highAccuracy())
        assertEquals(20_000L, p.intervalMillis(30))
    }

    @Test fun idleNeedsThreeValidFixesAndDwell() {
        val p = SmartLocationPolicy()
        p.observe(2f, null, 7f, 10_000L)
        p.observe(0f, 0f, 7f, 21_000L)
        p.observe(0f, 0f, 7f, 32_000L)
        assertEquals(SmartLocationPolicy.Mode.MOVING, p.mode)
        p.observe(0f, 0f, 7f, 45_000L)
        assertEquals(SmartLocationPolicy.Mode.IDLE, p.mode)
        assertFalse(p.highAccuracy())
        assertEquals(45_000L, p.intervalMillis(15))
        assertEquals(60_000L, p.intervalMillis(60))
    }

    @Test fun weakSignalReentersSearchingInsteadOfInventingPosition() {
        val p = SmartLocationPolicy()
        p.observe(3f, null, 3f, 1_000L)
        p.observe(null, null, 999f, 35_000L)
        p.observe(null, null, 999f, 42_000L)
        assertEquals(SmartLocationPolicy.Mode.SEARCHING, p.mode)
        assertTrue(p.highAccuracy())
    }

    @Test fun invalidSpeedOrDisplacementCannotClaimMoving() {
        val p = SmartLocationPolicy()
        p.observe(Float.NaN, Float.POSITIVE_INFINITY, 5f, 1_000L)
        assertEquals(SmartLocationPolicy.Mode.SEARCHING, p.mode)
    }
}
