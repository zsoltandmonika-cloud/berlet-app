import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const root="sh9/smart-travel/public-transport/smart-trip/v5/real-test/";
const script=readFileSync(root+"client.mjs","utf8")
 .replace(/^import \{evaluate,lenaSummary\} from "\.\/engine\.mjs(?:\?[^"]+)?";\s*/m,
 'const evaluate=()=>null,lenaSummary=()=>"";\n');
if(/^\s*import\s/m.test(script))throw Error("The client gained new imports; update browser test.");
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};

function browserHarness(){
 const nodes=new Map();
 const element=id=>{
  if(nodes.has(id))return nodes.get(id);
  const value={id,disabled:false,hidden:false,checked:id==="agree",value:"balanced",
   textContent:"",attributes:new Set(),events:new Map(),
   addEventListener(name,cb){this.events.set(name,cb);},
   setAttribute(name){this.attributes.add(name);},
   removeAttribute(name){this.attributes.delete(name);},
   replaceChildren(){},appendChild(){}};
  nodes.set(id,value);return value;
 };
 const fixture={schema:"sho.smart-trip.diagnostic/1",
  status:"ready_for_real_test",googleRequests:0,quotaReserved:0,
  paidProviderContacted:false,checks:{google_key:true,admin_key:true,
    public_key:true,quota_readable:true},blocking:[],
  quotaUsedToday:0,quotaUsedMonth:0,newAttemptAllowed:true};
 let diagnostic=fixture,requestCount=0,diagnoseCount=0;
 const mockClient={auth:{getSession:async()=>({
  data:{session:{user:{id:"signed-in-user"},access_token:"mock-session-token"}},error:null
 })}};
 const host={
  console,URL,AbortController,Promise,setTimeout,clearTimeout,
  performance:{now:()=>Date.now()},
  document:{getElementById:element,createElement:tag=>({
   tag,textContent:"",className:"",appendChild(){},replaceChildren(){}
  })},
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:
   "https://vhsrupphzcjkdrusonzh.supabase.co/",
   publishableKey:"pk_mock_012345678901234567890"},
  supabase:{createClient:()=>mockClient},
  fetch:async(_,options)=>{
   const body=JSON.parse(options.body);
   if(body.mode==="diagnose"){
    diagnoseCount++;
    return {ok:true,status:200,text:async()=>JSON.stringify(diagnostic)};
   }
   assert.equal(body.mode,"real_test");
   requestCount++;
   return {ok:false,status:503,text:async()=>JSON.stringify({
    error:"google_routes_key_missing",googleRequests:0,quotaReserved:0
   })};
  }
 };
 host.globalThis=host;
 vm.runInNewContext(script,host,{timeout:1000});
 return {
  node:element,
  click:async id=>{const cb=element(id).events.get("click");
   assert.equal(typeof cb,"function");cb();await flush();},
  stats:()=>({requestCount,diagnoseCount}),
  setDiagnostic:value=>{diagnostic={...fixture,...value};}
 };
}
test("A prior HTTP 503 locks run, but verified zero-quota diagnosis safely re-arms it",async()=>{
 const h=browserHarness();
 assert.equal(h.node("run").disabled,false);
 await h.click("run");
 assert.equal(h.stats().requestCount,1);
 assert.equal(h.node("run").disabled,true);
 assert.equal(h.node("timing").hidden,false);
 assert.match(h.node("status").textContent,/HTTP 503/);
 await h.click("diagnose");
 assert.equal(h.stats().diagnoseCount,1);
 assert.equal(h.stats().requestCount,1);
 assert.equal(h.node("run").disabled,false);
 assert.equal(h.node("timing").hidden,true);
 assert.equal(h.node("out").hidden,true);
 assert.match(h.node("status").textContent,/0 foglalás/);
 await h.click("run");
 assert.equal(h.stats().requestCount,2);
 assert.equal(h.node("run").disabled,true);
});
test("Any existing daily Google quota blocks new paid attempts after diagnosis",async()=>{
 const h=browserHarness();
 await h.click("run");
 h.setDiagnostic({quotaUsedToday:1,newAttemptAllowed:false});
 await h.click("diagnose");
 assert.equal(h.node("run").disabled,true);
 assert.match(h.node("status").textContent,/1 foglalás/);
 await h.click("run");
 assert.equal(h.stats().requestCount,1);
});
test("Missing configuration and unknown quota must fail closed",async()=>{
 const h=browserHarness();
 await h.click("run");
 h.setDiagnostic({
  checks:{google_key:false,admin_key:true,public_key:true,quota_readable:true},
  blocking:["google_key"],status:"not_ready",newAttemptAllowed:false
 });
 await h.click("diagnose");
 assert.equal(h.node("run").disabled,true);
 assert.match(h.node("status").textContent,/Google Routes API-kulcs hiányzik/);
 h.setDiagnostic({quotaUsedToday:null,newAttemptAllowed:false});
 await h.click("diagnose");
 assert.equal(h.node("run").disabled,true);
 assert.equal(h.stats().requestCount,1);
});
