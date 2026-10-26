const test=require('node:test');
const assert=require('node:assert/strict');
const router=require('../guardian/guardian-smart-hub-router-v804.js');
const now=Date.parse('2026-10-26T14:30:00+01:00');
const stop=(id)=>({id,name:id,lat:47.5,lng:19.03});
const sample=()=>({transfer:1,walk:200,approach:70,finish:130,legs:[
 {line:{id:'260',mode:'bus'},enter:stop('A'),exit:stop('B'),stopCount:4}
]});
function withSchedule(plan=sample()){
 return {...plan,timing:{source:'BKK_GTFS',verified:true,
  generatedAt:new Date(now).toISOString(),
  departure:'2026-10-26T14:53:00+01:00',
  arrival:'2026-10-26T15:21:00+01:00',
  waitMinutes:4,walkMinutes:4,walkVerified:true,
  matchedLegs:[{lineId:'260',boardStopId:'A',alightStopId:'B',tripId:'trip-1'}]
 }};
}
test('rating never claims 5 stars from a static stop-order graph',()=>{
 assert.ok(router.routeRating(sample(),now).stars<5);
 assert.equal(router.verifiedTiming(sample(),now),null);
});
test('fully matched source-backed journey gets 5 stars at strict thresholds',()=>{
 const p=withSchedule();
 assert.equal(router.routeRating(p,now).stars,5);
 assert.equal(router.verifiedTiming(p,now).durationMinutes,28);
 assert.equal(router.prettyClock(router.verifiedTiming(p,now).departure),'14:53');
 assert.equal(router.prettyClock(router.verifiedTiming(p,now).arrival),'15:21');
});
test('5 stars require ALL three measurable conditions',()=>{
 const base=withSchedule();
 assert.ok(router.routeRating({...base,transfer:2},now).stars<5);
 assert.ok(router.routeRating({...base,timing:{...base.timing,walkMinutes:5}},now).stars<5);
 assert.ok(router.routeRating({...base,timing:{...base.timing,waitMinutes:5}},now).stars<5);
 assert.ok(router.routeRating({...base,timing:{...base.timing,waitMinutes:null}},now).stars<5);
 assert.ok(router.routeRating({...base,timing:{...base.timing,walkVerified:false}},now).stars<5);
});
test('stale, untrusted or unbound stop-time records do not display times',()=>{
 const base=withSchedule();
 assert.equal(router.verifiedTiming({...base,timing:{...base.timing,source:'unknown'}},now),null);
 assert.equal(router.verifiedTiming({...base,timing:{...base.timing,
  generatedAt:'2026-10-23T14:00:00+01:00'}},now),null);
 assert.equal(router.verifiedTiming({...base,timing:{...base.timing,
  matchedLegs:[{...base.timing.matchedLegs[0],boardStopId:'WRONG'}]}},now),null);
});
test('best verified result ranks ahead of the preliminary result',()=>{
 const preliminary=sample(),verified=withSchedule(sample());
 assert.equal(router.rankOffers([preliminary,verified],now)[0],verified);
});
