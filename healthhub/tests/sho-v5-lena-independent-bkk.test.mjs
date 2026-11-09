import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateIndependentBkk} from "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/lena-independent-bkk-v1.mjs";
const SRC="BKK Zrt., CC BY 4.0";
const when="2026-11-27T14:00:00.000Z";
const req={from:"Hűvösvölgy",to:"Széll Kálmán tér",date:"2026-11-27",
 time:"15:00",mode:"depart",when,profile:"m",priority:"balanced"};
function leg(line,from,to,dep,arr,mode="tram"){
 return {source:SRC,coverage:"stop-to-stop",status:"timetable",mode,
  line,from,to,departure:dep,arrival:arr};
}
const direct=()=>{
 const l=leg("17",req.from,req.to,
  "2026-11-27T14:15:00.000Z","2026-11-27T14:50:00.000Z");
 return {from:req.from,to:req.to,source:SRC,coverage:"stop-to-stop",
  departure:l.departure,arrival:l.arrival,transfers:0,legs:[l]};
};
const via=(delay=8)=>{
 const first=leg("17",req.from,"Városmajor",
  "2026-11-27T14:02:00.000Z","2026-11-27T14:12:00.000Z");
 const second=leg("19","Városmajor",req.to,
  new Date(Date.parse(first.arrival)+delay*60000).toISOString(),
  new Date(Date.parse(first.arrival)+(delay+20)*60000).toISOString());
 return {from:req.from,to:req.to,source:SRC,coverage:"stop-to-stop",
  departure:first.departure,arrival:second.arrival,transfers:1,legs:[first,second],
  transfer:{footpathVerified:false,airMeters:110,waitMinutes:delay}};
};
const feed=(...results)=>({status:"ok",source:SRC,coverage:"stop-to-stop",live:false,results});
test("Léna chooses a genuine direct BKK A-plan and preserves original save handle",()=>{
 const a=direct(),b=via();
 const result=evaluateIndependentBkk(feed(b,a),req);
 assert.equal(result.status,"ok");
 assert.equal(result.aPlan.item,a);
 assert.equal(result.aPlan.transfers,0);
 assert.equal(result.aPlan.minutes,35);
 assert.equal(result.provisional,false);
 assert.equal(result.modelUsed,false);
 assert.equal(result.googleContentUsed,false);
 assert.equal(result.source,SRC);
 assert.equal(result.alternativesEvaluated,2);
 assert.match(result.warnings.join(" "),/Nem élő/);
});
test("a short unverified transfer is provisional and clearly warned",()=>{
 const result=evaluateIndependentBkk(feed(via(8)),req);
 assert.equal(result.status,"ok");
 assert.equal(result.aPlan.connectionRisk,true);
 assert.equal(result.provisional,true);
 assert.match(result.warnings.join(" "),/Szoros/);
 assert.match(result.warnings.join(" "),/gyalogos/);
});
test("unknown sources and Google content cannot be assessed",()=>{
 assert.equal(evaluateIndependentBkk({...feed(direct()),source:"Google Maps"},req).status,"unverified_source");
 assert.equal(evaluateIndependentBkk({...feed(direct()),live:true},req).status,"unverified_source");
 assert.equal(evaluateIndependentBkk({...feed(direct()),coverage:"door-to-door"},req).status,"unverified_source");
 assert.equal(evaluateIndependentBkk(feed({...direct(),source:"Google Maps"}),req).status,"no_independent_route");
 assert.equal(evaluateIndependentBkk(feed({...direct(),legs:[{...direct().legs[0],source:"Google Maps"}]}),req).status,"no_independent_route");
});
test("Léna never upgrades mismatched, overlapping, implausible or stale routes",()=>{
 assert.equal(evaluateIndependentBkk(feed({...direct(),to:"Budapest-Keleti"}),req).status,"no_independent_route");
 assert.equal(evaluateIndependentBkk(feed({...via(),transfer:{footpathVerified:true,airMeters:110,waitMinutes:8}}),req).status,"no_independent_route");
 assert.equal(evaluateIndependentBkk(feed(via(2)),req).status,"no_independent_route");
 assert.equal(evaluateIndependentBkk(feed(direct()),{...req,date:"2026-11-26"}).status,"no_independent_route");
 assert.equal(evaluateIndependentBkk(feed(direct()),{...req,when:"2026-11-27T15:20:00Z"}).status,"no_independent_route");
});
test("the V5 path separates the Google paid API UI from a no-cost verified GTFS selector",()=>{
 const root="sh9/smart-travel/public-transport/smart-trip/";
 const html=readFileSync(root+"index.html","utf8");
 const js=readFileSync(root+"v5/universal/smart-trip-v5-api-ui.mjs","utf8");
 const controller=readFileSync(root+"smart-trip-ai-v1022.js","utf8");
 assert.match(html,/id="st22V5LenaEvaluate"/);
 assert.match(html,/id="st22V5LenaResult"/);
 assert.match(html,/lena-independent-bkk-mav/);
 assert.match(js,/evaluateIndependentBkk/);
 assert.match(js,/SH9_BKK_SEARCH_V1107/);
 assert.match(js,/engine\.save\(pick\.item,q\.profile\)/);
 assert.match(js,/no-Google|Google-hívás/);
 assert.match(controller,/method==='google_api_v5'/);
 assert.match(js,/mode==="diagnose"/);
 const independent=js.slice(js.indexOf("async function runIndependentLena()"),
  js.indexOf("function open(payload)"));
 assert.doesNotMatch(independent,/renderRoutes\s*\(|\.routes\b|fetch\s*\(|OPENAI_API_KEY|api\.openai\.com/);
 assert.doesNotMatch(js,/\.insert\s*\(|\.upsert\s*\(|localStorage\.setItem/);
});