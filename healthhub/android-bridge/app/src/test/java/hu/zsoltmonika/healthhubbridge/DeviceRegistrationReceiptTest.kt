package hu.zsoltmonika.healthhubbridge

import org.json.JSONObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class DeviceRegistrationReceiptTest {
    private val deviceId = "android-12345678-1234-1234-1234-123456789abc"
    private val started = Instant.parse("2026-11-09T00:10:00Z").toEpochMilli()
    private val now = started + 10_000L

    private fun record(
        owner: String = "monika",
        id: String = deviceId,
        type: String = "android",
        seenAt: String = "2026-11-09T00:10:03Z"
    ): String = JSONObject()
        .put("schema", "healthhub.orchestrator.device/1")
        .put("deviceType", type)
        .put("deviceId", id)
        .put("activeProfile", owner)
        .put("lastSeenAt", seenAt)
        .toString()

    @Test fun currentAuthenticatedAndroidHeartbeatIsVerified() {
        val result = DeviceRegistrationReceipt.inspect(record(), deviceId, "monika", started, now)
        assertTrue(result.verified)
        assertTrue(result.lastSeenAt?.startsWith("2026-11-09T00:10") == true)
    }

    @Test fun missingMalformedOrStaleRecordIsRejected() {
        assertFalse(DeviceRegistrationReceipt.inspect(null, deviceId, "monika", started, now).verified)
        assertFalse(DeviceRegistrationReceipt.inspect("{broken", deviceId, "monika", started, now).verified)
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(seenAt = "2026-11-08T23:59:00Z"), deviceId, "monika", started, now
        ).verified)
    }

    @Test fun crossDeviceOrCrossProfileCannotBeMarkedVerified() {
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(owner = "zsolt"), deviceId, "monika", started, now
        ).verified)
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(id = "android-00000000-1234-1234-1234-123456789abc"), deviceId, "monika", started, now
        ).verified)
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(type = "web"), deviceId, "monika", started, now
        ).verified)
    }

    @Test fun invalidOrFutureTimestampsAreRejected() {
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(seenAt = "invalid"), deviceId, "monika", started, now
        ).verified)
        assertFalse(DeviceRegistrationReceipt.inspect(
            record(seenAt = "2030-01-01T00:00:00Z"), deviceId, "monika", started, now
        ).verified)
    }
}
