'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gate=read('recepttar-studio/hh-puter-credit-gate-v1159.js');
const app=read('recepttar-studio/app.js');
const html=read('recepttar-studio/index.html');
function boot(remaining,options={}){
 let reads=0;const events=[];
 const win={
  puter:{auth:{
   isSignedIn:()=>options.signed!==false,
   getMonthlyUsage:async()=>{
    reads++;
    if(options.reject)throw Error('offline');
    return remaining===null?{}:{allowanceInfo:{remaining}};
   }
  }},
  dispatchEvent:e=>events.push(e.detail)
 };
 const CustomEvent=function(name,params){this.type=name;this.detail=params.detail};
 vm.runInNewContext(gate,{window:win,CustomEvent,console,Date});
 return{api:win.LENA_PUTER_CREDIT_GATE_V1159,reads:()=>reads,events};
}
test('Quota guard is loaded ahead of Studio app, without altering Puter UI',()=>{
 assert.match(html,/hh-puter-credit-gate-v1159\.js/);
 assert.ok(html.indexOf('hh-puter-credit-gate-v1159.js')<html.indexOf('app.js?v=1163'));
 assert.doesNotMatch(gate,/requestUpgrade|MutationObserver|querySelector\(|setInterval\(|\.style\./);
 assert.doesNotThrow(()=>new vm.Script(gate));
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.doesNotMatch(html,/sh9-golden-controls-v1\.(?:js|css)/);
});
test('Exhausted funds block metered Puter calls and cache preflight',async()=>{
 const s=boot(0);
 assert.equal(await s.api.permit(),false);
 assert.equal(s.reads(),1);
 assert.equal((await s.api.check()).reason,'low-balance');
 assert.equal(s.reads(),1);
 assert.match(s.api.message(),/helyben mentve/i);
});
test('Usable funds allow sync; unsigned/unknown balances fail closed safely',async()=>{
 const s=boot(25000000);
 assert.equal(await s.api.permit(),true);
 assert.equal((await s.api.check()).reason,'ok');
 const missing=boot(null);
 assert.equal(await missing.api.permit(),false);
 assert.equal((await missing.api.check()).reason,'usage-unavailable');
 const offline=boot(null,{reject:true});
 assert.equal(await offline.api.permit(),false);
 const signedOut=boot(25000000,{signed:false});
 assert.equal(await signedOut.api.permit(),false);
 assert.equal(signedOut.reads(),0);
});
test('All cloud bulk/background operations use credit gate',()=>{
 assert.match(app,/async function canCloudIOV1159\(\)/);
 assert.match(app,/async function loadSharedRecipes\(force=false,readLegacy=false\)/);
 assert.match(app,/if\(readLegacy&&await canCloudIOV1159\(\)\)/);
 assert.match(app,/if\(force\|\|!cached\|\|!RECIPE_ASSET_CACHE_V1\?\.fresh\(cached\)/);
 assert.match(app,/async function syncLocalRecipe\(id,\{silent=false,refresh=true\}=\{\}\)[\s\S]*?HH_OWN_RECIPE_CLOUD_V1\.putRecipe\(row\)/);
 assert.match(app,/async function syncPendingToCloud\(\)\{\s*if\(!await HH_OWN_RECIPE_CLOUD_V1\?\.available\?\.\(\)\)return 0/);
 assert.match(app,/async function loadTasteFeedback\(\)[\s\S]*?HH_OWN_RECIPE_CLOUD_V1\.listValues\(TASTE_KEY_PREFIX\)/);
 assert.match(app,/async function loadNutritionCache\(\)[\s\S]*?HH_OWN_RECIPE_CLOUD_V1\.listValues\(NUTRI_KEY_PREFIX\)/);
 assert.match(app,/async function loadCloudRecipeMeta\(\)[\s\S]*?HH_OWN_RECIPE_CLOUD_V1\.listValues\(RECIPE_META_KEY_PREFIX\)/);
});
test('Manual recipe saves remain local-first, no required account login before local write',()=>{
 for(const f of ['saveEdit','saveNew','studioFinalize','saveStructuredReadable','replaceCurrentCardImage']){
  const a=app.indexOf('async function '+f+'(');
  assert.ok(a>=0,f+' exists');
  const b=app.indexOf('\n}',a);
  const snippet=app.slice(a,b);
  if(f==='saveStructuredReadable')assert.match(snippet,/saveStructuredReadableToCloud\(/);
  else assert.match(snippet,/dbPut\(|setMeta\(/,f+' writes local');
  assert.doesNotMatch(snippet,/await ensurePuterSignIn\(\)/,f+' must not sign in before saving locally');
 }
 assert.match(app,/const savedMessage=synced\?'☁ Recept és Golden kártya felhőben mentve\.':pendingCloudNoticeV1159\(\)/);
 assert.match(app,/if\(!await canCloudIOV1159\(\)\)\{\s*nutriResult=\{ok:false/);
});
test('Manual cooked weight is stored locally and later queued for cloud',()=>{
 assert.match(app,/localStorage\.setItem\('lena:nutri:pending:'\+id,'1'\)/);
 assert.match(app,/localStorage\.setItem\(nutriLocalKey\(id\),JSON\.stringify\(next\)\)/);
 assert.match(app,/flushLocalNutritionV1159\(\)/);
 assert.match(app,/markMetaPendingV1159\(id,true\)/);
 assert.match(app,/markMetaPendingV1159\(id,false\)/);
});
test('Provider credit state never pretends local pending writes were cloud synced',()=>{
 assert.match(app,/if\(!HH_OWN_RECIPE_CLOUD_V1\?\.available\|\|!await HH_OWN_RECIPE_CLOUD_V1\.available\(\)\)/);
 assert.match(app,/const savedMessage=synced\?/);
 assert.match(app,/if\(synced\)await loadSharedRecipes\(true\)/);
});
