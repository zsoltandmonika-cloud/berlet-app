'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=read('guardian/index.html'),
 css=read('guardian/guardian-device-pack-tall-v1054.css'),
 js=read('guardian/guardian-device-pack-tall-v1054.js'),
 previous=read('guardian/guardian-device-pack-preview-v1053.js');

test('v1054 is available only through its own URL switch, v1053 and normal v1052 remain',()=>{
 assert.match(html,/get\("devicePack"\)==="v1053"/);
 assert.match(html,/get\("devicePack"\)==="v1054"/);
 assert.match(html,/dataset\.hhDevicePackLayout="tall"/);
 assert.match(html,/guardian-device-pack-tall-v1054\.css\?v=1054-laptop-clear-logo/);
 assert.match(html,/guardian-device-pack-tall-v1054\.js\?v=1054-brand-header/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
 assert.match(html,/guardian-map-dock-fill-v828\.js\?v=1050-sh9-visible-dock-viewport/);
 assert.match(js,/dataset\?\.hhDevicePackLayout!=='tall'/);
 assert.match(css,/html\[data-hh-device-pack-layout="tall"\]/);
});

test('right aligned panel ends above the laptop in the supplied S24 screenshot',()=>{
 const panel=css.slice(css.indexOf('html[data-hh-device-pack-layout="tall"] .guardian-hero>#guardianTrioV845{'));
 assert.match(panel,/right:\.65%!important/);
 assert.match(panel,/top:\.8%!important/);
 assert.match(panel,/width:36\.5%!important;height:68\.5%!important/);
 assert.match(panel,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(panel,/grid-template-rows:33% repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(panel,/grid-column:1 \/ -1!important/);
 assert.match(css,/background:transparent!important/);
 assert.doesNotMatch(css,/#guardianMap|\.map-card|#sh9GlobalNavV24|\.maplibre/);
});

test('original embedded Family Guard logo and title remain; no extra tagline or fake badge',()=>{
 assert.match(js,/pack\.insertBefore\(header,pack\.firstChild\)/);
 assert.match(js,/header\.id='guardianDevicePackLogoV1054'/);
 assert.match(js,/header\.setAttribute\('aria-hidden','true'\)/);
 assert.doesNotMatch(js,/\.(?:textContent|innerHTML)\s*=\s*['"][^'"]*Family Guard/);
 assert.doesNotMatch(js,/createElement\('img'\)|fetch\(|XMLHttpRequest|watchPosition|geolocation|uploadJson|downloadJson|setInterval\(/);
 assert.match(read('guardian/guardian-polish-v767.css'),/guardian-family-hero-approved-v768\.avif/);
 assert.match(previous,/IDS=\['ota','wifi','mobile','bluetooth','cloud'\]/);
});

test('v1054 only prepends a passive logo area to existing 8 icon pack',()=>{
 function scene(enabled){
  const pack={firstChild:{id:'battery'},children:[],attrs:{},
   insertBefore(item,first){this.children.unshift(item);this.usedFirst=first},
   setAttribute(name,value){this.attrs[name]=value}};
  const nodes={guardianTrioV845:pack};
  const document={readyState:'complete',
   documentElement:{dataset:enabled?{hhDevicePackLayout:'tall'}:{}},
   getElementById(id){return nodes[id]||null},
   createElement(type){return {tagName:type,attrs:{},setAttribute(k,v){this.attrs[k]=v}}},
   addEventListener(){}};
  vm.runInNewContext(js,{window:{},document,console});
  return {pack,nodes};
 }
 const off=scene(false);assert.equal(off.pack.children.length,0);
 const on=scene(true);assert.equal(on.pack.children.length,1);
 assert.equal(on.pack.children[0].id,'guardianDevicePackLogoV1054');
 assert.equal(on.pack.usedFirst.id,'battery');
 assert.match(on.pack.attrs['aria-label'],/Battery, GPS, Health, OTA, Wi-Fi, Mobil, Bluetooth és Cloud/);
});
