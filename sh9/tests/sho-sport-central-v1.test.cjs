'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const landing=read('sh9/sport/index.html');
const sho=read('sh9/index.html');
const wiring=read('sh9/sho-preview/sho-wiring-v2.js');
test('Sport opens full existing MeccsRadar, not a partial imitation',()=>{
 assert.match(wiring,/'Sport':SH9\+'sport\/'/);
 assert.match(landing,/src="https:\/\/mecsradar\.pages\.dev\/" loading="eager"/);
 assert.match(landing,/class="sport-open-full" href="https:\/\/mecsradar\.pages\.dev\/" rel="noreferrer external"/);
 assert.match(landing,/id="mecsradarFull"/);
 // Scores and calendar remain inside the full unmodified remote application, not duplicated in the thin hero strip.
 assert.doesNotMatch(landing,/<iframe[^>]*\bsandbox\b/);
 for(const originalView of ['Műsor','Kedvencek','Marci','Magyar Kupa','Csatornák'])
  assert.ok(landing.includes(originalView),originalView+' missing');
 assert.match(landing,/\.sport-menu\{/);
 assert.match(landing,/\.sport-open-full\{/);
 assert.match(landing,/src="\.\.\/shared\/sh9-golden-bottom-nav-v924\.js\?v=924-unified"/);
});
test('SHO 4×3 grid and existing routes unchanged, Sport icon activated',()=>{
 assert.equal((sho.match(/<button class="tile" data-module=/g)||[]).length,12);
 assert.doesNotMatch(sho,/\.tile\[data-module="Sport"\] \.sym svg/);
 for(const name of ['Szórakozás','Bevásárlás','Kapcsolatok','Életmód'])
  assert.ok(sho.includes('.module-grid .tile[data-module="'+name+'"] .sym svg'));
 for(const dest of ["'Egészség':HH","'Biztonság':HH+'guardian/'","'Utazás':SH9+'smart-travel/'","'Táplálkozás':HH+'nutrition/'","'Aktivitás':HH+'?sho=activity'","'Alvás':HH+'?sho=sleep'"])
  assert.ok(wiring.includes(dest),'Existing route changed: '+dest);
 assert.match(wiring,/\$\('heroWallet'\)\.onclick=wallet/);
});
test('SHO Sport is a non-profile-specific read-only integration of existing MeccsRadar',()=>{
 assert.doesNotMatch(landing,/supabase|\.from\(|\.insert\(|\.update\(|localStorage|hh-profile/i);
 assert.doesNotMatch(landing,/fake|mock|demo.*match|Math\.random/);
 assert.match(landing,/src="\.\/SHO_Sport_hero_1672x941\.webp\?v=4"/);
 assert.doesNotMatch(landing,/Vissza a SHO kezdőlapra|Sport, egy helyen|Mérkőzések · Eredmények|MecsRadar · Teljes alkalmazás|Változatlan funkciók/);
 assert.match(landing,/\.sport-hero-art\{[^}]*aspect-ratio:1672 \/ 941;object-fit:contain/);
 assert.match(landing,/\.sport-menu\{[^}]*left:0;right:0;bottom:0;[^}]*border-radius:0;background:rgba\(7,25,52,\.21\)/);
 assert.equal((landing.match(/class="sport-open-full"/g)||[]).length,1,'Exactly one full-view link next to embedded logo');
 assert.ok(landing.indexOf('class="sport-open-full"')>landing.indexOf('<iframe'),'full view should be next to embedded MecsRadar, not over hero');
 assert.doesNotMatch(landing,/class="sport-content-head"|class="sport-top"|class="sport-copy"|id="sportRefresh"/);
 assert.match(landing,/\.sport-menu span\{[^}]*border-radius:0;background:transparent/);
 assert.match(landing,/\.sport-hero::after\{content:none\}/);
 assert.doesNotMatch(landing,/\.sport-menu\{[^}]*border-radius:1[0-9]px/);
 assert.match(landing,/\.sport-open-full\{[^}]*top:18px;right:73px/);
 assert.match(landing,/src="\.\.\/shared\/sh9-golden-bottom-nav-v924\.js\?v=924-unified"/);
});

test('Production Hero references the uploaded original 1672×941 WebP rather than the 3.8 KB thumbnail',()=>{
 const p=path.join(root,'sh9/sport/SHO_Sport_hero_1672x941.webp');
 const image=fs.readFileSync(p);
 assert.ok(image.length>200000 && image.length<5000000,'Full-quality image must be present');
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.equal(image.toString('ascii',12,16),'VP8 ');
 const width=image.readUInt16LE(26)&0x3fff;
 const height=image.readUInt16LE(28)&0x3fff;
 assert.deepEqual({width,height},{width:1672,height:941});
 assert.match(landing,/object-fit:contain/,'No visual crop is allowed');
 assert.doesNotMatch(landing,/src="\.\/hero\.webp\?/,'Do not regress to the low-resolution thumbnail');
});
