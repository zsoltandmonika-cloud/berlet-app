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
 assert.match(html,/class="glass"/);
 assert.match(mav,/<title>SH9 · MÁV Smart Rail<\/title>/);
});
test('User-approved Volán hero preview is embedded and actually decodable, no broken remote dependency',()=>{
 const match=html.match(/src="data:image\/avif;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(match,'approved image embed missing');
 const bytes=Buffer.from(match[1],'base64');
 assert.ok(bytes.length>3000,'hero asset too small');
 assert.equal(bytes.toString('ascii',4,12),'ftypavif');
 assert.match(html,/Léna a busz ajtajában segít Mónikának/);
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
 assert.match(html,/Az irány megfordult, a dátum és idő változatlan/);
 assert.match(html,/Menetrendi adatok még nincsenek bekötve/);
});
test('Standalone page has five-taskbar nav and does not pre-link placeholders or redirect to external MAV',()=>{
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav);
 assert.equal((nav.match(/<a /g)||[]).length,5);
 assert.match(html,/data-stage="Utazásaim"/);
 assert.match(html,/data-stage="Indulási asszisztens"/);
 assert.match(html,/data-stage="Biztonsági mentés"/);
 assert.match(html,/data-stage="System Health"/);
 assert.doesNotMatch(html,/<script[^>]*src="\.\/rail-/);
 assert.doesNotMatch(html,/\bfetch\(|XMLHttpRequest|setInterval\(|supabase\.co|mavplusz\.hu|navigator\.geolocation/);
 assert.match(html,/A 16:55-ös óra a jóváhagyott hero-kép része, nem ellenőrzött Volán-indulás/);
});
test('No cross-transport migration, unapproved Volán data claim or false live departures',()=>{
 assert.doesNotMatch(html,/rail-favorites-v1-zsolt|sh9-mav-saved-journeys/);
 assert.match(html,/a vasúti kedvencek/i);
 assert.match(html,/Élő buszindulás csak ellenőrzött, engedélyezett adatforrásból/);
 assert.doesNotMatch(html,/Indulási tábla.*16:55|Valós idejű.*16:55/);
});
