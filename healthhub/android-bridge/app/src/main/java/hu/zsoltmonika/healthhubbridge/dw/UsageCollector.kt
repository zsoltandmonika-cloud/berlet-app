package hu.zsoltmonika.healthhubbridge.dw

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * Reads last 48 COMPLETED UTC hours plus 12h lookback to catch active-session
 * starts. Query through actual sampling time so a real CLOSE/next app OPEN\n * after the most recent whole hour can confirm a prior session. Reducers\n * still CLIP to the last completed hour: never publish the partial current\n * hour and never synthesize an unobserved close.\n * Only foreground transition timings reach the in-memory reducer.
 * NO upload, background exfiltration, chat content or raw app-name history.
 */
internal object UsageCollector {
    data class CollectOutcome(val hoursObserved: Int, val storedHours: Int, val signals: Int, val detailedAppHours: Int)
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
        val cursor = usage.queryEvents(lookback, now)
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
        val prefs = PilotState.prefs(context)
        val consentStart = prefs.getLong(PilotState.APP_DETAIL_CONSENT_START_MS, 0L)
        val detailed = if (prefs.getBoolean(PilotState.APP_DETAIL_ENABLED, false) &&
            consentStart > 0 && consentStart < end) {
            // Android may return older events. NEVER persist app identities that
            // precede the owner's explicit, second-level detailed consent.
            val apps = AppUsageAggregator.aggregate(signals, maxOf(start, consentStart), end)
            AppDetailLedger.merge(context, owner, apps, now)
        } else {
            0
        }
        return CollectOutcome(observed.size, stored, signals.size, detailed)
    }
}
