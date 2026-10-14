package hu.zsoltmonika.healthhubbridge.dw

import android.content.Context
import android.content.SharedPreferences

/** Local-only usage settings within the EXISTING HH One Connect application. */
internal object PilotState {
    private const val NAME = "hh_one_digital_usage_v1"
    const val OWNER = "bound_profile"
    const val ENABLED = "collection_enabled"
    const val CLOUD_ENABLED = "shared_vault_upload_opt_in"
    const val CLOUD_ERASE_PENDING = "shared_vault_tombstone_pending"
    // Every consent mutation changes this monotonic generation so in-flight uploads cannot acknowledge stale consent.
    const val CLOUD_REVISION = "shared_vault_consent_revision"
    const val CLOUD_DETAIL_ENABLED = "shared_vault_app_detail_opt_in"
    const val CLOUD_DETAIL_START_MS = "shared_vault_detail_consent_ms"
    const val LAST_CLOUD_SUCCESS = "last_cloud_upload_verified_ms"
    const val LAST_CLOUD_ERROR = "last_cloud_upload_error"
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

    // HH One has ONE canonical Android device owner, already bound by
    // HealthHub Connect. Never let a local usage preference select another owner.
    // Owner changes fail closed: disable collection and delete previous app history.
    @Synchronized
    fun owner(context: Context): String? {
        val primary = context.getSharedPreferences("healthhub_connect", Context.MODE_PRIVATE)
            .getString("device_owner_profile", null)
            ?.takeIf { it == "zsolt" || it == "monika" }
        val p = prefs(context)
        val previouslyBound = p.getString(OWNER, null)
        if (previouslyBound != primary) {
            p.edit()
                .putBoolean(ENABLED, false)
                .putBoolean(CLOUD_ENABLED, false)
                .putBoolean(CLOUD_DETAIL_ENABLED, false)
                .remove(CLOUD_DETAIL_START_MS)
                .putBoolean(CLOUD_ERASE_PENDING, false)
                .putBoolean(APP_DETAIL_ENABLED, false)
                .remove(APP_DETAIL_CONSENT_START_MS)
                .putString(OWNER, primary)
                .putString(LAST_NOTE, "Eszköztulajdonos-változás: használati adatok gyűjtése leállítva.")
                .apply()
            CollectionScheduler.stop(context)
            previouslyBound?.takeIf { it == "zsolt" || it == "monika" }?.let {
                LocalLedger.clear(context, it)
                AppDetailLedger.clear(context, it)
            }
        }
        return primary
    }
}
