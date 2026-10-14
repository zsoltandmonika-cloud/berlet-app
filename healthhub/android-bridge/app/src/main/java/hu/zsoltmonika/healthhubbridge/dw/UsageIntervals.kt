package hu.zsoltmonika.healthhubbridge.dw

/**
 * Only Android-observed, CLOSED foreground sessions. A foreground-start without
 * a matching transition is UNKNOWN, not a fabricated duration ending at "now".
 * Shares exactly one interval source between the hourly total and the optional
 * per-application detail. Does not handle app content or messages.
 */
internal data class ObservedForegroundInterval(
    val startMs: Long,
    val endMs: Long,
    val packageName: String
)

internal object UsageIntervals {
    fun closed(events: List<UsageSignal>, rangeStartMs: Long, rangeEndMs: Long): List<ObservedForegroundInterval> {
        require(rangeStartMs >= 0 && rangeEndMs > rangeStartMs)
        val results = ArrayList<ObservedForegroundInterval>()
        var foreground: String? = null
        var started: Long? = null

        fun close(at: Long) {
            val pkg = foreground
            val start = started
            if (pkg != null && start != null && at > start) {
                val from = maxOf(start, rangeStartMs)
                val to = minOf(at, rangeEndMs)
                if (to > from) results.add(ObservedForegroundInterval(from, to, pkg))
            }
            foreground = null
            started = null
        }

        // Kotlin sort is stable for events with identical timestamps.
        for (event in events.sortedBy { it.atMs }) {
            if (event.atMs > rangeEndMs) break
            when (event.kind) {
                UsageKind.OPEN -> {
                    val pkg = event.packageName
                    if (!pkg.isNullOrBlank() && pkg != foreground) {
                        close(event.atMs)
                        foreground = pkg
                        started = event.atMs
                    }
                }
                UsageKind.CLOSE -> if (foreground == event.packageName) close(event.atMs)
                UsageKind.SCREEN_OFF -> close(event.atMs)
            }
        }
        // No automatic close at the end of the query range.
        return results
    }
}
