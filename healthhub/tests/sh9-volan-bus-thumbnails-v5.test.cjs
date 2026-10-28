const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const volan=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan/index.html'),'utf8');
const mav=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');

test('Volán v5: user-supplied bus vehicle in three distinct full/logo/front image crops',()=>{
 const images=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]*?src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
 assert.equal(images.length,3,'all three Volán cards must use embedded user-supplied bus image');
 assert.equal(new Set(images.map(x=>x[1])).size,3,'each card uses its own crop');
 const decoded=images.map(x=>Buffer.from(x[1],'base64'));
 for(const image of decoded){
  assert.ok(image.length>=24000,'crop should remain sharp even on high density S24 Ultra');
  assert.equal(image.toString('ascii',0,4),'RIFF');
  assert.equal(image.toString('ascii',8,12),'WEBP');
 }
});
test('Volán v5: no invented tourist-bus, remote image provider or incorrect photo credits',()=>{
 assert.doesNotMatch(volan,/class="volan-photo-credits"/);
 assert.doesNotMatch(volan,/upload\.wikimedia\.org/);
 assert.doesNotMatch(volan,/SzSzili01|AO-FV-747|Mercedes-Benz_Intouro_\(/);
 assert.doesNotMatch(volan,/class="volan-bus-thumb"[^>]*src="https:\/\//);
 assert.equal((volan.match(/class="volan-bus-thumb" loading="lazy" decoding="async"/g)||[]).length,3);
});
test('Volán v5 preserves HD hero image, Golden Glass, MÁV-size cards and existing trip controls',()=>{
 const hero=volan.match(/id="volan-hero" class="hero-img" src="\.\/assets\/volan-hero-final-approved-v2\.webp\?v=2" width="1670" height="942"/);
 assert.ok(hero,'final approved Volán HD hero must remain');
 const art=fs.readFileSync(path.join(base,'volan/assets/volan-hero-final-approved-v2.webp'));
 assert.ok(art.length>200000,'must not revert to tiny hero');
 assert.match(volan,/\.volan-bus-thumb\{height:41px/);
 assert.match(volan,/width:80px/);
 assert.match(volan,/id="profile-photo"/);
 assert.match(volan,/id="rail-date-trigger"/);
 assert.match(volan,/id="rail-journey-save-toggle"/);
 assert.match(volan,/id="rail-journey-plans"/);
 assert.match(mav,/id="rail-journey-save-toggle"/);
 assert.equal((volan.match(/class="volan-bus-card"/g)||[]).length,3);
});
test('Volán v5: local embedded imagery requires no new data providers or live departure claims',()=>{
 const imgs=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]+>/g)];
 assert.equal(imgs.length,3);
 imgs.forEach(m=>{
  assert.match(m[0],/loading="lazy" decoding="async"/);
  assert.match(m[0],/alt="" aria-hidden="true"/);
 });
 assert.match(volan,/Élő adatkapcsolat: még nincs/);
 assert.doesNotMatch(volan,/\bfetch\s*\(|XMLHttpRequest|navigator\.geolocation|supabase\.co/);
});
