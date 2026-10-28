const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const page=fs.readFileSync(path.join(root,'sh9/smart-travel/index.html'),'utf8');
const launcher=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
test('SH9 Smart Travel Golden page has nine tiles with Ask Léna in the center',()=>{
 const names=[...page.matchAll(/class="st-tile(?: st-tile-lena)?" data-name="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(names,['Trip Planner','Public Transport','Road Travel','Air Travel','Ask Léna','Taxi','Shared Mobility','My Trips','My Places']);
});
test('SH9 Smart Travel uses existing Family Guard modules and canonical ChatGPT shortcut',()=>{
 assert.match(page,/\#hhSmartHubDestinationV802/);
 assert.match(page,/data-name="Public Transport" data-href="\.\/public-transport\/"/);
 assert.match(page,/\#hhSmartHubFavoritesV806/);
 assert.match(page,/chatgpt-project-shortcut-v712\.js/);
 assert.match(page,/data-name="Ask Léna"/);
 assert.match(launcher,/data-name="Smart Travel" data-href="\.\/smart-travel\/"/);
});
test('SH9 Smart Travel keeps standard navigation and hides the profile switch',()=>{
 assert.equal([...page.matchAll(/data-nav="/g)].length,5);
 for(const label of ['Kezdőlap','Idővonal','Vissza','Értesítések','Admin'])assert.match(page,new RegExp('data-nav="'+label+'"'));
 assert.doesNotMatch(page,/id="stProfile"/);
 assert.doesNotMatch(page,/hh-profile/);
 assert.match(page,/SH9_Smart_Travel_Hero_1402x1122\.png/);
});

// Live clocks remain independent of the user's timezone and respect DST.
test('SH9 Smart Travel hero has only the top-right weather card and clock strip',()=>{
 assert.match(page,/<div class="st-hero-overlay-stack">/);
 assert.doesNotMatch(page,/class="st-hero-title"/);
 assert.doesNotMatch(page,/<h1>Smart Travel<\/h1>/);
 assert.match(page,/<section class="st-world"/);
 assert.equal([...page.matchAll(/data-st-zone="/g)].length,4);
 assert.match(page,/href="https:\/\/adsb\.lol\/"/);
 assert.match(page,/world-clocks-v2\.js/);
 assert.doesNotMatch(page,/<header class="st-head">/);
});
test('SH9 world clocks handle winter and summer offsets including DST',()=>{
 const clocks=require('../../sh9/smart-travel/world-clocks-v2.js');
 const winter=new Date('2026-01-15T12:00:00Z');
 const summer=new Date('2026-07-15T12:00:00Z');
 assert.deepEqual(clocks.ZONES,['America/New_York','Europe/London','Europe/Paris','Europe/Budapest']);
 assert.deepEqual(clocks.ZONES.map(z=>clocks.cityTime(z,winter)),['07:00','12:00','13:00','13:00']);
 assert.deepEqual(clocks.ZONES.map(z=>clocks.cityTime(z,summer)),['08:00','13:00','14:00','14:00']);
 assert.equal(clocks.cityTime('fake/zone',winter),null);
});

test('SH9 Smart Travel weather widget defaults to Budapest, with clickable city clocks',()=>{
 assert.match(page,/id="stWeatherWidget"/);
 assert.match(page,/id="stWeatherCity"/);
 assert.match(page,/id="stWeatherTemp"/);
 assert.match(page,/id="stWeatherDesc"/);
 assert.match(page,/id="stWeatherIcon"/);
 assert.match(page,/Open-Meteo/);
 assert.match(page,/weather-v3\.js/);
 const buttons=[...page.matchAll(/<button class="st-clock" type="button" data-city="([^"]+)"[^>]+aria-pressed="([^"]+)"/g)];
 assert.deepEqual(buttons.map(x=>x[1]),['newyork','london','paris','budapest']);
 assert.deepEqual(buttons.map(x=>x[2]),['false','false','false','true']);
 assert.doesNotMatch(page,/Flightradar24/);
});
test('SH9 Smart Travel weather API and forecast destinations are valid for four cities',()=>{
 const weather=require('../../sh9/smart-travel/weather-v3.js');
 assert.deepEqual(weather.CITY_KEYS,['newyork','london','paris','budapest']);
 for(const key of weather.CITY_KEYS){
  const city=weather.CITIES[key],url=new URL(weather.requestUrl(key));
  assert.equal(url.hostname,'api.open-meteo.com');
  assert.equal(url.pathname,'/v1/forecast');
  assert.equal(url.searchParams.get('timezone'),city.tz);
  assert.equal(url.searchParams.get('current'),'temperature_2m,weather_code,is_day');
  assert.ok(Number.isFinite(Number(url.searchParams.get('latitude'))));
  assert.ok(Number.isFinite(Number(url.searchParams.get('longitude'))));
  assert.match(city.forecastUrl,/^https:\/\/www\.meteoblue\.com\/en\/weather\/week\//);
 }
 assert.equal(weather.requestUrl('other'),null);
});
test('SH9 weather reports current conditions and handles common weather codes',()=>{
 const weather=require('../../sh9/smart-travel/weather-v3.js');
 const data=weather.parseCurrent({current:{temperature_2m:18.6,weather_code:61,is_day:1,time:'2026-10-24T09:00'}});
 assert.equal(data.temp,19);
 assert.equal(data.visual.label,'Eső');
 assert.equal(weather.weatherVisual(0,0).label,'Tiszta éjszaka');
 assert.equal(weather.weatherVisual(95,1).label,'Zivatar');
 assert.throws(()=>weather.parseCurrent({current:{weather_code:3}}),/Érvénytelen/);
});

test('SH9 top-right weather glass is 40 percent narrower and remains interactive',()=>{
 const stack=page.match(/\.st-hero-overlay-stack\{([^}]+)\}/);
 const weather=page.match(/\.st-weather\{([^}]+)\}/);
 assert.ok(stack&&weather);
 assert.match(stack[1],/top:5px;right:5px;left:auto/);
 assert.match(stack[1],/width:118px/);
 assert.match(stack[1],/align-items:stretch/);
 assert.match(stack[1],/--st-hero-glass-fill:linear-gradient\(135deg,rgba\(8,24,48,\.38\),rgba\(20,42,77,\.23\)\)/);
 assert.match(weather[1],/width:100%/);
 assert.match(weather[1],/min-height:68px;padding:7px 7px 6px/);
 assert.match(page,/\.st-weather\{padding:6px 6px;min-height:65px\}/);
 assert.match(weather[1],/background:var\(--st-hero-glass-fill\)/);
 assert.match(weather[1],/border:1px solid var\(--st-hero-glass-border\)/);
 assert.match(weather[1],/backdrop-filter:blur\(12px\)/);
 assert.match(weather[1],/box-shadow:var\(--st-hero-glass-shadow\)/);
 assert.match(page,/\.st-hero-overlay-stack\{top:4px;right:4px;left:auto;width:110px\}/);
 assert.doesNotMatch(page,/\.st-hero-title/);
 assert.doesNotMatch(page,/class="st-hero-title"/);
});

test('Public Transport v923 launcher has three providers and dedicated BKK landing',()=>{
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 const providers=[...pt.matchAll(/data-service="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(providers,['bkk','mav','volan']);
 assert.match(pt,/data-service="bkk" href="\.\/bkk\/"/);
 assert.equal([...pt.matchAll(/href="https:\/\/mavplusz\.hu\/"/g)].length,2);
 assert.match(pt,/data-profile="m"/);
 assert.doesNotMatch(pt,/fetch\(|setInterval\(|geolocation\.|supabase\.co/);
 assert.equal([...pt.matchAll(/class="nav"/g)].length,1);
 assert.match(page,/data-name="Public Transport" data-href="\.\/public-transport\/"/);
});

test('Public Transport v917 includes exact approved 941x1672 WEBP and glass hit zones',()=>{
 const base=path.join(root,'sh9/smart-travel/public-transport');
 const img=fs.readFileSync(path.join(base,'public-transport-hero-approved.webp'));
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 assert.equal(img.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(img.subarray(8,12).toString('ascii'),'WEBP');
 assert.equal(img.subarray(12,16).toString('ascii'),'VP8 ');
 assert.equal(img.readUInt16LE(26)&0x3fff,941);
 assert.equal(img.readUInt16LE(28)&0x3fff,1672);
 assert.ok(img.byteLength>200000,'approved high-quality artwork must not be a placeholder');
 assert.match(html,/src="\.\/public-transport-hero-approved\.webp\?v=918"/);
 assert.equal([...html.matchAll(/class="poster-hit /g)].length,3);
 assert.deepEqual([...html.matchAll(/data-service="([^"]+)"/g)].map(x=>x[1]),['bkk','mav','volan']);
 assert.match(html,/poster-hit\.bkk\{top:51\.2%;height:14\.45%\}/);
 assert.match(html,/poster-hit\.mav\{top:66\.55%;height:14\.3%\}/);
 assert.match(html,/poster-hit\.volan\{top:81\.45%;height:14\.45%\}/);
 assert.match(html,/assetMissing/);
});

test('Public Transport v918 ships approved artwork without fictitious device status indicators',()=>{
 const crypto=require('node:crypto');
 const img=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/public-transport-hero-approved.webp'));
 assert.equal(crypto.createHash('sha256').update(img).digest('hex'),'0fb977edf33718c7a40800e799f0dc8bd6cf5b2c37472b749b00187a02adb291');
});

test('Public Transport v922 shifts only the artboard 23px up, preserving image and tap alignment',()=>{
 const html=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(html,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.equal([...html.matchAll(/class="poster-hit /g)].length,3);
 assert.match(html,/src="\.\/public-transport-hero-approved\.webp\?v=918"/);
 assert.match(html,/\.nav\{z-index:12;width:min\(100%,470px\)\}/);
 assert.doesNotMatch(html,/\.nav\{transform:translateY\(-23px\)/);
});


test('BKK Smart Control v923 uses exact user-approved hero and preserves launcher golden standard',()=>{
 const crypto=require('node:crypto');
 const bkk=path.join(root,'sh9/smart-travel/public-transport/bkk');
 const art=fs.readFileSync(path.join(bkk,'bkk-hero-approved.webp'));
 const html=fs.readFileSync(path.join(bkk,'index.html'),'utf8');
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.equal(art.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(art.subarray(8,12).toString('ascii'),'WEBP');
 assert.equal(crypto.createHash('sha256').update(art).digest('hex'),'43202c14afe11b01a9abbb5d6626e2967228fca56fbf54561d94b4e681d9d010');
 assert.match(html,/bkk-hero-approved\.webp/);
 assert.match(html,/BKK Smart Control/);
 assert.match(html,/data-profile="m"/);
 assert.match(html,/id="favoriteRoutes"/);
 assert.match(html,/hh-bkk-route-favorites-v801/);
 assert.match(html,/hh-profile/);
 assert.match(html,/id="routeSearch"/);
 assert.match(html,/bkk-catalog-v801\.json/);
 assert.match(html,/id="bkkPdfOverlay"/);
 assert.match(html,/bkk-pdf-viewer-v923\.js/);
 assert.match(html,/dataset\.bkkSchedule='true'/);
 assert.match(html,/https:\/\/bkk\.hu\/menetrendek\//);
 assert.match(html,/healthhub\/guardian\/#hhTransitPanel/);
 assert.match(html,/healthhub\/guardian\/#hhSmartHubDestinationV802/);
 assert.match(html,/healthhub\/guardian\/#hhBkkWatchlistV814/);
 assert.match(html,/id="notifications"/);
 assert.match(pt,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.equal([...pt.matchAll(/class="poster-hit /g)].length,3);
 assert.equal([...pt.matchAll(/href="https:\/\/mavplusz\.hu\/"/g)].length,2);
});
test('BKK PDF reader validates official PDF URL and avoids background documents',()=>{
 const reader=require('../../sh9/smart-travel/public-transport/bkk/bkk-pdf-viewer-v923.js');
 assert.equal(reader.validateOfficialPdf('https://bkk.hu/menetrendek/test.pdf'),'https://bkk.hu/menetrendek/test.pdf');
 assert.equal(reader.validateOfficialPdf('https://www.bkk.hu/test.pdf'),'https://www.bkk.hu/test.pdf');
 for(const url of ['https://bkk.hu:444/260.pdf','http://bkk.hu/file.pdf','https://evil.test/file.pdf','https://bkk.hu.evil.test/260.pdf','https://bkk.hu@evil.test/pdf.pdf','https://bkk.hu/file.html','javascript:alert(1)'])
   assert.equal(reader.validateOfficialPdf(url),null);
 const source=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/bkk/bkk-pdf-viewer-v923.js'),'utf8');
 assert.match(source,/pdfjs-dist@4\.10\.38/);
 assert.match(source,/credentials:'omit'/);
 assert.match(source,/cache:'no-store'/);
 assert.match(source,/15\*1024\*1024/);
 assert.doesNotMatch(source,/setInterval\(|localStorage\.setItem|indexedDB|supabase\.co|geolocation/);
});


test('BKK v924 PDF controls are mobile-first, opt-in and preserve all approved hero artwork',()=>{
 const base=path.join(root,'sh9/smart-travel/public-transport/bkk');
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(base,'bkk-pdf-viewer-v923.js'),'utf8');
 const parent=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 for(const id of ['bkkPdfSelectedRoute','bkkPdfCopyRoute','bkkPdfPaste','bkkPdfLoad','bkkPdfDownload','bkkPdfClose','bkkPdfCanvas'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/bkk-pdf-viewer-v923\.js\?v=924/);
 assert.match(html,/bkk-hero-approved\.webp/);
 assert.match(html,/\.bkk-pdf-top\{position:sticky/);
 assert.match(html,/#bkkPdfDownload\[hidden\]\{display:none!important\}/);
 assert.match(html,/\.bkk-pdf-input button\{min-height:44px;flex:1\}/);
 assert.match(js,/function pasteOfficialLink\(\)/);
 assert.match(js,/function copyRoute\(\)/);
 assert.match(js,/function download\(\)/);
 assert.match(js,/downloadBytes=null/);
 assert.match(js,/abortPdf\?\.abort\(\)/);
 assert.match(js,/redirect:'error'/);
 assert.match(js,/clipboard\.readText\(\)/);
 assert.match(js,/createObjectURL\(new Blob/);
 assert.match(js,/revok[eE]ObjectURL/);
 assert.match(js,/if\(e\.key==='Tab'\)/);
 assert.doesNotMatch(js,/setInterval\(|geolocation\.|indexedDB|localStorage\.setItem|supabase\.co/);
 assert.match(parent,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.match(parent,/data-service="bkk" href="\.\/bkk\/"/);
 assert.equal([...parent.matchAll(/href="https:\/\/mavplusz\.hu\/"/g)].length,2);
});


test('BKK v925 premium glass is profile aware, keeps approved image and relabels arrival',()=>{
 const html=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/bkk/index.html'),'utf8');
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(html,/v925 · SH9 Golden Standard premium glass polish/);
 assert.match(html,/--bkk-edge-glow:rgba\(131,208,255,.28\)/);
 assert.match(html,/:root\[data-profile="m"\]\{[\s\S]*?--bkk-edge-glow:rgba\(255,164,235,.34\)/);
 assert.match(html,/\.glass\{[\s\S]*?backdrop-filter:blur\(17px\) saturate\(147%\)/);
 assert.match(html,/\.quick a::before\{/);
 assert.match(html,/\.nav\{border-top:1px solid var\(--bkk-edge-glow\)/);
 assert.match(html,/<strong>Következő járat<\/strong>/);
 assert.match(html,/aria-label="Következő járat · saját SH9 Smart Travel térkép és BKK-járatok"/);
 assert.doesNotMatch(html,/<strong>Mikor jön\?<\/strong>/);
 assert.match(html,/Saját térkép · ellenőrzött BKK-adatok/);
 assert.doesNotMatch(html,/BudapestGO/);
 assert.match(html,/A saját SH9 Smart Travel térképünkön/i);
 assert.equal([...html.matchAll(/guardian\/\?sh9Transit=1/g)].length,2);
 assert.doesNotMatch(html,/href="https:\/\/go\.bkk\.hu\//);
 assert.doesNotMatch(html,/<strong>Indulási tábla<\/strong>/);
 assert.match(html,/src="\.\/bkk-hero-approved\.webp"/);
 assert.match(html,/bkk-pdf-viewer-v923\.js\?v=924/);
 assert.match(pt,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.match(pt,/data-service="bkk" href="\.\/bkk\/"/);
 assert.equal([...pt.matchAll(/href="https:\/\/mavplusz\.hu\/"/g)].length,2);
 assert.doesNotMatch(html,/setInterval\(|geolocation\.|supabase\.co/);
});


test('BKK v927 launches a true SH9 branded Family Guard MapLibre view without external GO iframe',()=>{
 const bkk=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/bkk/index.html'),'utf8');
 const guardian=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
 const skin=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.css'),'utf8');
 const boot=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.js'),'utf8');
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.equal([...bkk.matchAll(/guardian\/\?sh9Transit=1/g)].length,2);
 assert.doesNotMatch(bkk,/https:\/\/go\.bkk\.hu\//);
 assert.match(bkk,/<strong>Következő járat<\/strong>/);
 assert.match(bkk,/src="\.\/bkk-hero-approved\.webp"/);
 assert.match(guardian,/get\('sh9Transit'\)==='1'/);
 assert.match(guardian,/guardian-sh9-transit-v927\.css\?v=931-centered-map-plus35/);
 assert.match(guardian,/guardian-sh9-transit-v927\.js\?v=932-reload-scroll-top/);
 assert.match(guardian,/id="sh9TransitHeaderV927" hidden/);
 assert.match(guardian,/id="sh9TransitNavV927" hidden/);
 assert.match(guardian,/>SH9 Smart Travel<\/strong>/);
 assert.match(guardian,/Következő járat · a saját Family Guard térképünkkel/);
 assert.equal([...guardian.matchAll(/id="guardianMap"/g)].length,1);
 assert.equal([...guardian.matchAll(/id="guardianHHNav"/g)].length,1);
 assert.equal([...guardian.matchAll(/id="sh9TransitNavV927"/g)].length,1);
 assert.match(guardian,/id="hhBkkWatchlistV814"/);
 assert.match(guardian,/id="hhTransitPanel"/);
 assert.match(guardian,/guardian-transit-v791\.js/);
 assert.match(skin,/:root\[data-sh9-transit="on"\]/);
 assert.match(skin,/:root\[data-sh9-transit="on"\]\[data-guardian-profile="m"\]/);
 assert.match(skin,/\.shell>main>:not\(\.map-card\):not\(#hhTransitPanel\)/);
 assert.match(skin,/#guardianHHNav\{display:none!important\}/);
 assert.match(skin,/#guardianMap/);
 assert.match(skin,/--sh9-tr-accent:#a3ddff/);
 assert.match(skin,/--sh9-tr-accent:#ffd0f0/);
 assert.match(boot,/if\(!active\(\)\)return/);
 assert.match(boot,/HH_GUARDIAN_V761\?\.map\?\.resize/);
 assert.match(boot,/hhBkkWatchToggleV858/);
 assert.match(boot,/sh9TransitProfileV927/);
 assert.doesNotMatch(boot,/fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(|new maplibregl\.Map|supabase\.co|localStorage\.setItem/);
 assert.match(pt,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.equal([...pt.matchAll(/class="poster-hit /g)].length,3);
 assert.equal([...pt.matchAll(/href="https:\/\/mavplusz\.hu\/"/g)].length,2);
});


test('v927 SH9 mode is inert on normal Family Guard and activates existing MapLibre without new location requests',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.js'),'utf8');
 function setup(search,profile='z'){
  let calls=0,resize=0,toggles=0,scrolled=[];
  const els=new Map();
  function element(id){
   if(!els.has(id))els.set(id,{
    hidden:true,handlers:{},textContent:'',
    addEventListener(name,fn){this.handlers[name]=fn},
    scrollIntoView(){scrolled.push(id)},
    click(){toggles++; if(id==='hhBkkWatchToggleV858')element('hhBkkWatchContentV858').hidden=false}
   });
   return els.get(id);
  }
  const doc={readyState:'complete',documentElement:{dataset:{guardianProfile:profile}},
   getElementById(id){calls++;return element(id)}};
  const win={location:{search},localStorage:{getItem:()=>profile==='m'?'m':'z'},
   HH_GUARDIAN_V761:{map:{resize(){resize++}}},
   requestAnimationFrame(fn){fn()},addEventListener(){},
   matchMedia(){return {matches:true}}};
  vm.runInNewContext(source,{window:win,document:doc,URLSearchParams});
  return {element,doc,stats(){return{calls,resize,toggles,scrolled}}};
 }
 const ordinary=setup('');
 assert.equal(ordinary.stats().calls,0);
 assert.equal(ordinary.stats().resize,0);
 const active=setup('?sh9Transit=1','m');
 assert.equal(active.doc.documentElement.dataset.sh9Transit,'on');
 assert.equal(active.element('sh9TransitHeaderV927').hidden,false);
 assert.equal(active.element('sh9TransitNavV927').hidden,false);
 assert.equal(active.element('sh9TransitProfileV927').textContent,'Mónika');
 assert.ok(active.stats().resize>=1);
 active.element('sh9TransitFavoritesV927').handlers.click();
 assert.equal(active.stats().toggles,1);
 assert.ok(active.stats().scrolled.includes('hhBkkWatchlistV814'));
 active.element('sh9TransitMapV927').handlers.click();
 assert.ok(active.stats().scrolled.includes('guardianMap'));
});

// Include v928 all-BKK low-usage and isolation tests in the established SH9 Golden CI.
require('./sh9-bkk-all-v928.test.cjs');


test('v929 BKK 3D marker fix changes only SH9 assets and retains old Family Guard dynamic loader',()=>{
 const html=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
 const loader=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-transit-v791.js'),'utf8');
 const live=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-live-pilot-v793.js'),'utf8');
 const render=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-all-bkk-v928.js'),'utf8');
 assert.match(html,/guardian-sh9-all-bkk-v928\.js\?v=929-visible-3d-vehicles/);
 assert.match(html,/guardian-transit-v791\.js\?v=929-sh9-loader-cache-fix/);
 assert.match(loader,/get\('sh9Transit'\)==='1'\?'929-sh9-bkk-3d-fix':'914-mini-above-marker'/);
 assert.match(live,/hh-sh9-all-live-ready-v929/);
 assert.match(render,/makeMarkerElement\(d,vehicle\)/);
 assert.match(render,/if\(source\?\.setData\)source\.setData/);
 assert.match(render,/last\.features\.length===0/);
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(pt,/\.poster-frame\{transform:translateY\(-23px\)\}/);
});


test('v930 Golden Glass header visually hides only the three user-marked paragraphs',()=>{
 const css=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.css'),'utf8');
 const guardian=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
 const original=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(guardian,/guardian-sh9-transit-v927\.css\?v=931-centered-map-plus35/);
 assert.match(css,/v930 · Clean SH9 Transit header/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9TransitHeaderV927 \.sh9-transit-subtitle-v927\{\s*display:none!important/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9AllVehiclesStatusV928,\s*:root\[data-sh9-transit="on"\] #sh9TransitStatusV927\{/);
 assert.match(css,/clip-path:inset\(50%\)!important/);
 assert.match(css,/position:absolute!important/);
 // The live diagnostic status elements must stay mounted for JS updates and assistive tech.
 for(const id of ['sh9AllVehiclesStatusV928','sh9TransitStatusV927'])
   assert.match(guardian,new RegExp('id="'+id+'" role="status"'));
 assert.match(guardian,/id="sh9AllVehiclesToggleV928"/);
 assert.match(guardian,/id="sh9AllVehiclesRefreshV928"/);
 assert.match(guardian,/guardian-sh9-all-bkk-v928\.js\?v=929-visible-3d-vehicles/);
 assert.match(original,/\.poster-frame\{transform:translateY\(-23px\)\}/);
});


test('v931 centers SH9 brand, removes duplicate header Back and adds exactly 35px to native map',()=>{
 const guardian=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.css'),'utf8');
 const main=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(guardian,/guardian-sh9-transit-v927\.css\?v=931-centered-map-plus35/);
 assert.doesNotMatch(guardian,/class="sh9-transit-back-v927"/);
 assert.match(guardian,/id="sh9TransitNavV927" hidden/);
 assert.match(guardian,/<span>Vissza<\/span>/);
 assert.match(guardian,/<strong>SH9 Smart Travel<\/strong>/);
 assert.match(guardian,/id="sh9TransitProfileV927"/);
 assert.match(css,/v931 · SH9 centered brand and taller map/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9TransitHeaderV927 \.sh9-transit-top-v927\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
 assert.match(css,/\.sh9-transit-name-v927\{\s*grid-column:2;\s*grid-row:1;\s*justify-self:center;\s*text-align:center;/);
 assert.match(css,/#sh9TransitProfileV927\{\s*grid-column:3;\s*grid-row:1;\s*justify-self:end;/);
 assert.match(css,/:root\[data-sh9-transit="on"\] \.shell>main>\.map-card:not\(\.hh-map-full-v819\) #guardianMap\{\s*height:clamp\(395px,calc\(54dvh \+ 35px\),775px\)!important;\s*min-height:395px!important;/);
 assert.match(css,/#sh9AllVehiclesStatusV928,\s*:root\[data-sh9-transit="on"\] #sh9TransitStatusV927/);
 assert.match(guardian,/id="sh9AllVehiclesToggleV928"/);
 assert.match(guardian,/id="sh9AllVehiclesRefreshV928"/);
 assert.equal([...guardian.matchAll(/id="guardianMap"/g)].length,1);
 assert.match(main,/\.poster-frame\{transform:translateY\(-23px\)\}/);
});


test('v932 SH9 restores top on new page/reload only, preserving history, anchors and in-page scrolling',()=>{
 const vm=require('node:vm');
 const src=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-sh9-transit-v927.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
 assert.match(html,/get\('sh9Transit'\)==='1'\)\{document\.documentElement\.dataset\.sh9Transit='on';if\(!location\.hash\)\{try\{history\.scrollRestoration='manual'/);
 assert.match(html,/guardian-sh9-transit-v927\.js\?v=932-reload-scroll-top/);
 function run(search,{type='reload',hash='',initialY=420}={}){
  const events={},elements=new Map(),scrolls=[],scrollingElement={scrollTop:initialY};
  const doc={readyState:'complete',hidden:false,scrollingElement,
   documentElement:{dataset:{},scrollTop:initialY},body:{scrollTop:initialY},
   getElementById(id){
    if(!elements.has(id))elements.set(id,{id,hidden:true,textContent:'',addEventListener(){},scrollIntoView(){}});
    return elements.get(id);
   }};
  const win={location:{search,hash},performance:{getEntriesByType:()=>[{type}]},
   localStorage:{getItem:()=> 'z'},requestAnimationFrame(fn){fn()},
   scrollTo(x,y){scrolls.push([x,y]);scrollingElement.scrollTop=y},
   HH_GUARDIAN_V761:{map:{resize(){}}},addEventListener(name,fn){events[name]=fn},
   matchMedia:()=>({matches:false})};
  vm.runInNewContext(src,{window:win,document:doc,URLSearchParams});
  return {scrolls,doc,events,scrollingElement};
 }
 const reload=run('?sh9Transit=1');
 assert.ok(reload.scrolls.length>=1);
 assert.equal(reload.scrollingElement.scrollTop,0);
 assert.equal(reload.doc.documentElement.scrollTop,0);
 reload.scrollingElement.scrollTop=310;
 reload.events.pageshow({persisted:true});
 assert.equal(reload.scrollingElement.scrollTop,310);
 reload.events.pageshow({persisted:false});
 assert.equal(reload.scrollingElement.scrollTop,0);
 const returned=run('?sh9Transit=1',{type:'back_forward'});
 assert.equal(returned.scrolls.length,0);
 assert.equal(returned.scrollingElement.scrollTop,420);
 const anchored=run('?sh9Transit=1',{hash:'#hhTransitPanel'});
 assert.equal(anchored.scrolls.length,0);
 const family=run('');
 assert.equal(family.scrolls.length,0);
 assert.equal(family.doc.documentElement.dataset.sh9Transit,undefined);
 // No recurring scroll watcher, no new location/GPS/network machinery.
 assert.doesNotMatch(src,/setInterval\(|setTimeout\(|watchPosition\(|getCurrentPosition\(|fetch\(/);
});


test('BKK v934 first fold proportionally fits four tiles with 35px clearance from taskbar',()=>{
 const pathBkk=path.join(root,'sh9/smart-travel/public-transport/bkk/index.html');
 const bkk=fs.readFileSync(pathBkk,'utf8');
 const publicTransport=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 const block=bkk.match(/<main>\s*<div class="bkk-first-fold">([\s\S]*?)<\/section>\s*<\/div>\s*<section id="favorites">/);
 assert.ok(block,'first fold wraps only hero, heading, four tiles');
 assert.match(block[1],/<figure class="hero"><img src="\.\/bkk-hero-approved\.webp"/);
 assert.match(block[1],/<div class="heading">/);
 assert.match(block[1],/<section class="quick" aria-label="BKK gyorsfunkciók">/);
 assert.equal([...block[1].matchAll(/<a class="glass" href=/g)].length,4);
 for(const label of ['Élő BKK térkép','Útvonaltervező','Következő járat','Kedvenceim'])
  assert.ok(block[1].includes('<strong>'+label+'</strong>'));
 assert.match(bkk,/\.bkk-first-fold\{\s*display:flex;\s*flex-direction:column;\s*min-height:calc\(100vh - 109px\);\s*min-height:calc\(100dvh - 107px - env\(safe-area-inset-bottom,0px\)\)/);
 assert.doesNotMatch(bkk,/min-height:calc\(100dvh - 72px - env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(bkk,/\.bkk-first-fold>\.quick\{\s*flex:1 1 auto;[\s\S]*?grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(bkk,/\.bkk-first-fold>\.quick>a\{\s*min-height:0;\s*height:100%/);
 assert.match(bkk,/padding-bottom:9px/);
 assert.match(bkk,/@media\(max-height:620px\) and \(orientation:landscape\)/);
 assert.match(bkk,/<section id="favorites">/);
 assert.match(bkk,/id="favoriteRoutes"/);
 assert.match(bkk,/id="routeSearch"/);
 assert.match(bkk,/id="bkkPdfOverlay"/);
 assert.match(bkk,/bkk-pdf-viewer-v923\.js\?v=924/);
 assert.match(bkk,/<nav class="nav" aria-label="SH9 Golden Standard navigáció">/);
 assert.match(bkk,/\.nav\{position:fixed;z-index:30;left:50%;bottom:0/);
 assert.match(bkk,/:root\[data-profile="m"\]/);
 assert.doesNotMatch(bkk,/setInterval\(|watchPosition\(|geolocation\.|supabase\.co/);
 assert.match(publicTransport,/\.poster-frame\{transform:translateY\(-23px\)\}/);
 assert.equal([...publicTransport.matchAll(/class="poster-hit /g)].length,3);
});
