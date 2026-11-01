import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {normalize} from '../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs';
import {parseEnvelope,makeRecord,isSameRequest} from '../../supabase/functions/hh-lena-handover-preview/handover-core.mjs';

const BASE='https://vhsrupphzcjkdrusonzh.supabase.co';
const RESOURCE=BASE+'/functions/v1/hh-lena-mcp-preview';
const file=resolve(import.meta.dirname,'../../supabase/functions/hh-lena-mcp-preview/index.ts');
const code=readFileSync(file,'utf8').replace(/^import[^\n]+\n/gm,'');
const uuid='8e52a77c-1d36-4ed4-a95b-779cd5ebf751';
const itinerary=()=>({schema:'sh9.trip-pack/1',title:'FAKE QA',from:'Budapest',
 to:'Székesfehérvár',travelDate:'2026-11-04',
 departure:'14:00',arrival:'15:00',
 segments:[{mode:'train',from:'Budapest',to:'Székesfehérvár',
  departure:'14:00',arrival:'15:00',status:'unknown',line:'FAKE'}]});
const argument=()=>({schema:'sh9.lena-handover/1',requestId:uuid,profile:'m',tripPack:itinerary()});
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function fixture(opts={}){
 let started=null,inserts=0;
 const rows=new Map();
 const user={id:'user-123',is_anonymous:false};
 const now=Math.floor(Date.now()/1000);
 const claims={iss:BASE+'/auth/v1',sub:user.id,role:'authenticated',
  aud:RESOURCE,client_id:'allowed-client',
  scope:'openid trip.write',exp:now+600,iat:now-10,...(opts.claims||{})};
 const jwt=b64({alg:'RS256',typ:'JWT'})+'.'+b64(claims)+'.'+'signature';
 const env={
  SUPABASE_ANON_KEY:'public-api-key',
  HH_LENA_MCP_WRITE_ENABLED:opts.enabled?'true':'false',
  HH_LENA_MCP_ALLOWED_CLIENT_IDS:opts.clients===undefined?'allowed-client':opts.clients,
  HH_LENA_MCP_AUDIENCE:opts.audience===undefined?RESOURCE:opts.audience
 };
 const client={auth:{getUser:async()=>({
  data:{user:opts.userDenied?null:user},
  error:opts.userDenied?{message:'invalid'}:null
 })},from(table){
  const wheres={};
  const query={
   select(){return this},eq(k,v){wheres[k]=v;return this},
   async maybeSingle(){
    if(table==='hh_profile_access')return {data:opts.profileDenied?null:{profile_key:wheres.profile_key},error:null};
    if(table==='hh_my_trip_packs')return {data:rows.get(wheres.profile_key+'|'+wheres.trip_id)||null,error:null};
    throw Error('unknown table '+table);
   },
   async insert(row){
    assert.equal(table,'hh_my_trip_packs');
    const key=row.profile_key+'|'+row.trip_id;
    if(rows.has(key))return {error:{code:'23505'}};
    rows.set(key,row);inserts++;
    return {error:null};
   }
  };return query;
 }};
 const Deno={env:{get:k=>env[k]||null},serve:callback=>{started=callback}};
 const factory=new Function('Deno','createClient','normalize','parseEnvelope',
  'makeRecord','isSameRequest','Response','Headers','atob','TextDecoder',code);
 factory(Deno,()=>client,normalize,parseEnvelope,makeRecord,isSameRequest,
  Response,Headers,atob,TextDecoder);
 const req=(method='tools/list',args=argument(),authorization=null)=>{
  const token=authorization===null?'Bearer '+jwt:authorization;
  const request={jsonrpc:'2.0',id:42,method,
   params:{name:'save_trip_pack',arguments:args}};
  return new Request(RESOURCE,{method:'POST',headers:{
   'content-type':'application/json','accept':'application/json, text/event-stream',
   'authorization':token
  },body:JSON.stringify(request)});
 };
 return {req,request:(x)=>started(x),jwt,rows,env,get inserts(){return inserts}};
}
test('MCP initialize and tools/list advertise protocol and OAuth tool schema',async()=>{
 const f=fixture();
 const init=await f.request(f.req('initialize'));
 assert.equal(init.status,200);
 assert.equal((await init.json()).result.protocolVersion,'2025-06-18');
 const list=await f.request(f.req());
 const tools=(await list.json()).result.tools;
 assert.equal(tools.length,1);
 assert.equal(tools[0].name,'save_trip_pack');
 assert.equal(tools[0].securitySchemes[0].type,'oauth2');
 assert.ok(tools[0].securitySchemes[0].scopes.includes('trip.write'));
 assert.equal(f.inserts,0);
});
test('OAuth protected resource metadata is public, no stored trip leaked',async()=>{
 const f=fixture();
 const r=await f.request(new Request(RESOURCE+'/.well-known/oauth-protected-resource'));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.resource,RESOURCE);
 assert.deepEqual(body.authorization_servers,[BASE+'/auth/v1']);
 assert.ok(!JSON.stringify(body).includes('user-123'));
});
test('missing bearer cannot invoke the write tool',async()=>{
 const f=fixture({enabled:true});
 const r=await f.request(f.req('tools/call',argument(),''));
 const result=await r.json();
 assert.equal(r.status,401);
 assert.equal(result.error,'invalid_token');
 assert.match(r.headers.get('WWW-Authenticate'),/resource_metadata=/);
 assert.equal(f.inserts,0);
});
test('non-OAuth session is rejected, even with verified Supabase user',async()=>{
 const f=fixture({enabled:true,claims:{client_id:undefined,scope:undefined,aud:'authenticated'}});
 const r=await f.request(f.req('tools/call'));
 assert.equal(r.status,401);
 assert.equal((await r.json()).error,'invalid_token');
 assert.equal(f.inserts,0);
});
test('wrong OAuth audience or missing scope is rejected',async()=>{
 for(const claim of [{aud:'authenticated'},{scope:'openid'},{client_id:'intruder'}]){
  const f=fixture({enabled:true,claims:claim});
  const r=await f.request(f.req('tools/call'));
  assert.equal(r.status,401);
  assert.equal((await r.json()).error,'invalid_token');
  assert.equal(f.inserts,0);
 }
});
test('no allowlist or audience configuration denies all writes',async()=>{
 for(const opts of [{clients:''},{audience:''},{userDenied:true}]){
  const f=fixture({...opts,enabled:true});
  const r=await f.request(f.req('tools/call'));
  assert.equal(r.status,401);
  assert.equal((await r.json()).error,'invalid_token');
  assert.equal(f.inserts,0);
 }
});
test('valid user+OAuth identity and membership only runs dry-run with pilot disabled',async()=>{
 const f=fixture();
 const result=(await (await f.request(f.req('tools/call'))).json()).result;
 assert.equal(result.structuredContent.status,'validated_dry_run');
 assert.equal(result.structuredContent.saved,false);
 assert.equal(f.inserts,0);
});
test('cross-profile access denied even with valid OAuth token',async()=>{
 const f=fixture({enabled:true,profileDenied:true});
 const result=(await (await f.request(f.req('tools/call'))).json()).result;
 assert.equal(result.isError,true);
 assert.equal(f.inserts,0);
});
test('authorized write is idempotent and retains later rating',async()=>{
 const f=fixture({enabled:true});
 const first=(await (await f.request(f.req('tools/call'))).json()).result;
 assert.equal(first.structuredContent.status,'saved');
 assert.equal(f.inserts,1);
 const row=[...f.rows.values()][0];
 row.trip_data.rating=5;
 const retry=(await (await f.request(f.req('tools/call'))).json()).result;
 assert.equal(retry.structuredContent.status,'already_saved');
 assert.equal(row.trip_data.rating,5);
 assert.equal(f.inserts,1);
});
test('same UUID with modified itinerary fails closed',async()=>{
 const f=fixture({enabled:true});
 await f.request(f.req('tools/call'));
 const changed=argument();changed.tripPack.title='DIFFERENT FAKE QA';
 const r=await f.request(f.req('tools/call',changed));
 const result=(await r.json()).result;
 assert.equal(result.isError,true);
 assert.match(result.content[0].text,/request_id_conflict/);
 assert.equal(f.inserts,1);
});
test('malformed or oversized JSON-RPC rejected without write',async()=>{
 const f=fixture({enabled:true});
 const bad=await f.request(new Request(RESOURCE,{method:'POST',
  headers:{'content-type':'application/json'},body:'{not json'}));
 assert.equal((await bad.json()).error.code,-32700);
 const huge={...argument(),tripPack:{...itinerary(),summary:'x'.repeat(80000)}};
 const r=await f.request(f.req('tools/call',huge));
 assert.equal(r.status,413);
 assert.equal(f.inserts,0);
});
