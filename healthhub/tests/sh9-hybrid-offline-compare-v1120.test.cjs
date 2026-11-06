const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {Script,createContext}=require("node:vm");
const file="sh9/smart-travel/smart-trip/hybrid-offline-compare-v1120.html";
const html=readFileSync(file,"utf8");
const js=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
const FEED={
 schema:"sh9-mav-gtfs-v1",timezone:"Europe/Budapest",
 rightsConfirmed:false,localOnly:true,source:"MÁV GTFS · local",
 generatedAt:"2026-11-06T10:00:00Z",
 stops:[["a","Budapest-Keleti"],["b","Kazincbarcika"]],
 services:{daily:{from:"20261101",to:"20261130",days:"1111111",exceptions:{}}},
 trips:[{id:"sajo",service:"daily",route:"Sajó Expressz",
  stops:[["a",850,850],["b",1000,1000]]}]
};
function environment(){
 let ms=0;const elements=new Map();
 function el(id){
  if(!elements.has(id))elements.set(id,{
   value:"",files:[],textContent:"",disabled:false,handlers:{},
   addEventListener(event,cb){this.handlers[event]=cb}
  });
  return elements.get(id)
 }
 el("from").value="Budapest-Keleti";
 el("to").value="Kazincbarcika";
 el("date").value="2026-11-09";
 el("time").value="14:00";
 el("runs").value="3";
 el("mav").files=[{size:4000,text:async()=>JSON.stringify(FEED)}];
 const context=createContext({document:{getElementById:el},performance:{now(){return ++ms}}});
 context.window=context;
 new Script(js,{filename:file}).runInContext(context,{timeout:4000});
 return {el,context};
}
test("single file is fully offline with no external asset or data egress",()=>{
 assert.ok(js?.length>40000);
 assert.doesNotMatch(html,/<(?:script|img|link|iframe)[^>]+(?:src|href)\s*=/i);
 assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/i);
 assert.doesNotMatch(js,/\b(?:localStorage|sessionStorage|indexedDB)\s*\./i);
 assert.doesNotMatch(js,/\.upload\s*\(/i);
 assert.doesNotMatch(js,/\bimport\s*\{/);
});
test("legacy and fast engine register independently without touching live Smart Trip",()=>{
 const {context}=environment();
 assert.equal(typeof context.SH9_MAV_GTFS_CORE_V1.route,"function");
 assert.equal(typeof context.SH9_MAV_GTFS_FAST_V1120.prepare,"function");
 assert.equal(typeof context.SHO_HYBRID_V1117.prefilter,"function");
 assert.doesNotMatch(html,/smart-trip-chatgpt-handoff-v1076\.js/i);
 assert.doesNotMatch(html,/sh9-my-trip-packs|hh_my_trip_packs|supabase\.co/i);
});
test("real offline button uses user-selected feed and compares complete results",async()=>{
 const {el}=environment();
 const button=el("run");
 assert.equal(typeof button.handlers.click,"function");
 await button.handlers.click.call(button);
 assert.equal(button.disabled,false);
 const report=JSON.parse(el("output").textContent);
 assert.equal(report.schema,"sh9.gtfs-offline-benchmark/1");
 assert.equal(report.localOnly,true);
 assert.equal(report.measurements.length,2);
 assert.equal(report.measurements[0].status,"ok");
 assert.equal(report.measurements[0].parity,true);
 assert.ok(report.measurements[0].routeCount>=1);
 assert.equal(report.measurements[0].legacyRoute.runs,3);
 assert.equal(report.measurements[0].fastRoute.runs,3);
 assert.ok(report.measurements[0].prepareMs>=0);
 assert.equal(report.measurements[1].status,"file_not_selected");
 assert.equal(report.gpt6Ms,null);
 assert.equal(report.cloudSaveMs,null);
 assert.equal(report.endToEndMs,null);
 assert.equal(JSON.stringify(report).includes("Sajó Expressz"),false);
 assert.equal(JSON.stringify(report).includes("Budapest-Keleti"),false);
});
test("invalid query is blocked before local files are read",async()=>{
 const {el}=environment();
 el("time").value="99:99";
 await el("run").handlers.click.call(el("run"));
 assert.match(el("status").textContent,/érvényes dátum\/idő/);
 assert.equal(el("run").disabled,false);
});
