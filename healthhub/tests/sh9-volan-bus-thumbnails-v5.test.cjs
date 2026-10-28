const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const volan=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan/index.html'),'utf8');
const mav=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');

test('User-supplied identifiable Volánbusz used as three distinct locally embedded vehicle crops',()=>{
 const thumbs=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]*?src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
 assert.equal(thumbs.length,3);
 assert.equal(new Set(thumbs.map(x=>x[1])).size,3,'three genuinely different crops');
 for(const m of thumbs){
  const bytes=Buffer.from(m[1],'base64');
  assert.ok(bytes.length>18000,'not a blurry miniature');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
test('No generative placeholder or external third-party image fetch, no obsolete Commons credits',()=>{
 assert.doesNotMatch(volan,/upload\.wikimedia\.org|commons\.wikimedia\.org/);
 assert.doesNotMatch(volan,/class="volan-bus-thumb"[^>]*src="https:\/\//);
 assert.doesNotMatch(volan,/class="volan-photo-credits"/);
 assert.doesNotMatch(volan,/a_wide_cinematic_high_resolution_scene_of_a_mode/);
 const thumbs=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]+>/g)];
 assert.equal(thumbs.length,3);
 thumbs.forEach(m=>assert.match(m[0],/alt="" aria-hidden="true"/));
});
test('Keep approved family hero, Golden Glass card sizing, planner and saved bus journeys intact',()=>{
 const hero=volan.match(/id="volan-hero" class="hero-img" src="data:image\/avif;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(hero,'approved Volán hero missing');
 assert.ok(hero[1].length>120000);
 assert.match(volan,/\.volan-bus-thumb\{height:41px/);
 assert.match(volan,/width:80px/);
 assert.equal((volan.match(/class="volan-bus-card"/g)||[]).length,3);
 assert.match(volan,/id="profile-photo"/);
 assert.match(volan,/id="rail-date-trigger"/);
 assert.match(volan,/id="rail-journey-save-toggle"/);
 assert.match(volan,/id="rail-journey-plans"/);
 assert.match(mav,/id="rail-journey-save-toggle"/);
});
test('Local photos load without billing/GPS/polling; rest of the Volán shell is offline-first',()=>{
 assert.equal((volan.match(/class="volan-bus-thumb" loading="lazy" decoding="async"/g)||[]).length,3);
 assert.match(volan,/Élő adatkapcsolat: még nincs/);
 assert.doesNotMatch(volan,/\bfetch\s*\(|\bXMLHttpRequest\b|navigator\.geolocation|supabase\.co/);
});
