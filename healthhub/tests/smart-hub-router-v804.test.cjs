const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const router=require('../guardian/guardian-smart-hub-router-v804.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');
const p=(name,lat,lng,id=name)=>({id,name,lat,lng});
function variant(headsign,stops){
 return {headsign,stops,shape:stops.map(x=>[x.lng,x.lat])};
}
function fixture(){
 const b=p('Belépő',47.5000,19.0000,'A');
 const x=p('Átszállás',47.5100,19.0100,'X');
 const y=p('Végállomás',47.5200,19.0200,'Y');
 const z=p('Köztes megálló',47.5150,19.0150,'Z');
 return {schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
 generatedAt:new Date().toISOString(),
 routes:{
  '260':{variants:[variant('Végállomás',[b,x,z,y])]},
  '17':{variants:[variant('Központ',[x,z,y])]},
  '19':{variants:[variant('Belépő',[b,x])]}
 }};
}
test('v804 verifies fresh official static GTFS source and direction sequences',()=>{
 const r=router.validate(fixture());
 assert.equal(r.length,3);
 assert.equal(router.validate({...fixture(),source:'fake'}),null);
 assert.equal(router.validate({...fixture(),generatedAt:'2020-01-01'}),null);
 const missing=fixture();delete missing.routes['260'];
 assert.equal(router.validate(missing),null);
 assert.equal(router.distance(p('a',47.5,19),p('b',47.5,19)),0);
});
test('v804 finds only directed, source-backed direct bus journeys',()=>{
 const lines=router.validate(fixture());
 const from=p('Kezdés',47.5,19),to=p('Vége',47.52,19.02);
 const options=router.plan(lines,from,to);
 assert.ok(options.length>0);
 assert.equal(options[0].transfer,0);
 assert.equal(options[0].legs[0].line.id,'260');
 assert.equal(options[0].legs[0].enter.id,'A');
 assert.equal(options[0].legs[0].exit.id,'Y');
 assert.deepEqual(router.plan(lines,to,from),[]);
});
test('v804 can connect official BKK stop sequences with one short transfer',()=>{
 const f=fixture();
 // Ensure only a transfer is possible: 260 stops at X, 17 starts at X and goes to Y.
 f.routes['260'].variants=[variant('Átszállás',[p('Belépő',47.5,19,'A'),p('Átszállás',47.51,19.01,'X')])];
 f.routes['19'].variants=[variant('Mellékág',[p('Távol',47.6,19.1,'M'),p('Távolabb',47.61,19.11,'N')])];
 const options=router.plan(router.validate(f),p('Kezdés',47.5,19),p('Cél',47.52,19.02));
 assert.ok(options.some(x=>x.transfer===1));
 const a=options.find(x=>x.transfer===1);
 assert.deepEqual(a.legs.map(x=>x.line.id),['260','17']);
 assert.equal(a.changeWalk,0);
});
test('v804 has own HealthHub UI, origin chooser and no fabricated ETA or GPS access',()=>{
 const html=read('index.html'),js=read('guardian-smart-hub-native-v803.js');
 const code=read('guardian-smart-hub-router-v804.js'),css=read('guardian-smart-hub-router-v804.css');
 for(const id of ['hhSmartHubOriginModeV804','hhSmartHubTargetModeV804','hhSmartHubTripPlansV804','hhSmartHubTripStatusV804'])
  assert.ok(html.includes(id),id);
 assert.ok(html.includes('guardian-smart-hub-router-v804.js?v=805-fewest-go-a'));
 assert.ok(html.includes('guardian-smart-hub-router-v804.css?v=804-router-a'));
 assert.ok(js.includes('HH_SMART_HUB_ROUTER_V804'));
 assert.ok(js.includes("router.setPlace(mode,item)"));
 assert.ok(code.includes("bkk-routes-v790.json"));
 assert.ok(code.includes("A megállók")===false);
 assert.ok(code.includes("légvonalban"));
 assert.ok(!code.includes("geolocation.getCurrentPosition"));
 assert.ok(!code.includes("localStorage.setItem"));
 assert.ok(css.includes('.hh-smart-trip-card-v804'));
});
