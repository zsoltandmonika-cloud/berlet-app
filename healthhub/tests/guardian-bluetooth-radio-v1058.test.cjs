'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const js=read('guardian/guardian-device-pack-preview-v1053.js');
const css=read('guardian/guardian-device-pack-preview-v1053.css');
const html=read('guardian/index.html');
const ota=read('guardian/guardian-ota-assistant-v1042.js');
const native=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OneRemoteAdmin.kt');
const worker=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const manifest=read('android-bridge/app/src/main/AndroidManifest.xml');
const activity=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');

const w={document:{readyState:'loading',addEventListener(){}},navigator:{onLine:true}};
vm.runInNewContext(js,{window:w,document:w.document,Date,Number,String,Math,console});
const api=w.HH_GUARDIAN_DEVICE_PACK_V1053;
const now=Date.parse('2026-10-31T09:00:00.000Z');
const phone=(enabled,profile='zsolt',age=10000)=>({
 profile,lastSeenAt:new Date(now-age).toISOString(),
 verifiedAt:new Date(now-age).toISOString(),
 networkStatus:{transport:'wifi',internetValidated:true},
 bluetoothEnabled:enabled
});
const state=(r,p='zsolt')=>api.derive(p,r,'current',true,now).bluetooth;

test('Bluetooth ON alone produces deep blue, without implying a paired connection',()=>{
 assert.equal(state(phone(true)).color,'blue');
 assert.match(state(phone(true)).details,/Bluetooth BE/);
 assert.match(state(phone(true)).details,/nem bizonyítja/);
 assert.equal(state(phone(false)).color,'gray');
 assert.match(state(phone(false)).details,/Bluetooth KI/);
 assert.equal(state(phone(null)).color,'gray');
 assert.equal(state(phone(undefined)).color,'gray');
});
test('stale, cross-profile or unverified Bluetooth can never show blue',()=>{
 assert.equal(state(null).color,'gray');
 assert.equal(state(phone(true,'monika')).color,'gray');
 assert.equal(state(phone(true,'zsolt',21*60*1000)).color,'gray');
 assert.equal(state({...phone(true),verifiedAt:'invalid'}).color,'gray');
});
test('UI uses the original deep-blue Bluetooth color, but keeps approved brand image',()=>{
 assert.match(css,/data-signal="blue"\] svg/);
 assert.match(css,/#15539a/);
 assert.match(html,/guardian-device-pack-preview-v1053\.css\?v=1060-verified-network-detail/);
 assert.match(html,/guardian-ota-assistant-v1042\.js\?v=1060-monika-network-refresh/);
 assert.match(read('guardian/guardian-device-pack-live-v1056.js'),/sh9-family-guard-logo-v1057\.webp/);
});
test('Native on/off from permission-gated HH One heartbeat; no scan or pairing',()=>{
 assert.match(manifest,/android\.permission\.BLUETOOTH_CONNECT/);
 assert.match(manifest,/android\.permission\.BLUETOOTH" android:maxSdkVersion="30"/);
 assert.match(native,/context\.checkSelfPermission\(Manifest\.permission\.BLUETOOTH_CONNECT\)/);
 assert.match(native,/\.adapter\?\.isEnabled/);
 assert.match(worker,/\.put\("bluetoothEnabled", OneRemoteAdmin\.bluetoothEnabled\(applicationContext\)\)/);
 assert.match(activity,/bluetoothPermissionLauncher\.launch\(Manifest\.permission\.BLUETOOTH_CONNECT\)/);
 assert.match(ota,/bluetoothEnabled:typeof device\.bluetoothEnabled==='boolean'\?device\.bluetoothEnabled:null/);
 assert.doesNotMatch(native,/startDiscovery|bondedDevices|createBond|enable\(\)|disable\(\)/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|navigator\.bluetooth|watchPosition|supabase/);
});
