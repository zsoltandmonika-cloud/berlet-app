import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validate,active} from "../../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
import {DEFAULT,HOME,compute} from "./core.mjs";

test("public BKK GTFS real-snapshot 260 boarding sanity, without live claims",t=>{
 const json=readFileSync(new URL("../../../sh9/smart-travel/lena-native/bkk/data/bkk-selected-routes-v1106.json",import.meta.url),"utf8");
 const data=JSON.parse(json);
 const day="2026-11-11"; // representative Wednesday of the 2026-11-10 snapshot
 if(data.feedStart>day||data.feedEnd<day||!validate(data)){
  t.skip("BKK feed was refreshed with a different validity window; synthetic contract remains authoritative");return;
 }
 const board=(route,name,head)=>{
  const vals=data.trips.filter(v=>v[0]===route&&
   v[3].some(ev=>data.stops[ev[0]]?.[0]===name)&&v[2].normalize("NFD").toLowerCase().includes(head));
  return vals.length;
 };
 const work=compute(data,day,DEFAULT);
 const home=compute(data,day,HOME);
 const shape={workTotal:work.totalCount,workMatched:work.matchingCount,
  homeTotal:home.totalCount,homeMatched:home.matchingCount,
  workSample:work.rows.slice(0,3).map(r=>({headsign:r.headsign,matched:!!r.best})),
  homeSample:home.rows.slice(0,3).map(r=>({headsign:r.headsign,matched:!!r.best})),
  outboundHarsanTrips:board("260","Bécsi út / Vörösvári út","harsa"),
  inboundCitronellaTrips:board("260","Citronella utca","obudai")
 };
 console.log("PUBLIC-BKK-SMART-MATCH-COUNTS",JSON.stringify(shape));

 const liveOutboundTrips=data.trips.filter(([line,service,headsign,events,mode])=>
  line==="260"&&mode==="bus"&&active(data.services[service],day)&&
  headsign.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes("harsanylejto")&&
  events.some(ev=>data.stops[ev[0]]?.[0]==="Bécsi út / Vörösvári út"));
 const stopPatterns=liveOutboundTrips.slice(0,6).map(t=>({
  headsign:t[2],atBecsi:t[3].filter(ev=>data.stops[ev[0]]?.[0]==="Bécsi út / Vörösvári út").map(ev=>ev[0]),
  around:t[3].map(x=>data.stops[x[0]]?.[0]).filter(Boolean).slice(0,12)
 }));
 console.log("PUBLIC-BKK-BOARDING-PLATFORMS",JSON.stringify({
  uniqueTrips:liveOutboundTrips.length,
  totalBecsiOccurrences:liveOutboundTrips.reduce((n,t)=>n+t[3].filter(ev=>data.stops[ev[0]]?.[0]==="Bécsi út / Vörösvári út").length,0),
  stopPatterns
 }));

 assert.ok(data.routes.includes("260"));
 assert.ok(data.routes.includes("17"));
 assert.ok(data.stops&&Object.values(data.stops).some(s=>s[0]==="Citronella utca"));
});
