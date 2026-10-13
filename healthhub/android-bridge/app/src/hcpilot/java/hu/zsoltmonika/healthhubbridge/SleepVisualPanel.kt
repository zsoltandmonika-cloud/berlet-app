package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.health.connect.client.records.SleepSessionRecord
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * v425 isolated visual pilot: per-record, source-grounded sleep stages only.
 * The day strip follows the Activity day-navigation concept but does not
 * claim to reuse the production web widget or to switch user profiles.
 */
internal class SleepVisualPanel(context: Context) : LinearLayout(context) {
    private val zone: ZoneId = ZoneId.systemDefault()
    private val dateFormat = DateTimeFormatter.ofPattern("MM.dd.")
    private val sessionFormat = DateTimeFormatter.ofPattern("HH:mm")
    private val header = TextView(context)
    private val dayStrip = LinearLayout(context)
    private val daysScroll = HorizontalScrollView(context)
    private val sessionColumn = LinearLayout(context)
    private var records: List<SleepSessionRecord> = emptyList()
    private var selected: LocalDate = LocalDate.now(zone)
    private var windowDays: Long = 30L

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()
    private fun label(value: String, size: Float = 15f): TextView = TextView(context).apply {
        text = value
        textSize = size
        setTextColor(Color.rgb(32, 54, 75))
        setPadding(0, dp(5), 0, dp(5))
    }

    init {
        orientation = VERTICAL
        setPadding(0, dp(18), 0, dp(20))
        header.textSize = 19f
        header.setTextColor(Color.rgb(24, 54, 84))
        header.text = "🌙 Alvás · 30 napos napválasztó"
        addView(header)
        addView(label("Ébredési nap szerint · színes idősávok a valódi Health Connect-fázisokból", 13f))
        daysScroll.isHorizontalScrollBarEnabled = false
        dayStrip.orientation = HORIZONTAL
        daysScroll.addView(dayStrip)
        addView(daysScroll)
        addView(sessionColumn)
        addView(label("A külön alvásrekordokat nem adjuk össze. Alváspontszámot nem becslünk.", 12f))
    }

    fun show(sessions: List<SleepSessionRecord>, days: Long) {
        records = sessions.sortedByDescending { it.endTime }
        windowDays = days
        val available = records.map { it.endTime.atZone(zone).toLocalDate() }
        selected = available.firstOrNull() ?: LocalDate.now(zone)
        renderDays()
        renderSelected()
        daysScroll.post { daysScroll.fullScroll(View.FOCUS_RIGHT) }
    }

    private fun renderDays() {
        dayStrip.removeAllViews()
        val today = LocalDate.now(zone)
        val dates = if (windowDays == 1L) listOf(today, today.minusDays(1))
            else (0..29).map { today.minusDays(it.toLong()) }.reversed()
        val countByDate = records.groupingBy { it.endTime.atZone(zone).toLocalDate() }.eachCount()
        for (day in dates) {
            val count = countByDate[day] ?: 0
            val button = Button(context).apply {
                isAllCaps = false
                textSize = 12f
                text = "${day.format(dateFormat)}\n${if (count > 0) "● $count" else "–"}"
                isEnabled = count > 0
                alpha = if (count == 0) 0.50f else 1f
                setOnClickListener {
                    selected = day
                    renderDays()
                    renderSelected()
                    daysScroll.post { daysScroll.scrollTo((dates.indexOf(day) * dp(88) - dp(24)).coerceAtLeast(0), 0) }
                }
            }
            dayStrip.addView(button, LayoutParams(dp(85), dp(75)).apply {
                marginEnd = dp(3)
            })
            if (day == selected) button.setTextColor(Color.rgb(15, 92, 170))
        }
    }

    private fun renderSelected() {
        sessionColumn.removeAllViews()
        val matching = records.filter { it.endTime.atZone(zone).toLocalDate() == selected }
        sessionColumn.addView(label("${selected} · ${matching.size} alvásrekord", 18f))
        if (matching.isEmpty()) {
            sessionColumn.addView(label("Ehhez az ébredési naphoz nincs rögzített alvás.", 14f))
            return
        }
        for ((index, session) in matching.withIndex()) {
            val start = session.startTime.atZone(zone)
            val end = session.endTime.atZone(zone)
            val elapsed = Duration.between(session.startTime, session.endTime).seconds.coerceAtLeast(0L)
            val durations = session.stages.groupBy { it.stage }.mapValues { (_, parts) ->
                parts.sumOf { Duration.between(it.startTime, it.endTime).seconds.coerceAtLeast(0L) }
            }
            val asleep = listOf(4, 5, 6).sumOf { durations[it] ?: 0L }
            val awake = durations[1]
            fun minutes(v: Long) = "${(v + 30L) / 60L} perc"
            sessionColumn.addView(label("${index + 1}. ${start.format(sessionFormat)}–${end.format(sessionFormat)} · teljes időszak: ${minutes(elapsed)}"))
            sessionColumn.addView(label("Tényleges alvás: ${if (durations.keys.any { it in listOf(4, 5, 6) }) minutes(asleep) else "nincs adat"} · ébren: ${if (awake != null) minutes(awake) else "nincs adat"}", 13f))
            sessionColumn.addView(SleepStageTimeline(context, session).apply {
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(120))
            })
            sessionColumn.addView(label("Ébren · Könnyű · Mély · REM   |   Forrás: ${session.metadata.dataOrigin.packageName}", 12f))
        }
    }
}

/** Segments are drawn at their true time position, never as proportionate summaries. */
internal class SleepStageTimeline(context: Context, private val session: SleepSessionRecord) : View(context) {
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val start: Instant = session.startTime
    private val duration = Duration.between(start, session.endTime).toMillis().coerceAtLeast(1L).toDouble()
    private val palette = mapOf(
        1 to Color.rgb(241, 94, 145),  // awake
        4 to Color.rgb(135, 105, 235), // light
        5 to Color.rgb(69, 49, 180),   // deep
        6 to Color.rgb(192, 172, 255)  // REM
    )

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        p.color = Color.rgb(237, 240, 245)
        canvas.drawRoundRect(0f, 8f, w, h - 27f, 8f, 8f, p)
        val bands = mapOf(1 to 0, 6 to 1, 4 to 2, 5 to 3)
        val usable = h - 36f
        val bandHeight = usable / 4f
        for (stage in session.stages.sortedBy { it.startTime }) {
            if (!stage.endTime.isAfter(stage.startTime)) continue
            val left = (Duration.between(start, stage.startTime).toMillis() / duration).toFloat().coerceIn(0f, 1f) * w
            val right = (Duration.between(start, stage.endTime).toMillis() / duration).toFloat().coerceIn(0f, 1f) * w
            val band = bands[stage.stage] ?: continue
            if (right <= left) continue
            p.color = palette[stage.stage] ?: Color.GRAY
            canvas.drawRoundRect(left, 8f + band * bandHeight, right.coerceAtLeast(left + 2f),
                8f + (band + 1) * bandHeight - 2f, 3f, 3f, p)
        }
        p.color = Color.DKGRAY
        p.textSize = 24f * resources.displayMetrics.scaledDensity / resources.displayMetrics.density
        canvas.drawText(session.startTime.atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("HH:mm")), 2f, h - 5f, p)
        val endText = session.endTime.atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("HH:mm"))
        canvas.drawText(endText, (w - p.measureText(endText) - 2f).coerceAtLeast(0f), h - 5f, p)
    }
}
