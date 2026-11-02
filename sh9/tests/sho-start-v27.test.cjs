'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=relative=>fs.readFileSync(path.resolve(__dirname,'../../',relative),'utf8');

test('SHO grid is exactly 4×3: Wallet takes former Family updates spot, bottom row is Health trio',()=>{
 const html=src('sh9/index.html');
 const keys=[...html.matchAll(/<button class="tile" data-module="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(keys,[
  'Egészség','Biztonság','Utazás','Szórakozás','Bevásárlás','Sport',
  'Wallet','Kapcsolatok','Életmód','Táplálkozás','Aktivitás','Alvás'
 ]);
 assert.doesNotMatch(html,/data-module="Családi aktualitások"/);
 assert.doesNotMatch(html,/class="tile wallet"/);
 assert.equal((html.match(/<button class="tile" data-module=/g)||[]).length,12);
 assert.match(html,/sho-wiring-v2\.js\?v=27-smart-wallet-three-health/);
});

test('SHO keeps shared taskbar, native OTA and Outlook bindings',()=>{
 const html=src('sh9/index.html');
 assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.css/);
 assert.match(html,/\.shell > nav\.nav\[data-sh9-golden-bottom-nav="on"\]/);
 assert.match(html,/id="sh9OtaIndicatorV1043"/);
 assert.match(html,/id="sh9AgendaDialog"/);
 assert.match(html,/id="heroWallet"/);
});

test('three new tiles route to actual HealthHub destinations and remain bilingual',()=>{
 const js=src('sh9/sho-preview/sho-wiring-v2.js');
 for(const marker of ["'Táplálkozás':HH+'nutrition/'","'Aktivitás':HH+'?sho=activity'","'Alvás':HH+'?sho=sleep'"]){
  assert.ok(js.includes(marker),marker);
 }
 assert.match(js,/\[data-module\]/);
 assert.match(js,/Táplálkozás:'Nutrition'/);
 assert.match(js,/Aktivitás:'Activity'/);
 assert.match(js,/Alvás:'Sleep'/);
});

test('Sleep and Activity bridge opens only canonical HealthHub modules, on explicit opt-in route',()=>{
 const html=src('healthhub/index.html');
 const js=src('healthhub/sho-entry-v1.js');
 assert.match(html,/shoTarget==='activity'\|\|shoTarget==='sleep'/);
 assert.match(html,/sho-entry-v1\.js\?v=1/);
 assert.match(js,/root\.hhOpenActivity/);
 assert.match(js,/root\.hh225OpenSleep\|\|root\.hhOpenSleep/);
 assert.match(js,/if\(target!=='activity'&&target!=='sleep'\)return/);
 assert.doesNotMatch(js,/fetch\(|supabase|\.from\(/i);
});
