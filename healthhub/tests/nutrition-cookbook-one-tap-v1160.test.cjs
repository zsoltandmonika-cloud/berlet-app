'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('recepttar-studio/hh-nutrition-export-v1154.js');
const math=read('healthhub/nutrition/hh-cookbook-portion-math-v1154.js');
const importer=read('healthhub/nutrition/hh-cookbook-import-v1154.js');
const studio=read('recepttar-studio/index.html');
const nutrition=read('healthhub/nutrition/index.html');
const record={servings:'4 fő',finishedWeightGrams:1600,perServing:{kcal:400,protein_g:20,carbs_g:40,fat_g:12,fiber_g:4}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fakeElement(){
 return {
  attrs:{},dataset:{},style:{},children:[],textContent:'',
  setAttribute(key,val){this.attrs[key]=val},
  insertAdjacentElement(_,el){this.inserted=el},
  append(...kids){this.children.push(...kids)},
  prepend(...kids){this.children.unshift(...kids)},
  replaceChildren(){this.children=[]},
  addEventListener(event,fn){this.events=this.events||{};this.events[event]=fn}
 };
}
function bridgeBoot({search='?hhNutritionImport=1&profile=zsolt',storedProfile='z',nutritionInfo=record,photo=null}={}){
 const links={},listeners={},el=fakeElement(),anchor=fakeElement(),button=fakeElement(),storage=new Map();
 links.hhAdd320ButtonV1160=button;
 const doc={
  getElementById:id=>links[id]||null,
  querySelector:q=>q==='header.app-header'?anchor:null,
  createElement:()=>fakeElement(),
  body:{dataset:{},prepend(el){this.added=el}},
  addEventListener:(event,fn,capture)=>{listeners[event]={fn,capture}}
 };
 let assigned=null,showCount=0;
 const href='https://example.test/berlet-app/recepttar-studio/'+search;
 const win={
  location:{href,search,assign:url=>{assigned=url}},
  localStorage:{getItem:k=>k==='hh-profile'?storedProfile:null},
  sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},
  crypto:{randomUUID:()=> '12345678-1234-4123-8123-123456789abc'},
  LENA_RECIPE_NUTRITION_EXPORT_V1154:{
   recipe:id=>id==='test1'?{id,title:'Almás zab',category:'Étel'}:null,
   nutrition:()=>nutritionInfo,photo:async()=>photo,currentRecipeId:()=> 'test1',
   showRecipe:()=>{showCount++}
  }
 };
 vm.runInNewContext(math,{window:win});
 vm.runInNewContext(source,{window:win,document:doc,URL,URLSearchParams,Image:function(){},console},{filename:'studio-handoff'});
 return {win,doc,links,listeners,storage,assigned:()=>assigned,showCount:()=>showCount,anchor,button};
}
test('Prominent recipe add button and one-tap home card are both wired, other SHO navigation untouched',()=>{
 assert.match(studio,/id="hhAdd320ButtonV1160"/);
 assert.match(studio,/hh-cookbook-one-tap-v1160\.css/);
 assert.match(studio,/hh-nutrition-export-v1154\.js\?v=1160/);
 assert.match(source,/if\(importMode\)d\.addEventListener\('click'/);
 assert.match(source,/const btn=d\.getElementById\('hhAdd320ButtonV1160'\)/);
 assert.match(studio,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(nutrition,/hh-cookbook-import-v1154\.js/);
});
test('Import-mode one-click card logs a 320 g snapshot even with no recipe photo',async()=>{
 const x=bridgeBoot();
 const card={dataset:{recipeId:'test1'}};
 const event={target:{closest:selector=>selector==='#grid .card[data-recipe-id]'?card:null},
  preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
 x.listeners.click.fn(event);
 await flush();
 assert.equal(event.prevented,true);
 assert.equal(event.stopped,true);
 assert.match(x.assigned(),/\/healthhub\/nutrition\/\?hhCookbookImport=1/);
 const payload=JSON.parse(x.storage.get('hh:recipe-studio:handoff:v1154'));
 assert.equal(payload.grams,320);
 assert.equal(payload.profile,'zsolt');
 assert.equal(payload.nutrients.kcal,320);
 assert.equal(payload.nutrients.protein,16);
 assert.equal(payload.imageMissing,true);
 assert.equal(payload.name,'Almás zab');
});
test('Standalone recipe detail button adds portion with previously selected profile',async()=>{
 const x=bridgeBoot({search:'?v=1160',storedProfile:'m'});
 assert.equal(x.listeners.click,undefined,'Standalone recipe cards remain normal edit links');
 x.button.events.click({preventDefault(){}});
 await flush();
 assert.match(x.assigned(),/hhCookbookImport=1/);
 const payload=JSON.parse(x.storage.get('hh:recipe-studio:handoff:v1154'));
 assert.equal(payload.profile,'monika');
 assert.equal(payload.grams,320);
});
test('Incomplete recipe shows an actionable error, not a fake kcal value',async()=>{
 const x=bridgeBoot({nutritionInfo:null});
 await x.win.HH_LENA_COOKBOOK_IMPORT_V1160.choose('test1');
 assert.equal(x.assigned(),null);
 assert.equal(x.showCount(),1);
 assert.match(x.anchor.inserted.textContent,/Nutri Info/i);
});
test('Diary receipt does not block entry on a disconnected image vault',async()=>{
 const payload={schema:'healthhub.cookbook.handoff/1',token:'12345678-1234-4123-8123-123456789abc',
  createdAt:Date.now(),profile:'zsolt',recipeId:'test1',name:'Almás zab',grams:320,
  image:'data:image/jpeg;base64,AAAA',imageMissing:false,
  finishedWeightGrams:1600,nutrients:{kcal:320,protein:16,carbs:32,fat:9.6,fiber:3.2}};
 let imported=null,removed=false,scrolls=0,synced=0;
 const aside=fakeElement(),doc={
  readyState:'complete',
  getElementById:id=>id==='hhBevitelHeading'?{closest:()=>({insertAdjacentElement(){}})}:
   id==='log'?{scrollIntoView(){scrolls++}}:null,
  createElement:()=>fakeElement(),
  body:{prepend(){}}
 };
 const w={
  location:{search:'?hhCookbookImport=1'},
  sessionStorage:{
   getItem:k=>JSON.stringify(payload),
   removeItem(){removed=true}
  },
  HH_NUTRITION_QUICK_API:{
   getProfile:()=> 'zsolt',
   recordCookbookPortion:p=>{imported=p;return{name:p.name,kcal:p.nutrients.kcal}},
   syncNow:async()=>{synced++;return true}
  },
  HH_NUTRITION_IMAGE_V641:{connected:()=>false,save:async()=>{throw Error('Should not upload when disconnected')}}
 };
 vm.runInNewContext(importer,{window:w,document:doc,URLSearchParams,Date,console});
 await flush();await flush();
 assert.equal(removed,true);
 assert.equal(imported.grams,320);
 assert.equal(imported.imageRef,null);
 assert.equal(scrolls,1);
 assert.equal(synced,1);
});
