import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.9.6";
const issuer="https://token.actions.githubusercontent.com";
const endpoint="https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/lena-capital-publish-v1";
const jwks=createRemoteJWKSet(new URL(issuer+"/.well-known/jwks"),{timeoutDuration:8000});
const out=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const finite=(x:unknown)=>typeof x==="number"&&Number.isFinite(x);
const sym=(x:unknown)=>x===null||["SPY","QQQ","IWM"].includes(String(x));
const date=(x:unknown)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
const text=(x:unknown)=>typeof x==="string"?x.slice(0,300):null;
function clean(s:any){
 if(!s||s.schema!==1||s.mode!=="PAPER_ONLY"||s.initial!==100000||!["WAITING","RUNNING","RISK_HALT","PAUSED","COMPLETE"].includes(s.status)||!date(s.lastDate)||typeof s.asOf!=="string"||!Number.isFinite(Date.parse(s.asOf))||Date.parse(s.asOf)>Date.now()+60000||!finite(s.nav)||!finite(s.benchmarkNav)||!finite(s.drawdown)||!sym(s.portfolio?.symbol)||!sym(s.pending?.target)||!Array.isArray(s.history)||s.history.length<1||s.history.length>200||!s.history.every((x:any)=>date(x.date)&&finite(x.nav)&&finite(x.benchmark))||!Array.isArray(s.trades)||s.trades.length>400||!Array.isArray(s.decisions))throw Error("invalid_snapshot");
 return {schema:1,mode:"PAPER_ONLY",initial:100000,asOf:s.asOf,lastDate:s.lastDate,status:s.status,nav:s.nav,benchmarkNav:s.benchmarkNav,drawdown:s.drawdown,history:s.history.map((x:any)=>({date:x.date,nav:x.nav,benchmark:x.benchmark})),portfolio:{symbol:s.portfolio.symbol},pending:{target:s.pending.target},trades:s.trades.filter((x:any)=>x?.kind==="STRATEGY").map(()=>({kind:"STRATEGY"})),decisions:s.decisions.slice(-1).map((x:any)=>({reason:text(x?.reason)})),reason:text(s.reason)};
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return out({error:"method_not_allowed"},405);
 const auth=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._-]{100,10000}$/.test(auth))return out({error:"oidc_required"},401);
 try{
  const {payload:p}=await jwtVerify(auth.slice(7),jwks,{issuer,audience:endpoint,algorithms:["RS256"],requiredClaims:["exp","iat","sub"],maxTokenAge:"5 minutes",clockTolerance:5});
  if(p.repository_id!=="1472511563"||p.repository_owner_id!=="320519759"||p.repository!=="zsoltandmonika-cloud/Lena-Capital-"||p.repository_visibility!=="private"||p.ref!=="refs/heads/main"||p.workflow_ref!=="zsoltandmonika-cloud/Lena-Capital-/.github/workflows/paper-pilot.yml@refs/heads/main"||!["schedule","workflow_dispatch"].includes(String(p.event_name)))return out({error:"workflow_not_authorized"},403);
 }catch(_){return out({error:"oidc_invalid"},401)}
 try{
  if(Number(req.headers.get("content-length"))>150000||!req.body)return out({error:"invalid_size"},413);
  const reader=req.body.getReader(),parts:Uint8Array[]=[];let total=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>150000){await reader.cancel();return out({error:"invalid_size"},413)}parts.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
  let s;try{s=clean(JSON.parse(new TextDecoder().decode(bytes)))}catch(_){return out({error:"invalid_snapshot"},400)}
  const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return out({error:"server_config"},503);
  const response=await fetch(base+"/rest/v1/lena_capital_paper_snapshot?on_conflict=as_of",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({as_of:s.asOf,snapshot:s}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return out({error:"snapshot_write_failed"},502);
  return out({ok:true,asOf:s.asOf});
 }catch(_){return out({error:"snapshot_publish_failed"},503)}
});