package hu.zsoltmonika.healthhub.screentimepilot

import android.app.AppOpsManager
import android.content.Context
import android.os.Process

/** PACKAGE_USAGE_STATS is AppOps special access; manifest declaration alone is NOT consent. */
internal object UsageAccess {
    fun isGranted(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        ) == AppOpsManager.MODE_ALLOWED
    }
}
