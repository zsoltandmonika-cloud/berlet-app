'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const rag=read('hh-one-rag-v500.js');
const reg=read('device-registry-v401.js');
const router=require('../hh-one-repair-routing-v503.js');
const css=read('hh-admin-device-contrast-v749.css');
const home=read('index.html'),digital=read('digital-health/index.html');

function classifier(){
 const window={location:{href:'https://example.org/healthhub'},setTimeout:()=>{},addEventListener:()=>{}};
 const document={readyState:'loading',addEventListener:()=>{}};
 vm.runInNewContext(rag,{window,document,Date,console});
 return window.HH_ONE_RAG_V500.classify;
}
const when=mins=>new Date(Date.now()-mins*60000).toISOString();
const reg0={schema:'healthhub.device_registry/1',
 activePhones:{zsolt:'android-z-current',monika:'android-m-old'},archived:[]};
const phone=(deviceId,owner,mins,version)=>({
 deviceId,deviceType:'android',activeProfile:owner,lastSeenAt:when(mins),
 build:version,status:{state:'done',updatedAt:when(mins)}
});
test('HH ONE names the exact stale selected owner even when unselected Android is recent',()=>{
 const classify=classifier();
 const z=phone('android-z-current','zsolt',8,'0.15.0');
 const m=phone('android-m-old','monika',13*24*60,'0.12.0');
 const candidate=phone('android-m-new','monika',2,'0.14.6');
 const current=classify(reg0,[z,m,candidate],true);
 assert.equal(current.color,'amber');
 assert.match(current.message,/Mónika.*kijelölt.*nem friss.*új bejegyzés ellenőrizendő/);
 assert.equal(current.primary[0].deviceId,z.deviceId);
 assert.equal(current.primary[1].deviceId,m.deviceId);
 // A newer report must NEVER silently replace the explicitly selected deviceId.
 assert.notEqual(current.primary[1].deviceId,candidate.deviceId);
 const selectedNew={...reg0,activePhones:{zsolt:z.deviceId,monika:candidate.deviceId}};
 const corrected=classify(selectedNew,[z,m,candidate],true);
 assert.equal(corrected.color,'green');
 assert.match(corrected.message,/Mindkét kijelölt telefon frissen jelentkezett/);
 const oldDone=classify(reg0,[z,m],true);
 assert.notEqual(oldDone.color,'green');
 assert.match(oldDone.message,/Mónika/);
});
test('registry visually separates stale selected, new unselected, archived history',()=>{
 for(const needle of ['hhRegStale504','hhRegCandidate504','hhRegAlert504','hhRegOld504','hhRegSuggestion504'])
  assert.ok(reg.includes(needle),'missing '+needle);
 assert.match(reg,/Friss, de NEM kijelölt telefon/);
 assert.match(reg,/KORÁBBI REGISZTRÁCIÓ/);
 assert.match(reg,/a kijelölt telefon nem jelentkezik frissen/);
 assert.match(reg,/sort\(function\(a,b\)\{return Date\.parse\(b\.lastSeenAt/);
 assert.match(reg,/registry&&Array\.isArray\(registry\.archived\)/);
 assert.match(reg,/Csak friss Android-jelentésű telefon jelölhető ki/);
 assert.match(reg,/profil MOST HASZNÁLT fizikai telefonja/);
 assert.match(reg,/await api\(\)\.uploadJson\(backup,/);
 assert.match(reg,/await api\(\)\.uploadJson\(PATH,next\)/);
 assert.doesNotMatch(reg,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
});
test('a candidate repair navigates to the existing registry and cannot auto-select',()=>{
 assert.equal(router.resolve('OPS-CANDIDATE-zsolt')?.target,'hhDeviceRegistry401');
 assert.equal(router.resolve('OPS-CANDIDATE-monika')?.target,'hhDeviceRegistry401');
 assert.equal(router.resolve('OPS-CANDIDATE-other'),null);
 assert.match(rag,/issueCard\(line,'OPS-CANDIDATE-'\+p/);
 assert.match(rag,/frissebb Android-bejegyzés ellenőrizhető/);
 assert.match(rag,/Ez a KIJELÖLT telefon több mint 20 perce nem jelentkezett/);
 assert.match(reg,/if\(!confirm\(/);
 assert.doesNotMatch(router.resolve('OPS-CANDIDATE-monika').label,/automatikus|mentve|javítva/i);
});
test('Premium Glass correction is scoped to the Admin and deployed with cache busts',()=>{
 assert.match(css,/\.hhRegCandidate504/);
 assert.match(css,/\.hhRegStale504/);
 assert.match(css,/\.hhRegOld504/);
 assert.match(css,/html\[data-hh-inline-admin="yes"\]/);
 assert.match(home,/hh-one-rag-v500\.js\?v=504-glass-top-left&repair=503&device=504/);
 assert.match(home,/device-registry-v401\.js\?v=401-reversible-housekeeping&admin=748&ui=749&device=504/);
 assert.match(home,/hh-admin-device-contrast-v749\.css\?v=749-contrast&device=504/);
 assert.match(digital,/hh-one-rag-v500\.js\?v=504-glass-top-left&repair=503&device=504/);
});
