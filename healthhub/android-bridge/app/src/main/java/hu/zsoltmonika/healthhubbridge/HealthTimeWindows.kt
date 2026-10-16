package hu.zsoltmonika.healthhubbridge

import java.time.Instant

/**
 * Time windows sent to Health Connect must be strictly increasing.
 * Invalid imported exercise intervals must not stop a complete health export.
 */
internal object HealthTimeWindows {
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
