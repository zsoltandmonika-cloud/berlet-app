package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import android.content.SharedPreferences

/** Separate application ID and prefs, never shared with production Connect. */
internal object PilotState {
    private const val NAME = "hh_screen_time_pilot_v1"
    const val OWNER = "bound_profile"
    const val ENABLED = "collection_enabled"
    // More sensitive application-level usage is a SECOND, explicit opt-in.
    const val APP_DETAIL_ENABLED = "app_detail_collection_enabled"
    // Do not retrospectively collect app identities from before this consent.
    const val APP_DETAIL_CONSENT_START_MS = "app_detail_consent_start_ms"
    const val LAST_RUN = "last_completed_run_ms"
    const val LAST_NOTE = "last_collection_note"
    // Independent per-phone schedule, never synced or sent to public Pages.
    const val SCHEDULE_INTERVAL_HOURS = "schedule_interval_hours_v030"
    const val SCHEDULE_CUSTOM_TIMES = "schedule_custom_times_v030"
    const val APPLIED_INTERVAL_HOURS = "applied_interval_hours_v030"
    const val APPLIED_CUSTOM_SLOTS = "applied_custom_slots_v030"
    const val LAST_COLLECTION_SOURCE = "last_collection_source_v030"

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun owner(context: Context): String? =
        prefs(context).getString(OWNER, null)?.takeIf { it == "zsolt" || it == "monika" }
}
