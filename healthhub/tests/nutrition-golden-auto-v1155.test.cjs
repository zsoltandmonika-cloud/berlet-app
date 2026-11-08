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
 for(const id of ['nutriBulkCountsV1155','nutriBulkStartV1155','nutriBulkStopV1155','nutriBulkStatusV1155']){
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
 return {api:window.LENA_NUTRI_STANDARD_V1155,context,cache,remote,elements,
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
 assert.ok(html.indexOf('app.js?v=1154')<html.indexOf('hh-nutri-golden-standard-v1155.js'));
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
 assert.match(automation,/Puter-felhőmentésének/);
});

test('Puter low balance guard stops before a denied AI request and leaves cloud data unchanged',async()=>{
 const s=setup();
 s.context.getMonthlyUsage=async()=>({allowanceInfo:{remaining:4000000}});
 await assert.rejects(s.api.generateOne('recipe-1'),/Puter AI-keret alacsony/);
 assert.equal(s.aiCalls(),0);
 assert.equal(s.remote.size,0);
 assert.equal(s.cache.size,0);
 assert.equal(s.api.stats().missing,1);
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
 assert.match(automation,/if\(isCreditFailure\(e\)\)\{/);
 assert.match(automation,/creditStopped=true/);
 assert.match(automation,/if\(!stopRequested&&!creditStopped&&consecutive<3\)/);
 assert.match(app,/getMonthlyUsage:\(\)=>puter\.auth\.getMonthlyUsage\(\)/);
});
