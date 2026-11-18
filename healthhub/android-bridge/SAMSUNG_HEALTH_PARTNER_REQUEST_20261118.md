# Samsung Health Data SDK · Partnerkérelem / HH One

**Állapot: ELŐKÉSZÍTVE, még NEM BEADVA.** A Samsung Developer belépés és az űrlap beküldése a fejlesztői fiók jogosult tulajdonosát igényli. Az engedélyezés **NEM** automatikus.

## Hivatalos források és beadási útvonal
- Partnerkérelem információ: https://developer.samsung.com/health/data/process.html
- Partnerkérelem közvetlen oldala (Samsung Developer belépés kell): https://developer.samsung.com/SHealth/business-partner/m48wvqi1mt9w2w4c
- Aláírás/partnerellenőrzés: https://developer.samsung.com/health/data/guide/app-verification.html

## A kérelemben felhasználandó, ellenőrzött azonosítók

| Mező | Érték |
|---|---|
| Application / product | HH One (HealthHub / Smart Hub One) |
| Android package name | `hu.zsoltmonika.healthhubbridge` |
| **Installed release APK signing certificate SHA-256** | `1045e5cc520eded12ebdec76eaf946cda0888f8cbccc7a2cdfc62a6aec92eb1e` |
| Samsung Health Data SDK | `1.1.0` |
| Release package candidate | `0.15.23` / `versionCode=50` |
| Access direction | **READ ONLY** (does not insert/update/delete Samsung Health measurements) |
| Distribution target | Two consenting, privately owned Android phones, signed in-place OTA APK; not Play/Galaxy Store |
| Native current baseline | `0.15.22/build49` running on both devices, original signing key preserved |
| Health data retention | Owner-specific, user-controlled HealthHub/Dropbox export; no data sold to advertisers |
| Missing fields | Stay unavailable, never inferred |
| Developer mode | Used for local pilot only; not a replacement for partner approval when distributing |

### Data types to request (Samsung Data SDK)
- `ACTIVITY_SUMMARY`: measured active minutes, active calories, distance
- `STEPS`: consolidated steps
- `EXERCISE`: exercise sessions
- `SLEEP`: nighttime stages, measured duration, Sleep Score
- `ENERGY_SCORE`: Samsung Energy Score
- `BLOOD_OXYGEN`: sleep-associated overnight oxygen saturation (when available)
- `SKIN_TEMPERATURE`: sleep-associated nighttime skin temperature (when available)

Health Connect separately provides HRV/respiratory rate with user's Android permissions; these are not claimed as Samsung SDK score data.

## Beküldhető angol szöveg

**Subject:** Samsung Health Data SDK 1.1.0 partner registration – HH One (private two-device signed OTA)

Hello Samsung Health Data SDK Partnership Team,

We have developed HH One, a private household health and wellness dashboard for two consenting Android phone owners. We are requesting official authorization to use Samsung Health Data SDK v1.1.0 outside developer mode and register the application's Android package name, release-signing certificate, and read-only data access scopes.

**Package name:** `hu.zsoltmonika.healthhubbridge`

**Release APK signing certificate SHA-256:** `1045e5cc520eded12ebdec76eaf946cda0888f8cbccc7a2cdfc62a6aec92eb1e`

**SDK:** Samsung Health Data SDK v1.1.0

**Requested READ access scopes:** ACTIVITY_SUMMARY, STEPS, EXERCISE, SLEEP, ENERGY_SCORE, BLOOD_OXYGEN, SKIN_TEMPERATURE. We request consent for individual measurements only where present and authorised by each user.

**Distribution model:** A signed Android APK delivered only to two private household devices through an existing SHA-256-verified, owner-confirmed, in-app OTA flow. We do not use Google Play or Galaxy Store and have no intention of distributing the app to the general public.

**Data handling:** Data is read only from Samsung Health with user consent, displayed in the owner's private dashboard and synchronized to user-controlled, owner-specific cloud storage. The app does not write to Samsung Health. Missing measurements are not fabricated. Health Connect data is handled separately.

Could you please confirm whether your partnership programme permits this private, two-device signed OTA distribution model? If eligible, please register the exact package and release-signing certificate above, with the requested read-only data types. If additional documentation, testing, store distribution, or privacy-policy information is required, please advise.

Thank you.

HH One / HealthHub development team

## Kiadási kapu

**Csak Samsung írásos jóváhagyása után:**
1. Jegyezzük fel a Samsung approval reference azonosítóját, valamint a véglegesen jóváhagyott package+SHA-256+READ scope halmazt.
2. GitHub repo **Actions variables**: `HH_SAMSUNG_PARTNER_APPROVED_CERT_SHA256` (fenti fingerprint), `HH_SAMSUNG_PARTNER_APPROVAL_REFERENCE` (Samsung ticket/reference), `HH_SAMSUNG_PARTNER_APPROVED_READ_SCOPES` (jóváhagyott, vesszővel elválasztott nevekkel).
3. Az `hh-one-samsung-integrated-ota.yml` kizárólag a `main` ágról, kézi `rollout=all` jóváhagyással, több egymásra épített hard stop ellenőrzéssel bocsáthatja ki a 0.15.23/build50 signed OTA-t.
4. A két készülék a meglévő SH9/SHO OTA pirulán látja a frissítést; Android telepítő jóváhagyás szükséges.

**Ne állítsuk a partnerbeállítási változókat valós Samsung jóváhagyás nélkül!** Az új release workflow nem állíthatja, hogy az engedély már létezik, és nem írhatja felül a production `healthhub/data/bridge-ota.json` manifestet addig.
