'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const adapter=fs.readFileSync(path.join(ROOT,'recepttar-studio/hh-recipe-own-cloud-v1.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'recepttar-studio/app.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'recepttar-studio/index.html'),'utf8');
function boot({signed=true,mismatch=false,denyLogin=false,denyProfile=false}={}){
 const state=new Map(),files=new Map(),recipes=new Map(),kv=new Map(),calls=[];
 if(signed)state.set('hh-supabase-health-session-v1',JSON.stringify({
  access_token:'test-jwt',refresh_token:'test-refresh',expires_at:Math.ceil(Date.now()/1000)+3600
 }));
 const local=new Map();
 const win={HH_CENTRAL_VAULT:{supabaseUrl:'https://test.supabase.co',publishableKey:'sb_publishable_mock'},
  sessionStorage:{getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k)},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  dispatchEvent:()=>{}};
 const response=(data,status=200)=>({ok:status>=200&&status<300,status,
  async text(){return JSON.stringify(data)},async json(){return data},async blob(){return data}});
 async function fetchMock(url,opts={}){
  const p=url.replace('https://test.supabase.co',''),method=opts.method||'GET';
  calls.push({path:p,method});
  if(p.startsWith('/auth/v1/token?grant_type=password'))
    return denyLogin?response({error:'invalid_grant'},400):response({access_token:'new-jwt',refresh_token:'new-refresh',expires_in:3600});
  if(p.startsWith('/rest/v1/hh_profiles?'))
    return response(denyProfile?[]:[{profile_key:'zsolt'}]);
  if(p.startsWith('/auth/v1/user'))return response({id:'user-1',email:'mock@example.com'});
  if(p.startsWith('/storage/v1/object/hh-recipe-studio-v1/')){
   const key=decodeURIComponent(p.replace('/storage/v1/object/hh-recipe-studio-v1/',''));
   if(method==='POST'){files.set(key,opts.body);return response({Key:key})}
   if(method==='GET'){const blob=files.get(key);return response(mismatch?{size:0,type:'image/jpeg'}:blob,blob?200:404)}
  }
  if(p==='/storage/v1/object/hh-recipe-studio-v1'&&method==='DELETE'){
   for(const key of JSON.parse(opts.body).prefixes)files.delete(key);
   return response({});
  }
  if(p.startsWith('/rest/v1/hh_recipe_studio_recipes_v1')){
   const query=new URLSearchParams(p.split('?')[1]||'');
   if(method==='POST'){
    const item=JSON.parse(opts.body);recipes.set(item.id,item);return response([item]);
   }
   if(method==='GET'){
    const id=String(query.get('id')||'').replace(/^eq\./,'');
    return response(id?(recipes.has(id)?[recipes.get(id)]:[]):[...recipes.values()]);
   }
   if(method==='DELETE'){
    recipes.delete(String(query.get('id')).replace(/^eq\./,''));return response(null);
   }
  }
  if(p.startsWith('/rest/v1/hh_recipe_studio_kv_v1')){
   const query=new URLSearchParams(p.split('?')[1]||'');
   if(method==='POST'){
    const input=JSON.parse(opts.body);
    // pg jsonb sorts keys, which must not cause a false negative in readback.
    const value={};for(const k of Object.keys(input.value).sort())value[k]=input.value[k];
    kv.set(input.key,value);return response([{...input,value}]);
   }
   if(method==='GET'){
    const match=query.get('key')||'';
    if(match.startsWith('eq.'))return response(kv.has(match.slice(3))?[{value:kv.get(match.slice(3))}]:[]);
    if(match.startsWith('like.'))return response([...kv.entries()].filter(([key])=>key.startsWith(match.slice(5,-1)))
      .map(([key,value])=>({key,value})));
   }
   if(method==='DELETE'){kv.delete(String(query.get('key')).slice(3));return response(null)}
  }
  throw Error('Unexpected remote request '+method+' '+p);
 }
 vm.runInNewContext(adapter,{window:win,fetch:fetchMock,URLSearchParams,Date,console,Event:class Event{}});
 return{api:win.HH_RECIPE_OWN_CLOUD_V1,files,recipes,kv,calls,state,local};
}
test('HealthHub own cloud loads before the Studio and keeps Puter for AI only',()=>{
 assert.ok(html.indexOf('hh-recipe-own-cloud-v1.js')<html.indexOf('app.js?v=1164'));
 assert.ok(html.indexOf('central-vault/config.js')<html.indexOf('hh-recipe-own-cloud-v1.js'));
 assert.match(app,/HH_OWN_RECIPE_CLOUD_V1\.putRecipe\(row\)/);
 assert.match(app,/async function loadSharedRecipes\(force=false,readLegacy=false\)/);
 assert.match(app,/if\(readLegacy&&await canCloudIOV1159\(\)\)/);
 assert.match(html,/id="importLegacyPuterV1"/);
 assert.doesNotThrow(()=>new vm.Script(adapter));
 assert.doesNotThrow(()=>new vm.Script(app));
});
test('Own cloud saves card, verifies it, lists it and deletes without Puter',async()=>{
 const b=boot(),blob=new Blob(['Golden recipe bytes'],{type:'image/jpeg'});
 assert.equal(await b.api.account(),'sb:user-1');
 const saved=await b.api.putRecipe({id:'u12345',title:'Krémleves',category:'Levesek',blob,createdAt:Date.now()});
 assert.equal(saved.card_path,'zsolt-monika/u12345/card.jpg');
 assert.equal(b.files.size,1);
 assert.equal((await b.api.listRecipes())[0].storage,'supabase');
 await b.api.deleteRecipe('u12345');
 assert.equal(b.files.size,0);assert.equal(b.recipes.size,0);
 assert.ok(b.calls.every(c=>!c.path.includes('puter')));
});
test('Metadata and nutrition are returned after verified write, regardless of jsonb key order',async()=>{
 const b=boot(),key='lena:nutri:uabc123';
 assert.equal(await b.api.putValue(key,{updatedAt:'now',id:'uabc123',servings:'4 fő'}),true);
 assert.equal((await b.api.getValue(key)).servings,'4 fő');
 assert.equal((await b.api.listValues('lena:nutri:')).length,1);
 await b.api.deleteValue(key);assert.equal(b.kv.size,0);
});
test('Expired/no HealthHub session cannot falsely claim a completed cloud save',async()=>{
 const b=boot({signed:false}),blob=new Blob(['recept'],{type:'image/jpeg'});
 assert.equal(await b.api.available(),false);
 await assert.rejects(b.api.putRecipe({id:'u12345',title:'Tesztrecept',blob}),/be kell jelentkezni/i);
 assert.equal(b.files.size,0);assert.equal(b.recipes.size,0);
});
test('Failed image readback never marks recipe cloud-synced',async()=>{
 const b=boot({mismatch:true}),blob=new Blob(['recept'],{type:'image/jpeg'});
 await assert.rejects(b.api.putRecipe({id:'u12345',title:'Tesztrecept',blob}),/visszaellenőrzése sikertelen/i);
 assert.equal(b.recipes.size,0);
});

