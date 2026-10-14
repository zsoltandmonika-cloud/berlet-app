package hu.zsoltmonika.healthhubbridge.dw

/**
 * Granular app identity must be separately opted into by the phone's owner.
 * Retained ONLY in this application's private local storage, never networked.
 */
internal data class AppUsageHour(
    val hourStartMs: Long,
    val packageName: String,
    val observedForegroundMs: Long,
    val sessionFragments: Int
)

internal object AppUsageAggregator {
    fun aggregate(
        events: List<UsageSignal>,
        rangeStartMs: Long,
        rangeEndMs: Long
    ): List<AppUsageHour> {
        val accum = mutableMapOf<Pair<Long, String>, MutableBucket>()
        for (interval in UsageIntervals.closed(events, rangeStartMs, rangeEndMs)) {
            var current = interval.startMs
            while (current < interval.endMs) {
                val hour = Math.floorDiv(current, UsageSessionizer.HOUR_MS) * UsageSessionizer.HOUR_MS
                val splitAt = minOf(interval.endMs, hour + UsageSessionizer.HOUR_MS)
                val key = hour to interval.packageName
                val bucket = accum.getOrPut(key) { MutableBucket() }
                bucket.durationMs += splitAt - current
                bucket.fragmentCount++
                current = splitAt
            }
        }
        val results = accum.entries
            .sortedWith(compareBy({ it.key.first }, { it.key.second }))
            .map { (key, value) -> AppUsageHour(key.first, key.second, value.durationMs, value.fragmentCount) }
        // Guard an Android device/source anomaly instead of silently publishing
        // impossible app usage for a single foreground clock-hour.
        require(results.groupBy { it.hourStartMs }.values.all { hour ->
            hour.sumOf { it.observedForegroundMs } <= UsageSessionizer.HOUR_MS
        }) { "Overlapping foreground observations exceed one clock hour" }
        return results
    }

    private class MutableBucket(
        var durationMs: Long = 0,
        var fragmentCount: Int = 0
    )
}
