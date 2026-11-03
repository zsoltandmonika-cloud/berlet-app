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
 assert.doesNotMatch(landing,/<iframe[^>]*\bsandbox\b/);
 for(const originalView of ['Műsor','Kedvencek','Marci','Magyar Kupa','Csatornák','Élő eredmények','Naptár'])
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
 assert.match(landing,/src="\.\/hero\.webp\?v=2"/);
 assert.doesNotMatch(landing,/Vissza a SHO kezdőlapra|Sport, egy helyen|Mérkőzések · Eredmények|MecsRadar · Teljes alkalmazás|Változatlan funkciók/);
 assert.match(landing,/\.sport-hero-art\{[^}]*aspect-ratio:1672 \/ 941;object-fit:contain/);
 assert.match(landing,/\.sport-menu\{[^}]*bottom:7px;[^}]*background:rgba\(7,25,52,\.46\)/);
 assert.equal((landing.match(/class="sport-open-full"/g)||[]).length,1,'Exactly one full-view link next to embedded logo');
 assert.ok(landing.indexOf('class="sport-open-full"')>landing.indexOf('<iframe'),'full view should be next to embedded MecsRadar, not over hero');
 assert.doesNotMatch(landing,/class="sport-content-head"|class="sport-top"|class="sport-copy"|id="sportRefresh"/);
 assert.match(landing,/\.sport-open-full\{[^}]*top:18px;right:73px/);
 assert.match(landing,/src="\.\.\/shared\/sh9-golden-bottom-nav-v924\.js\?v=924-unified"/);
});
