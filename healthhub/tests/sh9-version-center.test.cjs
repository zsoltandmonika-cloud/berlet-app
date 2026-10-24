'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const model=require(path.join(ROOT,'healthhub/sh9-version-model-v1.js'));
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const ui=read('healthhub/sh9-version-center-v1.js');
const admin=read('healthhub/hh-unified-admin-v745.js');
const html=read('healthhub/index.html');
const web=JSON.parse(read('sh9/version.json'));
const ora=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const ota=JSON.parse(read('healthhub/data/bridge-ota.json'));
const reg={schema:'healthhub.device_registry/1',activePhones:{zsolt:'android-z-device',monika:'android-m-device'},archived:[]};
const timestamp='2026-10-24T04:45:00.000Z';
const now=Date.parse('2026-10-24T04:50:00.000Z');
const sample=(id,owner,buildCode,build)=>({
 schema:'healthhub.orchestrator.device/1',deviceId:id,deviceType:'android',name:'Samsung',
 activeProfile:owner,build,buildCode,lastSeenAt:timestamp,otaLastCheckedAt:timestamp,
 capabilities:['health','ota'],otaCandidateVersion:null
});

test('signed releases require a matching URL/checksum and explicit rollout scope',()=>{
 const okay=model.shapeOta(ota);
 assert.ok(okay);
 assert.equal(okay.version,ota.version);
 assert.equal(okay.versionCode,ota.versionCode);
 assert.deepEqual(okay.rolloutProfiles,ota.rolloutProfiles);
 assert.equal(model.shapeOta({...ota,sha256:'f'.repeat(63)}),null);
 assert.equal(model.shapeOta({...ota,downloadUrl:'https://example.com/a.apk'}),null);
 assert.equal(model.shapeOta({...ota,applicationId:'fake.package'}),null);
 assert.equal(model.shapeOta({...ota,channel:'debug'}),null);
});

test('only registered exact-owner physical Android devices count; browser and stale telemetry excluded',()=>{
 const z=sample('android-z-device','zsolt',Math.max(27,ota.versionCode),'0.15.0');
 const m=sample('android-m-device','monika',26,'0.14.6');
 const both={...ota,rolloutProfiles:['zsolt','monika']};
 const view=model.read(reg,[z,m],both,web,now);
 assert.deepEqual(view.devices.map(x=>x.registered),[true,true]);
 assert.equal(view.devices[0].sh9,'unified');
 assert.equal(view.devices[0].ota,'up-to-date');
 assert.equal(view.devices[0].connectivity,'recent');
 assert.equal(view.devices[1].sh9,'legacy-no-integrated-sh9');
 assert.equal(view.devices[1].ota,ota.versionCode>26?'approved-update':'up-to-date');
 assert.equal(view.webRelease.version,'2026.10.24.1');
 const wrong=model.read(reg,[{...z,deviceType:'web'}, {...m,activeProfile:'zsolt'}],both,web,now);
 assert.deepEqual(wrong.devices.map(x=>x.registered),[false,false]);
 const archived=model.read({...reg,archived:['android-z-device']},[z,m],both,web,now);
 assert.equal(archived.devices[0].registered,false);
 const stale=model.read(reg,[{...z,lastSeenAt:'2026-10-23T04:50:00.000Z'},m],both,web,now);
 assert.equal(stale.devices[0].connectivity,'stale');
});

test('only signed published OTA is called available; no fake update for unpublished build 27',()=>{
 const z=sample('android-z-device','zsolt',ota.versionCode-1,'0.14.5');
 const x=model.read(reg,[z],{...ota,rolloutProfiles:['zsolt','monika']},web,now).devices[0];
 assert.equal(x.ota,'approved-update');
 assert.equal(x.approvedVersion,ota.version);
 const blocked=model.read(reg,[z],{...ota,rolloutProfiles:['monika']},web,now).devices[0];
 assert.equal(blocked.ota,'not-in-rollout');
 const invalid=model.read(reg,[z],{...ota,sha256:'invalid'},web,now).devices[0];
 assert.equal(invalid.ota,'unknown');
 const fresh=model.read(reg,[{...z,buildCode:Math.max(27,ota.versionCode),build:ota.version}],ota,web,now).devices[0];
 assert.equal(fresh.ota,'up-to-date');
 assert.equal(fresh.approvedVersion,null);
});

test('no telemetry means UNKNOWN, never device-connected, SH9-installed or GPS-connected',()=>{
 const empty=model.read(reg,[],ota,web,now);
 assert.deepEqual(empty.devices.map(x=>x.registered),[false,false]);
 assert.deepEqual(empty.devices.map(x=>x.sh9),['unknown','unknown']);
 assert.equal(model.shapeWeb({...web,version:'garbage'}),null);
 const missing=model.read(null,[],null,null,now);
 assert.equal(missing.hasRegistry,false);
 assert.equal(missing.release,null);
});

test('existing native heartbeat already reports signed OTA and installed app build data',()=>{
 for(const needle of ['.put("build", BuildConfig.VERSION_NAME)', '.put("buildCode", BuildConfig.VERSION_CODE)',
   '.put("otaCandidateVersion",', '.put("otaLastCheckedAt",', '.put("lastSeenAt",'])
   assert.ok(ora.includes(needle),'Native heartbeat missing '+needle);
});

test('version center is first-party Admin-only and reuses v401 registry, no duplicate database',()=>{
 assert.match(admin,/'hhAskLenaProjectAdminV756','sh9VersionCenterV1'/);
 assert.match(html,/sh9-version-model-v1\.js\?v=1/);
 assert.match(html,/sh9-version-center-v1\.js\?v=1/);
 assert.match(ui,/healthSectionKind!=='more'/);
 assert.match(ui,/\/HealthHub\/orchestrator\/device-registry-v401\.json/);
 assert.match(ui,/hhOrchestratorDevices305/);
 assert.match(ui,/hhOrchestratorDispatchScope355\(owner,id,'ota'\)/);
 assert.match(ui,/w\.confirm\(/);
 assert.match(ui,/NEM telepítés/);
 assert.match(ui,/A külön telepített régi SH9 Lite Browser APK nem jelent verziót/);
 assert.doesNotMatch(ui,/localStorage\.setItem|addJavascriptInterface|accessToken\(/);
});
