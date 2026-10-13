package hu.zsoltmonika.healthhub.screentimepilot

/**
 * Pure, Android-independent event reducer. Android UsageEvents records foreground
 * transitions, NOT ChatGPT messages or exact Samsung Digital Wellbeing totals.
 *
 * Only observed, CLOSED foreground intervals count. A missing close event is
 * intentionally not estimated until 'now'; missing observation is not zero use.
 */
internal enum class UsageKind { OPEN, CLOSE, SCREEN_OFF }
internal data class UsageSignal(
    val atMs: Long,
    val packageName: String?,
    val kind: UsageKind
)
internal data class UsageHour(
    val hourStartMs: Long,
    val observedForegroundMs: Long,
    val chatGptForegroundMs: Long,
    val sessionFragments: Int
)

internal object UsageSessionizer {
    const val HOUR_MS: Long = 3_600_000L
    const val CHATGPT_PACKAGE = "com.openai.chatgpt"

    fun aggregate(
        events: List<UsageSignal>,
        rangeStartMs: Long,
        rangeEndMs: Long,
        chatGptPackage: String = CHATGPT_PACKAGE
    ): List<UsageHour> {
        require(rangeEndMs > rangeStartMs)
        val accumulator = sortedMapOf<Long, MutableBucket>()
        var foreground: String? = null
        var openedAt: Long? = null
        fun close(at: Long) {
            val pkg = foreground
            val start = openedAt
            if (pkg != null && start != null && at > start) {
                var current = maxOf(start, rangeStartMs)
                val clippedEnd = minOf(at, rangeEndMs)
                while (current < clippedEnd) {
                    val hour = Math.floorDiv(current, HOUR_MS) * HOUR_MS
                    val splitAt = minOf(clippedEnd, hour + HOUR_MS)
                    val bucket = accumulator.getOrPut(hour) { MutableBucket() }
                    val duration = splitAt - current
                    bucket.foregroundMs += duration
                    if (pkg == chatGptPackage) bucket.chatGptMs += duration
                    bucket.fragmentCount++
                    current = splitAt
                }
            }
            foreground = null
            openedAt = null
        }

        // stable sort preserves same-millisecond event order.
        for (event in events.sortedBy { it.atMs }) {
            if (event.atMs > rangeEndMs) break
            when (event.kind) {
                UsageKind.OPEN -> {
                    val pkg = event.packageName
                    if (!pkg.isNullOrBlank()) {
                        if (foreground != pkg) {
                            close(event.atMs)
                            foreground = pkg
                            openedAt = event.atMs
                        }
                    }
                }
                UsageKind.CLOSE -> if (event.packageName == foreground) {
                    close(event.atMs)
                }
                UsageKind.SCREEN_OFF -> close(event.atMs)
            }
        }
        // Intentionally discard unclosed session: no invented duration.
        return accumulator.map { (key, bucket) ->
            UsageHour(key, bucket.foregroundMs, bucket.chatGptMs, bucket.fragmentCount)
        }
    }

    private class MutableBucket(
        var foregroundMs: Long = 0,
        var chatGptMs: Long = 0,
        var fragmentCount: Int = 0
    )
}
