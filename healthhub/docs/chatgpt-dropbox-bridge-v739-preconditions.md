# HealthHub v739 | ChatGPT Dropbox célkapcsolat (előkészítés, nem éles szinkron)

## Státusz
- A v738 kézi, helyi JSON-export működik.
- A privát HealthHub Dropbox forrása és a ChatGPT Dropbox-célmappa külön jogosultsági kör.
- A v739 fejlesztői ág tartalmaz egy **elkülönített Dropbox PKCE hitelesítési kísérletet** és a callback oldalt.
- **Nincs élesítve és nem másol adatot.** Nem állítható, hogy a napi szinkron már működik.
- A biztonságos, felhasználó által jóváhagyott célmappás adatátvitel implementációs és ellenőrzési munkája még hiányzik.

## Előfeltétel a felhasználótól
Dropbox App Console: létre kell hozni egy külön, Full Dropbox hozzáférésű alkalmazást a céltárhely olvasására/írására. A kérendő jogosultságok: files.metadata.read, files.metadata.write, files.content.read, files.content.write. A callback:
https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/chatgpt-dropbox-callback-v739.html

Csak az **App key** (nyilvános alkalmazásazonosító) szükséges a fejlesztői konfiguráláshoz. App secretet, access tokent vagy refresh tokent soha ne küldjön chatben.

## Elfogadási feltételek
1. A cél Dropbox engedélye explicit, profilokra bontott hozzájárulásból származzon.
2. A forrás- és célkapcsolat ne írja felül egymás hitelesítését.
3. Először csak a /HealthHub-ChatGPT-Analytics mappa olvashatóságát ellenőrizzük.
4. A két profil adatainak másolása csak külön jóváhagyás után kezdődhet.
5. Minden fájl feltöltése után céloldali visszaolvasás és azonos tartalomellenőrzés.
6. Hibás, elavult, hiányzó vagy profilidegen forrásról nincs zöld kész állapot.
7. A böngészős időzítő csak nyitott HealthHubban futhat. 24/7 működéshez külön, felhőben hitelesített ütemezett szolgáltatás és audit szükséges.
8. A Digital Wellbeing 30 napos lefedettségét a tényleges forrásidőpontokból kell igazolni.
9. A teljes orvosi PDF-archívum nem része automatikusan a v738-as exportnak.

## Biztonsági döntés
A meglévő App Folder Vault újracsatlakoztatása helyett független, felhasználó által visszavonható céloldali kapcsolat. Nem létezhet nyilvános export és nem kerülhet betegadat GitHubba.