'use strict';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {normalize} from '../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs';
import {parseEnvelope,makeRecord,isSameRequest} from '../../supabase/functions/hh-lena-handover-preview/handover-core.mjs';

const testDir=resolve(import.meta.dirname,'../..');
const server=readFileSync(resolve(testDir,'supabase/functions/hh-lena-handover-preview/index.ts'),'utf8');
const source=server.replace(/^import[^\n]+\n/gm,'');
const URL_BASE='https://example.invalid/functions/v1/hh-lena-handover-preview';
const uuid='8e52a77c-1d36-4ed4-a95b-779cd5ebf751';
const bearer='Bearer '+('x'.repeat(60));
const trip=()=>({
 schema:'sh9.trip-pack/1',title:'TEST · Nem valós menetrend',
 from:'Budapest állomás',to:'Székesfehérvár vasútállomás',travelDate:'2026-11-04',
 departure:'13:15',arrival:'14:50',arrivalStatus:'unknown',
 segments:[{mode:'train',line:'TEST 123',from:'Budapest állomás',
  to:'Székesfehérvár vasútállomás',departure:'13:15',arrival:'14:50',
  status:'unknown',note:'Kizárólag tesztadat'}],
 alerts:[],sources:[],alternatives:[]
});
const envelope=(profile='m')=>({
 schema:'sh9.lena-handover/1',profile,requestId:uuid,tripPack:trip()
});
function fixture({authorized=true,user=true,enabled=false}={}){
 const rows=new Map();
 let started=null,inserts=0,reads=0;
 const userId='safe-test-auth-id';
 const client={
  auth:{getUser:async()=>({data:{user:user?{id:userId,is_anonymous:false}:null},
   error:user?null:{message:'Invalid JWT'}})},
  from(name){
   const where={};
   const query={
    select(){return this},
    eq(key,value){where[key]=value;return this},
    async maybeSingle(){
     reads++;
     if(name==='hh_profile_access'){
      return {data:authorized&&where.user_id===userId?{profile_key:where.profile_key}:null,error:null};
     }
     if(name==='hh_my_trip_packs'){
      return {data:rows.get(where.profile_key+'|'+where.trip_id)||null,error:null};
     }
     throw Error('Unexpected table: '+name);
    },
    async insert(row){
     if(name!=='hh_my_trip_packs')throw Error('Wrong table');
     const key=row.profile_key+'|'+row.trip_id;
     if(rows.has(key))return {error:{code:'23505'}};
     rows.set(key,row);inserts++;
     return {error:null};
    }
   };
   return query;
  }
 };
 const env={
  SUPABASE_URL:'https://example.invalid',
  SUPABASE_ANON_KEY:'public-test-key',
  HH_LENA_HANDOVER_PREVIEW_WRITE_ENABLED:enabled?'true':'false'
 };
 const Deno={
  env:{get:name=>env[name]||null},
  serve(handler){started=handler}
 };
 const factory=new Function(
  'Deno','createClient','normalize','parseEnvelope','makeRecord',
  'isSameRequest','Response','Headers',source
 );
 factory(Deno,()=>client,normalize,parseEnvelope,makeRecord,isSameRequest,Response,Headers);
 const request=(input=undefined,method='POST',token=bearer)=>{
  const opts={method,headers:{Authorization:token}};
  if(method==='POST'){
   opts.headers['Content-Type']='application/json';
   opts.body=JSON.stringify(input===undefined?envelope():input);
  }
  return new Request(URL_BASE,opts);
 };
 return {invoke:req=>started(req),request,rows,get inserts(){return inserts},get reads(){return reads}};
}
test('new edge preview defaults to deny unauthenticated callers',async()=>{
 const f=fixture();
 const r=await f.invoke(f.request(undefined,'POST',''));
 assert.equal(r.status,401);
 assert.equal((await r.json()).status,'unauthorized');
 assert.equal(f.inserts,0);
});
test('invalid login cannot save data',async()=>{
 const f=fixture({user:false,enabled:true});
 const r=await f.invoke(f.request());
 assert.equal(r.status,401);assert.equal(f.inserts,0);
});
test('cross-profile authorization failure before dry-run or write',async()=>{
 const f=fixture({authorized:false,enabled:true});
 const r=await f.invoke(f.request());
 assert.equal(r.status,403);
 assert.equal((await r.json()).status,'access_denied');
 assert.equal(f.inserts,0);
});
test('authenticated valid request is dry-run by default',async()=>{
 const f=fixture();
 const r=await f.invoke(f.request());
 const data=await r.json();
 assert.equal(r.status,200);
 assert.equal(data.status,'validated_dry_run');
 assert.equal(data.saved,false);
 assert.equal(f.inserts,0);
});
test('invalid TripPack fails with 422 without writing',async()=>{
 const f=fixture({enabled:true});
 const payload=envelope();
 payload.tripPack.segments=[];
 const r=await f.invoke(f.request(payload));
 assert.equal(r.status,422);
 assert.equal(f.inserts,0);
});
test('idempotent authorized write does not overwrite later ratings',async()=>{
 const f=fixture({enabled:true});
 const first=await f.invoke(f.request());
 assert.equal(first.status,201);
 const created=await first.json();
 assert.equal(created.status,'saved');
 assert.equal(f.inserts,1);
 const key='monika|'+created.tripId;
 f.rows.get(key).trip_data.rating=5;
 const again=await f.invoke(f.request());
 assert.equal(again.status,200);
 assert.equal((await again.json()).status,'already_saved');
 assert.equal(f.rows.get(key).trip_data.rating,5);
 assert.equal(f.inserts,1);
});
test('reusing UUID for a changed itinerary is rejected 409',async()=>{
 const f=fixture({enabled:true});
 await f.invoke(f.request());
 const changed=envelope();
 changed.tripPack.summary='Different requested itinerary';
 const response=await f.invoke(f.request(changed));
 assert.equal(response.status,409);
 assert.equal((await response.json()).status,'request_id_conflict');
 assert.equal(f.inserts,1);
});
test('GET status does not leak trip data',async()=>{
 const f=fixture();
 const r=await f.invoke(f.request(undefined,'GET'));
 const obj=await r.json();
 assert.equal(r.status,200);
 assert.equal(obj.status,'preview_ready');
 assert.equal(obj.mode,'dry_run');
 assert.equal(obj.mcpOAuth,false);
 assert.ok(!('tripPack' in obj));
});
test('read-only header guard and method limits',async()=>{
 const f=fixture();
 const response=await f.invoke(new Request(URL_BASE,{method:'DELETE',headers:{Authorization:bearer}}));
 assert.equal(response.status,405);
 const tooLarge=envelope();
 tooLarge.extra='x'.repeat(64001);
 const invalid=await f.invoke(f.request(tooLarge));
 assert.equal(invalid.status,413);
 assert.equal(f.inserts,0);
});
