'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/sh9-ota-indicator-v1043.js');
const css=read('sh9/sh9-ota-indicator-v1043.css');
const home=read('sh9/index.html');
const native=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const ota=JSON.parse(read('healthhub/data/bridge-ota.json'));
function makeRelease(version,versionCode,rolloutProfiles=['zsolt','monika']){
 return {...ota,version,versionCode,rolloutProfiles,downloadUrl:
  'https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v'+
  version+'/HealthHub-Connect-v'+version+'-ota.apk'};
}
function run({build=37,health='ok',owner='monika',seenAt=Date.now(),release=ota,error=false,nativeLaunch=true}={}){
 const led={textContent:''};
 const handler={};
 const el={dataset:{state:'unknown'},title:'',href:'',
   setAttribute(name,value){this[name]=value;},querySelector(){return led},
   addEventListener(type,callback){handler['indicator:'+type]=callback},focus(){}};
 const manual={hidden:true};
 const manualClose={addEventListener(type,callback){handler['close:'+type]=callback}};
 const manualStatus={textContent:''};
 const manualSettings={href:''};
 const manualApk={href:'#',hidden:true};
 const detail={textContent:''};
 const events={};
 const session={};
 const timers=[];
 const w={
  location:{search:nativeLaunch?'?sh9native=1&hhBuildCode='+build+'&hhOwner='+owner+'&hhServiceHealth='+health+'&hhServiceSeenAt='+seenAt:''},
  sessionStorage:{getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v}},
  fetch:async()=>{if(error)throw Error('offline');return {ok:true,json:async()=>release}},
  setTimeout:(fn,ms)=>timers.push({fn,ms}),
  addEventListener:(type,fn)=>events[type]=fn
 };
 const elements={sh9OtaIndicatorV1043:el,sh9OtaStateV1043:detail,sh9OtaManualV1044:manual,
  sh9OtaManualCloseV1044:manualClose,sh9OtaManualStatusV1044:manualStatus,
  sh9OtaManualSettingsV1044:manualSettings,sh9OtaManualApkV1044:manualApk};
 const d={getElementById:id=>elements[id]||null,addEventListener:(type,fn)=>events[type]=fn,hidden:false};
 vm.runInNewContext(js,{window:w,document:d,URLSearchParams,Date,Number,JSON,Math,Error,Array,Set});
 return new Promise(resolve=>setImmediate(()=>resolve({el,detail,led,events,handler,manual,manualStatus,manualSettings,manualApk,timers,document:d})));
}
test('official SH9 layout retains 9 real modules and top-right compact lamp',()=>{
 assert.equal((home.match(/class="tile"/g)||[]).length,9);
 assert.match(home,/id="sh9OtaIndicatorV1043"/);
 assert.match(home,/sh9-ota-indicator-v1043\.css/);
 assert.match(home,/sh9-ota-indicator-v1043\.js/);
 assert.match(css,/position:absolute;top:/);
 assert.match(css,/right:9px/);
 assert.match(css,/min-height:44px;min-width:44px/);
 assert.match(css,/data-state="ok"/);
 assert.match(css,/data-state="update"/);
 assert.match(css,/data-state="warning"/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(home,/id="sh9OtaManualV1044"/);
 assert.match(home,/id="sh9OtaManualApkV1044"/);
 assert.match(css,/min-height:44px;min-width:44px/);
 assert.match(css,/position:fixed;z-index:101/);
});
test('genuine native startup passes a short-lived status, not GPS history or secrets',()=>{
 assert.match(native,/appendQueryParameter\("hhServiceHealth", nativeHealth\)/);
 assert.match(native,/appendQueryParameter\("hhServiceSeenAt", current\.toString\(\)\)/);
 assert.match(native,/FamilyGuardContinuity\.enabled\(this\)/);
 assert.match(native,/FamilyGuardNativeRelay\.enabled\(this\)/);
 assert.match(native,/Sh9GpsService\.active/);
 assert.match(native,/KEY_LAST_UPLOAD/);
 assert.doesNotMatch(native,/appendQueryParameter\("(?:latitude|longitude|gpsToken|healthRecord|accessToken)"/);
});
test('green only if signed-release baseline is installed and verified native health is fresh',async()=>{
 const release=makeRelease('0.15.10',37);
 const {el,detail}=await run({build:37,health:'ok',release});
 assert.equal(el.dataset.state,'ok');
 assert.match(detail.textContent,/indításkor rendben/);
});
test('amber pulse only if newer signed OTA is approved for the actual owner',async()=>{
 const release=makeRelease('0.15.11',38);
 const {el,detail}=await run({build:37,health:'ok',release});
 assert.equal(el.dataset.state,'update');
 assert.match(detail.textContent,/FRISSÍTÉS ELÉRHETŐ/);
 assert.match(el.href,/healthhubconnect:\/\/settings/);
 assert.doesNotMatch(el.href,/\.apk$/);
});
test('red if current owner phone reported real service failure, even if OTA cannot be checked',async()=>{
 const release=makeRelease('0.15.10',37);
 const a=await run({build:37,health:'warning',release});
 assert.equal(a.el.dataset.state,'warning');
 const b=await run({build:37,health:'warning',error:true});
 assert.equal(b.el.dataset.state,'warning');
});
test('no false green on browser, stale native boot snapshot, or unspecified service health',async()=>{
 const release=makeRelease('0.15.10',37);
 assert.equal((await run({nativeLaunch:false,release})).el.dataset.state,'release');
 assert.equal((await run({health:'unknown',release})).el.dataset.state,'unknown');
 assert.equal((await run({seenAt:Date.now()-11*60000,release})).el.dataset.state,'unknown');
});
test('signed update channel only; never downloads or installs automatically',()=>{
 assert.match(js,/healthhub\.connect\.ota\/1/);
 assert.match(js,/m\.rolloutProfiles\.includes\(owner\)/);
 assert.match(js,/m\.downloadUrl===link/);
 assert.doesNotMatch(js,/openSystemInstaller|fetch\(.+\.apk|eval\(|navigator\.geolocation/);
});

test('one tap tries installer directly; manual is visible only on failed handler, and verified owner APK',async()=>{
 const release=makeRelease('0.15.11',38);
 const view=await run({build:37,health:'ok',owner:'monika',release});
 assert.equal(view.manual.hidden,true);
 assert.equal(view.manualApk.hidden,true);
 view.handler['indicator:click']();
 assert.equal(view.manual.hidden,true,'tap MUST NOT show manual menu before the app handoff');
 assert.ok(view.timers.some(t=>t.ms===1800));
 view.timers.find(t=>t.ms===1800).fn();
 assert.equal(view.manual.hidden,false);
 assert.equal(view.manualApk.hidden,false);
 assert.equal(view.manualApk.href,release.downloadUrl);
 assert.match(view.manualStatus.textContent,/kézi letöltés/);
 view.handler['close:click']();
 assert.equal(view.manual.hidden,true);
 const excluded=await run({build:37,health:'ok',owner:'monika',
  release:{...release,rolloutProfiles:['zsolt']}});
 excluded.handler['indicator:click']();
 assert.equal(excluded.manualApk.hidden,true);
 const malformed=await run({build:37,health:'ok',release:{...release,downloadUrl:'https://example.com/fake.apk'}});
 malformed.handler['indicator:click']();
 assert.equal(malformed.manualApk.hidden,true);
 const stale=await run({build:38,health:'ok',release});
 stale.handler['indicator:click']();
 assert.equal(stale.manualApk.hidden,true);
});

test('v0.15.11+ opens direct native installer in one tap, background navigation hides fallback',async()=>{
 const release=makeRelease('0.15.12',39);
 const view=await run({build:38,health:'ok',owner:'zsolt',release});
 assert.equal(view.el.href,'healthhubconnect://settings?ota=install');
 view.handler['indicator:click']();
 view.document.hidden=true;
 view.timers.find(t=>t.ms===1800).fn();
 assert.equal(view.manual.hidden,true,'do not show manual menu after native navigation succeeds');
});

test('manual OTA failover is ONE native check tap on v0.15.11+, legacy versions stay safe',async()=>{
 const upToDate=makeRelease('0.15.11',38);
 const current=await run({build:38,health:'ok',release:upToDate});
 assert.equal(current.el.dataset.state,'ok');
 assert.equal(current.el.href,'healthhubconnect://settings?ota=check');
 const red=await run({build:38,health:'warning',release:upToDate});
 assert.equal(red.el.dataset.state,'warning');
 assert.equal(red.el.href,'healthhubconnect://settings?ota=check');
 const offline=await run({build:38,health:'unknown',error:true});
 assert.equal(offline.el.dataset.state,'unknown');
 assert.equal(offline.el.href,'healthhubconnect://settings?ota=check');
 const old=await run({build:37,health:'ok',release:makeRelease('0.15.10',37)});
 assert.equal(old.el.href,'healthhubconnect://settings');
 const untrusted=await run({nativeLaunch:false,release:upToDate});
 assert.equal(untrusted.el.href,'healthhubconnect://settings');
 assert.match(native,/u.getQueryParameter\("ota"\) == "check"/);
});

test('legacy build37 without native build metadata stays unknown, but click offers safe native installer fallback',async()=>{
 const view=await run({nativeLaunch:false});
 assert.equal(view.el.dataset.state,'release');
 assert.match(view.detail.textContent,/telepített verzió nem igazolt/);
 assert.equal(view.el.href,'healthhubconnect://settings');
 view.handler['indicator:click']();
 assert.equal(view.manual.hidden,false,'Legacy/PWA has immediate safe manual fallback');
 assert.equal(view.manualApk.hidden,false);
 assert.equal(view.manualApk.href,ota.downloadUrl);
 assert.equal(view.manualSettings.href,'healthhubconnect://settings');
 assert.match(view.manualSettings.textContent,/natív frissítő/);
});
test('validated build38 eligible for v0.15.12 uses one-tap installer and never fake APK link on offline errors',async()=>{
 const valid=await run({build:38,owner:'monika',release:makeRelease('0.15.12',39)});
 assert.equal(valid.el.dataset.state,'update');
 assert.equal(valid.el.href,'healthhubconnect://settings?ota=install');
 const bad=await run({build:38,error:true});
 assert.equal(bad.el.dataset.state,'unknown');
 bad.handler['indicator:click']();
 bad.timers.find(t=>t.ms===1800).fn();
 assert.equal(bad.manual.hidden,false);
 assert.equal(bad.manualApk.hidden,true);
 assert.equal(bad.manualSettings.href,'healthhubconnect://settings?ota=check');
});
test('foreground OTA checks use bounded five-minute cooldown, not six-hour delay or background polling',()=>{
 assert.match(js,/const REFRESH_MS=5\*60\*1000/);
 assert.match(js,/Date\.now\(\)-last<REFRESH_MS/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/pageshow/);
 assert.doesNotMatch(js,/setInterval\(/);
 assert.match(home,/sh9-ota-indicator-v1043\.js\?v=1062-legacy-release/);
});

test('both Zsolt and Mónika browser/PWA startpages show release without inventing installed build',async()=>{
 for(const owner of ['zsolt','monika']){
  const view=await run({owner,nativeLaunch:false,release:makeRelease('0.15.12',39)});
  assert.equal(view.el.dataset.state,'release');
  assert.match(view.detail.textContent,/build 39/);
  assert.equal(view.led.textContent,'OTA');
  view.handler['indicator:click']({preventDefault(){}});
  assert.equal(view.manual.hidden,false);
  assert.equal(view.manualApk.hidden,false);
  assert.equal(view.manualApk.href,ota.downloadUrl);
  assert.equal(view.manualSettings.href,'healthhubconnect://settings');
  assert.match(view.manualStatus.textContent,/telepített buildszáma/);
 }
});
test('browser/PWA cannot offer APK when family is not eligible or manifest URL is invalid',async()=>{
 for(const release of [
  {...makeRelease('0.15.12',39),rolloutProfiles:['zsolt']},
  {...makeRelease('0.15.12',39),downloadUrl:'https://attacker.invalid/release.apk'}
 ]){
  const view=await run({nativeLaunch:false,release});
  assert.equal(view.el.dataset.state,'unknown');
  view.handler['indicator:click']({preventDefault(){}});
  assert.equal(view.manual.hidden,false);
  assert.equal(view.manualApk.hidden,true);
 }
});
test('neutral published release is blue and both JS/CSS are fresh after deployment',()=>{
 assert.match(css,/data-state="release"/);
 assert.match(home,/sh9-ota-indicator-v1043\.css\?v=1062-legacy-release/);
 assert.match(home,/sh9-ota-indicator-v1043\.js\?v=1062-legacy-release/);
});
