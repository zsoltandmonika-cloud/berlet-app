'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('../recepttar-studio/index.html');
const app=read('../recepttar-studio/app.js');
const automation=read('../recepttar-studio/hh-nutri-golden-standard-v1155.js');
const css=read('../recepttar-studio/hh-nutri-golden-standard-v1155.css');
const originalData=read('../recepttar/data.js');
const originalReadable=read('../recepttar/readable-data.js');

function setup(){
 const recipe={id:'recipe-1',title:'Almás zab',category:'Desszert',studioData:{servings:'4 fő'}};
 const readable={status:'verified',ingredients:['400 g alma','200 g zab','200 ml tej'],steps:['Süsd meg'],notes:[]};
 let aiCalls=0,signIn=0;
 const cache=new Map(),remote=new Map();
 const elements={};
 for(const id of ['nutriBulkCountsV1155','nutriBulkStartV1155','nutriBulkStopV1155','nutriBulkStatusV1155','nutriPuterReconnectV1166']){
  elements[id]={textContent:'',dataset:{},hidden:false,disabled:false,addEventListener(_event,fn){this.handler=fn}};
 }
 const context={
  allRecipes:()=>[recipe],getRecipe:id=>id===recipe.id?recipe:null,
  getReadable:()=>readable,getNutrition:id=>cache.get(id)||null,
  recipeServingText:()=> '4 fő',puterAvailable:()=>true,
  ensureSignedIn:async()=>{signIn++},loadNutritionCache:async()=>{},
  chatNutrition:async()=>{aiCalls++;return {servings:'4 fő',perServing:{kcal:400,protein_g:20,carbs_g:40,fat_g:12,fiber_g:4},
   finishedWeightGrams:1600,weightConfidence:'medium',uncertaintyNotes:'AI becslés'}},
  setCloudNutrition:async(id,value)=>{remote.set(id,JSON.parse(JSON.stringify(value)))},
  getCloudNutrition:async id=>remote.get(id),
  cacheNutrition:(id,value)=>cache.set(id,JSON.parse(JSON.stringify(value))),
  renderNutrition:()=>{}
 };
 const window={LENA_NUTRI_STANDARD_CONTEXT_V1155:context};
 const document={getElementById:id=>elements[id]||null};
 vm.runInNewContext(automation,{window,document,setTimeout,console}, {filename:'golden-auto.js'});
 return {api:window.LENA_NUTRI_STANDARD_V1155,context,cache,remote,elements,window,
  aiCalls:()=>aiCalls,signIns:()=>signIn};
}

test('Golden Standard frontend scripts and declarations stay syntactically valid',()=>{
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.doesNotThrow(()=>new vm.Script(automation));
 assert.match(html,/hh-nutri-golden-standard-v1155\.js/);
 assert.match(html,/hh-nutri-golden-standard-v1155\.css/);
 assert.match(html,/nutriBulkStartV1155/);
 assert.match(html,/nutriBulkStopV1155/);
 assert.match(html,/nutriAutoStatusV1155/);
 assert.match(css,/nutri-golden-batch-v1155/);
 assert.ok(html.indexOf('app.js?v=1165')<html.indexOf('hh-nutri-golden-standard-v1155.js'));
 assert.match(app,/LENA_NUTRI_STANDARD_CONTEXT_V1155/);
 assert.match(app,/nutriStandard\.afterGoldenSave\(id,\{ingredientsChanged\}\)/);
});
test('All GitHub base recipes provide structured sources for estimated backfill',()=>{
 const w={};vm.runInNewContext(originalData+';'+originalReadable,{window:w});
 const recipes=w.LENA_RECIPES,readable=w.LENA_READABLE;
 assert.ok(recipes.length>=80);
 assert.ok(recipes.every(r=>readable[r.id]?.status==='verified'&&readable[r.id].ingredients?.length>0));
});
test('No AI generation occurs on page load; 320g nutrition yields are marked estimates',async()=>{
 const s=setup();
 assert.equal(s.aiCalls(),0);
 assert.equal(s.api.stats().missing,1);
 const r=await s.api.generateOne('recipe-1');
 assert.equal(r.record.servings,'4 fő');
 assert.equal(r.record.finishedWeightGrams,1600);
 assert.equal(r.record.weightSource,'ai_estimate');
 assert.equal(r.record.source,'ai_estimate');
 assert.equal(r.record.perServing.kcal,400);
 assert.equal(r.record.nutriStandardVersion,1155);
 assert.ok(r.record.ingredientsSignature);
 assert.equal(s.cache.get('recipe-1').updatedAt,s.remote.get('recipe-1').updatedAt);
 assert.equal(s.api.stats().ready,1);
 assert.equal(s.aiCalls(),1);
 assert.equal((await s.api.generateOne('recipe-1')).skipped,true);
 assert.equal(s.aiCalls(),1,'already complete must not call AI again');
});
test('Measured cooked yield protected unless Golden ingredients really changed',async()=>{
 const s=setup();
 await s.api.generateOne('recipe-1');
 const before=s.cache.get('recipe-1');
 s.cache.set('recipe-1',{...before,finishedWeightGrams:1700,weightSource:'measured'});
 const same=await s.api.generateOne('recipe-1',{force:true});
 assert.equal(same.record.finishedWeightGrams,1700);
 assert.equal(same.record.weightSource,'measured');
 const changed=await s.api.generateOne('recipe-1',{force:true,ingredientsChanged:true});
 assert.equal(changed.record.finishedWeightGrams,1600);
 assert.equal(changed.record.weightSource,'ai_estimate');
});
test('Cloud readback failure does not pretend a failed save was successful',async()=>{
 const s=setup();s.context.getCloudNutrition=async()=>null;
 await assert.rejects(s.api.generateOne('recipe-1'),/visszaellenőrzése/);
 assert.equal(s.cache.size,0);
 assert.equal(s.api.stats().missing,1);
});
test('Legacy manual measured entry explicitly records provenance',()=>{
 assert.match(app,/weightSource:'measured'/);
 assert.match(app,/ingredientsSignature:window\.LENA_NUTRI_STANDARD_V1155/);
 assert.match(app,/AI által becsült készétel-tömeg/);
 assert.match(automation,/HealthHub-felhőmentésének/);
});

