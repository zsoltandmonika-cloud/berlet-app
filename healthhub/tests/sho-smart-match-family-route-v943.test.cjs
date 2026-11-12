'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../guardian/smart-260-connect');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const app=read('app.mjs'),network=require('../guardian/bkk-network-v806.json');
const core=()=>import('../guardian/smart-260-connect/core.mjs');
function ordered(id,mode,from,to){
 return network.routes.some(r=>r.id===id&&r.mode===mode&&
  r.stops.findIndex(s=>s[1]===from)>=0&&
  r.stops.findIndex(s=>s[1]===to)>r.stops.findIndex(s=>s[1]===from));
}
test('Family outbound 260 → 17/19 → 4/6 is a true directional BKK stop sequence',async()=>{
 const {FAMILY_OUTBOUND:a}=await core();
 assert.deepEqual([a.originFavoriteSlot,a.destinationFavoriteSlot],[0,7]);
 assert.equal(a.multiLegDraft,true);
 assert.equal(a.originStop,'Citronella utca');
 assert.equal(a.transferStop,'Bécsi út / Vörösvári út');
 assert.equal(a.targetStop,'Margit híd, budai hídfő H');
 assert.equal(a.destinationTransitStop,'Boráros tér H');
 assert.deepEqual(a.targetRoutes,['4','6']);
 assert.deepEqual(a.feederRoutes,['260','17','19']);
 assert.ok(ordered('260','bus','Citronella utca','Bécsi út / Vörösvári út'));
 assert.ok(['17','19'].every(x=>ordered(x,'tram','Bécsi út / Vörösvári út','Margit híd, budai hídfő H')));
 assert.ok(['4','6'].every(x=>ordered(x,'tram','Margit híd, budai hídfő H','Boráros tér H')));
 assert.deepEqual(a.flowSteps.map(x=>x.role),['origin','bus','tram','tram','walk','destination']);
 assert.equal(a.flowSteps.length,6);
 assert.equal(a.routePriority,'260_departure_first');
});
test('Family return reverses stop order and anchors the scarce homebound 260',async()=>{
 const {FAMILY_OUTBOUND:a,FAMILY_RETURN:b}=await core();
 assert.equal(a.reverseId,b.id);
 assert.equal(b.reverseId,a.id);
 assert.deepEqual([b.originFavoriteSlot,b.destinationFavoriteSlot],[7,0]);
 assert.deepEqual(b.targetRoutes,['260']);
 assert.equal(b.targetHeadsign,'Harsánylejtő');
 assert.equal(b.originStop,'Boráros tér H');
 assert.equal(b.destinationTransitStop,'Citronella utca');
 assert.ok(['4','6'].every(x=>ordered(x,'tram','Boráros tér H','Margit híd, budai hídfő H')));
 assert.ok(['17','19'].every(x=>ordered(x,'tram','Margit híd, budai hídfő H','Bécsi út / Vörösvári út')));
 assert.ok(ordered('260','bus','Bécsi út / Vörösvári út','Citronella utca'));
 assert.deepEqual(b.flowSteps.map(x=>x.role),['origin','walk','tram','tram','bus','destination']);
 assert.equal(b.routePriority,'260_connection_backwards');
 assert.equal(b.transferSafetyMin,3);
 assert.equal(b.maxWaitMin,8);
});
test('Verified last-bus 54/55 alternatives are optional, not compulsory transfers',async()=>{
 const {FAMILY_OUTBOUND:a}=await core();
 assert.deepEqual(a.optionalLastBusRoutes,['54','55']);
 for(const route of a.optionalLastBusRoutes)
  assert.ok(ordered(route,'bus','Boráros tér H','Haller utca / Soroksári út'),route);
 assert.ok(a.optionalShortWalkTrams.includes('51'));
 assert.ok(a.optionalShortWalkTrams.includes('51A'));
 assert.ok(['51','51A'].every(x=>ordered(x,'tram','Mester utca / Ferenc körút','Bokréta utca')));
 assert.equal(a.destinationWalkMin,9);
});
test('Three-vehicle routes are honest drafts, never fed to two-leg ETA calculator',()=>{
 assert.match(app,/const multiLeg=item\.multiLegDraft===true/);
 assert.match(app,/if\(multiLeg\|\|!coverage/);
 assert.match(app,/state\.result=null;state\.full260=null;state\.lastNext=null/);
 assert.match(app,/\$\("heroTime"\)\.textContent="--:--"/);
 assert.match(app,/\$\("countdown"\)\.textContent="--:--"/);
 assert.match(app,/const verified=SAMPLES\.find\(x=>x\.id===item\.id&&x\.multiLegDraft===true\)/);
 assert.match(app,/!String\(item\.targetRoute\|\|""\)\.trim\(\)/);
 assert.match(app,/!String\(item\.originStop\|\|""\)\.trim\(\)/);
 assert.match(app,/!String\(item\.transferStop\|\|""\)\.trim\(\)/);
 assert.doesNotMatch(read('core.mjs'),/47\.57165|47\.47781|19\.07257/);
});
