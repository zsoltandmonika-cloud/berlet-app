const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const html=fs.readFileSync(path.join(base,'mav/index.html'),'utf8');
const entry=fs.readFileSync(path.join(base,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(base,'mav/rail-ui-v1.js'),'utf8');
const lib=require('../../sh9/smart-travel/public-transport/mav/rail-links-v1.js');

test('SH9 MÁV Phase1 has clickable internal landing and keeps Volán external',()=>{
 assert.match(entry,/data-service="mav" href="\.\/mav\/"/);
 assert.match(entry,/<a class="poster-hit mav"[^>]*aria-label="MÁV · saját Smart Rail útvonaltervező megnyitása"/);
 assert.doesNotMatch(entry,/<a class="poster-hit mav"[^>]*target="_blank"/);
 assert.match(entry,/data-service="volan" href="https:\/\/mavplusz.hu\/"/);
});
test('SH9 MÁV approved hero is real WebP with no phone status baked into HTML',()=>{
 const hero=fs.readFileSync(path.join(base,'mav/assets/mav-hero-approved.webp'));
 assert.equal(hero.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(hero.subarray(8,12).toString('ascii'),'WEBP');
 assert.ok(hero.length>200000);
 assert.match(html,/mav-hero-approved\.webp/);
 assert.doesNotMatch(html,/(?:12:45|100% ▰|signal-strength|fake-status-bar)/i);
});
test('SH9 MÁV supplied FLIRT audio is packaged but never autoplayed',()=>{
 const mp3=fs.readFileSync(path.join(base,'mav/assets/flirt-signal.mp3'));
 assert.ok(mp3.length>40000);
 assert.match(html,/id="signal"/);
 assert.match(ui,/new Audio\('\.\/assets\/flirt-signal\.mp3'\)/);
 assert.doesNotMatch(html,/<audio[^>]+autoplay/i);
 assert.doesNotMatch(ui,/setInterval\(|navigator\.geolocation|supabase\.co/);
});
test('SH9 MÁV Phase1 planner, profile privacy and source labeling',()=>{
 for(const field of ['from','to','swap','when','openPlanner','maps','addFav','favoriteList','profile','savePrefs'])assert.match(html,new RegExp('id="'+field+'"'));
 for(const mode of ['now','depart','arrive'])assert.match(html,new RegExp('data-mode="'+mode+'"'));
 assert.match(html,/https:\/\/mavplusz.hu\//);
 assert.match(html,/https:\/\/jegy.mav.hu\//);
 assert.match(html,/helyi mezők nem töltődnek át automatikusan/);
 assert.match(ui,/sh9-mav-rail-favorites-v1-/);
 assert.match(ui,/sh9-mav-rail-preferences-v1-/);
});
test('SH9 MÁV URL and input handling fails closed',()=>{
 assert.equal(lib.station('Keleti pályaudvar'),'Keleti pályaudvar');
 assert.equal(lib.journey('Keleti','Keleti'),null);
 assert.equal(lib.journey('<svg>','Miskolc'),null);
 assert.equal(lib.journey('javascript:abc','Miskolc'),null);
 const u=new URL(lib.directionsUrl('Budapest-Keleti','Kazincbarcika'));
 assert.equal(u.hostname,'www.google.com');assert.equal(u.searchParams.get('travelmode'),'transit');
 assert.equal(lib.normalizeFavorites([{from:'Keleti',to:'Miskolc'},{from:'Keleti',to:'Miskolc'}]).length,1);
});

test('SH9 MÁV Golden FLIRT audio defaults ON with persistent opt-out and no surprise OFF tap',()=>{
 const css=fs.readFileSync(path.join(base,'mav/rail-golden-v2.css'),'utf8');
 const overlay=fs.readFileSync(path.join(base,'mav/rail-golden-v2.js'),'utf8');
 assert.match(html,/id="signal" class="signal" aria-pressed="true"/);
 assert.match(ui,/let soundAllowed=true/);
 assert.match(ui,/SIGNAL_PREF='sh9-mav-flirt-signal-v2'/);
 assert.match(ui,/localStorage\.getItem\(SIGNAL_PREF\)!=='off'/);
 assert.match(ui,/localStorage\.setItem\(SIGNAL_PREF,soundAllowed\?'on':'off'\)/);
 assert.match(ui,/attemptStart\(\); \/\/ may be blocked/);
 assert.match(ui,/document\.addEventListener\('pointerdown',gestureStart,true\)/);
 assert.match(ui,/event\.target\?\.closest\?\.\('#signal'\)/);
 assert.match(ui,/removeStartGesture\(\)/);
 assert.match(css,/\.hero \.signal\{position:absolute;top:auto;bottom:10px;right:12px/);
 assert.match(css,/\.hero \.signal\[aria-pressed="true"\]::after/);
 assert.match(overlay,/hero\.append\(signal\)/);
 assert.doesNotMatch(overlay,/signal\.title=/);
 assert.doesNotMatch(html,/<audio[^>]*autoplay/i);
});
