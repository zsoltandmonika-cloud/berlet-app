package hu.zsoltmonika.healthhub.screentimepilot

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * Reads last 48 COMPLETED UTC hours plus 12h lookback to catch active-session
 * starts. Only foreground transition timings reach the in-memory reducer.
 * NO upload, background exfiltration, chat content or raw app-name history.
 */
internal object UsageCollector {
    data class CollectOutcome(val hoursObserved: Int, val storedHours: Int, val signals: Int)
    private const val WINDOW_HOURS = 48L
    private const val START_LOOKBACK_HOURS = 12L

    fun collect(context: Context, owner: String): CollectOutcome {
        require(PilotState.owner(context) == owner) { "Device owner mismatch" }
        require(UsageAccess.isGranted(context)) { "Android Usage Access is missing" }
        val now = System.currentTimeMillis()
        val end = Math.floorDiv(now, UsageSessionizer.HOUR_MS) * UsageSessionizer.HOUR_MS
        val start = end - WINDOW_HOURS * UsageSessionizer.HOUR_MS
        val lookback = start - START_LOOKBACK_HOURS * UsageSessionizer.HOUR_MS
        val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val cursor = usage.queryEvents(lookback, end)
            ?: error("Android UsageEvents unavailable: do not treat this as zero usage")
        val event = UsageEvents.Event()
        val signals = ArrayList<UsageSignal>()
        while (cursor.hasNextEvent()) {
            cursor.getNextEvent(event)
            val kind = when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> UsageKind.OPEN
                UsageEvents.Event.ACTIVITY_PAUSED -> UsageKind.CLOSE
                UsageEvents.Event.SCREEN_NON_INTERACTIVE -> UsageKind.SCREEN_OFF
                else -> null
            }
            if (kind != null) {
                signals.add(UsageSignal(event.timeStamp, event.packageName, kind))
            }
        }
        val observed = UsageSessionizer.aggregate(signals, start, end)
        // Intentionally don't write fabricated zero-hour entries.
        val stored = LocalLedger.merge(context, owner, observed, now)
        return CollectOutcome(observed.size, stored, signals.size)
    }
}
