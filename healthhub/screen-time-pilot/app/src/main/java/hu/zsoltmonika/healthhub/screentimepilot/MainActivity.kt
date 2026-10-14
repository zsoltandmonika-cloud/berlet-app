package hu.zsoltmonika.healthhub.screentimepilot

import android.app.Activity
import android.app.AlertDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.Calendar
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Standalone diagnostic app, not the production HealthHub Connect.
 * No INTERNET permission, no cloud upload, no automatic consent.
 */
class MainActivity : Activity() {
    private lateinit var root: LinearLayout
    private lateinit var output: TextView
    private val foregroundExecutor = Executors.newSingleThreadExecutor()
    private val manualRunning = AtomicBoolean(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scroller = ScrollView(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(36, 42, 36, 44)
        }
        scroller.addView(root)
        setContentView(scroller)

        title("📱 HH Screen Time · PILOT")
        description("Elkülönített, csak helyben működő tesztalkalmazás. " +
            "NEM a HealthHub Connect. Semmilyen adatot nem küld Dropboxba, " +
            "GitHubra vagy AI-hoz. Az adatgyűjtés alapból KI van kapcsolva.")
        button("1. Telefon tulajdonosának kiválasztása") {
            if (PilotState.owner(this) != null) {
                message("A telefon már profilhoz van kötve. Az alkalmazás újratelepítése " +
                    "önmagában nem törli az adatait; profilváltáshoz alkalmazásadat-törlés szükséges.")
            } else {
                AlertDialog.Builder(this)
                    .setTitle("Melyik személy telefonja?")
                    .setItems(arrayOf("Zsolt", "Mónika")) { _, which ->
                        val owner = if (which == 0) "zsolt" else "monika"
                        AlertDialog.Builder(this)
                            .setTitle("Profil rögzítése")
                            .setMessage("A helyi napló ehhez a személyhez lesz kötve. " +
                                "A másik profil adatait ez az alkalmazás nem olvassa.")
                            .setPositiveButton("Rögzítés") { _, _ ->
                                PilotState.prefs(this).edit()
                                    .putString(PilotState.OWNER, owner).apply()
                                CollectionScheduler.reconcile(this)
                                refresh()
                            }
                            .setNegativeButton("Mégsem", null).show()
                    }.show()
            }
        }
        button("2. Használati hozzáférés megnyitása (Android)") {
            try {
                startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            } catch (_: Exception) {
                message("A telefon Beállítások menüjében keresd: Használati adatokhoz való hozzáférés.")
            }
        }
        button("3. Automatikus gyűjtés BE/KI") {
            val prefs = PilotState.prefs(this)
            val old = prefs.getBoolean(PilotState.ENABLED, false)
            if (old) {
                prefs.edit().putBoolean(PilotState.ENABLED, false).apply()
                CollectionScheduler.stop(this)
                message("Automatikus gyűjtés kikapcsolva. A meglévő helyi előzményeket nem töröltem.")
            } else if (PilotState.owner(this) == null) {
                message("Előbb válaszd ki a telefon tulajdonosát.")
            } else if (!UsageAccess.isGranted(this)) {
                message("Előbb engedélyezd a Használati adatok hozzáférését az Android beállításaiban.")
            } else {
                prefs.edit().putBoolean(PilotState.ENABLED, true).apply()
                CollectionScheduler.reconcile(this)
                CollectionScheduler.collectNow(this) // first observation, no manual entry
                message("Automatikus helyi gyűjtés BE: WorkManager, saját időpontokkal kiegészítve. Az Android késleltetheti a futást.")
            }
            refresh()
        }
        button("4. Részletes alkalmazáslista BE/KI (külön engedély)") {
            val prefs = PilotState.prefs(this)
            val owner = PilotState.owner(this)
            if (prefs.getBoolean(PilotState.APP_DETAIL_ENABLED, false)) {
                AlertDialog.Builder(this)
                    .setTitle("Részletes napló kikapcsolása")
                    .setMessage("A részletes alkalmazásneveket és időpontokat azonnal törlöm. " +
                        "Az összesített óraszámok ettől még megmaradnak.")
                    .setPositiveButton("Kikapcsolás és törlés") { _, _ ->
                        prefs.edit().putBoolean(PilotState.APP_DETAIL_ENABLED, false)
                            .remove(PilotState.APP_DETAIL_CONSENT_START_MS).apply()
                        owner?.let { AppDetailLedger.clear(this, it) }
                        refresh()
                    }
                    .setNegativeButton("Mégsem", null).show()
            } else if (owner == null || !UsageAccess.isGranted(this)) {
                message("Előbb rögzítsd az eszköztulajdonost és engedélyezd az Android használati hozzáférést.")
            } else {
                AlertDialog.Builder(this)
                    .setTitle("Részletes alkalmazáslista?")
                    .setMessage("A saját telefonod alkalmazásainak azonosítóit és óránkénti " +
                        "előtéridejét is gyűjti a PILOT. Ez érzékenyebb adat, ezért külön jóváhagyás kell. " +
                        "Csak a jóváhagyásod UTÁNI használatot méri, 30 napig a telefonon; internet és felhőfeltöltés nélkül. " +
                        "A ChatGPT-beszélgetések tartalmát nem olvassa.")
                    .setPositiveButton("Engedélyezem") { _, _ ->
                        prefs.edit().putBoolean(PilotState.APP_DETAIL_ENABLED, true)
                            .putLong(PilotState.APP_DETAIL_CONSENT_START_MS, System.currentTimeMillis())
                            .apply()
                        if (prefs.getBoolean(PilotState.ENABLED, false)) {
                            CollectionScheduler.collectNow(this)
                        }
                        refresh()
                    }
                    .setNegativeButton("Mégsem", null).show()
            }
        }
        button("5. Automatikus gyakoriság (6 / 12 / 24 óra)") {
            val options = arrayOf("6 óránként", "12 óránként", "24 óránként")
            val values = CollectionSchedule.INTERVALS
            val selected = values.indexOf(CollectionSchedule.intervalHours(this)).coerceAtLeast(0)
            AlertDialog.Builder(this)
                .setTitle("Automatikus alapgyűjtés")
                .setMessage("Az egyedi napi időpontok az alapgyűjtés mellett működnek. Az Android a futást késleltetheti.")
                .setSingleChoiceItems(options, selected) { dialog, which ->
                    CollectionSchedule.setIntervalHours(this, values[which])
                    CollectionScheduler.reconcile(this)
                    dialog.dismiss()
                    refresh()
                }
                .setNegativeButton("Mégsem", null).show()
        }
        button("6. Saját napi időpont hozzáadása") {
            val now = Calendar.getInstance()
            TimePickerDialog(this, { _, hour, minute ->
                val value = String.format(Locale.ROOT, "%02d:%02d", hour, minute)
                if (CollectionSchedule.addSlot(this, value)) {
                    CollectionScheduler.reconcile(this)
                    message("Napi célidőpont elmentve: $value (nem percre pontos Android-ébresztés).")
                } else {
                    message("Nem sikerült hozzáadni: már létezik vagy elérted a 8 időpontos korlátot.")
                }
                refresh()
            }, now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE), true).show()
        }
        button("7. Saját napi időpont törlése") {
            val slots = CollectionSchedule.slotStrings(this)
            if (slots.isEmpty()) {
                message("Még nincs egyéni napi időpont.")
            } else {
                AlertDialog.Builder(this)
                    .setTitle("Melyik napi célidőpontot töröljük?")
                    .setItems(slots.toTypedArray()) { _, which ->
                        if (CollectionSchedule.removeSlot(this, slots[which])) {
                            CollectionScheduler.reconcile(this)
                            message("Törölve: ${slots[which]}")
                            refresh()
                        }
                    }
                    .setNegativeButton("Mégsem", null).show()
            }
        }
        button("Állapot megjelenítése / frissítése") { refresh() }
        button("Egyszeri mintavétel MOST (valós visszajelzés)") {
            when {
                !PilotState.prefs(this).getBoolean(PilotState.ENABLED, false) ->
                    message("Előbb engedélyezd az automatikus gyűjtést.")
                PilotState.owner(this) == null ->
                    message("Előbb rögzítsd a telefon tulajdonosát.")
                !UsageAccess.isGranted(this) ->
                    message("A használati adatokhoz való Android-hozzáférés hiányzik.")
                !manualRunning.compareAndSet(false, true) ->
                    message("Az egyszeri gyűjtés már folyamatban van.")
                else -> {
                    refresh()
                    foregroundExecutor.execute {
                        val result = runCatching {
                            CollectionEngine.collect(applicationContext, "manual")
                        }
                        runOnUiThread {
                            manualRunning.set(false)
                            if (!isDestroyed) {
                                refresh()
                                result.fold(
                                    onSuccess = { out ->
                                        message("Egyszeri gyűjtés sikeres: ${out.storedHours} helyi óra, ${out.detailedAppHours} részletes app-óra.")
                                    },
                                    onFailure = { error ->
                                        message("Gyűjtési hiba: ${error.javaClass.simpleName}. Nézd meg az állapotot.")
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        button("Gyűjtés leállítása és helyi napló törlése") {
            AlertDialog.Builder(this)
                .setTitle("Helyi napló törlése?")
                .setMessage("Az összes pilot mérést törlöm erről a telefonról és leállítom a gyűjtést.")
                .setPositiveButton("Törlés") { _, _ ->
                    CollectionEngine.clearAndStop(this)
                    refresh()
                }
                .setNegativeButton("Mégsem", null).show()
        }
        output = TextView(this).apply {
            textSize = 16f
            setPadding(0, 32, 0, 0)
            setTextIsSelectable(true)
        }
        root.addView(output)
    }

    override fun onResume() {
        super.onResume()
        // The Android permission may have been granted or revoked in Settings.
        CollectionScheduler.reconcile(this)
        if (::output.isInitialized) refresh()
    }

    override fun onDestroy() {
        foregroundExecutor.shutdown()
        super.onDestroy()
    }

    private fun refresh() {
        val prefs = PilotState.prefs(this)
        val owner = PilotState.owner(this)
        val permission = UsageAccess.isGranted(this)
        val enabled = prefs.getBoolean(PilotState.ENABLED, false)
        val detailed = prefs.getBoolean(PilotState.APP_DETAIL_ENABLED, false)
        val last = prefs.getLong(PilotState.LAST_RUN, 0L)
        val lines = mutableListOf(
            "Eszközhöz kötött profil: " + when (owner) {
                "zsolt" -> "Zsolt"; "monika" -> "Mónika"; else -> "NINCS"
            },
            "Android Usage Access: " + if (permission) "engedélyezve ✓" else "NINCS engedély",
            "Automatikus gyűjtés: " + if (enabled) "BE" else "KI",
            "Részletes alkalmazáslista: " + if (detailed) "BE · külön jóváhagyva" else "KI",
            "Automatikus ütemezés: WorkManager, kb. ${CollectionSchedule.intervalHours(this)} óránként",
            "Saját napi célidőpontok: " +
                (CollectionSchedule.slotStrings(this).joinToString(", ").ifEmpty { "nincsenek" }),
            "Következő saját célidőpont: " +
                (CollectionSchedule.nextSlotFromDevice(this)?.let { date(it.toInstant().toEpochMilli()) }
                    ?: "nincs beállítva") + " (az Android késhet)",
            "Egyszeri helyi gyűjtés: " +
                if (manualRunning.get()) "FOLYAMATBAN" else "készen áll",
            "Utolsó befejezett futás: " + if (last > 0) date(last) else "még nincs",
            "Utolsó indítás forrása: " +
                (prefs.getString(PilotState.LAST_COLLECTION_SOURCE, null) ?: "még nincs"),
            "Utolsó visszajelzés: " +
                (prefs.getString(PilotState.LAST_NOTE, null) ?: "még nincs")
        )
        if (owner != null) {
            try {
                val rows = LocalLedger.read(this, owner)
                val latest = System.currentTimeMillis() - 24L * UsageSessionizer.HOUR_MS
                val day = rows.filter { it.hourStartMs >= latest }
                val total = day.sumOf { it.observedForegroundMs }
                val chat = day.sumOf { it.chatGptForegroundMs }
                lines.add("")
                lines.add("HELYI NAPLÓ (90 napos gördülő megőrzés):")
                lines.add("Tárolt megfigyelt órák: ${rows.size}")
                lines.add("Legutóbbi 24h dokumentált órái: ${day.size} / 24")
                lines.add("Megfigyelt alkalmazás-előtéridő: ${minutes(total)}")
                lines.add("Ebből ChatGPT app-előtéridő: ${minutes(chat)}")
                if (detailed) {
                    val details = AppDetailLedger.read(this, owner)
                    val recent = details.filter { it.hourStartMs >= latest }
                    val top = recent.groupBy { it.packageName }
                        .mapValues { (_, values) -> values.sumOf { it.observedForegroundMs } }
                        .entries.sortedByDescending { it.value }.take(7)
                    lines.add("Részletes helyi napló (30 nap): ${details.size} alkalmazás-óra.")
                    lines.add("Legutóbbi 24h TOP alkalmazások (csak mért percek):")
                    top.forEach { (pkg, ms) -> lines.add("• ${pkg.take(70)}: ${minutes(ms)}") }
                    if (top.isEmpty()) lines.add("Nincs még megfigyelt, lezárt alkalmazás-idősáv.")
                }
                lines.add("Az adat NEM a Samsung Digital Wellbeing hivatalos képernyőideje.")
                lines.add("Hiányzó óra ≠ nulla használat. Nem látja a PC-s ChatGPT-t vagy az üzenetek tartalmát.")
            } catch (e: Exception) {
                lines.add("⚠ Helyi naplóhiba (${e.javaClass.simpleName}). A sérült adatot nem írjuk felül.")
            }
        }
        lines.add("")
        lines.add("ADATVÉDELEM: első induláskor KI; explicit Android engedély; " +
            "óránkénti összegzés, és csak külön engedéllyel 30 napos app-lista; nincs INTERNET jogosultság; " +
            "megosztás, központi távoli indítás és AI-elemzés még NINCS.")
        output.text = lines.joinToString("\n")
    }

    private fun minutes(ms: Long): String = "${ms / 60_000} perc (megfigyelt)"
    private fun date(ms: Long): String =
        SimpleDateFormat("yyyy.MM.dd. HH:mm", Locale.forLanguageTag("hu-HU")).format(Date(ms))

    private fun title(label: String) {
        root.addView(TextView(this).apply {
            text = label
            textSize = 23f
            setPadding(0, 0, 0, 18)
        })
    }

    private fun description(label: String) {
        root.addView(TextView(this).apply {
            text = label
            textSize = 15f
            setPadding(0, 0, 0, 24)
        })
    }

    private fun button(label: String, action: () -> Unit) {
        root.addView(Button(this).apply {
            text = label
            isAllCaps = false
            setOnClickListener { action() }
        })
    }

    private fun message(value: String) {
        Toast.makeText(this, value, Toast.LENGTH_LONG).show()
    }
}
