// SHO Native AI zero-cost pilot. Server/CLI only; synthetic prompts; no production integration.
const scenarios=Object.freeze({
  "recipe": "Adj magyarul egy rövid, 2 adagos receptet: burgonya, sárgarépa, hagyma. Hozzávalók grammban, 3 elkészítési lépés.",
  "note": "Foglalj össze 3 teendőt ebből a kitalált jegyzetből: holnap könyvtár, pénteken bevásárlás, hétvégén növénylocsolás.",
  "shopping": "Hasonlítsd össze: A termék 500 g és 1200 Ft; B termék 750 g és 1650 Ft. Számold ki a Ft/kg értékeket és nevezd meg az olcsóbbat.",
  "admin": "Elemezd a kitalált naplót: 10:00 HTTP 429, 10:01 HTTP 503, 10:02 HTTP 200. Adj 3 biztonságos hibakezelési javaslatot."
});
function createPilot({apiKey,fetchImpl=globalThis.fetch,now=Date.now,signalFactory=()=>AbortSignal.timeout(20000)}={}){
 let attempts=0,locked=false;
 const metrics=[];
 return {async run(task){
  if(!Object.prototype.hasOwnProperty.call(scenarios,task))return {ok:false,error:"task_not_allowed"};
  if(locked)return {ok:false,error:"cost_safety_lock"};
  if(typeof apiKey!=="string"||!apiKey.trim())return {ok:false,error:"missing_api_key"};
  if(attempts>=4)return {ok:false,error:"batch_limit"};
  attempts++;const started=now();
  const finish=(o)=>{metrics.push({task,ok:o.ok,error:o.error||null,model:o.model||null,cost:o.cost??null,ms:now()-started});return o;};
  try{
   const r=await fetchImpl("https://openrouter.ai/api/v1/chat/completions",{method:"POST",redirect:"error",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},signal:signalFactory(),body:JSON.stringify({model:"openrouter/free",messages:[{role:"user",content:scenarios[task]}],max_tokens:400,stream:false,provider:{max_price:{prompt:0,completion:0}},usage:{include:true}})});
   if(!r.ok)return finish({ok:false,error:"http_"+r.status});
   const data=await r.json();
   if(data.error)return finish({ok:false,error:"provider_error"});
   const cost=data.usage?.cost;
   if(typeof cost!=="number"||!Number.isFinite(cost)||cost!==0){locked=true;return finish({ok:false,error:"nonzero_or_unverified_cost",cost:typeof cost==="number"?cost:null});}
   const content=data.choices?.[0]?.message?.content;
   if(typeof content!=="string"||!content.trim()||data.choices[0].finish_reason!=="stop")return finish({ok:false,error:"empty_or_incomplete",cost});
   return finish({ok:true,model:data.model||"unknown",cost,answer:content});
  }catch(e){return finish({ok:false,error:e?.name==="TimeoutError"||e?.name==="AbortError"?"timeout":"network_or_response_error"});}
 },metrics:()=>metrics.map(x=>({...x}))};
}
async function selfTest(){
 const assert=(cond,msg)=>{if(!cond)throw Error(msg)};
 const ok={ok:true,status:200,json:async()=>({model:"example/free",usage:{cost:0},choices:[{message:{content:"válasz"},finish_reason:"stop"}]})};
 const make=(fn)=>createPilot({apiKey:"dummy-only",fetchImpl:fn,signalFactory:()=>undefined});
 let calls=0;
 const p=make(async(url,init)=>{calls++;const b=JSON.parse(init.body);assert(url==="https://openrouter.ai/api/v1/chat/completions","endpoint");assert(b.model==="openrouter/free"&&!b.models&&!b.tools&&b.provider.max_price.prompt===0&&b.provider.max_price.completion===0,"free only");return ok});
 assert((await p.run("recipe")).ok,"success");
 assert((await p.run("unlisted")).error==="task_not_allowed"&&calls===1,"deny unknown");
 for(const t of ["note","shopping","admin"])assert((await p.run(t)).ok,"scenario "+t);
 assert((await p.run("recipe")).error==="batch_limit"&&calls===4,"batch limit");
 assert(p.metrics().length===4,"metrics");
 const m=createPilot({fetchImpl:()=>{throw Error("network must not run")}});assert((await m.run("recipe")).error==="missing_api_key","missing key");
 for(const status of [401,429,503]){let n=0;const q=make(async()=>{n++;return {ok:false,status}});assert((await q.run("recipe")).error==="http_"+status&&n===1,"HTTP no retry "+status);}
 for(const cost of [undefined,0.01]){let n=0;const q=make(async()=>{n++;return {ok:true,json:async()=>({usage:{cost}})}});assert((await q.run("recipe")).error==="nonzero_or_unverified_cost","cost");assert((await q.run("note")).error==="cost_safety_lock"&&n===1,"locked");}
 const x=make(async()=>{throw Object.assign(Error("timeout"),{name:"TimeoutError"})});assert((await x.run("recipe")).error==="timeout","timeout");
 const y=make(async()=>({ok:true,json:async()=>({usage:{cost:0},choices:[{message:{content:""},finish_reason:"stop"}]})}));assert((await y.run("recipe")).error==="empty_or_incomplete","empty");
 return "PASS: free-only request, four tasks, unknown task, batch cap, metrics, missing key, HTTP 401/429/503, no retries, unknown/nonzero cost lock, timeout, empty output";
}
export {createPilot,selfTest};
if(process.argv.includes("--self-test"))console.log(await selfTest());
else if(process.argv.includes("--live")){
 const pilot=createPilot({apiKey:process.env.OPENROUTER_API_KEY});
 for(const task of Object.keys(scenarios)){
  const r=await pilot.run(task);console.log(JSON.stringify({task,...r}));if(!r.ok){process.exitCode=1;break;}
 }
 console.log(JSON.stringify({metrics:pilot.metrics()}));
}else console.log("Use --self-test (offline) or --live (explicit API call).");
