package hu.zsoltmonika.healthhubbridge

import android.util.Xml
import org.json.JSONArray
import org.json.JSONObject
import org.xmlpull.v1.XmlPullParser
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object DailyContentGenerator {
    private val zone = ZoneId.of("Europe/Budapest")

    private data class NewsItem(
        val title: String,
        val url: String,
        val publisher: String,
        val publishedAt: ZonedDateTime?
    )

    private val spark = mapOf(
        "focus" to listOf(
            "Válassz ki egyetlen ügyet, amely ma valóban számít, és vidd el egy konkrét következő lépésig.",
            "A mai nap akkor lesz könnyebb, ha a három fontos feladatból először a legkisebb bizonytalanságút zárod le.",
            "Ne próbálj mindent egyszerre optimalizálni. Egy jól befejezett dolog ma többet ér három félkésznél.",
            "Egy rövid rendrakás a teendők között meglepően sok mentális helyet szabadíthat fel.",
            "A fókusz ma nem több erőfeszítést jelent, hanem kevesebb felesleges váltást."
        ),
        "workMoney" to listOf(
            "A részletek ma segítenek. Egy rövid ellenőrzés vagy pontosítás megelőzhet egy fölösleges kört.",
            "Az egyszerű, jól ellenőrizhető megoldás ma erősebb, mint a túl sok feltételre épített terv.",
            "Egy kis adminisztratív rendrakás később időt és idegeskedést spórolhat.",
            "A mai döntéseknél különítsd el azt, ami sürgős attól, ami csak hangos.",
            "A jó kompromisszum ma az, amelyik később is könnyen visszaellenőrizhető."
        ),
        "relationships" to listOf(
            "A tömör, egyenes kommunikáció most könnyebben célba ér, mint a túlmagyarázás.",
            "Egy spontán beszélgetés könnyen közelebb hozhat valakit, ha nem akarod előre irányítani.",
            "Ma érdemes egy fél mondattal többet kérdezni, mielőtt következtetsz.",
            "A figyelem most többet adhat a másiknak, mint bármilyen nagy gesztus.",
            "Egy kisebb félreértést érdemes gyorsan tisztázni, mielőtt önálló életet kezd."
        ),
        "energy" to listOf(
            "Dolgozz rövidebb, fókuszált blokkokban, majd válts környezetet vagy mozogj pár percet.",
            "A változatosság segít. Egy másik környezet vagy rövid séta gyorsan visszahozhatja a lendületet.",
            "A nap közepén egy rövid szünet többet érhet, mint még egy erőből végigvitt óra.",
            "Ne várd meg, amíg teljesen elfogy a lendület. Egy kis váltás időben sokat számít.",
            "A tempó ma fontosabb, mint a sebesség: legyen benne ritmus és pihenő is."
        ),
        "evening" to listOf(
            "Az este akkor lesz igazán pihentető, ha egy lezárt nap érzésével érkezel meg hozzá.",
            "Valami könnyű és inspiráló program jobban feltölt, mint még egy feladat kipipálása.",
            "Az esti órákban hagyj egy kis helyet valaminek, aminek semmi haszna nincs, csak jólesik.",
            "Egy nyugodtabb este ma többet adhat, mint egy utolsó nagy nekifutás.",
            "Zárd le a napot egyetlen rövid holnapi jegyzettel, aztán hagyd békén a teendőlistát."
        ),
        "lenaThought" to listOf(
            "A haladás néha nem látványos. Néha csak annyi, hogy eggyel kevesebb nyitott szál marad.",
            "A jó ötletek ritkán kérnek engedélyt. Érdemes észrevenni őket, mielőtt továbbmennek.",
            "Nem minden problémának kell ma teljes megoldás. Néha a következő jó lépés bőven elég.",
            "A tisztább döntés gyakran abból születik, amit kihagysz, nem abból, amit még hozzáadsz.",
            "A nap végén az számít, mi lett egyszerűbb, nem az, hány dolgot mozgattál meg."
        )
    )

    private val headlines = listOf(
        "Ma a tiszta prioritás és egy jól időzített döntés hozhat nyugodtabb ritmust.",
        "Egy egyszerűbb megközelítés ma többet érhet, mint egy túlkomplikált terv.",
        "A mai nap akkor működik jól, ha a fontos dolgoknak valódi helyet hagysz.",
        "Egy kis rend, egy őszinte mondat és egy lezárt feladat meglepően sokat adhat a naphoz."
    )

    fun today(): String = ZonedDateTime.now(zone).toLocalDate().toString()

    fun isToday(json: String?): Boolean {
        if (json.isNullOrBlank()) return false
        return try { JSONObject(json).optString("date") == today() } catch (_: Exception) { false }
    }

    fun generateSpark(): JSONObject {
        val date = today()
        val out = JSONObject()
        out.put("schemaVersion", 1)
        out.put("date", date)
        out.put("generatedAt", ZonedDateTime.now(zone).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
        out.put("cloudGenerated", "healthhub-connect-android")
        out.put("profiles", JSONObject()
            .put("zsolt", sparkProfile(date, "zsolt", "Szűz"))
            .put("monika", sparkProfile(date, "monika", "Vízöntő")))
        return out
    }

    private fun sparkProfile(date: String, name: String, sign: String): JSONObject {
        val base = date + ":" + name
        val sections = JSONObject()
        spark.forEach { (key, values) -> sections.put(key, pick(base + ":" + key, values)) }
        return JSONObject()
            .put("sign", sign)
            .put("headline", pick(base + ":headline", headlines))
            .put("sections", sections)
    }

    private fun pick(seed: String, values: List<String>): String {
        var h = 0x811c9dc5.toInt()
        seed.forEach { ch ->
            h = h xor ch.code
            h *= 16777619
        }
        val index = (h.toLong() and 0xffffffffL).rem(values.size.toLong()).toInt()
        return values[index]
    }

    fun generateBriefing(): JSONObject {
        val now = ZonedDateTime.now(zone)
        val huQuery = URLEncoder.encode("Magyarország when:1d", "UTF-8")
        val feeds = mapOf(
            "world" to listOf(
                "BBC World" to "https://feeds.bbci.co.uk/news/world/rss.xml"
            ),
            "hungary" to listOf(
                "Google News HU" to "https://news.google.com/rss/search?q=" + huQuery + "&hl=hu&gl=HU&ceid=HU:hu"
            ),
            "economy" to listOf(
                "BBC Business" to "https://feeds.bbci.co.uk/news/business/rss.xml"
            ),
            "technology" to listOf(
                "BBC Technology" to "https://feeds.bbci.co.uk/news/technology/rss.xml"
            )
        )

        val buckets = mutableMapOf<String, List<NewsItem>>()
        feeds.forEach { (key, sources) ->
            val collected = mutableListOf<NewsItem>()
            sources.forEach { (label, url) ->
                try { collected += fetchRss(label, url) } catch (_: Exception) {}
            }
            buckets[key] = dedupeFresh(collected, now).take(8)
        }

        val all = dedupe(
            (buckets["world"].orEmpty() + buckets["hungary"].orEmpty() +
             buckets["economy"].orEmpty() + buckets["technology"].orEmpty())
        )
        val executive = all.take(4)
        val overnight = buckets["world"].orEmpty()
            .filter { item -> item.publishedAt?.let { java.time.Duration.between(it, now).toHours() in 0..12 } == true }
            .take(3)
            .ifEmpty { buckets["world"].orEmpty().take(3) }

        val riskWords = listOf(
            "war","attack","strike","sanction","oil","inflation","rate","cyber","crisis","conflict",
            "hábor","támad","szankció","infláció","kamat","olaj"
        )
        val risks = all.filter { item ->
            val low = item.title.lowercase(Locale.ROOT)
            riskWords.any { low.contains(it) }
        }.take(3).ifEmpty { all.take(2) }

        fun sentence(x: NewsItem) = x.publisher + ": " + x.title
        fun section(id: String, title: String, items: List<String>) =
            JSONObject().put("id", id).put("title", title).put("items", JSONArray(items))

        val sections = JSONArray()
            .put(section("executive", "Vezetői összefoglaló", executive.map(::sentence)))
            .put(section("overnight", "Éjszakai fejlemények", overnight.map(::sentence)))
            .put(section("geopolitics", "Külpolitika / Geopolitika", buckets["world"].orEmpty().take(3).map(::sentence)))
            .put(section("hungary", "Magyarország", buckets["hungary"].orEmpty().take(3).map(::sentence)))
            .put(section("economy", "Gazdaság / Piacok", buckets["economy"].orEmpty().take(3).map(::sentence)))
            .put(section("technology", "Technológia / AI", buckets["technology"].orEmpty().take(3).map(::sentence)))
            .put(section("risks", "Mai kockázatok", risks.map { "Figyelmi pont: " + it.title + " (" + it.publisher + ")." }))
            .put(section("watch", "Mi számít igazán / Figyelmi szint", all.take(2).map(::sentence)))

        val sources = JSONArray()
        all.take(24).forEach { item ->
            sources.put(JSONObject()
                .put("title", item.title)
                .put("publisher", item.publisher)
                .put("url", item.url)
                .put("publishedAt", (item.publishedAt ?: now).withZoneSameInstant(zone).toLocalDate().toString()))
        }

        val headline = if (executive.isNotEmpty()) {
            "A reggel fő témái: " + executive.take(2).joinToString("; ") { it.title }
        } else {
            "A friss hírforrások átmenetileg nem adtak feldolgozható találatot."
        }

        return JSONObject()
            .put("schemaVersion", 1)
            .put("date", today())
            .put("generatedAt", now.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
            .put("cloudGenerated", "healthhub-connect-android")
            .put("headline", headline)
            .put("sections", sections)
            .put("sources", sources)
    }

    private fun fetchRss(defaultPublisher: String, url: String): List<NewsItem> {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 20_000
            readTimeout = 25_000
            setRequestProperty("User-Agent", "HealthHub/1.0 Android")
        }
        if (conn.responseCode !in 200..299) {
            val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            error("RSS HTTP " + conn.responseCode + ": " + err.take(120))
        }

        val parser = Xml.newPullParser()
        conn.inputStream.use { input ->
            parser.setInput(input, null)
            val result = mutableListOf<NewsItem>()
            var event = parser.eventType
            var inItem = false
            var title = ""
            var link = ""
            var pubDate = ""
            var source = ""

            while (event != XmlPullParser.END_DOCUMENT && result.size < 20) {
                if (event == XmlPullParser.START_TAG) {
                    when (parser.name.lowercase(Locale.ROOT)) {
                        "item" -> {
                            inItem = true
                            title = ""; link = ""; pubDate = ""; source = ""
                        }
                        "title" -> if (inItem) title = parser.nextText().trim()
                        "link" -> if (inItem) link = parser.nextText().trim()
                        "pubdate" -> if (inItem) pubDate = parser.nextText().trim()
                        "source" -> if (inItem) source = parser.nextText().trim()
                    }
                } else if (event == XmlPullParser.END_TAG && parser.name.equals("item", ignoreCase = true)) {
                    if (title.isNotBlank() && link.isNotBlank()) {
                        result += NewsItem(
                            title = title.replace(Regex("\\s+"), " ").trim(),
                            url = link,
                            publisher = source.ifBlank { defaultPublisher },
                            publishedAt = parseRfc822(pubDate)
                        )
                    }
                    inItem = false
                }
                event = parser.next()
            }
            return result
        }
    }

    private fun parseRfc822(value: String): ZonedDateTime? {
        if (value.isBlank()) return null
        return try { ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME) } catch (_: Exception) { null }
    }

    private fun dedupeFresh(items: List<NewsItem>, now: ZonedDateTime): List<NewsItem> {
        val cutoff = now.minusHours(30)
        return dedupe(items.filter { it.publishedAt == null || !it.publishedAt.isBefore(cutoff) })
    }

    private fun dedupe(items: List<NewsItem>): List<NewsItem> {
        val seen = mutableSetOf<String>()
        return items.filter { item ->
            val key = item.title.lowercase(Locale.ROOT).replace(Regex("[^\\p{L}\\p{N}]+"), " ").trim()
            seen.add(key)
        }
    }
}
