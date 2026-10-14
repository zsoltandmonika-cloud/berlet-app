package hu.zsoltmonika.healthhubbridge.dw

/**
 * Pure replacement semantics for successive overlapping Android usage scans.
 * All apps for a re-observed UTC hour form ONE snapshot. Re-running a scan
 * cannot accumulate durations from outdated app lists.
 */
internal object AppUsageMerger {
    fun merge(
        existing: List<AppUsageHour>,
        incoming: List<AppUsageHour>,
        cutoffMs: Long,
        nowMs: Long
    ): List<AppUsageHour> {
        require(nowMs > cutoffMs)
        fun validate(rows: List<AppUsageHour>) {
            require(rows.distinctBy { it.hourStartMs to it.packageName }.size == rows.size) {
                "Duplicate app-hour key"
            }
            require(rows.all { row ->
                row.hourStartMs >= 0 &&
                    row.hourStartMs % UsageSessionizer.HOUR_MS == 0L &&
                    row.observedForegroundMs in 1..UsageSessionizer.HOUR_MS &&
                    row.packageName.length in 1..180 &&
                    row.sessionFragments in 1..100000
            })
            require(rows.groupBy { it.hourStartMs }.values.all { hour ->
                hour.sumOf { it.observedForegroundMs } <= UsageSessionizer.HOUR_MS
            }) { "Foreground exceeds clock hour" }
        }
        validate(existing)
        validate(incoming)
        val fresh = incoming.filter { it.hourStartMs >= cutoffMs && it.hourStartMs < nowMs }
        val replaced = fresh.map { it.hourStartMs }.toSet()
        val retained = existing.filter {
            it.hourStartMs >= cutoffMs && it.hourStartMs < nowMs && it.hourStartMs !in replaced
        }
        return (retained + fresh).sortedWith(compareBy({ it.hourStartMs }, { it.packageName }))
            .also(::validate)
    }
}
