'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const app=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/OneTapOtaActivity.kt');
const shell=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const manifest=read('app/src/main/AndroidManifest.xml');
const ota=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/OtaUpdateManager.kt');

test('real SH9 phone tap opens direct non-exported updater, not HH One settings',()=>{
 assert.match(manifest,/<activity android:name="\.OneTapOtaActivity" android:exported="false" \/>/);
 assert.match(shell,/u\.getQueryParameter\("ota"\) == "install"/);
 assert.match(shell,/OneTapOtaActivity::class\.java/);
 assert.match(shell,/OneTapOtaActivity\.EXTRA_FROM_SH9_TAP, true/);
 assert.match(app,/getBooleanExtra\(EXTRA_FROM_SH9_TAP, false\) == true/);
 assert.match(app,/startUpdate\(\)/);
 assert.doesNotMatch(app,/Runtime\.getRuntime|ProcessBuilder|PackageInstaller\.Session/);
});
test('no developer menu on success, only system install approval',()=>{
 assert.match(app,/OtaUpdateManager\.check\(this@OneTapOtaActivity\)/);
 assert.match(app,/OtaUpdateManager\.downloadVerified\(this@OneTapOtaActivity, candidate\)/);
 assert.match(app,/OtaUpdateManager\.openSystemInstaller\(this@OneTapOtaActivity, apk\)/);
 assert.match(ota,/actual != candidate\.sha256/);
 assert.match(ota,/Intent\(Intent\.ACTION_VIEW\)/);
 assert.match(app,/Az APK ellenőrzött|Az APK ellenőrzött\./);
 assert.doesNotMatch(app,/startActivity\(Intent\(this, MainActivity::class\.java\).*openNativeSettings/s);
});
test('unexpected Android install permission has guided one-time flow; manual action explicit',()=>{
 assert.match(app,/OtaUpdateManager\.unknownSourcesAllowed\(this\)/);
 assert.match(app,/Settings\.ACTION_MANAGE_UNKNOWN_APP_SOURCES/);
 assert.match(app,/ActivityResultContracts\.StartActivityForResult/);
 assert.match(app,/Kézi frissítés/);
 assert.match(app,/Újrapróbálás/);
 assert.match(app,/Bezárás/);
 assert.match(app,/setOnClickListener \{[\s\S]*MainActivity::class\.java/);
});

test('owner-tapped Android OTA notification also opens the signed updater directly',()=>{
 assert.match(ota,/Intent\(context, OneTapOtaActivity::class\.java\)/);
 assert.match(ota,/OneTapOtaActivity\.EXTRA_FROM_SH9_TAP, true/);
 assert.match(ota,/PendingIntent\.getActivity/);
 assert.doesNotMatch(ota,/val tapIntent = Intent\(context, MainActivity::class\.java\)/);
});
