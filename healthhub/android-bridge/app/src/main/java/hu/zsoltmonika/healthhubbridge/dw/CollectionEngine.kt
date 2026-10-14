package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context

/**
 * One collection engine for foreground "collect now" and WorkManager.
 * Lock prevents simultaneous collectors from racing local atomic-ledger merges.
 * No remote usage collection entry point or network upload.
 */
internal object CollectionEngine {
    @Synchronized
    fun collect(context: Context, source: String): UsageCollector.CollectOutcome {
        require(source in setOf("manual", "periodic", "custom", "startup")) {
            "Unknown trigger source"
        }
        val prefs = PilotState.prefs(context)
        require(prefs.getBoolean(PilotState.ENABLED, false)) { "Collection disabled" }
        val owner = PilotState.owner(context) ?: error("No bound profile")
        require(UsageAccess.isGranted(context)) { "Usage Access not granted" }
        return try {
            val outcome = UsageCollector.collect(context, owner)
            val localDetailRows = if (prefs.getBoolean(PilotState.APP_DETAIL_ENABLED, false))
                AppDetailLedger.read(context, owner).size else 0
            prefs.edit()
                .putInt(PilotState.LAST_LOCAL_DETAIL_ROWS, localDetailRows)
                .putLong(PilotState.LAST_RUN, System.currentTimeMillis())
                .putString(PilotState.LAST_COLLECTION_SOURCE, source)
                .putString(PilotState.LAST_NOTE,
                    "Forrás: ${source}; megfigyelt óra: ${outcome.hoursObserved}; " +
                    "privátan tárolt óra: ${outcome.storedHours}; Android esemény: " +
                    "${outcome.signals}; részletes app-óra: ${outcome.detailedAppHours}.")
                .apply()
            outcome
        } catch (e: Exception) {
            prefs.edit().putString(PilotState.LAST_NOTE,
                "Sikertelen ${source} mintavétel (${e.javaClass.simpleName}).").apply()
            throw e
        }
    }

    /** Stops + deletes under the same lock used by every collector. */
    @Synchronized
    fun clearAndStop(context: Context) {
        val prefs = PilotState.prefs(context)
        prefs.edit()
            .putBoolean(PilotState.ENABLED, false)
            .putBoolean(PilotState.APP_DETAIL_ENABLED, false)
            .remove(PilotState.APP_DETAIL_CONSENT_START_MS)
            .remove(PilotState.LAST_NOTE).remove(PilotState.LAST_RUN)
            .remove(PilotState.LAST_COLLECTION_SOURCE)
            .apply()
        CollectionScheduler.stop(context)
        PilotState.owner(context)?.let {
            LocalLedger.clear(context, it)
            AppDetailLedger.clear(context, it)
        }
    }
}
