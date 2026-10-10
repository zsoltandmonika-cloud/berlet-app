package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.content.Context
import org.json.JSONObject

/**
 * Used by the normal Health Connect build when Samsung's separately distributed
 * proprietary .aar has not been supplied. Never invent Samsung health records.
 */
object SamsungSdkDailyReader {
    const val available = false

    suspend fun collect(
        @Suppress("UNUSED_PARAMETER") activity: Activity,
        @Suppress("UNUSED_PARAMETER") profile: String,
        @Suppress("UNUSED_PARAMETER") days: Int = 30
    ): JSONObject = error("Samsung Health Data SDK library not installed in this build.")

    suspend fun collectBackground(
        @Suppress("UNUSED_PARAMETER") context: Context,
        @Suppress("UNUSED_PARAMETER") profile: String,
        @Suppress("UNUSED_PARAMETER") days: Int = 30
    ): JSONObject = error("Samsung Health Data SDK library not installed in this build.")
}
