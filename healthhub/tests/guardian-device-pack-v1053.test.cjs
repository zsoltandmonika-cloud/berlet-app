'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('guardian/guardian-device-pack-preview-v1053.js');
const css=read('guardian/guardian-device-pack-preview-v1053.css');
const html=read('guardian/index.html');
const ota=read('guardian/guardian-ota-assistant-v1042.js');
const older=read('guardian/guardian-live-trio-v845.js');
const battery=read('guardian/guardian-profile-battery-v841.js');
const w={document:{readyState:'loading',addEventListener(){}},navigator:{onLine:true}};
vm.runInNewContext(source,{window:w,document:w.document,Date,Number,String,Math,console});
const api=w.HH_GUARDIAN_DEVICE_PACK_V1053,now=Date.parse('2026-10-31T08:00:00.000Z');
const sample=(p='zsolt',age=40000,transport='wifi',internetValidated=true)=>({
 profile:p,lastSeenAt:new Date(now-age).toISOString(),verifiedAt:new Date(now-5000).toISOString(),
 networkStatus:{transport,internetValidated}
});
function values(r,ota='current',profile='zsolt',online=true){return api.derive(profile,r,ota,online,now)}

test('v1053 is strictly opt-in; production v1052 has no layout modification',()=>{
 assert.match(html,/get\("devicePack"\)==="v1053"/);
 assert.match(source,/hhDevicePackPreview!=='on'/);
 assert.match(css,/html\[data-hh-device-pack-preview="on"\]/);
 assert.doesNotMatch(css,/#guardianMap|\.map-card|maplibregl|sh9GlobalNavV24|sh9TransitNavV927/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
 assert.match(html,/guardian-map-dock-fill-v828\.js\?v=1050-sh9-visible-dock-viewport/);
});

test('single plate is 4x2, keeps original Battery GPS Health IDs and adds five signals',()=>{
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 for(const id of ['guardianTrioV845','guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(source,/IDS=\['ota','wifi','mobile','bluetooth','cloud'\]/);
 assert.match(source,/container.appendChild\(button\)/);
 assert.match(source,/guardianDevicePackDialogV1053/);
 assert.match(older,/const root=d\.getElementById\('guardianTrioV845'\)/);
 assert.match(battery,/const badge=d\?\.getElementById\('guardianBatteryV841'\)/);
});

test('fresh verified phone WiFi is green; inactive mobile and missing Bluetooth are gray',()=>{
 const v=values(sample());
 assert.equal(v.wifi.color,'green');
 assert.equal(v.mobile.color,'gray');
 assert.equal(v.bluetooth.color,'gray');
 assert.equal(v.cloud.color,'green');
 assert.equal(v.ota.color,'green');
 assert.match(v.cloud.details,/Supabase külön nem igazolt/);
});

test('mobile transport is green only with internet validation; no invented 4G 5G',()=>{
 const good=values(sample('monika',20000,'mobile',true),'current','monika');
 assert.equal(good.mobile.color,'green');assert.equal(good.wifi.color,'gray');
 assert.match(good.mobile.details,/3G\/4G\/5G/);
 const bad=values(sample('monika',1000,'mobile',false),'current','monika');
 assert.equal(bad.mobile.color,'amber');
});

test('stale/wrong-owner/absent evidence cannot light up network/OTA/cloud green',()=>{
 for(const snap of [sample('zsolt',TTLPLUS()),sample('monika',10000),null]){
  const v=values(snap,'current','zsolt');
  for(const id of ['ota','wifi','mobile','bluetooth','cloud'])
   assert.notEqual(v[id].color,'green',id+' must not claim current success');
 }
 function TTLPLUS(){return 21*60*1000}
 assert.equal(values(sample('zsolt'), 'update').ota.color,'amber');
 assert.equal(values(sample('zsolt'),'unknown').ota.color,'gray');
});

test('pure client UI consumes native OTA report, no new API or Android permissions',()=>{
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|watchPosition|geolocation|navigator\.bluetooth|navigator\.connection|new WebSocket|supabase\.from|uploadJson|downloadJson|localStorage\.setItem/);
 assert.match(ota,/hh-guardian-device-evidence-v1053/);
 assert.match(ota,/hhDevicePackPreview==='on'/);
 assert.match(ota,/networkStatus:\{transport:transport,/);
 assert.doesNotMatch(source,/healthhubconnect:\/\/settings\?ota=install/);
});
