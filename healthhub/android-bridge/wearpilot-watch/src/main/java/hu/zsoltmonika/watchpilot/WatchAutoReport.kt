package hu.zsoltmonika.watchpilot

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.WorkManager
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

/**
 * Inexact and OWNER-OPT-IN low-power telemetry: the worker reads ONLY the watch battery,
 * never requests sensors, microphone, background location or health records.
 * Default: disabled. Default transport: nearby only, not LTE.
 */
internal object WatchAutoSchedule {
    const val PREFS = "sh9_watch_autoreport_v2"
    const val KEY_ENABLED = "auto_enabled"
    const val KEY_INTERVAL = "auto_minutes"
    const val KEY_REMOTE = "auto_remote_consent"
    const val KEY_LAST_SEND = "auto_last_send"
    private const val UNIQUE = "watch9_pilot_battery_only"

    fun enable(context: Context, minutes: Int, allowRemote: Boolean) {
        require(minutes in listOf(30, 60, 120))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ENABLED, true)
            .putInt(KEY_INTERVAL, minutes)
            .putBoolean(KEY_REMOTE, allowRemote)
            .apply()
        val constraints = Constraints.Builder().setRequiresBatteryNotLow(true).build()
        val request = PeriodicWorkRequestBuilder<WatchBatteryWorker>(
            minutes.toLong(), TimeUnit.MINUTES
        ).setConstraints(constraints).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE, ExistingPeriodicWorkPolicy.UPDATE, request
        )
    }

    fun disable(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ENABLED, false)
            .putBoolean(KEY_REMOTE, false)
            .apply()
        WorkManager.getInstance(context).cancelUniqueWork(UNIQUE)
    }
}

internal class WatchBatteryWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(WatchAutoSchedule.PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(WatchAutoSchedule.KEY_ENABLED, false)) return Result.success()

        val battery = applicationContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        if (level < 0 || scale <= 0) return Result.success()

        val percent = (100.0 * level / scale).roundToInt().coerceIn(0, 100)
        val code = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val charging = code == BatteryManager.BATTERY_STATUS_CHARGING ||
            code == BatteryManager.BATTERY_STATUS_FULL
        // Do not wake radios for noncritical telemetry when power is scarce.
        if (percent < 20 && !charging) return Result.success()

        return try {
            val nodes = Tasks.await(
                Wearable.getNodeClient(applicationContext).connectedNodes, 12, TimeUnit.SECONDS
            )
            val allowRemote = prefs.getBoolean(WatchAutoSchedule.KEY_REMOTE, false)
            val targets = if (allowRemote) nodes else nodes.filter { it.isNearby }
            if (targets.size != 1) return Result.success()
            if (!prefs.getBoolean(WatchAutoSchedule.KEY_ENABLED, false)) return Result.success()

            val interval = prefs.getInt(WatchAutoSchedule.KEY_INTERVAL, 60)
            if (interval !in listOf(30, 60, 120)) return Result.success()
            val payload = JSONObject()
                .put("v", 1)
                .put("type", "battery_snapshot")
                .put("mode", "auto")
                .put("intervalMinutes", interval)
                .put("nonce", UUID.randomUUID().toString())
                .put("sentAtMillis", System.currentTimeMillis())
                .put("batteryPercent", percent)
                .put("charging", charging)
                .put("model", Build.MODEL)
                .toString().toByteArray(Charsets.UTF_8)
            // MessageClient success is NOT proof the phone persisted the data.
            Tasks.await(
                Wearable.getMessageClient(applicationContext)
                    .sendMessage(targets.single().id, "/sh9/watch/pilot/v1", payload),
                12, TimeUnit.SECONDS
            )
            prefs.edit().putLong(WatchAutoSchedule.KEY_LAST_SEND, System.currentTimeMillis()).apply()
            Result.success()
        } catch (_: Exception) {
            // Best effort, next periodic window; never spin in a retry loop.
            Result.success()
        }
    }
}