test('Zero MONTHLY allowance must not block AI with separate purchased credit',async()=>{
 const s=setup();
 s.context.getMonthlyUsage=async()=>({allowanceInfo:{remaining:0}});
 const result=await s.api.generateOne('recipe-1');
 assert.equal(result.ok,true);
 assert.equal(s.aiCalls(),1);
 assert.equal(s.remote.size,1);
 assert.equal(s.cache.size,1);
});
test('Adequate balance allows existing AI generation and verification',async()=>{
 const s=setup();
 s.context.getMonthlyUsage=async()=>({allowanceInfo:{remaining:25000000}});
 const result=await s.api.generateOne('recipe-1');
 assert.equal(result.ok,true);
 assert.equal(s.aiCalls(),1);
 assert.equal(s.api.stats().ready,1);
});
test('A credit rejection is fail-fast during bulk operation (no three repeated SDK prompts)',()=>{
 assert.match(automation,/classifyProviderError\(e\)/);
 assert.match(automation,/creditStopped=true/);
 assert.match(automation,/if\(!stopRequested&&!creditStopped&&consecutive<3\)/);
 assert.match(app,/getMonthlyUsage:\(\)=>puter\.auth\.getMonthlyUsage\(\)/);
});

test('Temporary credit lookup failure does not falsely report exhausted Puter credits',async()=>{
 const s=setup();
 s.window.LENA_PUTER_CREDIT_GATE_V1159={check:async()=>({allowed:false,reason:'usage-unavailable'})};
 const result=await s.api.generateOne('recipe-1');
 assert.equal(result.ok,true);
 assert.equal(s.aiCalls(),1);
 assert.equal(s.api.stats().ready,1);
});
test('Even when gate sees zero monthly allowance, real Puter AI decides request permission',async()=>{
 const s=setup();
 s.window.LENA_PUTER_CREDIT_GATE_V1159={check:async()=>({allowed:false,reason:'low-balance',remaining:0})};
 const result=await s.api.generateOne('recipe-1');
 assert.equal(result.ok,true);
 assert.equal(s.aiCalls(),1);
});
test('Real Puter insufficient_funds still blocks batch after exactly one rejected call',async()=>{
 const s=setup();
 s.context.chatNutrition=async()=>{throw {code:'insufficient_funds',message:'No spendable credits'}};
 await s.api.runOne();
 assert.match(s.elements.nutriBulkStatusV1155.textContent,/insufficient_funds/);
 assert.equal(s.remote.size,0);
});
test('Missing HealthHub write connection cannot consume Puter AI credits',async()=>{
 const s=setup();s.context.healthHubReady=async()=>false;
 await assert.rejects(s.api.generateOne('recipe-1'),/HealthHub-belépés/);
 assert.equal(s.aiCalls(),0);
 assert.equal(s.remote.size,0);
});

