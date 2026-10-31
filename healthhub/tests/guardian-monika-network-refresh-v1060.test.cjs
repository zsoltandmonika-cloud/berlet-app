'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ota=read('guardian/guardian-ota-assistant-v1042.js');
const pack=read('guardian/guardian-device-pack-preview-v1053.js');
const html=read('guardian/index.html');
const w={document:{readyState:'loading',addEventListener(){}},navigator:{onLine:true}};
vm.runInNewContext(pack,{window:w,document:w.document,Date,Number,String,Math,console});
const now=Date.now(),api=w.HH_GUARDIAN_DEVICE_PACK_V1053;
function phone(code,transport,age=8000){
 return {profile:'monika',buildCode:code,lastSeenAt:new Date(now-age).toISOString(),
  verifiedAt:new Date(now-5000).toISOString(),networkStatus:{transport,internetValidated:true}};
}
test('legacy Mónika phone explains missing Wi-Fi/mobile evidence instead of falsely showing disabled radio',()=>{
 const states=api.derive('monika',phone(37,'unknown'),'unknown',true,now);
 for(const kind of ['wifi','mobile']){
  assert.equal(states[kind].color,'gray');
  assert.match(states[kind].details,/build 37/);
  assert.match(states[kind].details,/0\.15\.11/);
 }
 const old=api.derive('monika',phone(37,'unknown',22*60000),'unknown',true,now);
 assert.equal(old.wifi.color,'gray');
 assert.match(old.wifi.details,/build 37/);
});
test('new HH One can show real Wi-Fi when verified, but missing network never claims WIFI OFF',()=>{
 assert.equal(api.derive('monika',phone(39,'wifi'),'unknown',true,now).wifi.color,'green');
 const missing=api.derive('monika',phone(39,'unknown'),'unknown',true,now);
 assert.equal(missing.wifi.color,'gray');
 assert.match(missing.wifi.details,/nem szerepel használható/);
});
test('profile switch while Zsolt report in flight still fetches and emits Mónika report once',async()=>{
 const events=[],handles={},elements={};
 function el(id){return elements[id]||=({hidden:false,disabled:false,href:'',
  addEventListener(type,cb){this[type]=cb},setAttribute(){},textContent:''});}
 const d={documentElement:{dataset:{hhDevicePackPreview:'on'}},
  getElementById:el,addEventListener(){}};
 let profile='z',resolveZ=null,readZ=0,readM=0;
 const registry={schema:'healthhub.device_registry/1',archived:[],
  activePhones:{zsolt:'android-z',monika:'android-m'}};
 const native=(p,code,transport)=>({
  schema:'healthhub.orchestrator.device/1',deviceType:'android',deviceId:'android-'+(p==='monika'?'m':'z'),
  activeProfile:p,buildCode:code,lastSeenAt:new Date().toISOString(),
  networkStatus:{transport,internetValidated:true},bluetoothEnabled:p==='monika'
 });
 const w={
  document:d,CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},
  dispatchEvent(e){events.push(e)},addEventListener(type,cb){handles[type]=cb},
  setTimeout(){},localStorage:{getItem(k){return k==='hh-profile'?profile:null}},
  HH_GUARDIAN_LIVE_V785:{familyAuthorized:true},
  HH_DROPBOX_VAULT:{connected(){return true},async downloadJson(file){
   if(file.includes('device-registry'))return registry;
   if(file.endsWith('android-z.json')){readZ++;return await new Promise(resolve=>{resolveZ=resolve})}
   if(file.endsWith('android-m.json')){readM++;return native('monika',39,'wifi')}
   throw Error('Unexpected download: '+file);
  }},
  async fetch(){return {ok:true,async json(){return {
   schema:'healthhub.connect.ota/1',channel:'signed-release',
   applicationId:'hu.zsoltmonika.healthhubbridge',version:'0.15.12',versionCode:39,
   rolloutProfiles:['zsolt'],sha256:'a'.repeat(64),
   downloadUrl:'https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v0.15.12/HealthHub-Connect-v0.15.12-ota.apk'
  }}}}
 };
 vm.runInNewContext(ota,{window:w,document:d,Date,Number,String,JSON,URLSearchParams,console});
 el('guardianOtaCheckV1042').click();
 await new Promise(setImmediate);
 assert.equal(typeof resolveZ,'function');
 profile='m';
 handles['hh-guardian-auth-changed']();
 resolveZ(native('zsolt',39,'mobile'));
 await new Promise(setImmediate);
 await new Promise(setImmediate);
 assert.equal(readZ,1);
 assert.equal(readM,1);
 assert.equal(events.filter(e=>e.type==='hh-guardian-device-evidence-v1053'&&e.detail.profile==='monika').length,1);
 assert.equal(events.find(e=>e.detail.profile==='monika').detail.networkStatus.transport,'wifi');
 assert.equal(events.find(e=>e.detail.profile==='monika').detail.buildCode,39);
 assert.match(el('guardianOtaStatusV1042').textContent,/Mónika: telefonállapot lekérdezve/);
});
test('production asset versions load the network fix and no extra background polling is introduced',()=>{
 assert.match(html,/guardian-ota-assistant-v1042\.js\?v=1060-monika-network-refresh/);
 assert.match(html,/guardian-device-pack-preview-v1053\.js\?v=1060-verified-network-detail/);
 assert.match(ota,/pendingRefresh/);
 assert.match(ota,/activeProfile/);
 assert.doesNotMatch(ota,/setInterval\(/);
 assert.doesNotMatch(pack,/fetch\(|XMLHttpRequest/);
});
