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

test('Public Transport v916 launcher has exactly three providers and preserves BKK live module',()=>{
 const pt=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 const providers=[...pt.matchAll(/data-service="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(providers,['bkk','mav','volan']);
 assert.match(pt,/href="\.\.\/\.\.\/\.\.\/healthhub\/guardian\/#hhTransitPanel"/);
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

test('Public Transport v921 shifts only the artboard 22px up, preserving image and tap alignment',()=>{
 const html=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
 assert.match(html,/\.poster-frame\{transform:translateY\(-22px\)\}/);
 assert.equal([...html.matchAll(/class="poster-hit /g)].length,3);
 assert.match(html,/src="\.\/public-transport-hero-approved\.webp\?v=918"/);
 assert.match(html,/\.nav\{z-index:12;width:min\(100%,470px\)\}/);
 assert.doesNotMatch(html,/\.nav\{transform:translateY\(-22px\)/);
});
