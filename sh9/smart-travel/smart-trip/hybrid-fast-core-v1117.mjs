/* SHO Smart Trip AI · Hybrid GTFS Fast Core v1117 (preview ONLY).
 * Converts ALREADY-COMPUTED provider results to a small, auditable candidate set.
 * Never reads private GTFS from another device, never calls GPT or Supabase,
 * never changes existing search preferences or writes any personal data.
 * This file is deliberately NOT referenced by the production Smart Trip page.
 */
import {mav,volan,bkk,combine} from "./provider-results-merge-v1110.mjs";

const SCHEMA="sh9.gtfs-candidates/1";
const MAX_CANDIDATES=5;
const MAX_JSON_BYTES=1900;
const validDay=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
const safe=(s,n=100)=>String(s??"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const timeOf=iso=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(iso));
const validQuery=q=>q&&validDay(q.travelDate)&&typeof q.from==="string"&&
 typeof q.to==="string"&&safe(q.from).length>1&&safe(q.to).length>1&&
 safe(q.from).toLocaleLowerCase("hu-HU")!==safe(q.to).toLocaleLowerCase("hu-HU");
function category(x){
 const names=x.legs.map(l=>l.line).join(" ");
 if(x.provider==="volan"&&x.transfers===0)return "direct_volan";
 if(x.provider==="mav"&&/saj[oó]/i.test(names))return "sajo_express";
 if(x.provider==="mav"&&/(?:^|\s)(?:IC|EC|RJ|EX|expressz)(?:\s|\d|$)/i.test(names))
  return "other_express";
 return "other";
}
/* Diversity is for WHAT GPT-6 gets to evaluate, not an imposed choice.
 * A verified direct Volán or Sajó must not disappear merely because an
 * earlier generic duration sort returned five other routes first.
 */
function selectCandidates(options,limit=MAX_CANDIDATES){
 if(!Array.isArray(options))return [];
 const max=Math.max(1,Math.min(MAX_CANDIDATES,Number.isInteger(limit)?limit:MAX_CANDIDATES));
 const picked=[],used=new Set();
 const take=predicate=>{
  const index=options.findIndex((x,i)=>!used.has(i)&&predicate(x));
  if(index>=0&&picked.length<max){picked.push(options[index]);used.add(index)}
 };
 take(x=>category(x)==="direct_volan");
 take(x=>category(x)==="sajo_express");
 take(x=>category(x)==="other_express");
 for(const provider of ["bkk","volan","mav"])take(x=>x.provider===provider);
 options.forEach((x,i)=>{
  if(picked.length<max&&!used.has(i)){picked.push(x);used.add(i)}
 });
 return picked;
}
function compact(x){
 return {
  provider:x.provider,kind:category(x),source:safe(x.source,70),
  departure:timeOf(x.departure),arrival:timeOf(x.arrival),
  transfers:x.transfers,
  waitMinutes:x.waitVerified?x.waitMinutes:null,
  walkMeters:x.walkVerified?x.walkMeters:null,
  confidence:"timetable_not_live",
  legs:x.legs.map(l=>[l.mode,safe(l.line,30),safe(l.from,65),safe(l.to,65),
   timeOf(l.departure),timeOf(l.arrival)])
 };
}
function candidateEnvelope(query,options,{maxBytes=MAX_JSON_BYTES}={}){
 if(!validQuery(query)||!Array.isArray(options)||!options.length)return null;
 const from=safe(query.from,100),to=safe(query.to,100);
 const output={schema:SCHEMA,from,to,travelDate:query.travelDate,
  caution:"Menetrend, nem élő adat. Gyaloglás és átszállás csak igazolt esetben biztos.",
  options:options.map(compact)};
 const json=JSON.stringify(output);
 if(typeof TextEncoder!=="undefined"?new TextEncoder().encode(json).length>maxBytes:
    json.length>maxBytes)return null;
 return json;
}
/* The clock is injected to make timing testable without falsifying results.
 * providerResults must be outputs of existing BKK, MÁV and Volán planners.
 * All unavailable/invalid sources fail closed; no route inference or stitching.
 */
function prefilter({query,providerResults={},clock=()=>performance.now(),
 maxCandidates=MAX_CANDIDATES,maxJsonBytes=MAX_JSON_BYTES}={}){
 if(!validQuery(query))return {status:"invalid_query",candidates:[],elapsedMs:null};
 const begun=clock(),timings={},failures=[];
 const timed=(name,fn)=>{
  const start=clock();
  try{return fn()}catch(_){failures.push(name);return []}
  finally{timings[name+"Ms"]=Math.max(0,clock()-start)}
 };
 const source=providerResults||{};
 const ma=timed("mav",()=>source.mav?mav(source.mav,{from:query.from,to:query.to}):[]);
 const vo=timed("volan",()=>Array.isArray(source.volan)?
  volan(source.volan,{from:query.from,to:query.to,stopById:source.volanStops,
   source:source.volanSource||"Volán GTFS (helyi)",generatedAt:source.volanGeneratedAt}):[]);
 const ba=timed("bkk",()=>Array.isArray(source.bkk)&&
  typeof source.bkkTimingValidator==="function"?
  bkk(source.bkk,{from:query.from,to:query.to,
   source:"BKK Zrt., CC BY 4.0",timingValidator:source.bkkTimingValidator,
   generatedAt:source.bkkGeneratedAt}):[]);
 const merged=timed("combine",()=>combine({mav:ma,volan:vo,bkk:ba},query));
 if(!merged||!Array.isArray(merged.options)){
  return {status:"fallback_required",candidates:[],elapsedMs:Math.max(0,clock()-begun),
   timings,failures:[...failures,"combine"]};
 }
 const chosen=timed("selection",()=>selectCandidates(merged.options,maxCandidates));
 const json=timed("serialization",()=>candidateEnvelope(query,chosen,{maxBytes:maxJsonBytes}));
 const elapsedMs=Math.max(0,clock()-begun);
 if(!chosen.length)return {status:"fallback_required",reason:"no_comparable_verified_routes",
  candidates:[],timings,elapsedMs,failures,excluded:merged.excluded?.length||0};
 if(!json)return {status:"fallback_required",reason:"candidate_payload_exceeds_budget",
  candidates:[],timings,elapsedMs,failures,excluded:merged.excluded?.length||0};
 return {status:"ready",schema:SCHEMA,candidates:chosen,json,timings,elapsedMs,
  failures,excluded:merged.excluded?.length||0,sourceCount:{mav:ma.length,volan:vo.length,bkk:ba.length}};
}
/* Minimal future end-to-end telemetry contract; stages capture durations only.
 * Do not record routes, addresses, health data, JSON or access tokens.
 */
function createTimingTrace(clock=()=>performance.now()){
 const stages=[],start=clock();let previous=start;
 return Object.freeze({
  mark(stage){
   if(!["gtfs","gpt6","validate","save","my_trips"].includes(stage))return false;
   const now=clock();stages.push({stage,elapsedMs:Math.max(0,now-previous)});
   previous=now;return true;
  },
  summary(){return {totalMs:Math.max(0,clock()-start),stages:stages.map(x=>({...x})),
   completed:stages.some(x=>x.stage==="my_trips")}}
 });
}
export {SCHEMA,MAX_CANDIDATES,MAX_JSON_BYTES,category,selectCandidates,
 candidateEnvelope,prefilter,createTimingTrace};
