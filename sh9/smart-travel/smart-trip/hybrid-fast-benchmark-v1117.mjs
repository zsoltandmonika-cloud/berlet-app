/* Synthetic ONLY: tracks the cost of the isolated adapter, not ChatGPT latency.
 * CI output is diagnostic and deliberately has NO absolute speed pass/fail.
 */
import {performance} from "node:perf_hooks";
import {prefilter} from "./hybrid-fast-core-v1117.mjs";
const query={from:"Budapest",to:"Kazincbarcika",travelDate:"2026-11-09"};
const journeys=Array.from({length:20},(_,i)=>{
 const departure=new Date(Date.parse("2026-11-09T14:00:00Z")+i*8*60000);
 const arrival=new Date(departure.getTime()+3*3600000);
 return {legs:[{service:i===0?"Sajó Expressz":"IC "+(100+i),
  tripId:"benchmark-"+i,from:query.from,to:query.to,
  departure:departure.toISOString(),arrival:arrival.toISOString()}]};
});
const providerResults={mav:{status:"ok",source:"MÁV GTFS · local synthetic",generatedAt:"2026-11-07T10:00:00Z",journeys}};
const samples=[];let failures=0;
for(let i=0;i<220;i++){
 const start=performance.now();
 const result=prefilter({query,providerResults,maxJsonBytes:2500,clock:()=>performance.now()});
 const ms=performance.now()-start;
 if(result.status!=="ready")failures++;
 if(i>=20)samples.push(ms); // warm-up is excluded
}
samples.sort((a,b)=>a-b);
const pct=p=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*p))];
const output={kind:"synthetic_prefilter_only",iterations:samples.length,
 first20Excluded:true,failures,
 p50Ms:Number(pct(.5).toFixed(3)),p95Ms:Number(pct(.95).toFixed(3)),
 note:"NOT real GTFS feed, GPT-6, mobile device, cloud sync, or end-to-end timing"};
process.stdout.write(JSON.stringify(output,null,2)+"\n");
if(failures)process.exitCode=1;
