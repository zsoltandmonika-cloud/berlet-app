package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Test

/** No Android dependencies, new sensors, or uploads in this deterministic test. */
class NativeGpsUploadPolicyTest {
    @Test fun bus15SecondsButRespectsUserSlowerChoices() {
        assertEquals(15_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.MOVING, 8f, 9f))
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            30, SmartLocationPolicy.Mode.MOVING, 8f, 9f))
        assertEquals(60_000L, NativeGpsUploadPolicy.minimumUploadMs(
            60, SmartLocationPolicy.Mode.MOVING, 8f, 9f))
    }

    @Test fun noSpeedOrWalkingRemain30Seconds() {
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.MOVING, 1.5f, 10f))
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.SEARCHING, null, 10f))
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.MOVING, Float.NaN, 10f))
    }

    @Test fun stationaryAccurateFixReducesDropboxWrites() {
        assertEquals(60_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.IDLE, 0f, 12f))
        assertEquals(60_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.IDLE, null, 12f))
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.IDLE, null, 100f))
        // A reliable bus-speed fix takes precedence over the old idle mode.
        assertEquals(15_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.IDLE, 12f, 10f))
    }

    @Test fun poorGpsCannotActivateFastUpload() {
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.MOVING, 10f, 45f))
        assertEquals(30_000L, NativeGpsUploadPolicy.minimumUploadMs(
            15, SmartLocationPolicy.Mode.MOVING, -1f, 12f))
    }
}
