package hu.zsoltmonika.healthhubbridge.dw

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/** Synthetic-only scheduler policy: no device, no app names, no user health data. */
class CollectionScheduleDetailTest {
    @Test fun defaultCoarseCadenceIsUnchanged() {
        for (hours in listOf(6, 12, 24)) {
            assertEquals(hours, CollectionSchedule.chooseEffectiveHours(hours, false))
        }
    }

    @Test fun consentedSharedAppDetailsTriggerHourlyLocalCollection() {
        for (hours in listOf(6, 12, 24)) {
            assertEquals(1, CollectionSchedule.chooseEffectiveHours(hours, true))
        }
    }

    @Test fun unsupportedIntervalsRemainBlocked() {
        assertThrows(IllegalArgumentException::class.java) {
            CollectionSchedule.chooseEffectiveHours(0, true)
        }
    }
}
