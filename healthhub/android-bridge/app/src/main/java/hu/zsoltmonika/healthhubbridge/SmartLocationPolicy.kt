package hu.zsoltmonika.healthhubbridge

/**
 * No route collection, motion-sensor permission or background microphone.
 * Pure sampling policy: derived motion is ephemeral and is never persisted.
 * Android's Fused Location Provider retains final control over update timing.
 */
class SmartLocationPolicy {
    enum class Mode { SEARCHING, MOVING, IDLE }

    var mode: Mode = Mode.SEARCHING
        private set

    private var consecutiveStill = 0
    private var consecutivePoor = 0
    private var lastSwitchAt = 0L

    fun observe(
        speedMps: Float?,
        displacementMeters: Float?,
        accuracyMeters: Float,
        monotonicNowMs: Long
    ): Mode {
        val valid = accuracyMeters.isFinite() && accuracyMeters in 0f..100f
        if (!valid) consecutivePoor++ else consecutivePoor = 0

        val candidate = when {
            consecutivePoor >= 2 -> Mode.SEARCHING
            !valid -> mode
            (speedMps != null && speedMps.isFinite() && speedMps >= 1.3f) ||
                (displacementMeters != null && displacementMeters.isFinite() &&
                    displacementMeters >= 20f) -> {
                consecutiveStill = 0
                Mode.MOVING
            }
            else -> {
                consecutiveStill++
                if (consecutiveStill >= 3) Mode.IDLE else mode
            }
        }
        // Avoid thrashing FLP's subscription after every location callback.
        val minDwell = if (candidate == Mode.MOVING) 5_000L else 30_000L
        if (candidate != mode && (lastSwitchAt == 0L ||
                    monotonicNowMs - lastSwitchAt >= minDwell)) {
            mode = candidate
            lastSwitchAt = monotonicNowMs
        }
        return mode
    }

    fun intervalMillis(userSeconds: Int): Long {
        val configured = userSeconds.coerceIn(15, 60).toLong() * 1000L
        return when (mode) {
            Mode.SEARCHING -> minOf(configured, 15_000L)
            Mode.MOVING -> minOf(configured, 20_000L)
            Mode.IDLE -> maxOf(configured, 45_000L)
        }
    }

    fun highAccuracy(): Boolean = mode != Mode.IDLE
}
