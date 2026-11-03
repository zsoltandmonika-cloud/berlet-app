package hu.zsoltmonika.healthhubbridge

/**
 * Watch9 (40 mm LTE) is the REFERENCE target, Watch5 Pro is compatibility-only.
 * This describes a roadmap, NOT verified device capabilities or measured data.
 *
 * Sources:
 * https://developer.samsung.com/health/sensor/guide/data-specifications.html
 * https://developer.samsung.com/health/data/overview.html
 * https://developer.android.com/training/wearables/data/overview
 *
 * Do not infer available trackers from the Bluetooth name. Verify the on-device
 * Samsung Health Sensor Service tracker capability and app permissions before
 * enabling ANY watch sensor. Never silently request or start continuous tracking.
 */
internal object Watch9CapabilityPlanV1 {
    data class Capability(
        val label: String,
        val acquisition: String,
        val watch9Target: Boolean = true,
        val watch5ProFallback: Boolean = true,
        val remarks: String = ""
    )

    val capabilities = listOf(
        // Existing phone Health Connect: historical measurements, not live watch.
        Capability("Legutóbbi pulzus és idő", "Health Connect (már helyben olvasható)"),
        Capability("Utolsó mért SpO₂ és idő", "Health Connect (ha Samsung Health továbbadja)"),
        Capability("Nyugalmi pulzus", "Health Connect"),
        Capability("Alvás, fázisok, frissesség", "Health Connect"),
        Capability("Edzés, aktivitás, lépések", "Health Connect"),

        // Watch bridge: paired watch app with matching package and signing.
        Capability("Óra akkumulátor, töltés", "Wear OS app + Data Layer", remarks="Nem olvasható a telefon BatteryManageréből"),
        Capability("Kapcsolat, utolsó érvényes jel", "Wear OS app + Data Layer", remarks="Párosítás önmagában nem élő kapcsolat"),
        Capability("Bluetooth / hálózati adatút", "Wear OS app + Data Layer", remarks="LTE fallback csak valós teszt után"),
        Capability("Pulzus élő eseményei", "Wear OS Health Services / Samsung Sensor SDK", remarks="Külön hozzájárulás és akkukímélés"),
        Capability("Bőrhőmérséklet trend", "Samsung Health Sensor SDK", remarks="Nem testmaghőmérséklet"),
        Capability("IBI / regenerációs nyers jel", "Samsung Health Sensor SDK", remarks="Nem validált klinikai HRV/diagnózis"),
        Capability("EDA: elektrodermális aktivitás", "Samsung Health Sensor SDK", watch5ProFallback=false,
            remarks="Watch8+ támogatás; tracker és szervizverzió ellenőrzendő"),
        Capability("MF-BIA: többfrekvenciás impedancia", "Samsung Health Sensor SDK", watch5ProFallback=false,
            remarks="Watch8+; csak kérésre mérhető"),
        Capability("SpO₂ közvetlen mérés", "Samsung Health Sensor SDK", remarks="Csak kérésre, nem folyamatos"),
        Capability("EKG közvetlen mérés", "Samsung Health Sensor SDK / jóváhagyás", remarks="Külön indított mérés, nem vészjelző"),
        Capability("Testösszetétel BIA", "Samsung Health Sensor SDK", remarks="Csak kérésre"),
        Capability("Energy Score", "Samsung Health Data SDK", remarks="SDK- és jogosultság-ellenőrzés szükséges"),
        Capability("Alvási apnoé és ritmusértesítés", "Samsung Health Data SDK", remarks="Csak ha a forrás és jogosultság engedi; nem klinikai felügyelet")
    )

    fun summary(): String {
        val watch9 = capabilities.count { it.watch9Target }
        val watch5 = capabilities.count { it.watch5ProFallback }
        return buildString {
            appendLine("🩷 REFERENCIA: GALAXY WATCH9 40 mm LTE")
            appendLine("💙 KOMPATIBILITÁS: WATCH5 PRO")
            appendLine()
            appendLine("Tervezett adatkörök: $watch9 · Watch5 Pro alapkompatibilitás: $watch5")
            appendLine("A támogatás nem jelenti azt, hogy a szenzorhoz már van hozzáférés.")
            appendLine()
            capabilities.forEach { f ->
                append(if (f.watch5ProFallback) "• " else "★ ")
                appendLine(f.label + " → " + f.acquisition)
                if (!f.watch5ProFallback) appendLine("   Watch9-prioritás; Watch5 Pro: nem támogatott")
            }
            appendLine()
            appendLine("Jelmagyarázat: ★ Watch9 többletcél · • közös fejlesztési cél.")
            appendLine("Jelenleg csak az első, Health Connectből kiolvasható adatok pilotja készült el.")
            appendLine("Órás szenzor, LTE, akku és valódi online jel még NINCS bekötve.")
            appendLine("Adat nélkül nincs 0 érték vagy hamis zöld státusz.")
        }
    }
}
