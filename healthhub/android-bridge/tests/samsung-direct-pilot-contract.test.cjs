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

test('candidate HH One 0.15.22 upgrades installed 0.15.21 with the same signed identity and Dropbox',()=>{
 assert.match(build,/gradleProperty\("hhSamsungIntegratedCandidate"\)/);
 assert.match(build,/val hhSamsungDirectEnabled = hhSamsungPilotEnabled \|\| hhSamsungIntegratedCandidateEnabled/);
 assert.match(build,/versionCode = 47[\s\S]*if \(hhSamsungIntegratedCandidateEnabled\) \{\s*versionCode = 49\s*versionName = "0\.15\.22"/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_AVAILABLE", hhSamsungDirectEnabled\.toString\(\)\)/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_CANDIDATE", hhSamsungIntegratedCandidateEnabled\.toString\(\)\)/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_AVAILABLE\) \{/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\) \{/);
 assert.match(main,/Samsung Direct · 0\.15\.22 tesztfrissítés/);
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


test('0.15.22 Samsung background sync is opt-in, owner-bound, and disabled in normal OTA or separate Pilot',()=>{
 assert.match(bg,/check\(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\)/);
 assert.match(bg,/const val KEY_ENABLED = "samsung_direct_background_enabled"/);
 assert.match(bg,/const val KEY_MANUAL_CLOUD_VERIFIED_OWNER = "samsung_direct_manual_cloud_verified_owner"/);
 assert.match(bg,/prefs\.getString\(KEY_MANUAL_CLOUD_VERIFIED_OWNER, null\) == owner/);
 assert.match(bg,/getString\("device_owner_profile", null\) == owner/);
 assert.match(bg,/if \(!enabled\) \{\s*wm\.cancelUniqueWork\(PERIODIC\)\s*wm\.cancelUniqueWork\(ONCE\)/);
 assert.match(bg,/PeriodicWorkRequestBuilder<SamsungDirectBackgroundWorker>\(interval\.toLong\(\), TimeUnit\.HOURS\)/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_CANDIDATE\) \{\s*val samsungStatusLabel = TextView\(this\)/);
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
 assert.match(steps,/val byLocalHour = linkedMapOf<Int, Long>\(\)/);
 assert.match(steps,/\(byLocalHour\[local\.hour\] \?: 0L\) \+ count/);
 assert.match(steps,/byLocalHour\.toSortedMap\(\)\.forEach/);
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

test('optional SDK exercise collector is read-only, permission-bound and preserves Beta sessions on empty or failed reads',()=>{
 const exercise=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungExerciseCollector.kt');
 assert.match(exercise,/Permission\.of\(DataTypes\.EXERCISE, AccessType\.READ\)/);
 assert.match(exercise,/DataTypes\.EXERCISE\.readDataRequestBuilder/);
 assert.match(exercise,/getValue\(DataType\.ExerciseType\.SESSIONS\)/);
 assert.match(exercise,/session\.startTime/);
 assert.match(exercise,/session\.endTime/);
 assert.match(exercise,/session\.distance/);
 assert.match(exercise,/session\.altitudeGain/);
 assert.doesNotMatch(exercise,/\broute\b\s*[.?](?:let|forEach|map)\b|\bGPS\b.*put\(/i);
 assert.match(exercise,/if \(fresh == null \|\| fresh\.length\(\) == 0\) return previous/);
 assert.match(exercise,/combined\[start\.toString\(\) \+ "\|" \+ end\.toString\(\) \+ "\|" \+ typ\] = row/);
 assert.match(sdk,/SamsungExerciseCollector\.readRecent\(/);
 assert.match(sdk,/SamsungExerciseCollector\.mergeSessions\(/);
 assert.match(bg,/SamsungExerciseCollector\.readRecent\(/);
 assert.match(bg,/SamsungExerciseCollector\.mergeSessions\(/);
 // A periodic worker cannot open system permission dialogs or modify HC.
 assert.doesNotMatch(bg,/requestPermissions\(/);
 assert.doesNotMatch(exercise,/uploadHealthConnectSnapshot\(|healthConnectPath\(/);
});

test('Samsung browser shows newest exercise sessions and never double-counts overlapping HC sessions',()=>{
 const vm=require('node:vm'),ctx={window:{}};
 vm.runInNewContext(web,ctx,{timeout:1000});
 const now=Date.now();
 const sessions=[];
 for(let n=650;n>=0;n--){
  const end=new Date(now-n*1800000);
  const start=new Date(end.getTime()-1200000);
  sessions.push({startTime:start.toISOString(),endTime:end.toISOString(),
                 exerciseType:'WALKING',distanceMeters:1100});
 }
 const recent=sessions.at(-1);
 const payload={schemaVersion:'healthhub.samsung.daily/1',profile:'monika',
   exportedAt:new Date(now).toISOString(),
   records:{dailySummary:[],exerciseSessions:sessions}};
 const parsed=ctx.window.HH_SAMSUNG_SOURCE_V371.normalize('monika',payload);
 assert.ok(parsed);
 assert.equal(parsed.exerciseSessions.length,600);
 assert.equal(parsed.exerciseSessions[0].endTime,recent.endTime);
 const result={status:'ready',data:parsed};
 const existing={daily:[],sessions:[{id:'health-connect-session',
   startTime:recent.startTime,endTime:recent.endTime,distanceKm:1.2}]};
 const combined=ctx.window.HH_SAMSUNG_SOURCE_V371.merge(existing,result,'monika');
 assert.equal(combined.sessions.filter(x=>x.endTime===recent.endTime).length,1);
 assert.equal(combined.sessions.some(x=>x.id==='health-connect-session'),true);
});

test('HH One Samsung buttons invoke Kotlin object INSTANCE instead of invalid static reflection',()=>{
 // Kotlin object member methods are instance methods unless annotated @JvmStatic.
 // Calling Method.invoke(null, ...) silently failed before user consent UI.
 assert.match(main,/val samsungInstance = pilot\.getField\("INSTANCE"\)\.get\(null\)/);
 assert.match(main,/\.invoke\(samsungInstance, this@MainActivity, selectedProfile\(\)\)/);
 assert.match(main,/val samsungBackgroundInstance = bridge\.getField\("INSTANCE"\)\.get\(null\)/);
 assert.match(main,/\.invoke\(samsungBackgroundInstance, this@MainActivity, owner, next\)/);
 assert.match(main,/\.invoke\(samsungBackgroundInstance, this@MainActivity\)\.toString\(\)/);
 assert.doesNotMatch(main,/\.invoke\(null,\s*this@MainActivity/);
});

test('Samsung OTA cadence defaults to hourly, is owner editable without reinstall and migration retains data',()=>{
 assert.match(bg,/const val KEY_INTERVAL_HOURS = "samsung_direct_interval_hours"/);
 assert.match(bg,/prefs\.getInt\("\$\{KEY_INTERVAL_HOURS\}_\$owner", 1\)/);
 assert.match(bg,/require\(hours in 1\.\.3\)/);
 assert.match(bg,/fun setIntervalHours\(context: Context, owner: String, hours: Int\)/);
 assert.match(bg,/if \(prefs\.getBoolean\(KEY_ENABLED, false\)\) setEnabled\(context, owner, true\)/);
 assert.match(bg,/wm\.enqueueUniquePeriodicWork\(PERIODIC, ExistingPeriodicWorkPolicy\.UPDATE, periodic\)/);
 assert.match(bg,/fun reconcileHourlyDefault\(context: Context\)/);
 assert.match(main,/getMethod\("reconcileHourlyDefault", Context::class\.java\)/);
 assert.match(main,/val intervals = arrayOf\("1 óra \(alapértelmezett\)", "2 óra", "3 óra"\)/);
 assert.match(main,/getMethod\(\s*"setIntervalHours"/);
 assert.match(main,/root\.addView\(samsungStatusLabel\)/);
 // Owner permissions + consent remain mandatory. No silent cross-profile reads.
 assert.match(bg,/prefs\.getString\(KEY_MANUAL_CLOUD_VERIFIED_OWNER, null\) == owner/);
 assert.match(bg,/prefs\.getString\("device_owner_profile", null\) == owner/);
});

test('Samsung unified build49 keeps existing production OTA at build47 and starts both owners at 1 hour',()=>{
 assert.match(build,/versionCode = 47[\s\S]*versionName = "0\.15\.20"/);
 assert.match(build,/if \(hhSamsungIntegratedCandidateEnabled\) \{\s*versionCode = 49\s*versionName = "0\.15\.22"/);
 assert.match(bg,/prefs\.getInt\("\$\{KEY_INTERVAL_HOURS\}_\$owner", 1\)/);
 assert.match(bg,/saved in 1\.\.3/);
 assert.match(bg,/fun reconcileHourlyDefault\(context: Context\)/);
 assert.match(main,/getMethod\("reconcileHourlyDefault", Context::class\.java\)/);
 assert.match(main,/val intervals = arrayOf\("1 óra \(alapértelmezett\)", "2 óra", "3 óra"\)/);
 assert.doesNotMatch(bg,/requestPermissions\(/);
});


test('Samsung Watch9 wellness SDK records preserve missing values and require separate read consent',()=>{
 const w=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungWellnessCollector.kt');
 for(const field of ['SLEEP','ENERGY_SCORE','BLOOD_OXYGEN','SKIN_TEMPERATURE']){
   assert.match(w,new RegExp('Permission\\.of\\(DataTypes\\.'+field+', AccessType\\.READ\\)'));
 }
 assert.match(w,/DataType\.SleepType\.SLEEP_SCORE/);
 assert.match(w,/DataType\.EnergyScoreType\.ENERGY_SCORE/);
 assert.match(w,/DataTypes\.SLEEP\.associatedReadRequestBuilder/);
 assert.match(w,/IdFilter\.fromDataUid\(uid\)/);
 assert.match(w,/DataType\.BloodOxygenType\.MIN_OXYGEN_SATURATION/);
 assert.match(w,/DataType\.SkinTemperatureType\.MIN_SKIN_TEMPERATURE/);
 assert.match(w,/if \(fresh == null \|\| fresh\.length\(\) == 0\) return old/);
 assert.match(w,/fun mergeInto\(records: JSONObject, previous: JSONObject\?, snapshot: Snapshot\?\)/);
 assert.doesNotMatch(w,/writeData|insertData|updateData|deleteData|uploadText/);
 assert.match(sdk,/SamsungWellnessCollector\.read\(store, today\)/);
 assert.match(sdk,/SamsungWellnessCollector\.mergeInto\(/);
 assert.match(bg,/SamsungWellnessCollector\.read\(store, today\)/);
 assert.match(bg,/SamsungWellnessCollector\.mergeInto\(/);
 assert.match(bg,/6L \* 60L \* 60L \* 1000L/);
 assert.doesNotMatch(bg,/requestPermissions\(/);
});

test('Samsung Watch9 optional scores and night vitals normalize and remain profile isolated',()=>{
 const vm=require('node:vm'),ctx={window:{}};
 vm.runInNewContext(web,ctx,{timeout:1500});
 const today=new Date().toISOString().slice(0,10);
 const start=new Date(Date.now()-7*3600*1000).toISOString();
 const end=new Date(Date.now()-3600*1000).toISOString();
 const record={schemaVersion:'healthhub.samsung.daily/1',profile:'monika',
   exportedAt:new Date().toISOString(),records:{
     dailySummary:[{date:today,activeMinutes:11}],
     samsungSleepSessions:[{uid:'sleep-1',date:today,startTime:start,endTime:end,
       sleepMinutes:360,sleepScore:84,sessions:[]}],
     samsungEnergyScores:[{date:today,energyScore:76}],
     samsungNightOxygen:[{sleepUid:'sleep-1',startTime:start,endTime:end,
       minPercent:92,maxPercent:98}],
     samsungNightSkinTemperature:[{sleepUid:'sleep-1',startTime:start,endTime:end,
       minCelsius:32.2,maxCelsius:34.9}]
   }};
 assert.equal(ctx.window.HH_SAMSUNG_SOURCE_V371.normalize('zsolt',record),null);
 const parsed=ctx.window.HH_SAMSUNG_SOURCE_V371.normalize('monika',record);
 assert.equal(parsed.sleepSessions[0].sleepScore,84);
 assert.equal(parsed.energyScores[0].energyScore,76);
 assert.equal(parsed.nightOxygen[0].minPercent,92);
 assert.equal(parsed.nightSkinTemperature[0].maxCelsius,34.9);
 const c={daily:[{date:today,activeMinutes:11}],sessions:[],sleepSessions:[{id:'hc-sleep'}]};
 const mixed=ctx.window.HH_SAMSUNG_SOURCE_V371.merge(c,{status:'ready',data:parsed},'monika');
 assert.equal(mixed.samsungWellnessSource.profile,'monika');
 assert.equal(mixed.samsungWellnessSource.sleepScore.sleepScore,84);
 assert.deepEqual(mixed.sleepSessions,c.sleepSessions);
 assert.strictEqual(ctx.window.HH_SAMSUNG_SOURCE_V371.merge(c,{status:'ready',data:parsed},'zsolt'),c);
});

test('Samsung Watch9 invalid, absent or stale optional data must not be invented',()=>{
 const vm=require('node:vm'),ctx={window:{}};
 vm.runInNewContext(web,ctx,{timeout:1500});
 const today=new Date().toISOString().slice(0,10);
 const a=new Date(Date.now()-4*3600*1000).toISOString();
 const b=new Date(Date.now()-3600*1000).toISOString();
 const parsed=ctx.window.HH_SAMSUNG_SOURCE_V371.normalize('zsolt',{
   schemaVersion:'healthhub.samsung.daily/1',profile:'zsolt',
   exportedAt:new Date().toISOString(),records:{dailySummary:[],
     samsungSleepSessions:[{uid:'s1',date:today,startTime:a,endTime:b,sleepScore:101}],
     samsungEnergyScores:[{date:today,energyScore:101}],
     samsungNightOxygen:[{sleepUid:'s1',startTime:a,endTime:b,minPercent:30,maxPercent:99}],
     samsungNightSkinTemperature:[{sleepUid:'s1',startTime:a,endTime:b,minCelsius:52}]
   }});
 assert.equal(parsed.sleepSessions[0].sleepScore,undefined);
 assert.equal(parsed.energyScores.length,0);
 assert.equal(parsed.nightOxygen[0].minPercent,undefined);
 assert.equal(parsed.nightOxygen[0].maxPercent,99);
 assert.equal(parsed.nightSkinTemperature.length,0);
 const merged=ctx.window.HH_SAMSUNG_SOURCE_V371.merge(
   {daily:[],sessions:[]},{status:'ready',data:parsed},'zsolt');
 assert.equal(merged.samsungWellnessSource.sleepScore,null);
 assert.equal(merged.samsungWellnessSource.energyScore,null);
 assert.equal(merged.samsungWellnessSource.nightSkinTemperature,null);
});
