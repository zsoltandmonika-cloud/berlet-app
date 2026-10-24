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
 assert.match(page,/\#hhTransitPanel/);
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

test('SH9 top-right weather glass stays compact, readable, and transparent',()=>{
 const stack=page.match(/\.st-hero-overlay-stack\{([^}]+)\}/);
 const weather=page.match(/\.st-weather\{([^}]+)\}/);
 assert.ok(stack&&weather);
 assert.match(stack[1],/top:10px;right:10px;left:auto/);
 assert.match(stack[1],/width:196px/);
 assert.match(stack[1],/align-items:stretch/);
 assert.match(stack[1],/--st-hero-glass-fill:linear-gradient\(135deg,rgba\(8,24,48,\.38\),rgba\(20,42,77,\.23\)\)/);
 assert.match(weather[1],/width:100%/);
 assert.match(weather[1],/min-height:68px;padding:7px 9px 6px/);
 assert.match(page,/\.st-weather\{padding:6px 8px;min-height:65px\}/);
 assert.match(weather[1],/background:var\(--st-hero-glass-fill\)/);
 assert.match(weather[1],/border:1px solid var\(--st-hero-glass-border\)/);
 assert.match(weather[1],/backdrop-filter:blur\(12px\)/);
 assert.match(weather[1],/box-shadow:var\(--st-hero-glass-shadow\)/);
 assert.match(page,/\.st-hero-overlay-stack\{top:8px;right:8px;left:auto;width:184px\}/);
 assert.doesNotMatch(page,/\.st-hero-title/);
 assert.doesNotMatch(page,/class="st-hero-title"/);
});
