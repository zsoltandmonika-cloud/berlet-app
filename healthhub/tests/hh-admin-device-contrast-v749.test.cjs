'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const css=read('hh-admin-device-contrast-v749.css');
const reg=read('device-registry-v401.js');
const html=read('index.html');
const orch=read('live-v305.js');
const native=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');

test('real mobile Admin loads accessible v749 style with cache-busting',()=>{
 assert.match(html,/hh-admin-device-contrast-v749\.css\?v=749-contrast/);
 assert.match(html,/device-registry-v401\.js\?v=401-reversible-housekeeping&admin=748&ui=749/);
 assert.match(css,/html\[data-hh-inline-admin="yes"\]/);
 assert.match(css,/#hhDeviceRegistry401/);
 assert.match(css,/#hhSyncOrchestrator305/);
 assert.match(css,/\.hhRegHead401 h3\{/);
 assert.match(css,/color:#f8faff!important/);
 assert.match(css,/\.hhRegNoNative401\{/);
 assert.match(css,/min-height:46px!important/);
 assert.match(css,/font-size:12px!important/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.doesNotMatch(css,/display:none!important|overflow:hidden!important|visibility:hidden/);
});

test('registry accurately states missing native heartbeats, preserving enrolled identity',()=>{
 assert.match(reg,/A korábban kijelölt telefonhoz most nincs ellenőrizhető Android-bejegyzés/);
 assert.match(reg,/Még nem érkezett ellenőrizhető Android-jelentés/);
 assert.match(reg,/HH One \/ HH Connect natív alkalmazást/);
 assert.match(reg,/ellenőrizd a tulajdonosprofilt és a Dropbox-kapcsolatot/);
 assert.match(reg,/A webes kliens nem helyettesíti az Android-eszközjelentést/);
 assert.doesNotMatch(reg,/Ehhez a profilhoz nincs regisztrált Android-készülék/);
 assert.match(reg,/activePhones\[d.activeProfile\]===d.deviceId/);
 assert.match(reg,/await api\(\)\.uploadJson\(backup,/);
 assert.match(reg,/await api\(\)\.uploadJson\(PATH,next\)/);
 assert.doesNotMatch(reg,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
});

test('Android and web device records remain explicitly differentiated',()=>{
 assert.match(native,/\.put\("deviceType", "android"\)/);
 assert.match(native,/\.put\("buildCode", BuildConfig.VERSION_CODE\)/);
 assert.match(native,/\.put\("lastSeenAt", java\.time\.Instant\.now\(\)\.toString\(\)\)/);
 assert.match(orch,/deviceType==='android'/);
 assert.match(reg,/d\.deviceType==='android'/);
 assert.match(reg,/v401 biztonság|v401: reversible/);
});

test('no background GPS or OTA install triggered by visual-only repair',()=>{
 assert.doesNotMatch(css,/gps|foregroundService|ACCESS_FINE_LOCATION/);
 assert.doesNotMatch(reg,/ACTION_INSTALL|ACTION_START|\.installPackage\(/);
 assert.doesNotMatch(orch,/\.installPackage\(|ACTION_INSTALL/);
});
