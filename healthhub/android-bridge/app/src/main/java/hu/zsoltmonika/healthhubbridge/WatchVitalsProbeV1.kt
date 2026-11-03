package hu.zsoltmonika.healthhubbridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CancellationException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * WATCH PILOT: local, owner-initiated, read-only Health Connect snapshot.
 *
 * The records may originate from the phone, Galaxy Watch, other wearables or
 * another app. A Health Connect source package does NOT verify the watch model.
 *
 * No uploads, database writes, continuous sensors, remote control, polling,
 * cloud identity, notifications, auto-refresh or medical decisions.
 */
internal object WatchVitalsProbeV1 {
    private val timestamp = DateTimeFormatter.ofPattern("yyyy.MM.dd. HH:mm", Locale.forLanguageTag("hu-HU"))
        .withZone(ZoneId.systemDefault())

    private fun dated(instant: Instant, now: Instant): String {
        val seconds = now.epochSecond - instant.epochSecond
        val freshness = when {
            seconds < -300 -> "óraeltérés / jövőbeli időbélyeg"
            seconds <= 600 -> "10 percen belüli mérés"
            seconds <= 3600 -> "1 órán belüli mérés"
            seconds <= 86400 -> "24 órán belüli mérés"
            else -> "régebbi mérés"
        }
        return timestamp.format(instant) + " · " + freshness
    }

    private fun source(packageName: String): String =
        "Forrás: " + packageName.ifBlank { "nem azonosítható" } +
            " (az óra modellje nem igazolt)"

    suspend fun inspect(client: HealthConnectClient?): String {
        if (client == null) {
            return "Health Connect jelenleg nem elérhető. Nincs megjeleníthető mérés."
        }
        val now = Instant.now()
        val granted = try {
            client.permissionController.getGrantedPermissions()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            return "A Health Connect hozzáférési állapotot nem sikerült ellenőrizni."
        }
        val lines = mutableListOf<String>()
        lines += "⌚ Watch Vital Pilot · HELYI PILLANATKÉP"
        lines += "Csak korábbi Health Connect-mérések; NEM élő szenzoradat."
        lines += "Olvasás ideje: " + timestamp.format(now)
        lines += ""

        suspend fun item(label: String, permission: String, read: suspend () -> String?) {
            val text = if (!granted.contains(permission)) {
                "Nincs olvasási engedély"
            } else {
                try {
                    read() ?: "Nincs mérés a vizsgált időablakban"
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    "Az adatforrás pillanatnyilag nem olvasható"
                }
            }
            lines += "$label: $text"
        }

        item("❤️ Utolsó pulzus", HealthPermission.getReadPermission(HeartRateRecord::class)) {
            val rows = client.readRecords(
                ReadRecordsRequest<HeartRateRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(48 * 3600), now),
                    ascendingOrder = false, pageSize = 100
                )
            ).records
            val latest = rows.flatMap { record -> record.samples.map { sample -> record to sample } }
                .maxByOrNull { it.second.time }
            latest?.let { (record, sample) ->
                "${sample.beatsPerMinute} bpm · ${dated(sample.time, now)}\n   ${source(record.metadata.dataOrigin.packageName)}"
            }
        }

        item("🫁 Utolsó SpO₂", HealthPermission.getReadPermission(OxygenSaturationRecord::class)) {
            val record = client.readRecords(
                ReadRecordsRequest<OxygenSaturationRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(30L * 86400L), now),
                    ascendingOrder = false, pageSize = 40
                )
            ).records.maxByOrNull { it.time }
            record?.let {
                "${String.format(Locale.ROOT, "%.1f", it.percentage.value)}% · ${dated(it.time, now)}\n   ${source(it.metadata.dataOrigin.packageName)}"
            }
        }

        item("💓 Nyugalmi pulzus", HealthPermission.getReadPermission(RestingHeartRateRecord::class)) {
            val record = client.readRecords(
                ReadRecordsRequest<RestingHeartRateRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(14L * 86400L), now),
                    ascendingOrder = false, pageSize = 40
                )
            ).records.maxByOrNull { it.time }
            record?.let {
                "${it.beatsPerMinute} bpm · ${dated(it.time, now)}\n   ${source(it.metadata.dataOrigin.packageName)}"
            }
        }

        item("🌙 Utolsó alvásszakasz", HealthPermission.getReadPermission(SleepSessionRecord::class)) {
            val record = client.readRecords(
                ReadRecordsRequest<SleepSessionRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(14L * 86400L), now),
                    ascendingOrder = false, pageSize = 40
                )
            ).records.maxByOrNull { it.endTime }
            record?.let {
                "Vége: ${dated(it.endTime, now)}\n   ${source(it.metadata.dataOrigin.packageName)}"
            }
        }

        item("🏃 Legutóbbi edzés", HealthPermission.getReadPermission(ExerciseSessionRecord::class)) {
            val record = client.readRecords(
                ReadRecordsRequest<ExerciseSessionRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(14L * 86400L), now),
                    ascendingOrder = false, pageSize = 40
                )
            ).records.maxByOrNull { it.endTime }
            record?.let {
                "${it.title?.take(70) ?: "Edzés"} · ${dated(it.endTime, now)}\n   ${source(it.metadata.dataOrigin.packageName)}"
            }
        }

        item("🫀 VO₂ max", HealthPermission.getReadPermission(Vo2MaxRecord::class)) {
            val record = client.readRecords(
                ReadRecordsRequest<Vo2MaxRecord>(
                    timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(90L * 86400L), now),
                    ascendingOrder = false, pageSize = 40
                )
            ).records.maxByOrNull { it.time }
            record?.let {
                "${String.format(Locale.ROOT, "%.1f", it.vo2MillilitersPerMinuteKilogram)} ml/kg/perc · ${dated(it.time, now)}\n   ${source(it.metadata.dataOrigin.packageName)}"
            }
        }

        lines += ""
        lines += "🔋 Óraakku: ismeretlen · valódi BT/LTE-kapcsolat: ismeretlen."
        lines += "A párosítás önmagában nem bizonyítja az élő órakapcsolatot."
        lines += "Nem orvosi monitorozás vagy sürgősségi riasztás."
        return lines.joinToString("\n")
    }
}
