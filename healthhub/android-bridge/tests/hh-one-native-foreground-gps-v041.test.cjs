'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/java/hu/zsoltmonika/healthhubbridge');
const src=name=>fs.readFileSync(path.join(dir,name),'utf8');
const continuity=src('FamilyGuardContinuity.kt');
const main=src('MainActivity.kt');
const web=src('Sh9WebActivity.kt');
const gps=src('Sh9GpsService.kt');
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle.kts'),'utf8');
const published=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../data/bridge-ota.json'),'utf8'));

test('build41 remains a candidate while signed Zsolt-only pilot build40 is preserved',()=>{
 assert.match(gradle,/versionCode = 41/);
 assert.match(gradle,/versionName = "0\.15\.14"/);
 assert.equal(published.versionCode,40);
 assert.equal(published.version,'0.15.13');
 assert.deepEqual(published.rolloutProfiles,['zsolt']);
});
test('native launcher and settings both attempt safe approved-only GPS recovery on foreground',()=>{
 assert.match(web,/override fun onResume\(\)\s*\{\s*super\.onResume\(\)\s*\/\/[\s\S]*?FamilyGuardContinuity\.resumeApprovedGpsOnForeground\(this\)/);
 assert.match(main,/override fun onResume\(\)\s*\{\s*super\.onResume\(\)[\s\S]*?FamilyGuardContinuity\.resumeApprovedGpsOnForeground\(this\)/);
 assert.equal((web.match(/resumeApprovedGpsOnForeground\(this\)/g)||[]).length,1);
 assert.equal((main.match(/resumeApprovedGpsOnForeground\(this\)/g)||[]).length,1);
});
test('foreground recovery never grants consent or location permissions and honors owner STOP',()=>{
 const start=continuity.indexOf('fun resumeApprovedGpsOnForeground(');
 const end=continuity.indexOf('fun restartApprovedGps(',start);
 assert.ok(start>0&&end>start);
 const body=continuity.slice(start,end);
 assert.ok(body.indexOf('if (!enabled(context)) return "not-approved"') <
           body.indexOf('Sh9GpsService.start(context)'));
 for(const check of ['if (Sh9GpsService.active) return "already-running"',
 'if (!hasOwner(context)) return "missing-owner"',
 'if (!hasBackgroundLocation(context)) return "background-permission-missing"',
 'if (!gpsAvailable(context)) return "location-disabled"'])assert.ok(body.includes(check));
 assert.match(body,/FOREGROUND_RETRY_MS/);
 assert.match(body,/putLong\(KEY_FOREGROUND_RESTORE_ATTEMPT, now\)/);
 assert.doesNotMatch(body,/setApproved\(|requestPermissions\(|FamilyGuardNativeRelay\.enable\(|GPS_STOP|KEY_AUTO_GPS, true/);
 assert.match(gps,/if \(intent\?\.action == ACTION_STOP\) \{[\s\S]*?FamilyGuardContinuity\.setApproved\(this, false\)/);
 assert.match(continuity,/fun setApproved\(context: Context, allow: Boolean\)[\s\S]*?if \(!allow\) FamilyGuardNativeRelay\.disable\(context\)/);
});
test('owner sees if native location is only temporary; no false live status',()=>{
 assert.match(main,/GPS csak kézzel indul/);
 assert.match(main,/Automatikus natív GPS-helyreállítás: jóváhagyva/);
 assert.match(main,/Helymeghatározás leállítva/);
});
