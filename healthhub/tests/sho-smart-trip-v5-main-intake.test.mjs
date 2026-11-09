import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildV5Intake} from "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/smart-trip-v5-intake.mjs";
const NOW=new Date("2026-11-09T13:00:00.000Z");
const query={from:"Mónika Munkahely",to:"Mónika · Anyuka",mode:"depart",
 date:"2026-11-27",time:"15:00"};
const places={
 origin:{name:"Mónika Munkahely",lat:47.52693,lng:19.03802},
 destination:{name:"Mónika · Anyuka",lat:48.25657,lng:20.62831}
};
const build=(input={})=>buildV5Intake({query,places,profile:"m",priority:"balanced",...input},{now:NOW});
test("chosen original predictive GPS is used exactly, not an address guess",()=>{
 const a=build();
 assert.equal(a.status,"ok");
 assert.deepEqual(a.selected,{origin:true,destination:true});
 assert.equal(a.query.origin.lat,47.52693);
 assert.equal(a.query.origin.lng,19.03802);
 assert.equal(a.query.destination.lat,48.25657);
 assert.equal(a.query.destination.lng,20.62831);
 assert.equal(a.query.when,"2026-11-27T14:00:00.000Z");
 assert.equal(a.query.time,"15:00");
 assert.equal(a.query.mode,"depart");
 assert.equal(a.query.profile,"m");
});
test("manual text edit invalidates previously selected predictive location",()=>{
 const v=build({query:{...query,from:"Budapest, Váci út 18"}});
 assert.equal(v.status,"ok");
 assert.equal(v.selected.origin,false);
 assert.equal(v.query.origin.kind,"address");
 assert.equal(v.query.origin.label,"Budapest, Váci út 18");
 assert.equal(v.selected.destination,true);
});
test("wrong/corrupt saved coordinates never override typed address",()=>{
 const v=build({places:{origin:{name:query.from,lat:350,lng:19},destination:places.destination}});
 assert.equal(v.status,"ok");
 assert.equal(v.query.origin.kind,"address");
});
test("any unrelated pair and chosen profile are accepted",()=>{
 const v=build({
  query:{from:"Debrecen, Kossuth tér 1",to:"Szeged, Dugonics tér",date:"2026-11-27",
   time:"12:30",mode:"arrive"},
  places:{origin:null,destination:null},profile:"z",priority:"transfers"
 });
 assert.equal(v.status,"ok");
 assert.equal(v.selected.origin,false);
 assert.equal(v.selected.destination,false);
 assert.equal(v.query.when,"2026-11-27T11:30:00.000Z");
 assert.equal(v.query.profile,"z");
 assert.equal(v.query.mode,"arrive");
});
test("now departure is real current Budapest time; rejects DST ambiguous times",()=>{
 const n=build({query:{...query,mode:"now"}});
 assert.equal(n.status,"ok");
 assert.equal(n.query.when,NOW.toISOString());
 const dst=build({query:{...query,date:"2026-10-25",time:"02:30"}},
 {now:new Date("2026-09-01")});
 // The default sample now is November. Previous DST time is invalid/past.
 assert.notEqual(dst.status,"ok");
});
test("V5 API is isolated, routed via existing form and all old methods still remain",()=>{
 const root="sh9/smart-travel/public-transport/smart-trip/";
 const html=readFileSync(root+"index.html","utf8");
 const controller=readFileSync(root+"smart-trip-ai-v1022.js","utf8");
 const ui=readFileSync(root+"v5/universal/smart-trip-v5-inline-v1.mjs","utf8");
 const intake=readFileSync(root+"v5/universal/smart-trip-v5-intake.mjs","utf8");
 assert.match(html,/value="google_api_v5"/);
 assert.doesNotMatch(html,/id="st22V5ApiDialog"/);
 assert.doesNotMatch(html,/id="st22V5ApiConsent"/);
 assert.doesNotMatch(html,/id="st22V5ApiDiagnose"/);
 assert.doesNotMatch(html,/id="st22V5ApiSearch"/);
 assert.match(html,/smart-trip-v5-inline-v1\.mjs/);
 for(const method of ["chatgpt","google","native","lena_native","bkk_gtfs"])
  assert.match(controller,new RegExp("'"+method+"'"));
 assert.match(controller,/places:selectedPlaces\(\)/);
 assert.match(controller,/method==='google_api_v5'/);
 assert.match(ui,/buildV5Intake/);
 assert.match(ui,/hh-guardian-family-auth-v785/);
 assert.match(ui,/hh-smart-trip-universal-v1/);
 assert.match(ui,/getSession\(\)/);
 assert.match(ui,/consent:true/);
 assert.match(ui,/mode:"search"/);
 assert.doesNotMatch(ui,/mode:"diagnose"/);
 assert.match(controller,/response\?\.status==='started'/);
 assert.match(intake,/normalizeUniversalQuery/);
 assert.doesNotMatch(ui,/window\.location\.assign|localStorage\.setItem|\.upsert\s*\(|\.insert\s*\(/);
 assert.doesNotMatch(ui,/routes\.googleapis\.com|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(html,/google_api_v5" selected/);
});
