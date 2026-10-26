/* SH9 Family Guard: deterministic Active Transit safety/logic regression tests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const logic=require('../guardian/guardian-active-transit-v862.js');
const now=Date.parse('2026-10-26T16:00:00+01:00');
const record=(extra={})=>({
 profile_key:'monika',route_id:'17',mode:'tram',selection:'manual',
 onboard:true,started_at:new Date(now).toISOString(),
 expires_at:new Date(now+3600000).toISOString(),...extra
});
test('only legitimate, fresh, self-declared line information can become a badge',()=>{
 assert.equal(logic.normalize(record(),now).route,'17');
 assert.equal(logic.normalize(record({route_id:'<script>'}),now),null);
 assert.equal(logic.normalize(record({mode:'not_a_mode'}),now),null);
 assert.equal(logic.normalize(record({profile_key:'else'}),now),null);
 assert.equal(logic.normalize(record({expires_at:new Date(now-1).toISOString()}),now),null);
 assert.equal(logic.normalize(record({expires_at:new Date(now+6*3600000).toISOString()}),now),null);
});
test('nearby GTFS stop sequences only suggest plausible routes and never auto-board',()=>{
 const fix={lat:47.53025,lng:19.03025,accuracy:15};
 const lines=[
  {id:'17',mode:'tram',stops:[{lat:47.53,lng:19.03},{lat:47.5305,lng:19.0305}]},
  {id:'260',mode:'bus',stops:[{lat:47.56,lng:19.02},{lat:47.5605,lng:19.0205}]},
  {id:'960',mode:'bus',stops:[{lat:47.53,lng:19.03},{lat:47.5305,lng:19.0305}]}
 ];
 assert.deepEqual(logic.candidates(lines,fix).map(x=>x.id),['17']);
 assert.deepEqual(logic.candidates(lines,{...fix,accuracy:200}),[]);
});
test('two entry paths and one bubble are connected without a second GPS watch',()=>{
 const base=join(__dirname,'../guardian/');
 const html=readFileSync(join(base,'index.html'),'utf8');
 const router=readFileSync(join(base,'guardian-smart-hub-router-v804.js'),'utf8');
 const gps=readFileSync(join(base,'guardian.js'),'utf8');
 const follow=readFileSync(join(base,'guardian-profile-follow-v837.js'),'utf8');
 const style=readFileSync(join(base,'guardian-active-transit-v862.css'),'utf8');
 assert.match(html,/id="hhActiveTransitBoardV862"/);
 assert.match(html,/id="hhActiveTransitManualV862"/);
 assert.match(router,/Kiválasztom ezt az útvonalat/);
 assert.match(router,/onPlanned|active\?\.planned\(p\)/);
 assert.match(gps,/hh-guardian-own-fix-v862/);
 assert.match(follow,/hh-guardian-active-transit-updated-v862/);
 assert.match(style,/data-mode="tram"/);
 assert.match(style,/#ffdf69/);
 assert.doesNotMatch(readFileSync(join(base,'guardian-active-transit-v862.js'),'utf8'),
  /watchPosition\(/);
});
