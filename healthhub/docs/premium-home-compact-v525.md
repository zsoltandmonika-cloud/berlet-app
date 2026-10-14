# HealthHub v525 – Compact Premium Glass Home

**2026-10-14 · Kérés:** a Mónika képes, budapesti Hero minél több részlete látható legyen; az S24 Ultra képernyőjén férjen ki a 12 navigációs csempe, a dátum/időjárás/névnap 3 mezője legyen alacsony, és a HH ONE gomb simuljon a Dark Premium Glass dizájnhoz.

## Változások
- **Hero:** a nagy fehér HealthHub felirat rejtve, a jóváhagyott Léna–Budapest háttér változatlan (v524 biztosítja a helyes profilképet).
- **Info glass:** 72 → 52 CSS px minimális magasság. Dátum élő eredetiből: `Október 14 · Budapest`; névnap: `Helén`, előtte csak egyszer a címke `NÉVNAP`. Időjárás egy sorban, eredeti Open-Meteo forrásból, hőmérséklet nem kitalált.
- **Valódi adatforrások:** a v522 által mozgatott eredeti `#dateHome` és `#namedayHome` adatelemek változatlanok, megfigyeléssel rövid kijelzések frissülnek. Nincs új fetch / Dropbox / adatkeveredés.
- **12 csempe:** 94 → 76 CSS px min. magasság; 42 → 35 px ikon; 9 → 6 px gap. Három oszlop, négy sor, minimum 72 px a legkeskenyebb kijelzőkön. A kattintási célok így is nagyméretűek.
- **HH ONE:** a működő service gomb és kezdeti fallback sötét, áttetsző, frosted glass pill-t kap; státuszszínek (green/amber/red) és kattintási működés érintetlen. Zsolt cyan, Mónika finom rose border/glow. Csak aktív Home + `?hhpremium=1`.
- **Biztonság:** nem változnak egészségadatok, profiljogosultságok, Android OTA, szerverintegrációk. A normál Home érintetlen.

## Elfogadási szempontok
S24 Ultra: a Hero portréja látható; 3 kompakt mező, duplázott névnap nélkül; 12 csempe jóváhagyott sorrendben, állítható és koppintható mérettel; HH ONE nem vakító fehér; profilváltás színei és státuszpont működik. Mobile viewport és hozzáférhetőségi szövegméret valódi készüléken ellenőrzendő, mielőtt az opt-in nézet alapértelmezett lesz.
