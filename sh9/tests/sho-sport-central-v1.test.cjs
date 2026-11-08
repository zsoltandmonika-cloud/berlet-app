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
test('Sport opens full existing MeccsRadar with actionable hero navigation',()=>{
 assert.match(wiring,/'Sport':SH9\+'sport\/'/);
 assert.match(landing,/src="https:\/\/mecsradar\.pages\.dev\/\?sh9Compact=7&amp;broadcastDefault=on&amp;matchCards=v2" loading="eager"/);
 assert.match(landing,/<a href="https:\/\/mecsradar\.pages\.dev\/" class="sport-full-view sport-accent"/);
 assert.match(landing,/id="mecsradarFull"/);
 assert.doesNotMatch(landing,/<iframe[^>]*\bsandbox\b/);
 for(const name of ['Műsor','Kedvencek','Teljes nézet','Magyar Kupa','Csatornák'])
  assert.ok(landing.includes(name),name+' missing');
 for(const view of ['program','favorites','cup','channels'])
  assert.match(landing,new RegExp('data-sport-nav="'+view+'"'));
 assert.equal((landing.match(/data-sport-nav=/g)||[]).length,4);
 assert.match(landing,/data-sport-action="refresh"/);
 assert.match(landing,/frame\.contentWindow\.postMessage/);
 assert.match(landing,/origin='https:\/\/mecsradar\.pages\.dev'/);
 assert.match(landing,/\.sport-menu\{/);
 assert.match(landing,/src="\.\.\/shared\/sh9-golden-bottom-nav-v924\.js\?v=924-unified"/);
});
test('Sport Hero buttons use Radar lime and the requested order without underlines',()=>{
 const nav=landing.match(/<nav class="sport-menu"[\s\S]*?<\/nav>/)?.[0]||'';
 const sequence=['Műsor','Kedvencek','Csatornák','Magyar Kupa','Teljes nézet','↻'];
 let previous=-1;
 for(const label of sequence){
  const position=nav.indexOf('>'+label+'<');
  assert.ok(position>previous,'Menu order wrong: '+label);
  previous=position;
 }
 assert.match(nav,/data-sport-nav="channels" aria-pressed="false"/);
 assert.doesNotMatch(nav,/data-sport-nav="channels" class="sport-accent"/);
 assert.match(nav,/class="sport-full-view sport-accent"/);
 assert.match(landing,/--sport-radar-lime:#baff2f/);
 assert.match(landing,/\.sport-menu > \.sport-accent/);
 assert.match(landing,/text-decoration:none/);
 assert.doesNotMatch(nav,/data-sport-nav="marci"/);
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
test('SHO Sport preserves the V4 Hero and the original read-only MeccsRadar embed',()=>{
 assert.doesNotMatch(landing,/supabase|\.from\(|\.insert\(|\.update\(|localStorage|hh-profile/i);
 assert.doesNotMatch(landing,/fake|mock|demo.*match|Math\.random/);
 assert.match(landing,/src="\.\/SHO_Sport_hero_1672x941\.webp\?v=6"/);
 assert.doesNotMatch(landing,/Vissza a SHO kezdőlapra|Sport, egy helyen|Mérkőzések · Eredmények|MecsRadar · Teljes alkalmazás|Változatlan funkciók/);
 assert.match(landing,/\.sport-hero-art\{[^}]*aspect-ratio:1672 \/ 941;object-fit:contain/);
 assert.match(landing,/\.sport-menu\{[^}]*left:0;right:0;bottom:0;[^}]*border-radius:0;background:rgba\(7,25,52,\.21\)/);
 assert.equal((landing.match(/class="sport-full-view sport-accent"/g)||[]).length,1,'One full-view link in the hero');
 assert.ok(landing.indexOf('class="sport-full-view sport-accent"')<landing.indexOf('<iframe'),'Full view must be in hero menu');
 assert.doesNotMatch(landing,/sport-open-full|<span>Marci<\/span>/);
 assert.doesNotMatch(landing,/class="sport-content-head"|class="sport-top"|class="sport-copy"|id="sportRefresh"/);
 assert.match(landing,/\.sport-menu > :is\(button,a\)\{[^}]*border-radius:0;background:transparent/);
 assert.match(landing,/\.sport-hero::after\{content:none\}/);
 assert.doesNotMatch(landing,/\.sport-menu\{[^}]*border-radius:1[0-9]px/);
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
