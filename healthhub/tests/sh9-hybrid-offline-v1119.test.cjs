const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {Script,createContext}=require("node:vm");
const path="sh9/smart-travel/smart-trip/hybrid-offline-benchmark-v1119.html";
const html=readFileSync(path,"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];

test("offline benchmark is one independent HTML with embedded original engines",()=>{
 assert.ok(script&&script.length>18000);
 assert.doesNotMatch(html,/<script[^>]+src\s*=/i);
 assert.doesNotMatch(html,/import\s*\{/);
 assert.doesNotMatch(script,/export\s*\{/);
 assert.match(html,/type="file"/);
 assert.match(html,/id="run"/);
 assert.match(html,/sh9.gtfs-offline-benchmark\/1/);
});
test("offline HTML contains no URL, upload, persistence or paid AI invocation",()=>{
 assert.doesNotMatch(html,/https?:\/\//i);
 assert.doesNotMatch(script,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/);
 assert.doesNotMatch(script,/\b(?:localStorage|sessionStorage|indexedDB)\s*\./);
 assert.doesNotMatch(script,/\.upload\s*\(/);
 assert.doesNotMatch(script,/\.location\.assign\s*\(/);
});
test("bundled production railway core + adapters compile and register",()=>{
 const fakeElement={addEventListener(){},files:[],value:"",textContent:"",disabled:false};
 const context=createContext({
  performance:{now:()=>1},
  document:{getElementById:()=>({...fakeElement})}
 });
 context.window=context;
 new Script(script,{filename:path}).runInContext(context,{timeout:2500});
 assert.equal(typeof context.SH9_MAV_GTFS_CORE_V1.validate,"function");
 assert.equal(typeof context.SH9_MAV_GTFS_CORE_V1.route,"function");
 assert.equal(typeof context.SHO_ADAPTER_V1110.combine,"function");
 assert.equal(typeof context.SHO_HYBRID_V1117.prefilter,"function");
 assert.equal(context.SHO_HYBRID_V1117.MAX_CANDIDATES,5);
});
test("real GTFS data remains local and cannot create a cloud TripPack",()=>{
 assert.match(script,/file\.text\(\)/);
 assert.match(script,/core\.validate\(data,\{allowPrivate:true\}\)/);
 assert.match(script,/core\.route\(data/);
 assert.match(script,/gpt6Ms:null,cloudSaveMs:null,endToEndMs:null/);
 assert.doesNotMatch(script,/supabase\.from\(/i);
 assert.doesNotMatch(script,/hh_my_trip_packs/i);
});
