import test from "node:test";
import assert from "node:assert/strict";
import {handleBackupControl} from "../../supabase/functions/_shared/backup-control-v1.mjs";

const ORIGIN="https://zsoltandmonika-cloud.github.io";
const USER="11111111-1111-4111-8111-111111111111";
const env={
 SUPABASE_URL:"https://vhsrupphzcjkdrusonzh.supabase.co",
 SUPABASE_ANON_KEY:"sb_publishable_test",
 SHO_BACKUP_OWNER_USER_IDS:USER,
 SHO_BACKUP_GITHUB_DISPATCH_TOKEN:"INTERNAL_BACKEND_ONLY_TEST",
 SHO_BACKUP_RUNNER_CONFIRMED:"true"
};
function scenario({origin=ORIGIN, auth=true, owner=true, runner=true,
                  workflow=true, recent=false, dispatch=204}={}){
 const calls=[];
 const local={...env,SHO_BACKUP_RUNNER_CONFIRMED:runner?"true":"false"};
 const fetchImpl=async (u,opt)=>{
  calls.push({url:u,method:opt.method,authorization:opt.headers?.Authorization});
  if(u.endsWith("/auth/v1/user"))return new Response(JSON.stringify({id:owner?USER:"22222222-2222-4222-8222-222222222222"}),{status:auth?200:401});
  if(u.includes("/workflows/sho-onedrive-full-backup-nightly.yml/runs"))return new Response(JSON.stringify({workflow_runs:recent?[{id:3,created_at:new Date().toISOString(),status:"in_progress"}]:[]}),{status:200});
  if(u.includes("/workflows/sho-onedrive-full-backup-nightly.yml/dispatches"))return new Response(null,{status:dispatch});
  if(u.includes("/workflows/sho-onedrive-full-backup-nightly.yml"))return new Response(JSON.stringify({state:workflow?"active":"disabled_manually",name:"SHO OneDrive Full Backup"}),{status:200});
  throw Error("Unexpected request: "+u);
 };
 const request=(method="GET",mode="readiness",body)=>new Request("https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-backup-control-v1?mode="+mode,{
  method,headers:{"Origin":origin,"Authorization":"Bearer "+"A".repeat(32),"Content-Type":"application/json","X-SHO-Backup-Confirm":"true"},
  ...(method==="POST"?{body:JSON.stringify(body||{operation:"start_manual_full_backup"})}:{})
 });
 const run=(request)=>handleBackupControl(request,{env:local,fetchImpl});
 return {calls,run,request,local};
}
test("owner-only CORS excludes other origins before authentication",async()=>{
 const t=scenario({origin:"https://evil.test"});
 const r=await t.run(t.request());
 assert.equal(r.status,403);
 assert.equal(r.headers.get("access-control-allow-origin"),null);
 assert.equal(t.calls.length,0);
});
test("OPTIONS is explicitly CORS-only with no privileged requests",async()=>{
 const t=scenario();
 const r=await t.run(t.request("OPTIONS"));
 assert.equal(r.status,204);
 assert.equal(r.headers.get("access-control-allow-origin"),ORIGIN);
 assert.equal(t.calls.length,0);
});
test("authentication and immutable user allowlist enforced",async()=>{
 const wrong=scenario({owner:false});
 const response=await wrong.run(wrong.request("POST","readiness",{operation:"start_manual_full_backup"}));
 assert.equal(response.status,403);
 assert.equal(wrong.calls.some(x=>x.url.includes("api.github.com")),false);
 const expired=scenario({auth:false});
 assert.equal((await expired.run(expired.request("POST","readiness",{operation:"start_manual_full_backup"}))).status,401);
});
test("readiness is false until runner prerequisites and default workflow exist",async()=>{
 const a=scenario({runner:false});
 const r=await a.run(a.request());
 assert.deepEqual((await r.json()).ready,false);
 const b=scenario({workflow:false});
 const rr=await b.run(b.request());
 assert.equal((await rr.json()).ready,false);
});
test("admin manual POST dispatches the single allowlisted workflow on main, never a restore",async()=>{
 const t=scenario();
 const res=await t.run(t.request("POST","ready",{operation:"start_manual_full_backup"}));
 assert.equal(res.status,202);
 const data=await res.json();
 assert.equal(data.status,"ACCEPTED_NOT_VERIFIED");
 const dispatch=t.calls.find(x=>x.url.endsWith("/dispatches"));
 assert.equal(dispatch.method,"POST");
 assert.ok(t.calls.every(x=>!x.url.includes("releases")&&!x.url.includes("contents")));
 assert.ok(!JSON.stringify(data).includes("INTERNAL_BACKEND_ONLY_TEST"));
});
test("unknown commands, duplicate runs and missing approval fail closed",async()=>{
 const t=scenario();
 const bad=await t.run(t.request("POST","ready",{operation:"delete_backup"}));
 assert.equal(bad.status,400);
 assert.equal(t.calls.some(x=>x.url.endsWith("/dispatches")),false);
 const recent=scenario({recent:true});
 const rr=await recent.run(recent.request("POST","ready",{operation:"start_manual_full_backup"}));
 assert.equal(rr.status,409);
 assert.equal(recent.calls.some(x=>x.url.endsWith("/dispatches")),false);
 const noRunner=scenario({runner:false});
 assert.equal((await noRunner.run(noRunner.request("POST","ready",{operation:"start_manual_full_backup"}))).status,503);
 const denied=scenario();
 const request=new Request("https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-backup-control-v1",{
  method:"POST",headers:{Origin:ORIGIN,Authorization:"Bearer "+"A".repeat(32),"Content-Type":"application/json"},
  body:JSON.stringify({operation:"start_manual_full_backup"})
 });
 assert.equal((await denied.run(request)).status,428);
});
test("GitHub unexpected dispatch responses are NOT reported as accepted",async()=>{
 const t=scenario({dispatch:403});
 const r=await t.run(t.request("POST","ready",{operation:"start_manual_full_backup"}));
 assert.equal(r.status,502);
 const data=await r.json();
 assert.equal(data.ok,false);
});
test("status endpoint reads only sanitized workflow metadata",async()=>{
 const t=scenario();
 const r=await t.run(t.request("GET","last_run"));
 assert.equal(r.status,200);
 assert.deepEqual((await r.json()).last_run,null);
 assert.equal(t.calls.some(x=>x.url.endsWith("/dispatches")),false);
});
