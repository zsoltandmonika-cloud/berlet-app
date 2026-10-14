package hu.zsoltmonika.healthhubbridge.dw

/** Pure, Android-independent aggregate; foreground observation != device screen-on time. */
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
        val accumulator = sortedMapOf<Long, MutableBucket>()
        for (interval in UsageIntervals.closed(events, rangeStartMs, rangeEndMs)) {
            var current = interval.startMs
            while (current < interval.endMs) {
                val hour = Math.floorDiv(current, HOUR_MS) * HOUR_MS
                val splitAt = minOf(interval.endMs, hour + HOUR_MS)
                val bucket = accumulator.getOrPut(hour) { MutableBucket() }
                val duration = splitAt - current
                bucket.foregroundMs += duration
                if (interval.packageName == chatGptPackage) bucket.chatGptMs += duration
                bucket.fragmentCount++
                current = splitAt
            }
        }
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
