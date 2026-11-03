'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
const routing=fs.readFileSync(path.join(root,'sh9/sho-preview/sho-wiring-v2.js'),'utf8');
const planned=['Szórakozás','Bevásárlás','Kapcsolatok','Életmód'];
const working=['Egészség','Biztonság','Utazás','Sport','Wallet','Táplálkozás','Aktivitás','Alvás'];
const tiles=[...html.matchAll(/<button class="tile" data-module="([^"]+)"([^>]*)>/g)].map(m=>({name:m[1],attrs:m[2]}));
assert.equal(tiles.length,12,'Original 4x3 grid must be preserved');
assert.deepEqual(tiles.map(t=>t.name),[
 'Egészség','Biztonság','Utazás','Szórakozás','Bevásárlás','Sport',
 'Wallet','Kapcsolatok','Életmód','Táplálkozás','Aktivitás','Alvás'
]);
for(const tile of tiles){
 assert.doesNotMatch(tile.attrs,/\bdisabled\b|data-sho-status|aria-disabled/,tile.name+' must be enabled');
}
assert.doesNotMatch(html,/data-sho-status|hamarosan|content:"soon"/);
assert.doesNotMatch(routing,/PLANNED_MODULES|\.disabled\s*=\s*true|\.dataset\.shoStatus/);
assert.match(routing,/else unavailable\(label\)/,'Original unfinished-module dialog remains clickable');
assert.match(routing,/\$\('heroWallet'\)\.onclick=wallet/,'Existing Wallet unchanged');
const css=html.slice(html.indexOf('/* SHO v1161 · only the INNER icon linework'),html.indexOf('</style>'));
assert.equal((css.match(/data-module="/g)||[]).length,4,'Four not-yet-developed inner icons only');
for(const name of planned){
 assert.ok(css.includes('.module-grid .tile[data-module="'+name+'"] .sym svg'),name+' missing from muted icons');
}
for(const name of working){
 assert.ok(!css.includes('data-module="'+name+'"'),name+' incorrectly muted');
}
assert.match(css,/stroke:#9aabbf!important/);
assert.doesNotMatch(css,/\.tile\s*\{|opacity:|filter:|background:|pointer-events|::after|:disabled/);
assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.js/);
assert.match(html,/sh9-ota-indicator-v1043\.js/);
assert.match(html,/id="sh9AgendaDialog"/);
console.log('PASS SHO Sport V1: original 12 active tiles + four unbuilt muted icons, Sport active');
