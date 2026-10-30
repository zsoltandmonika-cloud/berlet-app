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
function run({build=37,health='ok',owner='monika',seenAt=Date.now(),release=ota,error=false,nativeLaunch=true}={}){
 const led={textContent:''};
 const el={dataset:{state:'unknown'},title:'',href:'',setAttribute(name,value){this[name]=value;},querySelector(){return led}};
 const detail={textContent:''};
 const events={};
 const session={};
 const w={
  location:{search:nativeLaunch?'?sh9native=1&hhBuildCode='+build+'&hhOwner='+owner+'&hhServiceHealth='+health+'&hhServiceSeenAt='+seenAt:''},
  sessionStorage:{getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v}},
  fetch:async()=>{if(error)throw Error('offline');return {ok:true,json:async()=>release}},
  setTimeout:()=>{},
  addEventListener:(type,fn)=>events[type]=fn
 };
 const d={getElementById:id=>id==='sh9OtaIndicatorV1043'?el:id==='sh9OtaStateV1043'?detail:null,
  addEventListener:(type,fn)=>events[type]=fn,hidden:false};
 vm.runInNewContext(js,{window:w,document:d,URLSearchParams,Date,Number,JSON,Math,Error,Array,Set});
 return new Promise(resolve=>setImmediate(()=>resolve({el,detail,led,events})));
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
 const release={...ota,versionCode:37,version:'0.15.10'};
 const {el,detail}=await run({build:37,health:'ok',release});
 assert.equal(el.dataset.state,'ok');
 assert.match(detail.textContent,/indításkor rendben/);
});
test('amber pulse only if newer signed OTA is approved for the actual owner',async()=>{
 const release={...ota,versionCode:38,version:'0.15.11',downloadUrl:
  'https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v0.15.11/HealthHub-Connect-v0.15.11-ota.apk'};
 const {el,detail}=await run({build:37,health:'ok',release});
 assert.equal(el.dataset.state,'update');
 assert.match(detail.textContent,/SYSTEM UPDATE AVAILABLE/);
 assert.match(el.href,/healthhubconnect:\/\/settings/);
 assert.doesNotMatch(el.href,/\.apk$/);
});
test('red if current owner phone reported real service failure, even if OTA cannot be checked',async()=>{
 const release={...ota,versionCode:37};
 const a=await run({build:37,health:'warning',release});
 assert.equal(a.el.dataset.state,'warning');
 const b=await run({build:37,health:'warning',error:true});
 assert.equal(b.el.dataset.state,'warning');
});
test('no false green on browser, stale native boot snapshot, or unspecified service health',async()=>{
 const release={...ota,versionCode:37};
 assert.equal((await run({nativeLaunch:false,release})).el.dataset.state,'unknown');
 assert.equal((await run({health:'unknown',release})).el.dataset.state,'unknown');
 assert.equal((await run({seenAt:Date.now()-11*60000,release})).el.dataset.state,'unknown');
});
test('signed update channel only; never downloads or installs automatically',()=>{
 assert.match(js,/healthhub\.connect\.ota\/1/);
 assert.match(js,/m\.rolloutProfiles\.includes\(owner\)/);
 assert.match(js,/m\.downloadUrl===link/);
 assert.doesNotMatch(js,/openSystemInstaller|fetch\(.+\.apk|eval\(|navigator\.geolocation/);
});
