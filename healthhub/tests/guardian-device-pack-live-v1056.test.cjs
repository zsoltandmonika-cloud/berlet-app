'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-device-pack-live-v1056.css');
const js=read('guardian/guardian-device-pack-live-v1056.js');
const oldJS=read('guardian/guardian-device-pack-preview-v1053.js');
const oldMap=read('guardian/guardian-satellite-v1033.js');

test('default production Family Guard uses v1056; v1052, v1053, v1054, v1055 stay individually addressable',()=>{
 assert.match(html,/const hhPackMode=hhPackPreview\.get\("devicePack"\)/);
 assert.match(html,/hhPackMode===null&&hhPackPreview\.get\("sh9Transit"\)!=="1"/);
 for(const tag of ['v1053','v1054','v1055','v1056']){
  assert.ok(html.includes('get("devicePack")==="'+tag+'"'),tag);
 }
 assert.match(html,/dataset\.hhDevicePackLiveV1056="on"/);
 assert.match(html,/devicePack=v1052/);
 assert.match(html,/guardian-device-pack-live-v1056\.css\?v=1059-softer-premium-transparency/);
 assert.match(html,/guardian-device-pack-live-v1056\.js\?v=1057-original-logo-full-res/);
 assert.match(js,/hhDevicePackLiveV1056!=='on'/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
 assert.match(html,/guardian-map-dock-fill-v828\.js\?v=1050-sh9-visible-dock-viewport/);
});

test('the supplied graphic was actually committed, is a complete transparent WEBP and renders at source size',()=>{
 const source=fs.readFileSync(path.join(root,'assets/sh9-family-guard-logo-v1057.webp'));
 assert.equal(source.toString('ascii',0,4),'RIFF');
 assert.equal(source.toString('ascii',8,12),'WEBP');
 assert.equal(source.readUInt32LE(4)+8,source.length);
 assert.ok(source.length>2000&&source.length<200000);
 assert.match(js,/sh9-family-guard-logo-v1057\.webp/);
 assert.match(js,/logo\.width=640;logo\.height=214/);
 assert.match(css,/object-fit:contain!important/);
 assert.doesNotMatch(js,/fg-shield-v1055|class="fg-brand-big-v1055"/);
});

test('the full card uses 50%-ish premium glass and all 4 status rows without overlap reserves',()=>{
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:25% repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/height:98\.5%!important/);
 assert.match(css,/width:36\.7%!important/);
 assert.match(css,/rgba\\(18,40,87,\\.48\\)/);
 assert.match(css,/rgba\\(77,35,112,\\.52\\)/);
 assert.match(css,/rgba\\(21,36,83,\\.76\\)/);
 assert.match(css,/rgba\\(69,36,95,\\.77\\)/);
 assert.doesNotMatch(css,/rgba\\(18,40,87,\\.56\\)/);
 assert.match(css,/backdrop-filter:blur\(16px\)/);
 assert.match(css,/hh-device-pack-signal-v1053 svg\{\s*width:clamp\(17px,4\.6vw,23px\)/);
 assert.match(css,/min-height:0!important/);
 assert.match(css,/text-overflow:ellipsis!important/);
 assert.match(css,/data-guardian-profile="m"/);
 assert.doesNotMatch(css,/#guardianMap|\.map-card|maplibregl|#sh9GlobalNavV24/);
});

test('there are exactly eight source-backed indicators; no new network reads, GPS or update commands',()=>{
 for(const old of ['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845'])
   assert.ok(html.includes('id="'+old+'"'),old);
 assert.match(oldJS,/IDS=\['ota','wifi','mobile','bluetooth','cloud'\]/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|watchPosition|navigator\.geolocation|navigator\.bluetooth|setInterval\(|supabase|dropbox|location\.href|downloadUrl/);
 assert.match(js,/Object\.freeze\(\{mount\}\)/);
 assert.ok(oldMap.includes('guardianSatelliteV1033'));
});

test('real user logo replaces old generated icon only when v1056 is enabled',()=>{
 function scene(enabled){
  const header={dataset:{},attributes:{},
   removeAttribute(k){delete this.attributes[k]},
   setAttribute(k,v){this.attributes[k]=v},
   appendChild(c){this.child=c}};
  const d={readyState:'complete',
   documentElement:{dataset:enabled?{hhDevicePackLiveV1056:'on'}:{}},
   getElementById(id){return id==='guardianDevicePackLogoV1054'?header:null},
   createElement(){return {setAttribute(k,v){this[k]=v}}}};
  const w={};
  vm.runInNewContext(js,{window:w,document:d});
  return {header,w};
 }
 const off=scene(false);
 assert.equal(off.header.child,undefined);
 const on=scene(true);
 assert.equal(on.header.child.src,'../assets/sh9-family-guard-logo-v1057.webp');
 assert.equal(on.header.child.className,'fg-brand-image-v1056');
 assert.equal(on.header.child.alt,'SH9 Family Guard · Biztonság és monitoring');
 assert.equal(on.header.attributes.role,'img');
 assert.equal(on.w.HH_GUARDIAN_DEVICE_PACK_LIVE_V1056.mount(),true);
 assert.equal(on.header.child.src,'../assets/sh9-family-guard-logo-v1057.webp');
});
