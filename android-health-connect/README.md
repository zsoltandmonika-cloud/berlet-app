# HealthHub Connector 0.1.0 (Android beta)

Read-only Health Connect exporter, manually imported into the existing HealthHub PWA. No INTERNET permission, remote upload, background worker, or write/delete permission. Permission grants remain under Android's control.

Build with Java 17, Gradle 8.11.1, Android SDK 36 and build-tools 35:

    gradle :app:assembleDebug

Set `ANDROID_HOME` or an ignored `local.properties` with `sdk.dir`. The supplied APK is a debug-signed testing build. A future production release needs a privately retained release signing key. Never commit signing keys or health data.

UI selects the owner's profile explicitly, a 7/30-day period, read permissions, then confirms ownership before export. Records are paginated; missing permissions are listed. A failed read produces no partial export. Heart-rate samples are flattened; steps use Health Connect's aggregateGroupByPeriod to respect its deduplication. Saving uses Android's document picker.

Contract: JSON `format=healthhub-health-connect`, `schemaVersion=1`, `profile=zsolt|monika`, ISO export timestamp and `measurements`. Each record has a type, origin, provider ID, measuredAt and lastModifiedAt. Units: mmHg, beats/min, kg, mmol/L, %, daily count. Stable provider IDs are retained; steps use local date + timezone. No delete synchronization. This version reads only the last 7/30 calendar days.

Web importer: `healthhub/connect/core.js` validates data and computes changes; `live-v147.js` previews and applies them in one IndexedDB transaction. Re-import is idempotent, older changed records are skipped, profiles must match. A transaction-local rollback record is retained in meta for developer recovery; no user-facing restore UI is claimed.

Tests: `node --test tests/health-connect.test.cjs`. DOM/IndexedDB integration test requires `jsdom` and `fake-indexeddb` (`npm install --no-save jsdom fake-indexeddb`), then `node --test tests/health-connect-ui.test.cjs`.

Acceptance still required on a real phone: install, grant permissions, compare a known OMRON reading and Samsung steps in Health Connect with exported/imported values, repeat import, then export after a new reading. Compilation and synthetic tests do not establish device compatibility.
