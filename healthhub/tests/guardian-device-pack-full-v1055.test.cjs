'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(base,x),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-device-pack-full-v1055.css');
const js=read('guardian/guardian-device-pack-full-v1055.js');
const earlier=read('guardian/guardian-device-pack-preview-v1053.js');
const imageCSS=read('guardian/guardian-polish-v767.css');

test('v1055 is a separate opt-in preview; v1052, v1053 and v1054 survive',()=>{
 assert.match(html,/get\("devicePack"\)==="v1052"|guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
 for(const v of ['v1053','v1054','v1055'])assert.ok(html.includes('get("devicePack")==="'+v+'"'),v);
 assert.match(html,/dataset\.hhDevicePackFullV1055="on"/);
 assert.match(js,/hhDevicePackFullV1055!=='on'/);
 assert.match(html,/guardian-device-pack-full-v1055\.css\?v=1055-full-height-preview/);
 assert.match(html,/guardian-device-pack-full-v1055\.js\?v=1055-logo-and-icons/);
 assert.match(html,/guardian-device-pack-tall-v1054\.js\?v=1054-brand-header/);
 assert.match(html,/guardian-device-pack-preview-v1053\.js\?v=(?:1053-optin-preview|1058-bluetooth-blue)/);
});

test('single tall Premium Glass panel reaches the hero bottom and retains spare future space',()=>{
 assert.match(css,/height:98\.1%!important/);
 assert.match(css,/width:36\.5%!important/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:28% repeat\(4,12\.75%\) 21%!important/);
 assert.match(css,/Last 21% has no status tiles/);
 assert.match(css,/backdrop-filter:blur\(12px\) saturate\(125%\)/);
 assert.match(css,/rgba\(19,38,94,\.96\)/,'opaque enough to read labels over hero');
 assert.match(css,/data-guardian-profile="m"/,'pink Mónika version');
});

test('real new accessible graphic title has no tagline and shows larger icons',()=>{
 assert.match(js,/head\.setAttribute\('aria-label','HealthHub Family Guard'\)/);
 assert.match(js,/class="fg-shield-v1055"/);
 assert.match(js,/HealthHub<\/span>/);
 assert.match(js,/Family <em>Guard<\/em>/);
 assert.doesNotMatch(js,/tagline|Szeretteid biztonságban|mindig veled/i);
 assert.match(css,/hh-device-pack-signal-v1053 svg\{\s*width:clamp\(17px,4\.1vw,23px\)/);
 assert.match(css,/hh-guardian-icon-v845\{\s*width:clamp\(16px,3\.95vw,22px\)/);
});

test('old hero logo gets visual concealment in preview only while asset remains preserved',()=>{
 assert.match(imageCSS,/guardian-family-hero-approved-v768\.avif/);
 assert.match(css,/data-hh-device-pack-full-v1055="on"\] \.guardian-hero::before/);
 assert.match(css,/background-image:url\('\.\.\/assets\/guardian-family-hero-approved-v768\.avif'\)/);
 assert.match(css,/mask-image:linear-gradient/);
 assert.doesNotMatch(css,/#guardianMap|\.map-card|maplibregl|sh9GlobalNavV24/);
 assert.match(html,/guardian-map-dock-fill-v828\.js\?v=1050-sh9-visible-dock-viewport/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
});

test('preview header enhancement is idempotent and inert for default and older previews',()=>{
 function scene(active){
  const header={dataset:{},attrs:{},
   setAttribute(k,v){this.attrs[k]=v},
   removeAttribute(k){delete this.attrs[k]}};
  const d={documentElement:{dataset:active?{hhDevicePackFullV1055:'on'}:{}},
   readyState:'complete',getElementById(id){return id==='guardianDevicePackLogoV1054'?header:null}};
  const w={};
  vm.runInNewContext(js,{window:w,document:d});
  const first=header.innerHTML||'';
  w.HH_GUARDIAN_FULL_PACK_V1055.install();
  return {header,first};
 }
 const off=scene(false);
 assert.equal(off.first,'');
 const on=scene(true);
 assert.match(on.first,/fg-shield-v1055/);
 assert.match(on.first,/Family <em>Guard<\/em>/);
 assert.equal(on.header.attrs.role,'img');
 assert.equal(on.header.attrs['aria-label'],'HealthHub Family Guard');
 assert.equal(on.header.dataset.brandV1055,'ready');
});

test('no new network calls, GPS, Android permissions, OTA installs or source data changes',()=>{
 assert.doesNotMatch(js,/fetch\(|geolocation|watchPosition|supabase|Dropbox|uploadJson\(|downloadJson\(|setInterval\(|localStorage\.setItem/);
 assert.match(earlier,/IDS=\['ota','wifi','mobile','bluetooth','cloud'\]/);
 for(const id of ['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845'])
  assert.ok(html.includes('id="'+id+'"'));
});
