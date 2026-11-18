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
 assert.match(sdk,/oldRecords\?\.optJSONArray\("exerciseSessions"\)/);
 assert.match(bg,/oldRecords\?\.optJSONArray\("exerciseSessions"\)/);
 assert.match(sdk,/SamsungStepCollector\.mergeHourly\(/);
 assert.match(bg,/SamsungStepCollector\.mergeHourly\(/);
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

test('Watch9 optional Health Connect vitals cannot block existing mandatory sync',()=>{
 const exporter=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/HealthConnectExporter.kt');
 const manifest=read('app/src/main/AndroidManifest.xml');
 for (const field of ['HeartRateVariabilityRmssdRecord','RespiratoryRateRecord','SkinTemperatureRecord']) {
   assert.match(exporter,new RegExp('HealthPermission\\.getReadPermission\\('+field+'::class\\)'));
 }
 assert.match(exporter,/OPTIONAL_WATCH_VITALS_PERMISSIONS = setOf\(/);
 const required=exporter.match(/REQUIRED_PERMISSIONS = setOf\(([\s\S]*?)\n        \)/)?.[1]||'';
 for (const optional of ['HeartRateVariabilityRmssdRecord','RespiratoryRateRecord','SkinTemperatureRecord']) {
   assert.doesNotMatch(required,new RegExp(optional+'::class'));
 }
 assert.match(exporter,/private suspend fun <T : Record> readOptionalSource\(/);
 assert.match(exporter,/if \(e is kotlinx\.coroutines\.CancellationException\) throw e/);
 assert.match(exporter,/records\.put\("heartRateVariabilityRmssd"/);
 assert.match(exporter,/records\.put\("respiratoryRate"/);
 assert.match(exporter,/records\.put\("skinTemperature"/);
 assert.match(exporter,/\.put\("deltaCelsius", sample\.delta\.inCelsius\)/);
 assert.match(exporter,/\.put\("baselineCelsius", r\.baseline\?\.inCelsius \?: JSONObject\.NULL\)/);
 assert.match(exporter,/\.put\("sourcePackage", r\.metadata\.dataOrigin\.packageName\)/);
 assert.match(main,/watchVitalsPermissionLauncher/);
 assert.match(main,/watchVitalsPermissionLauncher\.launch\(missing\)/);
 assert.match(main,/Watch9 · HRV, légzésszám, bőrhőmérséklet engedélyezése/);
 for (const perm of ['READ_HEART_RATE_VARIABILITY','READ_RESPIRATORY_RATE','READ_SKIN_TEMPERATURE']){
   assert.match(manifest,new RegExp('android\\.permission\\.health\\.'+perm));
 }
});

test('Watch9 optional vitals are preserved in Dropbox on denied permission or source failure',()=>{
 const client=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/DropboxVaultClient.kt');
 assert.match(client,/val optionalAccess = diagnostics\.optJSONObject\("optionalVitalsPermissions"\)/);
 assert.match(client,/"hrv" to "heartRateVariabilityRmssd"/);
 assert.match(client,/"respiratoryRate" to "respiratoryRate"/);
 assert.match(client,/"skinTemperature" to "skinTemperature"/);
 assert.match(client,/if \(optionalAccess\.optBoolean\(permission, false\)\) continue/);
 assert.match(client,/val priorRecords = existing\.optJSONArray\(field\) \?: continue/);
 for (const key of ['heartRateVariabilityRmssd','respiratoryRate','skinTemperature']) {
   assert.match(client,new RegExp('"'+key+'" to "'+key+'"'));
 }
});

test('Samsung SDK consolidated hourly steps are permission-scoped, never guessed, and preserve historic Beta rows',()=>{
 const steps=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungStepCollector.kt');
 assert.match(steps,/Permission\.of\(DataTypes\.STEPS, AccessType\.READ\)/);
 assert.match(steps,/DataType\.StepsType\.TOTAL\.requestBuilder/);
 assert.match(steps,/LocalTimeGroup\.of\(LocalTimeGroupUnit\.HOURLY, 1\)/);
 assert.match(steps,/setLocalTimeFilterWithGroup\(filter, group\)/);
 assert.match(steps,/record\.startTime\.atZone\(ZoneId\.systemDefault\(\)\)/);
 assert.match(steps,/result\.takeIf \{ it\.length\(\) > 0 \}/);
 assert.match(steps,/if \(fresh == null \|\| fresh\.length\(\) == 0\) return old/);
 assert.match(steps,/val replacementHours = HashSet<Int>\(\)/);
 assert.match(steps,/item\.optInt\("hour", -1\) in replacementHours\) continue/);
 assert.match(sdk,/SamsungStepCollector\.readHourly\(store, day, until\)/);
 assert.match(sdk,/SamsungStepCollector\.mergeHourly\(/);
 assert.match(bg,/SamsungStepCollector\.readHourly\(store, measuredDay, until\)/);
 assert.match(bg,/SamsungStepCollector\.mergeHourly\(/);
 assert.doesNotMatch(bg,/requestPermissions\(/);
});

test('Samsung web reader prioritizes newly measured hourly records over old Beta history',()=>{
 const vm=require('node:vm'),ctx={window:{}};
 vm.runInNewContext(web,ctx,{timeout:1000});
 const now=Date.now(),rows=[];
 const dayAt=days=>new Date(now-days*86400000).toISOString().slice(0,10);
 // More than 72 hours, oldest first: old code would silently hide today.
 for(let d=5;d>=0;d--)for(let h=0;h<20;h++)rows.push({date:dayAt(d),hour:h,steps:h+1});
 const payload={schemaVersion:'healthhub.samsung.daily/1',profile:'zsolt',
   exportedAt:new Date(now).toISOString(),records:{dailySummary:[],hourlySteps:rows}};
 const parsed=ctx.window.HH_SAMSUNG_SOURCE_V371.normalize('zsolt',payload);
 assert.ok(parsed);
 assert.equal(parsed.hourlySteps.length,72);
 assert.equal(parsed.hourlySteps[0].date,dayAt(0));
 assert.equal(parsed.hourlySteps[0].hour,19);
 assert.equal(parsed.hourlySteps.some(r=>r.date===dayAt(5)),false);
});
