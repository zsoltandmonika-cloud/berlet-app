'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const browser=read('sh9/sh9-ota-browser-v1067.js'),native=read('sh9/sh9-ota-indicator-v1043.js'),html=read('sh9/index.html');
const release=JSON.parse(read('healthhub/data/bridge-ota.json'));
const expectedId='android-01234567-1234-1234-1234-123456789abc';
function scene({profile='z',build=40,age=10000,registryValid=true,deviceValid=true,dropbox=true,releaseOverride=null,offline=false,nativeLaunch=false}={}){
 const now=Date.now(),calls=[],timers=[],handlers={},store=new Map();
 if(profile)store.set('hh-profile',profile);
 if(dropbox)store.set('hh-dropbox-token-v2',JSON.stringify({refresh_token:'a'.repeat(25),access_token:'private-access-token',expires_at:now+3600000}));
 const elements={};
 function make(id){
  const e={id,hidden:false,textContent:'',value:'',disabled:false,dataset:{state:'unknown'},href:'',title:'',
   setAttribute(k,v){this[k]=v},addEventListener(k,fn){handlers[id+':'+k]=fn},
   querySelector(){return elements.label},focus(){}};
  elements[id]=e;return e;
 }
 const ids=['sh9OtaIndicatorV1043','sh9OtaStateV1043','sh9OtaManualV1044','sh9OtaManualCloseV1044',
 'sh9OtaManualStatusV1044','sh9OtaManualSettingsV1044','sh9OtaManualApkV1044',
 'sh9OtaDeviceSelectV1067','sh9OtaRefreshV1067','sh9OtaConnectVaultV1067'];
 ids.forEach(make);elements.label={textContent:''};elements.sh9OtaManualV1044.hidden=true;
 elements.sh9OtaManualApkV1044.hidden=true;elements.sh9OtaConnectVaultV1067.hidden=true;
 const events={};
 const d={hidden:false,getElementById:id=>elements[id]||null,addEventListener:(n,fn)=>events[n]=fn};
 const w={location:{search:nativeLaunch?'?sh9native=1&hhBuildCode=40&hhOwner=zsolt':''},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 setTimeout:(fn,ms)=>timers.push({fn,ms}),addEventListener:(n,fn)=>events[n]=fn,
 fetch:async(url,options={})=>{
  calls.push({url,options});
  if(offline)throw Error('offline');
  if(url.includes('bridge-ota.json'))return {ok:true,json:async()=>releaseOverride||release};
  if(url==='https://content.dropboxapi.com/2/files/download'){
   const p=JSON.parse(options.headers['Dropbox-API-Arg']).path;
   if(p.endsWith('device-registry-v401.json'))return {ok:true,json:async()=>({
    schema:registryValid?'healthhub.device_registry/1':'wrong',activePhones:{zsolt:expectedId,monika:expectedId},
    archived:[]})};
   if(p.endsWith('/'+expectedId+'.json'))return {ok:true,json:async()=>({
    schema:deviceValid?'healthhub.orchestrator.device/1':'wrong',deviceType:'android',
    deviceId:expectedId,activeProfile:profile==='m'?'monika':'zsolt',
    buildCode:build,lastSeenAt:new Date(now-age).toISOString()})};
   throw Error('Untrusted path '+p);
  }
  throw Error('Unexpected fetch: '+url);
 }};
 vm.runInNewContext(browser,{window:w,document:d,URL,URLSearchParams,Date,Number,JSON,Math,Error,Array,Set});
 return {w,d,store,elements,handlers,events,calls,timers,async settle(){
  for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
 }};
}
test('Chrome/Edge exactly one registered phone is selected without claiming local identity',async()=>{
 const s=scene();await s.settle();
 assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'ok');
 assert.match(s.elements.sh9OtaStateV1043.textContent,/Zsolt telefonja NAPRAKÉSZ/);
 assert.match(s.elements.sh9OtaStateV1043.textContent,/build 40/);
 assert.equal(s.calls.filter(x=>x.url.includes('/2/files/download')).length,2);
 assert.equal(s.elements.sh9OtaIndicatorV1043.href,'healthhubconnect://settings?ota=check');
 assert.equal(s.timers.filter(x=>x.ms===1800).length,0);
 assert.match(html,/Figyelt családi telefon/);
 assert.match(browser,/nem bizonyítja, hogy a böngésző azon a készüléken fut/);
});
test('amber only with verified fresh old installed version, matching owner and approved signed release',async()=>{
 const s=scene({build:39});await s.settle();
 assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'update');
 assert.equal(s.elements.sh9OtaIndicatorV1043.href,'healthhubconnect://settings?ota=install');
 assert.match(s.elements.sh9OtaStateV1043.textContent,/39 → 40/);
 s.handlers['sh9OtaIndicatorV1043:click']({preventDefault(){throw Error('must use native link')}});
 s.timers.find(t=>t.ms===1800).fn();
 assert.equal(s.elements.sh9OtaManualV1044.hidden,false);
 assert.equal(s.elements.sh9OtaManualApkV1044.hidden,false);
 assert.equal(s.elements.sh9OtaManualApkV1044.href,release.downloadUrl);
});
test('missing Dropbox, old heartbeat, invalid registry, mismatched device, bad release => never green or amber',async()=>{
 for(const options of [{dropbox:false},{age:21*60000},{registryValid:false},{deviceValid:false},
  {releaseOverride:{...release,downloadUrl:'https://attacker.invalid/apk'}},{offline:true}]){
  const s=scene(options);await s.settle();
  assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'unknown',JSON.stringify(options));
  assert.equal(s.elements.sh9OtaIndicatorV1043.href,'healthhubconnect://settings?ota=check');
  assert.equal(s.elements.sh9OtaManualApkV1044.hidden,true);
 }
});
test('no automatic APK download, installation, GPS, location, polling or new remote write',()=>{
 assert.doesNotMatch(browser,/fetch\(.+\.apk|setInterval\(|watchPosition\(|navigator\.geolocation|files\/upload|\/2\/files\/upload|openSystemInstaller|eval\(/);
 assert.match(browser,/MAX_AGE=20\*60\*1000/);
 assert.match(browser,/COOLDOWN=5\*60\*1000/);
 assert.match(browser,/registry\.archived\.includes\(deviceId\)/);
 assert.match(browser,/record\.activeProfile!==owner/);
 assert.match(browser,/Number\.isInteger\(code\)/);
 assert.match(native,/sh9native'\)!=='1'\)return/);
});
test('a browser with no selected phone remains neutral; one-time chosen phone persists and checks on selection',async()=>{
 const s=scene({profile:''});await s.settle();
 assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'unknown');
 assert.equal(s.calls.filter(x=>x.url.includes('/2/files/download')).length,0);
 s.elements.sh9OtaDeviceSelectV1067.value='zsolt';
 s.handlers['sh9OtaDeviceSelectV1067:change']();
 await s.settle();
 assert.equal(s.store.get('sh9-ota-phone-v1067'),'zsolt');
 assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'ok');
});
test('on external browser the old native WebView indicator does not bind any handlers',()=>{
 const s=scene();
 const el=s.elements.sh9OtaIndicatorV1043;
 const d=s.d,w=s.w;
 const before=s.calls.length;
 vm.runInNewContext(native,{window:w,document:d,URLSearchParams,Date,Number,JSON,Math,Error,Array,Set});
 assert.equal(s.calls.length,before);
 assert.ok(s.handlers['sh9OtaIndicatorV1043:click']);
});
test('native browser is handled by existing OTA path, not the new Chrome verifier',async()=>{
 const s=scene({nativeLaunch:true});await s.settle();
 assert.equal(s.calls.length,0);
 assert.equal(s.elements.sh9OtaIndicatorV1043.dataset.state,'unknown');
});
