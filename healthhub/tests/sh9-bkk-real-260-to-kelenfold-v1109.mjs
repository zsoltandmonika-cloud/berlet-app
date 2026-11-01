/* SH9 v1109 actual official BKK feed acceptance gate.
 * Citronella utca -> Kelenföld vasútállomás M
 * 2026-11-02 17:53 Budapest, known screenshot failure case.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {findConnections,toConnectionPack}
 from "../../sh9/smart-travel/lena-native/bkk/bkk-one-transfer-v1109.mjs";
import {normalize} from "../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs";
const path="sh9/smart-travel/lena-native/bkk/data/bkk-selected-routes-v1106.json";
const data=JSON.parse(fs.readFileSync(path,"utf8"));
const request={date:"2026-11-02",mode:"depart",
 when:"2026-11-02T16:53:00.000Z",
 from:"Citronella utca",to:"Kelenföld vasútállomás M"};
const at=Date.parse("2026-11-01T18:10:00.000Z");
const matches=findConnections(data,request,at);
const stops=Object.values(data.stops);
if(!matches.length){
 const from=stops.filter(x=>x[0].toLowerCase().includes("citronella")).map(x=>x[0]);
 const to=stops.filter(x=>x[0].toLowerCase().includes("kelenföld")).map(x=>x[0]);
 const interchange=stops.filter(x=>x[0].toLowerCase().includes("vörösvári")).map(x=>x[0]);
 console.error("Official source candidate stops:",JSON.stringify({from,to,interchange}));
 throw Error("Citronella -> Kelenföld must find real one-transfer BKK option");
}
const matching=matches.find(x=>x.transfers===1&&x.legs.length===2&&
 x.legs[0].line==="260"&&x.legs[1].line==="19");
if(!matching){
 console.error("Actual connections",JSON.stringify(matches.map(x=>({
  lines:x.legs.map(y=>y.line),departure:x.departure,arrival:x.arrival,
  transfer:x.transfer
 }))));
 throw Error("Expected 260→19 connection missing on official 2026-11-02 schedule");
}
const pack=normalize(toConnectionPack(request,matching));
assert.equal(pack.segments.length,2);
assert.deepEqual(pack.segments.map(x=>x.line),["260","19"]);
assert.equal(pack.travelDate,"2026-11-02");
assert.match(pack.summary,/gyalog|séta|légvonal/i);
assert.equal(pack.sources[0].name,"BKK Zrt., CC BY 4.0");
console.log("ACTUAL BKK 260→19 SH9 TripPack PASS",JSON.stringify({
 from:pack.from,to:pack.to,departure:pack.departure,arrival:pack.arrival,
 segments:pack.segments,transfer:matching.transfer
},null,2));
