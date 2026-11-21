/* Synthetic comparison ONLY. Does not benchmark user private GTFS or GPT-6.
 * Measures and verifies legacy-v1 vs independently prepared-v1120 itinerary parity.
 */
const {performance}=require("node:perf_hooks");
const legacy=require("../public-transport/mav/rail-gtfs-core-v1.js");
const fast=require("./rail-gtfs-core-fast-v1120.js");
const trips=Array.from({length:120},(_,i)=>{
 const t=740+i*3;
 return {id:"generated-"+i,service:"all",route:i%7===0?"Sajó Expressz":"IC "+(100+i),
  stops:[["from",t,t],["to",t+140,t+140]]};
});
const data={
 schema:"sh9-mav-gtfs-v1",timezone:"Europe/Budapest",
 rightsConfirmed:false,localOnly:true,
 source:"MÁV GTFS · SYNTHETIC / NOT A REAL SCHEDULE",
 generatedAt:"2026-11-06T10:00:00Z",
 stops:[["from","Budapest-Keleti"],["to","Kazincbarcika"]],
 services:{all:{from:"20261101",to:"20261130",days:"1111111",exceptions:{}}},
 trips
};
const q={from:"Budapest-Keleti",to:"Kazincbarcika",
 when:"2026-11-09T12:00:00Z",mode:"depart"};
const opts={localOnly:true,limit:30,ranking:"recommended",maxTransfers:1};
const time=fn=>{const s=performance.now();const result=fn();return {result,ms:performance.now()-s}};
const prep=time(()=>fast.prepare(data,{allowPrivate:true}));
if(!prep.result)throw Error("prepare refused authorized synthetic fixture");
const initialFast=time(()=>fast.route(prep.result,q,opts));
const baseline=time(()=>legacy.route(data,q,opts));
if(JSON.stringify(initialFast.result)!==JSON.stringify(baseline.result))
 throw Error("RESULTS_DIVERGED");
const a=[],b=[];
for(let i=0;i<7;i++){
 // Alternate to reduce hot code scheduling bias.
 if(i%2){a.push(time(()=>legacy.route(data,q,opts)).ms);b.push(time(()=>fast.route(prep.result,q,opts)).ms)}
 else{b.push(time(()=>fast.route(prep.result,q,opts)).ms);a.push(time(()=>legacy.route(data,q,opts)).ms)}
}
const pct=(s,p)=>{const x=[...s].sort((a,b)=>a-b);return +(x[Math.ceil((x.length-1)*p)]).toFixed(3)};
const m=(s)=>({p50Ms:pct(s,.5),p95Ms:pct(s,.95)});
const old=m(a),optimized=m(b);
console.log(JSON.stringify({
 kind:"SYNTHETIC_RAIL_ROUTING_NOT_END_TO_END",
 trips:trips.length,iterations:7,
 preparedOnceMs:+prep.ms.toFixed(3),
 coldRouteMs:+initialFast.ms.toFixed(3),
 original:old,fast:optimized,
 observedSpeedup:optimized.p50Ms>0?+(old.p50Ms/optimized.p50Ms).toFixed(2):null,
 resultsEqual:true,
 notice:"No actual MÁV/Volán, ChatGPT latency, web lookup, cloud or phone timings"
},null,2));
