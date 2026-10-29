package hu.zsoltmonika.healthhubbridge

/**
 * Applies only to consented *native Dropbox upload* frequency. It does not
 * request sensors, add location history or change the user's chosen GPS rate.
 *
 * At 15s user setting: verified road speed -> 15s, moving/unknown -> 30s,
 * measured idle -> 60s. A slower 30s/60s user choice is never overridden.
 * These are minimum intervals, not guarantees of when Android supplies fixes.
 */
internal object NativeGpsUploadPolicy {
    fun minimumUploadMs(
        configuredSeconds: Int,
        mode: SmartLocationPolicy.Mode,
        speedMetersPerSecond: Float?,
        accuracyMeters: Float
    ): Long {
        val selectedMs = configuredSeconds.coerceIn(15, 60).toLong() * 1000L
        val accurate = accuracyMeters.isFinite() && accuracyMeters in 0f..40f
        val measuredSpeed = speedMetersPerSecond?.takeIf { it.isFinite() && it >= 0f }
        val inVehicle = accurate && measuredSpeed != null && measuredSpeed >= 2.8f
        val stationary = accurate && mode == SmartLocationPolicy.Mode.IDLE &&
            (measuredSpeed == null || measuredSpeed < 1.0f)
        val minimum = when {
            inVehicle -> 15_000L
            stationary -> 60_000L
            else -> 30_000L
        }
        return maxOf(selectedMs, minimum)
    }
}
