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
    const val LAST_RUN = "last_completed_run_ms"
    const val LAST_NOTE = "last_collection_note"

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun owner(context: Context): String? =
        prefs(context).getString(OWNER, null)?.takeIf { it == "zsolt" || it == "monika" }
}