test('Inline login works without navigating away, with family authorization and trusted session',async()=>{
 const b=boot({signed:false});
 assert.match(html,/id="syncLoginFormV1164"/);
 assert.match(html,/id="syncLoginStateV1164"/);
 assert.doesNotMatch(app,/location\.assign\(HH_OWN_RECIPE_CLOUD_V1\.loginUrl\)/);
 assert.match(app,/HH_OWN_RECIPE_CLOUD_V1\.signIn\(email,password,remember\)/);
 const user=await b.api.signIn('family@example.com','example-pass',true);
 assert.equal(user.id,'user-1');
 assert.equal(JSON.parse(b.state.get('hh-supabase-health-session-v1')).access_token,'new-jwt');
 assert.equal(JSON.parse(b.local.get('hh-supabase-health-session-v1')).access_token,'new-jwt');
 assert.equal(b.local.get('hh-health-vault-trusted-device-v332'),'yes');
});
test('Failed account switch preserves existing authenticated session',async()=>{
 const b=boot({denyLogin:true}),previous=b.state.get('hh-supabase-health-session-v1');
 await assert.rejects(b.api.signIn('other@example.com','bad-pass',false),/Hibás e-mail/);
 assert.equal(b.state.get('hh-supabase-health-session-v1'),previous);
});
test('Non-family HealthHub accounts cannot replace the current household session',async()=>{
 const b=boot({denyProfile:true}),previous=b.state.get('hh-supabase-health-session-v1');
 await assert.rejects(b.api.signIn('unrelated@example.com','example-pass',false),/nincs engedélyezett/);
 assert.equal(b.state.get('hh-supabase-health-session-v1'),previous);
});
