'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const build=read('app/build.gradle.kts'),sdk=read('app/src/samsungDirectPilot/kotlin/hu/zsoltmonika/healthhubbridge/SamsungHealthDirectPilot.kt'),
 main=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const web=fs.readFileSync(path.join(root,'../live-v371-samsung.js'),'utf8');
test('production Android never compiles proprietary Samsung sources without an explicit opt-in and local AAR',()=>{
 assert.match(build,/gradleProperty\("hhSamsungDirectPilot"\)/);
 assert.match(build,/hhSamsungPilotRequested && hhSamsungPilotAar\.isFile/);
 assert.match(build,/if \(hhSamsungPilotEnabled\) \{\s*sourceSets\.getByName\("main"\)\.java\.srcDir/);
 assert.match(build,/buildConfigField\("boolean", "HH_SAMSUNG_DIRECT_PILOT", hhSamsungPilotEnabled\.toString\(\)\)/);
 assert.match(build,/applicationIdSuffix = "\.samsungpilot"/);
 assert.match(build,/it\.contains\("release", ignoreCase = true\)/);
 assert.match(build,/Samsung Direct pilot is DEBUG-ONLY/);
 assert.match(main,/if \(BuildConfig\.HH_SAMSUNG_DIRECT_PILOT\) \{/);
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
 assert.doesNotMatch(sdk,/PeriodicWorkRequest|WorkManager|SYNC NOW/);
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
 assert.match(sdk,/entries\[day\.toString\(\)\] = JSONObject\(\)/);
 assert.match(sdk,/\.put\("date", day\.toString\(\)\)/);
 assert.match(sdk,/!localDate\.isBefore\(today\.minusDays\(29\)\)/);
 assert.match(sdk,/!localDate\.isAfter\(today\)/);
 assert.match(sdk,/if \(day == today\) "mai" else "tegnapi"/);
});

test('a valid Samsung activity reading is reported locally without falsely claiming a cloud upload',()=>{
 assert.match(sdk,/DropboxVaultClient\.hasRefreshToken\(prefs\)/);
 assert.match(sdk,/Dropbox nincs csatlakoztatva a Pilothoz; nem történt feltöltés/);
 assert.match(sdk,/stage = "SAMSUNG_ADATOLVASAS"/);
 assert.match(sdk,/stage = "DROPBOX_LETÖLTÉS"/);
 assert.match(sdk,/stage = "DROPBOX_FELTÖLTÉS"/);
 assert.match(sdk,/Samsung Direct hiba \(\$stage\)/);
});
