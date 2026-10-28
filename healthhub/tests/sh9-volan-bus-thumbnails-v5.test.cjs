const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const volan=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan/index.html'),'utf8');
const mav=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');

test('Volán has three actual bus-vehicle photographic thumbnails, not repeated full family hero',()=>{
 const cards=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]*?src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
 assert.equal(cards.length,3,'exactly three Volán service cards need coach imagery');
 const images=cards.map(x=>Buffer.from(x[1],'base64'));
 for(const buf of images){
  assert.ok(buf.length>12000,'no tiny blurry bus graphic');
  assert.equal(buf.toString('ascii',0,4),'RIFF');
  assert.equal(buf.toString('ascii',8,12),'WEBP');
 }
 assert.equal(new Set(cards.map(x=>x[1])).size,3,'service rows must have distinct bus crops');
});
test('Volán remains original approved hero + MÁV-size Golden Glass cards and controls',()=>{
 const hero=volan.match(/id="volan-hero" class="hero-img" src="data:image\/avif;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(hero,'approved hero must not be replaced');
 assert.ok(hero[1].length>120000,'HD approved hero must remain');
 assert.match(volan,/\.volan-bus-thumb\{height:41px/);
 assert.match(volan,/width:80px/);
 assert.match(volan,/id="profile-photo"/);
 assert.match(volan,/id="rail-date-trigger"/);
 assert.match(volan,/id="rail-journey-save-toggle"/);
 assert.match(volan,/id="rail-journey-plans"/);
 assert.match(mav,/id="rail-journey-save-toggle"/);
 assert.equal((volan.match(/class="volan-bus-card"/g)||[]).length,3);
});
test('Bus art remains local and purely decorative, no remote paid API or live timing claims',()=>{
 assert.equal((volan.match(/class="volan-bus-thumb" loading="lazy" decoding="async"/g)||[]).length,3);
 assert.match(volan,/Élő adatkapcsolat: még nincs/);
 assert.doesNotMatch(volan,/src="https:\/\/[^"]+"/);
 const cards=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]+>/g)];
 assert.equal(cards.length,3);
 cards.forEach(m=>assert.match(m[0],/alt="" aria-hidden="true"/));
});
