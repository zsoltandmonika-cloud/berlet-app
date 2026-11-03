'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(base,'sh9/index.html'),'utf8');
const js=fs.readFileSync(path.join(base,'sh9/sho-preview/sho-wiring-v2.js'),'utf8');
const tiles=[...html.matchAll(/<button class="tile" data-module="([^"]+)"([^>]*)>/g)]
  .map(x=>({name:x[1],attrs:x[2]}));
const planned=['Szórakozás','Bevásárlás','Sport','Kapcsolatok','Életmód'];
const active=['Egészség','Biztonság','Utazás','Wallet','Táplálkozás','Aktivitás','Alvás'];
assert.equal(tiles.length,12,'The original 4 x 3 SHO module grid must remain unchanged');
assert.deepEqual(tiles.map(x=>x.name),[
 'Egészség','Biztonság','Utazás','Szórakozás','Bevásárlás','Sport',
 'Wallet','Kapcsolatok','Életmód','Táplálkozás','Aktivitás','Alvás'
]);
for(const name of planned){
 const t=tiles.find(x=>x.name===name);
 assert.ok(t,'Missing '+name);
 assert.match(t.attrs,/data-sho-status="planned"/,name);
 assert.match(t.attrs,/\bdisabled\b/,name);
 assert.match(t.attrs,/aria-disabled="true"/,name);
 assert.match(t.attrs,/title="Fejlesztés alatt"/,name);
}
for(const name of active){
 const t=tiles.find(x=>x.name===name);
 assert.ok(t,'Missing '+name);
 assert.doesNotMatch(t.attrs,/data-sho-status=|\bdisabled\b/,name+' must stay functional');
}
assert.equal((html.match(/data-sho-status="planned" type="button"/g)||[]).length,5);
assert.match(html,/\.module-grid \.tile\[data-sho-status="planned"\]\{/);
assert.match(html,/opacity:\.67/);
assert.match(html,/filter:grayscale\(\.9\)/);
assert.match(html,/content:"hamarosan"/);
assert.match(html,/content:"soon"/);
assert.match(js,/const PLANNED_MODULES=Object\.freeze\(/);
assert.match(js,/if\(PLANNED_MODULES\.includes\(label\)\)return/);
assert.match(js,/el\.disabled=true/);
assert.match(js,/el\.dataset\.shoStatus='planned'/);
assert.match(js,/el\.title=english\?'Under development':'Fejlesztés alatt'/);
for(const r of [
 "'Egészség':HH",
 "'Biztonság':HH+'guardian/'",
 "'Utazás':SH9+'smart-travel/'",
 "'Táplálkozás':HH+'nutrition/'",
 "'Aktivitás':HH+'?sho=activity'",
 "'Alvás':HH+'?sho=sleep'"
])assert.ok(js.includes(r),r+' navigation changed');
assert.match(js,/\$\('heroWallet'\)\.onclick=wallet/);
assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.js/);
assert.match(html,/sh9-ota-indicator-v1043\.js/);
assert.match(html,/sho-wiring-v2\.js/);
console.log('PASS SHO v1160: exactly 5 subtly disabled, 7 active, all Golden controls preserved');