test('A local $0.05 threshold is not proof Puter denied purchased or monthly remaining credit',async()=>{
 const s=setup();
 s.window.LENA_PUTER_CREDIT_GATE_V1159={check:async()=>({allowed:false,reason:'low-balance',remaining:4000000})};
 const out=await s.api.generateOne('recipe-1');
 assert.equal(out.ok,true);
 assert.equal(s.aiCalls(),1);
});
test('Real 402 provider rejection is labelled, and is not misrepresented as a confirmed empty subscription',()=>{
 const s=setup();
 const e={status:402,message:'Payment authorization required'};
 const info=s.api.diagnoseError(e);
 assert.equal(info.kind,'billing');
 assert.match(info.text,/402/);
 assert.doesNotMatch(info.text,/elfogyott/);
});
test('True Puter insufficient_funds is distinguished from subscription_required and 429',()=>{
 const s=setup();
 assert.equal(s.api.diagnoseError({code:'insufficient_funds',message:'Not enough balance'}).kind,'credit');
 assert.equal(s.api.diagnoseError({code:'subscription_required',message:'Plan missing'}).kind,'plan');
 assert.equal(s.api.diagnoseError({code:'too_many_requests',message:'Slow down'}).kind,'rate');
 assert.equal(s.api.diagnoseError({code:'request_timeout'}).kind,'timeout');
});
test('One-recipe trial performs at most one AI call even if more recipes need nutrition',async()=>{
 const s=setup(),original=s.context.getRecipe;
 s.context.allRecipes=()=>[
  {id:'recipe-1',title:'Almás zab',category:'Desszert',studioData:{servings:'4 fő'}},
  {id:'recipe-2',title:'Répatorta',category:'Desszert',studioData:{servings:'4 fő'}}
 ];
 s.context.getRecipe=id=>id==='recipe-2'?s.context.allRecipes()[1]:original(id);
 await s.api.runOne();
 assert.equal(s.aiCalls(),1);
});
test('Single-recipe trial control is present, no bulk run starts on page load',()=>{
 assert.match(html,/id="nutriSingleStartV1165"/);
 assert.match(automation,/one\?\.addEventListener\('click',\(\)=>void batch\(1\)\)/);
 assert.match(automation,/classifyProviderError\(e\)/);
});

test('Puter password-change reconnect calls official forced account chooser directly from click',async()=>{
 const s=setup();let prompted=false,refreshed=false,signed=false,userLookups=0;
 s.window.puter={auth:{
   signIn(options){prompted=true;assert.equal(options.request_auth,true);assert.equal(options.attempt_temp_user_creation,false);
    signed=true;return Promise.resolve({success:true});},
   isSignedIn:()=>signed,
   getUser:async()=>{userLookups++;return {username:'existing-account'};},
   getMonthlyUsage:async()=>({allowanceInfo:{remaining:26000000}})
 }};
 s.window.LENA_PUTER_CREDIT_GATE_V1159={reset:()=>{refreshed=true},check:async()=>({reason:'ok',remaining:26000000})};
 const click=s.elements.nutriPuterReconnectV1166.handler;
 assert.equal(typeof click,'function','explicit button click must be wired');
 click();
 assert.equal(prompted,true,'popup must open synchronously within user gesture');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(refreshed,true,'old balance/session state must be reset');
 assert.ok(userLookups>=1);
 assert.match(s.elements.nutriBulkStatusV1155.textContent,/existing-account/);
 assert.equal(s.elements.nutriPuterReconnectV1166.disabled,false);
 assert.doesNotMatch(automation,/auth\.signOut\(/,'should not force logout or delete files');
});
test('Puter popup blocked or cancelled reports the true failure without touching recipes',async()=>{
 const s=setup();
 s.window.puter={auth:{signIn(){throw {error:'popup_blocked'};}}};
 const ok=await s.api.reconnectPuter();
 assert.equal(ok,false);
 assert.match(s.elements.nutriBulkStatusV1155.textContent,/blokkolta a felugró ablakot/i);
 assert.equal(s.remote.size,0);
 assert.equal(s.cache.size,0);
});
test('Puter account chooser cancellation preserves existing recipe and HealthHub state',async()=>{
 const s=setup();
 s.window.puter={auth:{
   signIn(){return Promise.reject({error:'auth_window_closed'});},
   getUser:async()=>({username:'original-account'})
 }};
 const ok=await s.api.reconnectPuter();
 assert.equal(ok,false);
 assert.match(s.elements.nutriBulkStatusV1155.textContent,/megszakítottad/i);
 assert.equal(s.remote.size,0);
});

test('Only real provider AI errors trigger credit or plan denial, not monthly allowance fields',()=>{
 const s=setup();
 const script=String(automation);
 assert.doesNotMatch(script,/puter_balance_zero/);
 assert.doesNotMatch(script,/low_balance_guard/);
 assert.doesNotMatch(script,/MIN_AI_REMAINING_MICROCENTS/);
 assert.match(script,/Purchased Puter credits are spent AFTER/);
 assert.equal(s.api.diagnoseError({code:'insufficient_funds'}).kind,'credit');
});
