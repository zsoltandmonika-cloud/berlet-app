package hu.zsoltmonika.watchpilot

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import kotlin.math.roundToInt

/**
 * ON-WATCH, ON-DEMAND pulse check only. No automatic/background sampling,
 * no network transfer, no save to local history and no medical claims.
 */
internal class WatchHeartProbe(
    private val activity: Activity,
    private val onResult: (String) -> Unit
) : SensorEventListener {
    companion object {
        const val REQUEST_CODE = 6171
        private const val TIMEOUT_MS = 25_000L
    }

    private val sensorManager = activity.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val handler = Handler(Looper.getMainLooper())
    private var active = false
    private val stopTask = Runnable {
        if (active) {
            cancel()
            onResult("Nincs megbízható pulzusmérés 25 másodpercen belül. Próbáld újra, az órát szorosan viselve.")
        }
    }

    fun requiredPermission(): String =
        if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE"
        else Manifest.permission.BODY_SENSORS

    fun hasPermission(): Boolean =
        activity.checkSelfPermission(requiredPermission()) == PackageManager.PERMISSION_GRANTED

    fun start() {
        if (!hasPermission()) {
            onResult("Pulzusméréshez külön érzékelőengedély szükséges.")
            activity.requestPermissions(arrayOf(requiredPermission()), REQUEST_CODE)
            return
        }
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE)
        if (sensor == null) {
            onResult("Az Android nem teszi elérhetővé a pulzusszenzort ezen az órán. Nincs hamis adat.")
            return
        }
        cancel()
        active = sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        if (active) {
            handler.postDelayed(stopTask, TIMEOUT_MS)
            onResult("❤️ Pulzusmérés folyamatban (legfeljebb 25 mp). Csak az óra kijelzőjén jelenik meg.")
        } else {
            onResult("A pulzusszenzor foglaltnak vagy nem elérhetőnek tűnik.")
        }
    }

    fun cancel() {
        handler.removeCallbacks(stopTask)
        if (active) sensorManager.unregisterListener(this)
        active = false
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!active || event.sensor.type != Sensor.TYPE_HEART_RATE) return
        val value = event.values.firstOrNull() ?: return
        if (event.accuracy == SensorManager.SENSOR_STATUS_UNRELIABLE ||
            !value.isFinite() || value !in 30.0f..240.0f) return
        val bpm = value.roundToInt()
        cancel()
        onResult("❤️ Órán mért pulzus: $bpm bpm.\nKülön, kézi szenzormérés; nem automatikus Samsung Health-adat és nem orvosi eredmény.")
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit
}
