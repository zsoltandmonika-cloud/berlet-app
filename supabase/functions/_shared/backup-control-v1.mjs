/* SHO backup dispatch bridge, server-only. No Github token or cloud credentials in browser. */
// The public SHO application is NEVER the secret-bearing backup runner.
const OWNER="zsoltandmonika-cloud",REPO="SHO-Backup-Runner",WORKFLOW="sho-backup-unified.yml";
const EXPECTED_ORIGIN="https://zsoltandmonika-cloud.github.io";
const ACTIVE=new Set(["queued","in_progress","requested","pending","waiting"]);
const MAX_REQUEST_AGE_MS=15*60*1000;
const isConfigured=v=>typeof v==="string"&&v.trim().length>0;
const getEnv=(env,k)=>typeof env==="function"?env(k):env?.[k];
function reply(data,status=200,origin=""){
  return new Response(JSON.stringify(data),{status,headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "Vary":"Origin",
    ...(origin===EXPECTED_ORIGIN?{"Access-Control-Allow-Origin":EXPECTED_ORIGIN}:{}),
  }});
}
function fail(message,status,origin){return reply({ok:false,error:message},status,origin)}
async function serviceFetch(url,options,impl){
  const u=new URL(url);
  if(!["api.github.com"].includes(u.host)&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u.origin))
    throw Error("Disallowed upstream hostname");
  const res=await impl(u.toString(),{...options,redirect:"error",cache:"no-store"});
  return res;
}
const githubHeaders=token=>({
  "Authorization":"Bearer "+token,
  "Accept":"application/vnd.github+json",
  "X-GitHub-Api-Version":"2026-03-10"
});
async function gh(path,token,impl,method="GET",body){
  return serviceFetch("https://api.github.com/repos/"+OWNER+"/"+REPO+"/actions/"+path,{
    method,headers:{...githubHeaders(token),...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  },impl);
}
async function authOwner(request,env,impl){
  const h=request.headers.get("authorization")||"";
  const m=h.match(/^Bearer ([A-Za-z0-9._-]{24,8192})$/);
  if(!m)return {ok:false,code:401};
  const base=getEnv(env,"SUPABASE_URL")||"https://vhsrupphzcjkdrusonzh.supabase.co";
  if(base!=="https://vhsrupphzcjkdrusonzh.supabase.co")return {ok:false,code:503};
  const key=getEnv(env,"SUPABASE_ANON_KEY")||getEnv(env,"SUPABASE_PUBLISHABLE_KEY");
  const ids=(getEnv(env,"SHO_BACKUP_OWNER_USER_IDS")||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!isConfigured(key)||!ids.length||!ids.every(x=>/^[a-f0-9-]{36}$/i.test(x)))return {ok:false,code:503};
  const auth=await serviceFetch(base+"/auth/v1/user",{
    method:"GET",headers:{"Authorization":"Bearer "+m[1],"apikey":key}
  },impl);
  if(!auth.ok)return {ok:false,code:401};
  const user=await auth.json();
  if(typeof user?.id!=="string"||!ids.includes(user.id))return {ok:false,code:403};
  return {ok:true,userId:user.id};
}
async function workflowDetails(token,impl){
  // Refuse dispatch if the designated runner repository is not private.
  const repoRes=await serviceFetch("https://api.github.com/repos/"+OWNER+"/"+REPO,{
    method:"GET",headers:githubHeaders(token)
  },impl);
  if(!repoRes.ok)return null;
  const repo=await repoRes.json();
  if(repo.private!==true||repo.archived===true)return null;
  const res=await gh("workflows/"+WORKFLOW,token,impl);
  if(!res.ok)return null;
  const data=await res.json();
  return {state:data.state,name:data.name,private_repo_verified:true};
}
async function latestRuns(token,impl){
  const res=await gh("workflows/"+WORKFLOW+"/runs?per_page=10",token,impl);
  if(!res.ok)throw Error("GitHub workflow state lookup unavailable");
  const body=await res.json();
  if(!Array.isArray(body.workflow_runs))throw Error("GitHub status missing workflow_runs");
  return body.workflow_runs.map(x=>({
    id:Number(x.id)||null,created_at:String(x.created_at||""),
    status:String(x.status||"unknown"),conclusion:x.conclusion||null,
    event:String(x.event||"unknown"),name:String(x.name||""),
    url:typeof x.html_url==="string"&&x.html_url.startsWith("https://github.com/")?x.html_url:null
  }));
}
export async function handleBackupControl(request,ctx={}){
  const env=ctx.env||{},impl=ctx.fetchImpl||fetch;
  const origin=request.headers.get("origin")||"";
  if(origin!==EXPECTED_ORIGIN)return fail("Origin not allowed",403);
  if(request.method==="OPTIONS"){
    return new Response(null,{status:204,headers:{
      "Access-Control-Allow-Origin":EXPECTED_ORIGIN,
      "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, X-SHO-Backup-Confirm",
      "Access-Control-Max-Age":"300","Vary":"Origin"
    }});
  }
  if(!["GET","POST"].includes(request.method))return fail("Method not allowed",405,origin);
  try{
    const owner=await authOwner(request,env,impl);
    if(!owner.ok)return fail(owner.code===403?"Not a configured backup admin":owner.code===503?"Backup auth not configured":"Authentication required",owner.code,origin);
    const dispatchToken=getEnv(env,"SHO_BACKUP_GITHUB_DISPATCH_TOKEN");
    if(!isConfigured(dispatchToken))return fail("Backup dispatch service is not configured",503,origin);
    if(request.method==="GET"){
      const mode=new URL(request.url).searchParams.get("mode");
      if(mode==="readiness"){
        const workflow=await workflowDetails(dispatchToken,impl);
        const runnerReady=getEnv(env,"SHO_BACKUP_RUNNER_CONFIRMED")==="true";
        return reply({ok:true,bridge:"authenticated",workflow_active:workflow?.state==="active",
          runner_config_confirmed:runnerReady,
          ready:workflow?.state==="active"&&workflow?.private_repo_verified===true&&runnerReady,
          enabled_operation:"manual_backup_only"},200,origin);
      }
      if(mode==="last_run"){
        const runs=await latestRuns(dispatchToken,impl);
        return reply({ok:true,last_run:runs[0]||null},200,origin);
      }
      return fail("Unsupported status mode",400,origin);
    }
    const length=Number(request.headers.get("content-length")||0);
    if(length>1024)return fail("Request too large",413,origin);
    if(!/^application\/json(?:;|$)/i.test(request.headers.get("content-type")||""))
      return fail("JSON required",415,origin);
    const raw=await request.text();
    if(raw.length>1024)return fail("Request too large",413,origin);
    let body;try{body=JSON.parse(raw)}catch{return fail("Invalid JSON",400,origin)}
    const kinds=Object.freeze({
      start_manual_full_backup:"manual",
      start_predevelopment_full_backup:"pre_development"
    });
    if(!body||typeof body.operation!=="string"||!Object.prototype.hasOwnProperty.call(kinds,body.operation)||
       Object.keys(body).length!==1)
      return fail("Unsupported backup operation",400,origin);
    // Backup is source-read-only. Reuse owner authentication, no redundant confirmation tokens.
    if(getEnv(env,"SHO_BACKUP_RUNNER_CONFIRMED")!=="true")
      return fail("Runner prerequisites have not been verified",503,origin);
    const workflow=await workflowDetails(dispatchToken,impl);
    if(workflow?.state!=="active"||workflow.private_repo_verified!==true)return fail("Private backup workflow not active",503,origin);
    const runs=await latestRuns(dispatchToken,impl);
    const now=Date.now();
    const recent=runs.some(r=>ACTIVE.has(r.status)||
      (Number.isFinite(Date.parse(r.created_at))&&now-Date.parse(r.created_at)<MAX_REQUEST_AGE_MS&&now>=Date.parse(r.created_at)));
    if(recent)return fail("Backup running or dispatched recently",409,origin);
    const response=await gh("workflows/"+WORKFLOW+"/dispatches",dispatchToken,impl,"POST",{ref:"main",inputs:{backup_kind:kinds[body.operation]}});
    if(response.status!==204)return fail("GitHub did not accept backup request",502,origin);
    return reply({ok:true,requested:true,operation:body.operation,backup_kind:kinds[body.operation],
      status:"ACCEPTED_NOT_VERIFIED",detail:"The workflow was requested, no backup has been verified yet."},202,origin);
  }catch(_e){
    return fail("Backup control temporarily unavailable. No job completion has been confirmed.",503,origin);
  }
}
