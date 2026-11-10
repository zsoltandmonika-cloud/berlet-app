package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Test

class GuardianLegacyRegistryDecisionTest {
    private val z = "android-11111111-2222-3333-4444-555555555555"
    private val m = "android-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    private fun legacy(zsolt: String? = null, monika: String? = m, archived: String = "[]"): String {
        fun value(id: String?) = id?.let { "\"$it\"" } ?: "null"
        return """{"schema":"healthhub.device_registry/1","activePhones":{"zsolt":${value(zsolt)},"monika":${value(monika)}},"archived":$archived,"history":[]}"""
    }

    @Test fun selectedExistingOwnerRetainsAccess() {
        assertEquals(GuardianLegacyRegistryDecision.Result.SELECTED,
            GuardianLegacyRegistryDecision.inspect(legacy(z), "zsolt", z))
    }
    @Test fun unassignedMayOnlyTryCentralServerProof() {
        assertEquals(GuardianLegacyRegistryDecision.Result.UNASSIGNED,
            GuardianLegacyRegistryDecision.inspect(legacy(), "zsolt", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.UNASSIGNED,
            GuardianLegacyRegistryDecision.inspect(null, "zsolt", z))
    }
    @Test fun conflictingOwnerOrRetiredPhoneCannotFallback() {
        assertEquals(GuardianLegacyRegistryDecision.Result.CONFLICT,
            GuardianLegacyRegistryDecision.inspect(legacy(m), "zsolt", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.CONFLICT,
            GuardianLegacyRegistryDecision.inspect(legacy(archived = "[\"$z\"]"), "zsolt", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.CONFLICT,
            GuardianLegacyRegistryDecision.inspect(legacy(zsolt = null, monika = z), "zsolt", z))
    }
    @Test fun corruptedOrWrongOwnerCannotFallback() {
        assertEquals(GuardianLegacyRegistryDecision.Result.INVALID,
            GuardianLegacyRegistryDecision.inspect("{", "zsolt", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.INVALID,
            GuardianLegacyRegistryDecision.inspect("""{"schema":"wrong","activePhones":{},"archived":[]}""", "zsolt", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.INVALID,
            GuardianLegacyRegistryDecision.inspect(legacy(), "invalid", z))
        assertEquals(GuardianLegacyRegistryDecision.Result.INVALID,
            GuardianLegacyRegistryDecision.inspect(legacy(), "zsolt", "android-guess"))
    }
}
