/* SHO AI Super Search v1 · isolated and consent-first search orchestration.
 * Pure local broker: it never fetches external data, calls a model or saves data.
 * Providers are explicitly registered by host modules; NO automatic access to
 * HealthHub, Smart Valet, Supabase, GPS, microphone or household profile data.
 * No import into production UI. The provider must enforce real auth itself.
 */
const VERSION="sho.super-search/1";
const DOMAINS=Object.freeze(["travel","sport","health","wallet","tasks"]);
const PUBLIC_DOMAINS=new Set(["travel","sport"]);
const MAX_PROVIDERS=12,MAX_ITEMS=12,MAX_CACHE=32;
const safe=(value,max=160)=>typeof value==="string"?
 value.replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,max):"";
function cloneQuery(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 try{
  const json=JSON.stringify(value);
  if(json.length>4000)return null;
  const parsed=JSON.parse(json);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return null;
  return parsed;
 }catch(_){return null}
}
function normalizeItem(item,domain,providerId,clockMs){
 if(!item||typeof item!=="object")return null;
 const id=safe(item.id,120),title=safe(item.title,160);
 const source=safe(item.source,120);
 if(!id||!title||!source)return null;
 const confidence=["timetable","verified_public","source_reported","unknown"].includes(item.confidence)?
  item.confidence:"unknown";
 const expiry=Date.parse(item.validUntil);
 const stale=Number.isFinite(expiry)&&expiry<clockMs;
 const sourceUrl=typeof item.sourceUrl==="string"&&/^https:\/\/[^\s]+$/i.test(item.sourceUrl)&&
  item.sourceUrl.length<=500?item.sourceUrl:null;
 const result={id:providerId+":"+id,domain,provider:providerId,title,
  summary:safe(item.summary,340),source,sourceUrl,
  confidence:stale?"unknown":confidence,
  stale,category:safe(item.category,50),
  startsAt:typeof item.startsAt==="string"&&Number.isFinite(Date.parse(item.startsAt))?
   new Date(item.startsAt).toISOString():null,
  endsAt:typeof item.endsAt==="string"&&Number.isFinite(Date.parse(item.endsAt))?
   new Date(item.endsAt).toISOString():null};
 return Object.freeze(result);
}
function createSuperSearch({
 clock=()=>performance.now(),now=()=>Date.now(),
 setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)
}={}){
 const registered=new Map(),publicCache=new Map();
 function register(provider){
  if(!provider||typeof provider!=="object"||registered.size>=MAX_PROVIDERS)throw Error("provider_limit");
  const {id,domain,scope,search,privacy="public",cacheMs=0}=provider;
  if(!/^[a-z][a-z0-9_-]{1,40}$/.test(id||"")||registered.has(id)||
   !DOMAINS.includes(domain)||typeof search!=="function"||
   !/^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/.test(scope||"")||
   !scope.startsWith(domain+":")||
   !["public","local_private","sensitive"].includes(privacy)||
   !Number.isInteger(cacheMs)||cacheMs<0||cacheMs>300000)
   throw Error("invalid_provider");
  if(privacy!=="public"&&cacheMs!==0)throw Error("private_cache_forbidden");
  const item=Object.freeze({id,domain,scope,privacy,cacheMs,run:search,
   cacheKey:privacy==="public"&&typeof provider.cacheKey==="function"?provider.cacheKey:null});
  registered.set(id,item);
  return Object.freeze({id,domain,privacy});
 }
 function clearPublicCache(){const count=publicCache.size;publicCache.clear();return count}
 function registry(){return Object.freeze([...registered.values()].map(p=>
  Object.freeze({id:p.id,domain:p.domain,scope:p.scope,privacy:p.privacy})))}
 function findCached(p,query){
  if(!p.cacheMs||!p.cacheKey)return null;
  let key;try{key=p.cacheKey(query)}catch(_){return null}
  if(typeof key!=="string"||!/^[a-z0-9:_-]{1,80}$/i.test(key))return null;
  const cacheId=p.id+":"+key;
  const entry=publicCache.get(cacheId);
  if(!entry)return {cacheId,items:null};
  if(entry.expires<=now()){publicCache.delete(cacheId);return {cacheId,items:null}}
  return {cacheId,items:entry.items};
 }
 function cache(p,key,items){
  if(!key||!p.cacheMs||p.privacy!=="public")return;
  if(publicCache.size>=MAX_CACHE)publicCache.delete(publicCache.keys().next().value);
  publicCache.set(key,{expires:now()+p.cacheMs,items});
 }
 async function search(request={}){
  const domain=request.domain,profile=request.profile;
  const query=cloneQuery(request.query),scopes=Array.isArray(request.scopes)?request.scopes:[];
  if(!DOMAINS.includes(domain)||!["z","m"].includes(profile)||!query||
   scopes.length>20||!scopes.every(s=>typeof s==="string"&&s.length<=80))
   return {schema:VERSION,status:"invalid_request",items:[],providers:[],elapsedMs:0};
  /* Explicit block until independently authenticated scoped adapters exist.
   * The UI supplying profile=z/m is not proof of authorization.
   */
  if(!PUBLIC_DOMAINS.has(domain))return {schema:VERSION,status:"private_domain_not_connected",
   items:[],providers:[],elapsedMs:0};
  const budgetMs=Number.isFinite(request.budgetMs)?
   Math.min(12000,Math.max(100,Math.floor(request.budgetMs))):7000;
  const start=clock();
  const active=[...registered.values()].filter(p=>p.domain===domain&&scopes.includes(p.scope));
  if(!active.length)return {schema:VERSION,status:"no_authorized_provider",items:[],providers:[],elapsedMs:0};
  if(request.signal?.aborted)return {schema:VERSION,status:"cancelled",items:[],providers:[],elapsedMs:0};
  const controller=new AbortController(),statuses=[],combined=[],seen=new Set();
  let accepting=true,timeout=false,cancelled=false;
  function acceptResults(p,result,elapsed){
   if(!accepting)return;
   const source=result&&typeof result==="object"?result:null;
   const valid=source?.status==="ok"&&Array.isArray(source.items);
   const limited=valid?source.items.slice(0,MAX_ITEMS)
    .map(item=>normalizeItem(item,domain,p.id,now())).filter(Boolean):[];
   const sourceState=valid?(limited.length?"ok":"no_usable_items"):
    ["not_covered","unavailable","no_results","stale","unauthorized"].includes(source?.status)?
     source.status:"unavailable";
   statuses.push({id:p.id,status:sourceState,elapsedMs:Math.max(0,clock()-elapsed),itemCount:limited.length});
   for(const item of limited){
    if(seen.has(item.id))continue;
    seen.add(item.id);if(combined.length<MAX_ITEMS)combined.push(item)
   }
   // View can display provisional findings, but never a final "verified" claim.
   if(typeof request.onPartial==="function"){
    try{request.onPartial(Object.freeze({source:p.id,count:limited.length,status:sourceState}))}catch(_){}
   }
  }
  function runOne(p){
   const cached=findCached(p,query);
   if(cached?.items){
    acceptResults(p,{status:"ok",items:cached.items},clock());
    return Promise.resolve();
   }
   const started=clock();
   return Promise.resolve().then(()=>{
    if(controller.signal.aborted)return {status:"unavailable"};
    /* Only a per-provider cloned query; no cross-module object graph or auth. */
    return p.run({query:cloneQuery(query),signal:controller.signal,profile,
      nowMs:now(),budgetMs,cacheAllowed:p.privacy==="public"});
   }).then(result=>{
    if(!accepting)return;
    acceptResults(p,result,started);
    if(result?.status==="ok"&&cached?.cacheId&&p.privacy==="public"){
     const valid=(result.items||[]).slice(0,MAX_ITEMS)
      .map(item=>normalizeItem(item,domain,p.id,now())).filter(Boolean);
     cache(p,cached.cacheId,valid.map(x=>({...x,id:x.id.slice(p.id.length+1)})));
    }
   }).catch(_=>{
    if(!accepting)return;
    statuses.push({id:p.id,status:"unavailable",elapsedMs:Math.max(0,clock()-started),itemCount:0});
   });
  }
  let timer=null,stopSignal;
  const deadline=new Promise(resolve=>{
   timer=setTimer(()=>{timeout=true;accepting=false;controller.abort();resolve()},budgetMs);
   stopSignal=()=>{cancelled=true;accepting=false;controller.abort();resolve()};
   if(request.signal)request.signal.addEventListener("abort",stopSignal,{once:true});
  });
  const all=Promise.allSettled(active.map(runOne));
  await Promise.race([all,deadline]);
  accepting=false;
  if(timer!==null)clearTimer(timer);
  if(stopSignal&&request.signal)request.signal.removeEventListener("abort",stopSignal);
  const elapsedMs=Math.max(0,clock()-start);
  const providerReports=active.map(p=>statuses.find(x=>x.id===p.id)||
   {id:p.id,status:cancelled?"cancelled":timeout?"timeout":"unavailable",
    elapsedMs,itemCount:0});
  return {schema:VERSION,domain,status:cancelled?"cancelled":combined.length?
   timeout?"partial_timeout":"results":timeout?"timeout":"fallback_required",
   items:combined.slice(0,MAX_ITEMS),providers:providerReports,elapsedMs,
   timedOut:timeout,modelCalled:false,cloudSaved:false,
   fallback:combined.length?null:domain==="travel"?"existing_chatgpt_handoff":"module_search"};
 }
 return Object.freeze({version:VERSION,register,registry,search,clearPublicCache});
}
export {VERSION,DOMAINS,createSuperSearch};
