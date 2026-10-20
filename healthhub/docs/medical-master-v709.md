# HealthHub Medical Master v709 · 6+1 integráció

## Első fázis
A működő hat központi JSON Dropbox állományból külön hetedik privát JSON jön létre. Az éles Ask Léna és a 6 forrás nem változik.

## Golden Standard mércék
1. Mónika 2024. június 17. – július 16. kórházi története, konkrét laborok és források.
2. Mónika hormonvizsgálatainak célzott TSH-időrendje, hiányzó eredmények jelölésével.

## Külön tesztkapcsoló
https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/?hhMasterPilot=v1

Az első gomb beolvassa mind a hat forrást és elkészíti a 7. JSON előnézetét. A második külön megerősítés után kizárólag a privát Dropbox /HealthHub/master/medical-master.json fájlt hozza létre/frissíti. Visszaolvasás után a teljes JSON tartalmát összeveti az írt anyaggal. Harmadik gomb teljes helyi JSON letöltés.

## Védelmek
- Mind a hat forrás kötelező és sémával ellenőrzött.
- Zsolt és Mónika profilok elkülönítve; magyarázatok pontos dokumentumazonosítóval párosítva.
- A helyi és távoli manifest azonossága kötelező.
- Az öt strukturált adatcsomag időbélyegének egyeznie kell.
- A már létező, frissebb vagy több rekordot tartalmazó 7. Mastert nem írhatja felül régebbi vagy kisebb állomány.
- Hiányzó rekord vagy profilkeveredés esetén a próba megszakad.
- A hat régi JSON kizárólag olvasható. A Master nem kerül nyilvános GitHub-kódba.
- Az OpenAI API még nem kapja meg a 7. fájlt; a normál Ask Léna nem változik.

## További mérföldkövek
v710: külön engedélyezett, profiljogosultságot ellenőrző Ask Léna kutatási pilot, biztonságos szerveroldali API-kulccsal.
v711: új lelet és új magyarázat esetén a 6+1 automatikus szinkron a sikeres v710 tesztet követően.

CODED ≠ TESTED ≠ DEPLOYED ≠ LIVE VERIFIED ≠ USER ACCEPTED.