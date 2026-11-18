'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const build=read('app/build.gradle.kts'),sdk=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungHealthDirectPilot.kt'),
 main=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt'),
 bg=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungDirectBackgroundSync.kt');
const web=fs.readFileSync(path.join(root,'../live-v371-samsung.js'),'utf8');
test('production Android never compiles proprietary Samsung sources without an explicit opt-in and local AAR',()=>{
 assert.match(build,/gradleProperty\("hhSamsungDirectPilot"\)/);
 assert.match(build,/hhSamsungPilotRequested && hhSamsungPilotAar\.isFile/);
 assert.match(build,/if \(hhSamsungDirectEnabled\) \{\s*sourceSets\.getByName\("main"\)\.java\.srcDir/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_PILOT", hhSamsungPilotEnabled\.toString\(\)\)/);
 assert.match(build,/applicationIdSuffix = "\.samsungpilot"/);
 assert.match(build,/it\.contains\("release", ignoreCase = true\)/);
 assert.match(build,/Samsung Direct pilot is DEBUG-ONLY/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE\) \{/);
 assert.doesNotMatch(build,/implementation\("com\.samsung/);
});
test('Samsung direct requires separate explicit read permission and uses real SDK Duration',()=>{
 assert.match(sdk,/Permission\.of\(DataTypes\.ACTIVITY_SUMMARY, AccessType\.READ\)/);
 assert.match(sdk,/getGrantedPermissions\(required\)/);
 assert.doesNotMatch(sdk,/getGrantedPermissions\(required\)\.grantedPermissions/);
 assert.match(sdk,/val granted = store\.requestPermissions\(required, activity\)/);
 assert.match(sdk,/requestPermissions\(required, activity\)/);
 assert.match(sdk,/DataType\.ActivitySummaryType\.TOTAL_ACTIVE_TIME\.requestBuilder/);
 assert.match(sdk,/val measured: Duration\? = store\.aggregateData\(request\)\.dataList\.firstOrNull\(\)\?\.value/);
 assert.match(sdk,/if \(measured == null/);
 assert.match(sdk,/val minutes = measured\.toMinutes\(\)/);
 assert.doesNotMatch(sdk,/steps.*[/.+*]\s*[0-9]/i);
});
test('pilot cannot cross profiles, overwrite Health Connect, or fire without the owner pressing a button',()=>{
 assert.match(sdk,/getString\("device_owner_profile", null\) != profile/);
 assert.match(sdk,/check\(prefs\.getString\("device_owner_profile", null\) == profile\)/);
 assert.match(sdk,/DropboxVaultClient\.PROFILES_DIR \+ "\/" \+ profile \+ "-samsung-health\.json"/);
 assert.doesNotMatch(sdk,/uploadHealthConnectSnapshot\(/);
 assert.match(sdk,/check\(old\.optString\("profile"\) == profile\)/);
 assert.match(main,/setOnClickListener \{\s*try \{\s*val pilot = Class\.forName/);
 assert.doesNotMatch(sdk,/PeriodicWorkRequestBuilder|WorkManager\.getInstance\(|SYNC NOW/);
 assert.match(web,/dailySummary/);
 assert.match(web,/activeMinutes/);
});

test('Windows SDK builder only ingests local official ZIP/AAR and never overwrites production package',()=>{
 const script=read('scripts/build-samsung-pilot-windows.ps1');
 assert.match(script,/samsung-health-data-api\.aar/);
 assert.match(script,/Expand-Archive/);
 assert.match(script,/hhSamsungDirectPilot=true/);
 assert.match(script,/hu\.zsoltmonika\.healthhubbridge\.samsungpilot/);
 assert.doesNotMatch(script,/(?:Invoke-WebRequest|curl|wget|git push|upload-artifact)/i);
});

test('Samsung private pilot checks today then yesterday without changing the dated output',()=>{
 assert.match(sdk,/for \(candidate in listOf\(today, today\.minusDays\(1\)\)\)/);
 assert.match(sdk,/val end = if \(candidate == today\) LocalDateTime\.now\(\) else today\.atStartOfDay\(\)/);
 assert.match(sdk,/val filter = LocalTimeFilter\.of\(candidate\.atStartOfDay\(\), end\)/);
 assert.match(sdk,/if \(measured == null \|\| measured\.isNegative \|\| measured\.toMinutes\(\) > 1440\)/);
 assert.match(sdk,/measuredDay = candidate/);
 assert.match(sdk,/entries\[day\.toString\(\)\] = mergeDay\(sameDay, freshDay\)/);
 assert.match(sdk,/\.put\("date", day\.toString\(\)\)/);
 assert.match(sdk,/!localDate\.isBefore\(today\.minusDays\(29\)\)/);
 assert.match(sdk,/!localDate\.isAfter\(today\)/);
 assert.match(sdk,/if \(day == today\) "mai" else "tegnapi"/);
});

test('a valid Samsung activity reading is reported locally without falsely claiming a cloud upload',()=>{
 assert.match(sdk,/DropboxVaultClient\.hasRefreshToken\(prefs\)/);
 assert.match(sdk,/Helyben mentve\. Dropbox nélkül; exportálás a külön gombbal/);
 assert.match(sdk,/stage = "SAMSUNG_ADATOLVASAS"/);
 assert.match(sdk,/stage = "DROPBOX_LETÖLTÉS"/);
 assert.match(sdk,/stage = "DROPBOX_FELTÖLTÉS"/);
 assert.match(sdk,/Samsung Direct hiba \(\$stage\)/);
});


test('Samsung Pilot local-first transport requires no browser, persists measured data and supports explicit Android file export',()=>{
 assert.match(sdk,/stage = "HELYI_MENTÉS"/);
 assert.match(sdk,/File\(activity\.filesDir, "samsung-direct-\$profile\.json"\)/);
 assert.match(sdk,/StandardCopyOption\.ATOMIC_MOVE/);
 assert.match(sdk,/\.put\("source", "samsung-health-data-sdk-1\.1\.0"\)/);
 assert.match(sdk,/Dropbox nélkül; exportálás a külön gombbal/);
 assert.match(main,/ActivityResultContracts\.CreateDocument\("application\/json"\)/);
 assert.match(main,/samsungExportLauncher\.launch\("\$owner-samsung-health\.json"\)/);
 assert.match(main,/!BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE &&/);
 assert.match(main,/Samsung Direct · mentett adatok exportálása/);
 assert.match(main,/!File\(filesDir, "samsung-direct-\$owner\.json"\)\.isFile/);
});

test('fresh second Samsung Pilot needs explicit confirmed owner binding, not HC sync or Dropbox',()=>{
 assert.match(main,/Samsung Pilot · telefon tulajdonosának rögzítése/);
 assert.match(main,/if \(deviceOwnerProfile\(\) == null\) \{/);
 assert.match(main,/\.setPositiveButton\("✅ \$label telefonja"\)/);
 assert.match(main,/bindOwnerIfNeeded\(chosen\)/);
 assert.match(main,/val chosen = selectedProfile\(\)/);
 assert.match(sdk,/if \(prefs\.getString\("device_owner_profile", null\) != profile\)/);
});

test('candidate HH One 0.15.21 uses the same signed identity and Dropbox, but default OTA stays Samsung-free',()=>{
 assert.match(build,/gradleProperty\("hhSamsungIntegratedCandidate"\)/);
 assert.match(build,/val hhSamsungDirectEnabled = hhSamsungPilotEnabled \|\| hhSamsungIntegratedCandidateEnabled/);
 assert.match(build,/versionCode = 47[\s\S]*if \(hhSamsungIntegratedCandidateEnabled\) \{\s*versionCode = 48\s*versionName = "0\.15\.21"/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_AVAILABLE", hhSamsungDirectEnabled\.toString\(\)\)/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_CANDIDATE", hhSamsungIntegratedCandidateEnabled\.toString\(\)\)/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE\) \{/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\) \{/);
 assert.match(main,/Samsung Direct · 0\.15\.21 canary/);
 assert.match(build,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(build,/if \(hhSamsungPilotEnabled\) \{\s*applicationIdSuffix = "\.samsungpilot"/);
});

test('integrated Samsung Direct export and Dropbox use canonical source marker',()=>{
 assert.match(sdk,/\.put\("source", "samsung-health-data-sdk-1\.1\.0"\)/g);
 assert.doesNotMatch(sdk,/\.put\("source", "Samsung Health Data SDK - ACTIVITY_SUMMARY"\)/);
 assert.match(main,/if \(uri != null && owner != null && BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE\) \{/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE\) \{\s*root\.addView\(TextView\(this\)/);
 assert.match(build,/Samsung integrated candidate requires the existing HH One OTA signing credentials/);
});


test('0.15.21 Samsung background sync is opt-in, owner-bound, and disabled in normal OTA or separate Pilot',()=>{
 assert.match(bg,/check\(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\)/);
 assert.match(bg,/const val KEY_ENABLED = "samsung_direct_background_enabled"/);
 assert.match(bg,/const val KEY_MANUAL_CLOUD_VERIFIED_OWNER = "samsung_direct_manual_cloud_verified_owner"/);
 assert.match(bg,/prefs\.getString\(KEY_MANUAL_CLOUD_VERIFIED_OWNER, null\) == owner/);
 assert.match(bg,/getString\("device_owner_profile", null\) == owner/);
 assert.match(bg,/if \(!enabled\) \{\s*wm\.cancelUniqueWork\(PERIODIC\)\s*wm\.cancelUniqueWork\(ONCE\)/);
 assert.match(bg,/PeriodicWorkRequestBuilder<SamsungDirectBackgroundWorker>\(3, TimeUnit\.HOURS\)/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\) \{\s*root\.addView\(Button\(this\)/);
 assert.match(main,/Samsung automatikus szinkron · BEKAPCSOLÁS/);
 assert.match(main,/Samsung automatikus szinkron · KIKAPCSOLÁS/);
 assert.match(sdk,/putString\(SamsungDirectBackgroundSync\.KEY_MANUAL_CLOUD_VERIFIED_OWNER, profile\)/);
});

test('Samsung background worker reads only pre-approved real SDK activity and cannot overwrite canonical HC file',()=>{
 assert.match(bg,/if \(!BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\) return Result\.success\(\)/);
 assert.match(bg,/if \(!prefs\.getBoolean\(SamsungDirectBackgroundSync\.KEY_ENABLED, false\)\) return Result\.success\(\)/);
 assert.match(bg,/getGrantedPermissions\(needed\)\.containsAll\(needed\)/);
 assert.doesNotMatch(bg,/\.requestPermissions\(/);
 assert.match(bg,/for \(date in listOf\(today, today\.minusDays\(1\)\)\)/);
 assert.match(bg,/val measured: Duration\? = store\.aggregateData\(request\)\.dataList\.firstOrNull\(\)\?\.value/);
 assert.match(bg,/SamsungHealthDirectPilot\.writer\.withLock/);
 assert.match(bg,/File\(applicationContext\.filesDir, "samsung-direct-\$owner\.json"\)/);
 assert.match(bg,/val cloudPath = DropboxVaultClient\.PROFILES_DIR \+ "\/\$owner-samsung-health\.json"/);
 assert.doesNotMatch(bg,/uploadHealthConnectSnapshot\(|healthConnectPath\(/);
 assert.match(bg,/\.put\("source", "samsung-health-data-sdk-1\.1\.0"\)/);
 assert.match(bg,/if \(cloudTime\.isAfter\(readStartedAt\)\)/);
});

test('unified HH One Samsung reader preserves Beta fields instead of rewriting a single metric',()=>{
 assert.match(sdk,/DataType\.ActivitySummaryType\.TOTAL_ACTIVE_CALORIES_BURNED\.requestBuilder/);
 assert.match(sdk,/DataType\.ActivitySummaryType\.TOTAL_DISTANCE\.requestBuilder/);
 assert.match(bg,/DataType\.ActivitySummaryType\.TOTAL_ACTIVE_CALORIES_BURNED\.requestBuilder/);
 assert.match(bg,/DataType\.ActivitySummaryType\.TOTAL_DISTANCE\.requestBuilder/);
 assert.match(sdk,/mergeDay\(historicalDay, freshDay\)/);
 assert.match(bg,/mergeDay\(\s*sameDay\(cloud, measuredDay\)/);
 assert.match(sdk,/listOf\("hourlySteps", "exerciseSessions"\)/);
 assert.match(bg,/listOf\("hourlySteps", "exerciseSessions"\)/);
 assert.doesNotMatch(sdk,/steps\s*[/\*]\s*\d+/);
 assert.doesNotMatch(bg,/steps\s*[/\*]\s*\d+/);
});

test('first sync and unattended sync require owner-scoped readback before claiming cloud success',()=>{
 assert.match(sdk,/val readBack = DropboxVaultClient\.downloadTextOrNull\(prefs, path\)/);
 assert.match(sdk,/confirmed\.optString\("profile"\) == profile/);
 assert.match(sdk,/confirmed\.optString\("exportedAt"\) == output\.optString\("exportedAt"\)/);
 assert.match(bg,/val readBack = DropboxVaultClient\.downloadTextOrNull\(prefs, cloudPath\)/);
 assert.match(bg,/validateOwner\(confirmed, owner\)/);
 assert.match(bg,/confirmed\.optString\("exportedAt"\) == uploaded\.optString\("exportedAt"\)/);
 assert.match(bg,/KEY_LAST_SUCCESS, System\.currentTimeMillis\(\)/);
 assert.match(sdk,/KEY_MANUAL_CLOUD_VERIFIED_OWNER, profile/);
});
