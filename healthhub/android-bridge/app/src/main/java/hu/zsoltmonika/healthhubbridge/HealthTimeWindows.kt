package hu.zsoltmonika.healthhubbridge

import java.time.Instant

/**
 * Time windows sent to Health Connect must be strictly increasing.
 * Invalid imported exercise intervals must not stop a complete health export.
 */
internal object HealthTimeWindows {

    // The exact Health Connect error seen on the device. Only this malformed
    // source-data error is safe to recover from; network/permissions must retry.
    fun isInvalidIntervalError(error: Throwable): Boolean =
        generateSequence(error) { it.cause }
            .take(6)
            .any {
                val msg = it.message.orEmpty()
                msg.contains("startTime must be before endTime", ignoreCase = true) ||
                    msg.contains("start time must be before end time", ignoreCase = true)
            }
    /**
     * Returns the valid intersection of an exercise interval and an export interval,
     * or null if either is empty/reversed or they do not overlap.
     */
    fun boundedSession(
        sessionStart: Instant,
        sessionEnd: Instant,
        exportStart: Instant,
        exportEnd: Instant
    ): Pair<Instant, Instant>? {
        if (!sessionStart.isBefore(sessionEnd) || !exportStart.isBefore(exportEnd)) return null
        val start = if (sessionStart.isAfter(exportStart)) sessionStart else exportStart
        val end = if (sessionEnd.isBefore(exportEnd)) sessionEnd else exportEnd
        return if (start.isBefore(end)) start to end else null
    }
}
