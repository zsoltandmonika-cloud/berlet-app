const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan/index.html'),'utf8');
const mav=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');
test('Volán shell is separate from working MÁV v612 module and preserves Golden Glass',()=>{
 assert.match(html,/<title>SH9 · Volán Smart Bus<\/title>/);
 assert.match(html,/class="app" id="app"/);
 assert.match(html,/class="hero"/);
 assert.match(html,/class="quick"/);
 assert.match(html,/class="planner glass"/);
 assert.match(html,/class="utils"/);
 assert.match(html,/class="bottom"/);
 assert.match(html,/--panel:linear-gradient/);
 assert.match(html,/class="depart glass"/);
 assert.match(mav,/<title>SH9 · MÁV Smart Rail<\/title>/);
});
test('User-approved Volán hero preview is embedded and actually decodable, no broken remote dependency',()=>{
 const match=html.match(/src="data:image\/avif;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(match,'approved image embed missing');
 const bytes=Buffer.from(match[1],'base64');
 assert.ok(bytes.length>3000,'hero asset too small');
 assert.equal(bytes.toString('ascii',4,12),'ftypavif');
 assert.match(html,/Léna a busznál fogadja Mónikát/);
 assert.doesNotMatch(html,/mav-hero-approved.webp|volan-hero-approved.webp/);
});
test('One-tap profile toggler uses the already shared HH Golden avatar provider and separate themes',()=>{
 assert.match(html,/golden-standard-avatars-v529\.js/);
 assert.match(html,/document\.documentElement\.dataset\.profile=profile/);
 assert.match(html,/localStorage\.setItem\('hh-profile',profile\)/);
 assert.match(html,/id="profile-photo"/);
 assert.match(html,/bottom:9px;left:6px;width:45px;height:45px/);
 assert.match(html,/:root\[data-profile="m"\]/);
});
test('Planner is a local UI preview: three modes, native date and time, swap preserves chosen date',()=>{
 for(const id of ['planner','from','to','swap','rail-date','rail-time','find'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const mode of ['now','depart','arrive'])assert.match(html,new RegExp('data-mode="'+mode+'"'));
 assert.match(html,/type="date"/);
 assert.match(html,/type="time"/);
 assert.match(html,/Megállók felcserélve · dátum és időpont változatlan/);
 assert.match(html,/Élő Volán-menetrend még nincs bekötve/);
});
test('Standalone page has five-taskbar nav and does not pre-link placeholders or redirect to external MAV',()=>{
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav);
 assert.equal((nav.match(/<a /g)||[]).length,5);
 assert.match(html,/data-stage="kedvenc vonalak"/);
 assert.match(html,/data-stage="indulási tábla"/);
 assert.match(html,/data-stage="megálló infó"/);
 assert.match(html,/data-stage="jegyvásárlás"/);
 assert.doesNotMatch(html,/<script[^>]*src="\.\/rail-/);
 assert.doesNotMatch(html,/\bfetch\(|XMLHttpRequest|setInterval\(|supabase\.co|mavplusz\.hu|navigator\.geolocation/);
 assert.match(html,/16:55 nem hitelesített buszindulás/);
});
test('No cross-transport migration, unapproved Volán data claim or false live departures',()=>{
 assert.doesNotMatch(html,/rail-favorites-v1-zsolt|sh9-mav-saved-journeys/);
 assert.match(html,/a vasúti kedvencek/i);
 assert.match(html,/Élő adatkapcsolat: még nincs/);
 assert.doesNotMatch(html,/Indulási tábla.*16:55|Valós idejű.*16:55/);
});

test('Volán uses the same actual MÁV Golden layout blocks',()=>{
 for(const cls of ['hero','quick','planner glass','depart glass','utils']){
  assert.ok(html.includes('class="'+cls+'"'));
  assert.ok(mav.includes('class="'+cls+'"'));
 }
 for(const cls of ['phead','mode','routebox','stationfields','stations','swap','datetime','actions','search','refresh','departhead','demo'])
  assert.ok(html.includes('class="'+cls+'"'));
 assert.match(html,/class="hero-img"/);
 assert.match(html,/\.hero-img\{width:100%;height:100%;display:block/);
 assert.equal((html.match(/class="volan-bus-card"/g)||[]).length,3);
 assert.match(html,/id="rail-date-trigger"/);
 assert.match(html,/id="rail-time-trigger"/);
 assert.match(html,/data-icon="bus"/);
});
test('All bus functions remain unlinked until one-by-one activation',()=>{
 for(const name of ['menetrend','kedvencek','élő autóbuszok','jegyek'])
  assert.ok(html.includes('data-stage="'+name+'"'));
 assert.doesNotMatch(html,/\bfetch\s*\(|\bXMLHttpRequest\b|navigator\.geolocation/);
 assert.doesNotMatch(html,/src="\.\/rail-.*\.js"/);
});
