const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const volan=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan/index.html'),'utf8');
const mav=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');

const filenames=[
 'Mercedes-Benz_Intouro_(TDE-313).jpg',
 'Credo_Econell_12_(RDB-606)_a_786-oson.jpg',
 'Credo_Econell_12_Next_(AO-AV-896)_a_762-es_viszonylaton.jpg'
];
test('v5 real photographs: verified Volán fleet files from Wikimedia Commons, not AI buses',()=>{
 const urls=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]*?src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,3);
 assert.equal(new Set(urls).size,3);
 for(let i=0;i<3;i++){
  assert.ok(urls[i].startsWith('https://upload.wikimedia.org/wikipedia/commons/thumb/'));
  assert.ok(urls[i].includes(filenames[i]));
  assert.ok(urls[i].endsWith('/330px-'+filenames[i]));
 }
 assert.ok(urls[0].includes('/b/b1/'));
 assert.ok(urls[1].includes('/0/08/'));
 assert.ok(urls[2].includes('/d/d8/'));
 assert.doesNotMatch(volan,/class="volan-bus-thumb"[^>]*src="data:image\/webp/);
});
test('v5 credits the real photographers and original Commons files, with valid reuse licenses',()=>{
 assert.match(volan,/Valódi Volánbusz-fotók/);
 assert.match(volan,/SzSzili01/);
 assert.match(volan,/AO-FV-747/);
 assert.match(volan,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
 assert.match(volan,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(volan,/commons\.wikimedia\.org\/wiki\/File:Mercedes-Benz_Intouro_/);
 assert.match(volan,/commons\.wikimedia\.org\/wiki\/File:Credo_Econell_12_/);
});
test('Volán retains user-approved HD hero, MÁV glass dimensions and saved journeys',()=>{
 const hero=volan.match(/id="volan-hero" class="hero-img" src="data:image\/avif;base64,([A-Za-z0-9+/=]+)"/);
 assert.ok(hero,'HD hero must remain unchanged');
 assert.ok(hero[1].length>120000);
 assert.match(volan,/\.volan-bus-thumb\{height:41px/);
 assert.match(volan,/width:80px/);
 assert.match(volan,/id="profile-photo"/);
 assert.match(volan,/id="rail-date-trigger"/);
 assert.match(volan,/id="rail-journey-save-toggle"/);
 assert.match(volan,/id="rail-journey-plans"/);
 assert.match(mav,/id="rail-journey-save-toggle"/);
 assert.equal((volan.match(/class="volan-bus-card"/g)||[]).length,3);
});
test('V5 loads static CC photographs only, no API/GPS/polling; keeps original empty alt decorative imagery',()=>{
 const imgs=[...volan.matchAll(/<img class="volan-bus-thumb"[^>]+>/g)];
 assert.equal(imgs.length,3);
 imgs.forEach(m=>{
  assert.match(m[0],/loading="lazy" decoding="async"/);
  assert.match(m[0],/alt="" aria-hidden="true"/);
 });
 assert.match(volan,/Élő adatkapcsolat: még nincs/);
 assert.doesNotMatch(volan,/\bfetch\s*\(|XMLHttpRequest|navigator\.geolocation|supabase\.co/);
 assert.doesNotMatch(volan,/https:\/\/(?:magyarbusz\.info|fotobus\.msk\.ru)/);
});
