package hu.zsoltmonika.healthhub.screentimepilot

import android.content.Context
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Device-local, owner-bound schedule preferences. Custom slots complement,
 * never replace, the safe recurring baseline collection.
 * WorkManager is inexact: HH:mm is a target, not an alarm guarantee.
 */
internal object CollectionSchedule {
    const val MAX_SLOTS = 8
    val INTERVALS = listOf(6, 12, 24)
    private val SLOT_RE = Regex("^(?:[01][0-9]|2[0-3]):[0-5][0-9]$")
    private val DISPLAY = DateTimeFormatter.ofPattern("HH:mm")

    fun intervalHours(context: Context): Int =
        PilotState.prefs(context).getInt(PilotState.SCHEDULE_INTERVAL_HOURS, 6)
            .takeIf { it in INTERVALS } ?: 6

    fun setIntervalHours(context: Context, hours: Int) {
        require(hours in INTERVALS) { "Unsupported collection interval" }
        PilotState.prefs(context).edit()
            .putInt(PilotState.SCHEDULE_INTERVAL_HOURS, hours).apply()
    }

    fun parseSlot(value: String): LocalTime? =
        if (SLOT_RE.matches(value)) LocalTime.parse(value, DISPLAY) else null

    fun slots(context: Context): List<LocalTime> =
        PilotState.prefs(context)
            .getStringSet(PilotState.SCHEDULE_CUSTOM_TIMES, emptySet())
            .orEmpty()
            .mapNotNull(::parseSlot)
            .distinct()
            .sorted()

    fun addSlot(context: Context, value: String): Boolean {
        val candidate = parseSlot(value) ?: return false
        val current = slots(context).toMutableSet()
        if (candidate in current) return false
        if (current.size >= MAX_SLOTS) return false
        current.add(candidate)
        PilotState.prefs(context).edit()
            .putStringSet(PilotState.SCHEDULE_CUSTOM_TIMES, current.map { it.format(DISPLAY) }.toSet())
            .apply()
        return true
    }

    fun removeSlot(context: Context, value: String): Boolean {
        val candidate = parseSlot(value) ?: return false
        val current = slots(context).toMutableSet()
        if (!current.remove(candidate)) return false
        PilotState.prefs(context).edit()
            .putStringSet(PilotState.SCHEDULE_CUSTOM_TIMES, current.map { it.format(DISPLAY) }.toSet())
            .apply()
        return true
    }

    /**
     * Picks a future instant, not just a wall-clock string.
     * DST gaps shift naturally to the next valid local time; ambiguous fall
     * hours are triggered once using ZonedDateTime's earlier offset.
     */
    fun nextSlot(now: ZonedDateTime, times: List<LocalTime>): ZonedDateTime? {
        if (times.isEmpty()) return null
        val zone: ZoneId = now.zone
        val start: LocalDate = now.toLocalDate()
        val after = now.toInstant().plusSeconds(15)
        for (day in 0..2) {
            val date = start.plusDays(day.toLong())
            val candidates = times.map { date.atTime(it).atZone(zone) }
                .sortedBy { it.toInstant() }
            candidates.firstOrNull { it.toInstant().isAfter(after) }?.let { return it }
        }
        return null
    }

    fun nextSlotFromDevice(context: Context): ZonedDateTime? =
        nextSlot(ZonedDateTime.now(ZoneId.systemDefault()), slots(context))

    fun slotStrings(context: Context): List<String> =
        slots(context).map { it.format(DISPLAY) }
}
