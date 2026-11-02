'use strict';
/* Nutrition v1133: Banana-selection and Puter AI mock tests. No cloud or AI calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const core=read('nutrition-preview-v592.js'),manual=read('hh-manual-intake-v1130.js');
const page=read('index.html'),library=read('hh-shared-food-library-v1118.js');
for(const [name,source] of [['nutrition',core],['manual',manual],['shared library',library]])
 new vm.Script(source,{filename:name+'.js'});
assert.ok(page.includes('v=1133-ai-estimate-photo-fallback'));
assert.ok(page.includes('v=1133-explicit-food-safety'));
assert.ok(page.includes('v=1133-sdk-singleton'));
assert.match(core,/entryFoodExplicitlyChosen/);
assert.match(core,/selected\.value!==currentFood/);
assert.match(core,/saved\.name!==name\|\|saved\.foodId!==rec\.foodId/);
const start=core.indexOf('function saveFood(e){'),end=core.indexOf('function readPresetInputs(){',start);
assert.ok(start>0&&end>start);
function foodCase(explicit,id,selected){
 const calls=[],dom={};
 const get=k=>dom[k]||(dom[k]={value:'',selectedOptions:[],textContent:'',close(){}});
 const foods={banana:{id:'banana',name:'Banán',kind:'food',icon:'🍌',per:{kcal:89}},
  chicken:{id:'chicken',name:'Csirkemell',kind:'food',icon:'🍗',per:{kcal:165}}};
 get('foodSelect').selectedOptions=[{value:selected}];
 get('quantity').value='100';get('unit').value='g';
 get('entryTime').value='12:10';get('meal').value='Ebéd';
 const factory=new Function('p','$','foodBy','num','chosenUnit','normalizeMeal','stamp','currentDay','uid','calc','update','success','fmt',
   'let entryFoodExplicitlyChosen=p.explicit,currentFood=p.id,currentEdit="";'+core.slice(start,end)+'return saveFood;');
 factory({explicit,id},get,k=>foods[k],Number,()=>1,x=>x,()=>new Date().toISOString(),
  ()=>'2026-11-02',()=>'entry-id',(per,g)=>({kcal:per.kcal*g/100}),
  cb=>{const data={entries:[]};cb(data);calls.push(data.entries[0])},()=>{},x=>String(x))
  ({preventDefault(){}});
 return {calls,error:get('entryError').textContent};
}
assert.equal(foodCase(false,'banana','banana').calls.length,0);
assert.equal(foodCase(true,'banana','chicken').calls.length,0);
assert.equal(foodCase(true,'chicken','chicken').calls[0].name,'Csirkemell');
assert.equal(foodCase(true,'banana','banana').calls[0].name,'Banán');
const inject=manual.replace('})(window,document);',
 'window.__setProfile=p=>session=p;window.__estimate=estimate;window.__image=image;})(window,document);');
assert.notEqual(inject,manual);
async function aiCase(mode){
 const calls=[],nodes={};
 const el=k=>nodes[k]||(nodes[k]={value:'',hidden:false,open:true,disabled:false,textContent:'',dataset:{},src:'',focus(){}});
 const doc={getElementById:el,readyState:'loading',addEventListener(){},scripts:[],querySelectorAll(){return []}};
 const w={HH_NUTRITION_QUICK_API:{getProfile:()=> 'monika'},
  HH_SHARED_FOOD_LIBRARY_V1118:{generateCardImage:async()=>{
   calls.push('image');if(mode==='image-auth')throw Error('auth required');
   return 'data:image/jpeg;base64,AAA';}},
  puter:{ai:{chat:async(prompt,options)=>{
   calls.push(options.model||'default');
   if(mode==='fallback'&&options.model)throw Error('model unavailable');
   if(mode==='credit')throw Error('insufficient_funds');
   return {message:{content:'{"kcal":290,"protein":11,"carbs":40,"fat":9,"note":"receptfüggő"}'}};
  }}}
 };
 vm.runInNewContext(inject,{window:w,document:doc,console});
 w.__setProfile('monika');
 el('hhManualName1130').value='Rakott krumpli';el('hhManualQty1130').value='250';
 el('hhManualUnit1130').value='g';el('hhManualMeal1130').value='Ebéd';
 if(mode.startsWith('image'))await w.__image();else await w.__estimate();
 return {calls,energy:el('hhManualKcal1130').value,status:el('hhManualStatus1130').textContent,
  imageSrc:el('hhManualPhoto1130').src};
}
(async()=>{
 const ok=await aiCase('normal'),backup=await aiCase('fallback'),credit=await aiCase('credit');
 const img=await aiCase('image-ok'),imgAuth=await aiCase('image-auth');
 assert.equal(ok.energy,290);
 assert.deepEqual(backup.calls,['gpt-5.4-nano','default']);
 assert.match(credit.status,/AI-keret/);
 assert.equal(img.imageSrc,'data:image/jpeg;base64,AAA');
 assert.match(imgAuth.status,/bejelentkezés/);
 console.log('Nutrition v1133: 9 Banana/AI/photo mock scenarios OK');
})().catch(e=>{console.error(e);process.exitCode=1});
