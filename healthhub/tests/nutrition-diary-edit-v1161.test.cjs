'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const math=read('healthhub/nutrition/hh-diary-scale-v1161.js');
const editor=read('healthhub/nutrition/hh-diary-edit-v1161.js');
const nutritionCore=read('healthhub/nutrition/nutrition-preview-v592.js');
const index=read('healthhub/nutrition/index.html');
function baseRecord(overrides={}){
 return {id:'cookbook:testtoken',date:'2026-11-08',time:'12:40',meal:'Ebéd',kind:'food',
 name:'Almás zabkása',quantity:320,unit:'g',quantityText:'320 g',
 nutrients:{kcal:400,protein:24,carbs:58,fat:12,fiber:6,vitc:null,calcium:180},
 cookbookImport:{token:'testtoken',recipeId:'apples',grams:320,finishedWeightGrams:1600,imageRef:{sha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}},
 ...overrides};
}
function loadScaler(){
 const w={};vm.runInNewContext(math,{window:w},{filename:'hh-diary-scale-v1161.js'});
 return w.HH_NUTRITION_DIARY_SCALE_V1161;
}
function fakeElement(tag='div',index){
 const obj={tagName:tag,children:[],events:{},dataset:{},attrs:{},style:{},
  value:'',textContent:'',open:false,hidden:false,
  append(...children){this.children.push(...children)},
  addEventListener(name,fn){this.events[name]=fn},
  setAttribute(k,v){this.attrs[k]=v},
  showModal(){this.open=true},
  close(){this.open=false;this.events.close?.()},
  focus(){},
  querySelector(selector){return selector==='.hh-diary-edit-dismiss-v1161'?fakeElement('button',index):null}
 };
 if(tag==='dialog'){
  Object.defineProperty(obj,'innerHTML',{set(text){
   this.markup=text;
   for(const found of text.matchAll(/id="([^"]+)"/g)){
    const n=fakeElement(found[1].includes('Amount')?'input':'div',index);
    n.id=found[1];index.set(found[1],n);
   }
  }});
 }
 return obj;
}
function setupEditor(data=baseRecord()){
 const ids=new Map(),rootWin={HH_NUTRITION_DIARY_SCALE_V1161:loadScaler()},writes=[];
 const d={
  createElement:tag=>fakeElement(tag,ids),
  getElementById:id=>ids.get(id)||null,
  body:fakeElement('body',ids)
 };
 rootWin.HH_NUTRITION_QUICK_API={
  getProfile:()=> 'zsolt',
  updateDiaryEntry:payload=>{
   writes.push(payload);
   return {id:payload.id,name:payload.name,meal:payload.meal,quantity:payload.quantity,profile:payload.expectedProfile}
  }
 };
 vm.runInNewContext(editor,{window:rootWin,document:d,console,Date},{filename:'hh-diary-edit-v1161.js'});
 const api=rootWin.HH_NUTRITION_DIARY_EDIT_V1161;
 const dialog=ids.get('hhDiaryEditDialogV1161')||d.body.children.find(x=>x.tagName==='dialog');
 const field=key=>{
  const label=ids.get('hhDiaryEditNutrientsV1161').children.find(x=>x.children.some(c=>c.dataset.nutrient===key));
  return label.children.find(c=>c.dataset.nutrient===key);
 };
 return {api,data,ids,dialog,field,writes,open:()=>api.open(data)};
}
test('Live weight scaling uses original snapshot, handles 320→200g and 200→300g without rounding drift',()=>{
 const s=loadScaler(),row=baseRecord(),inferred=s.infer(row);
 assert.equal(inferred.amount,320);assert.equal(inferred.unit,'g');
 const cut=s.scale(row.nutrients,320,200);
 assert.equal(cut.kcal,250);
 assert.equal(cut.protein,15);
 assert.equal(cut.carbs,36.25);
 assert.equal(cut.fat,7.5);
 assert.equal(cut.fiber,3.75);
 assert.equal(cut.vitc,null);
 assert.equal(cut.calcium,112.5);
 assert.equal(s.scale(row.nutrients,320,320).kcal,400);
 assert.equal(s.scale(row.nutrients,320,300).kcal,375);
 assert.throws(()=>s.validation(1601,'g',1600),/nagyobb/);
 assert.equal(s.validation(200,'g',1600),200);
});
test('All types of existing diary rows have a truthful default amount/unit',()=>{
 const m=loadScaler();
 assert.equal(m.infer({quantity:250,unit:'ml'}).amount,250);
 assert.equal(m.infer({volumeMl:320}).unit,'ml');
 assert.equal(m.infer({quantityText:'Fotóból becsült · 350 g'}).amount,350);
 assert.equal(m.infer({quantityText:'2 adag'}).amount,null);
 assert.equal(m.infer({quantityText:'1 előre beállított adag'}).unit,'g');
 assert.throws(()=>m.scale({kcal:100},0,200));
 assert.equal(m.scale({fiber:null,kcal:0},100,250).fiber,null);
});
test('Live nutrition fields update immediately when weight changes',()=>{
 const u=setupEditor();
 assert.equal(u.open(),true);
 assert.equal(u.dialog.open,true);
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 assert.equal(Number(weight.value),320);
 weight.value='200';weight.events.input();
 assert.equal(Number(u.field('kcal').value),250);
 assert.equal(Number(u.field('protein').value),15);
 assert.equal(Number(u.field('carbs').value),36.25);
 assert.equal(Number(u.field('fat').value),7.5);
 assert.equal(Number(u.field('fiber').value),3.75);
 assert.match(u.ids.get('hhDiaryEditScaleV1161').textContent,/62,5%/);
 weight.value='320';weight.events.input();
 assert.equal(Number(u.field('kcal').value),400);
});
test('Manual calorie correction becomes scale anchor for further weight edits',()=>{
 const u=setupEditor();u.open();
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 weight.value='200';weight.events.input();
 u.field('kcal').value='300';u.field('kcal').events.input();
 weight.value='250';weight.events.input();
 assert.equal(Number(u.field('kcal').value),375);
 assert.equal(Number(u.field('protein').value),18.75);
});
test('Meal, time, date and nutrition edits submit a single in-place update',()=>{
 const u=setupEditor();u.open();
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 weight.value='200';weight.events.input();
 u.ids.get('hhDiaryEditMealV1161').value='Vacsora';
 u.ids.get('hhDiaryEditTimeV1161').value='19:30';
 u.ids.get('hhDiaryEditDateV1161').value='2026-11-07';
 u.ids.get('hhDiaryEditNameV1161').value='Almás zabkása, fahéjjal';
 const evt={preventDefault(){this.handled=true}};
 u.ids.get('hhDiaryEditFormV1161').events.submit(evt);
 assert.equal(evt.handled,true);
 assert.equal(u.writes.length,1);
 const p=u.writes[0];
 assert.equal(p.id,'cookbook:testtoken');
 assert.equal(p.expectedProfile,'zsolt');
 assert.equal(p.date,'2026-11-07');
 assert.equal(p.time,'19:30');
 assert.equal(p.meal,'Vacsora');
 assert.equal(p.quantity,200);
 assert.equal(p.nutrients.kcal,250);
 assert.equal(p.nutrients.vitc,null);
 assert.equal(p.nutrients.calcium,112.5);
 assert.equal(u.dialog.open,false);
});
test('Invalid oversized portion cannot be saved',()=>{
 const u=setupEditor();u.open();
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 weight.value='1700';weight.events.input();
 assert.match(u.ids.get('hhDiaryEditErrorV1161').textContent,/nagyobb/);
 u.ids.get('hhDiaryEditFormV1161').events.submit({preventDefault(){}});
 assert.equal(u.writes.length,0);
});
test('Existing canonical Nutrition update preserves image/snapshot and Dropbox profile isolation',()=>{
 assert.doesNotThrow(()=>new vm.Script(nutritionCore));
 assert.doesNotThrow(()=>new vm.Script(editor));
 assert.match(nutritionCore,/if\(root\.HH_NUTRITION_DIARY_EDIT_V1161\?\.open\?\.\(row\)\)return/);
 assert.match(nutritionCore,/updateDiaryEntry:payload=>/);
 assert.match(nutritionCore,/payload\?\.expectedProfile!==active/);
 assert.match(nutritionCore,/doc\.entries\[idx\]=updated/);
 assert.match(nutritionCore,/cookbookImport:\s*\{?[\s\S]*?imageRef/);
 assert.match(nutritionCore,/updated\.cookbookImport=\{\.\.\.original\.cookbookImport,grams:qty\}/);
 assert.match(nutritionCore,/update\(doc=>\{/);
 assert.match(nutritionCore,/queueSync\(profile\)/);
 assert.match(index,/hh-diary-scale-v1161\.js/);
 assert.match(index,/hh-diary-edit-v1161\.js/);
 assert.match(index,/hh-diary-edit-v1161\.css/);
 assert.ok(index.indexOf('hh-diary-scale-v1161.js')<index.indexOf('nutrition-preview-v592.js'));
 assert.ok(index.indexOf('nutrition-preview-v592.js')<index.indexOf('hh-diary-edit-v1161.js'));
});

test('v1162 never interprets servings or pieces as grams; dkg and kg normalize to grams',()=>{
 const m=loadScaler();
 assert.equal(m.infer({kind:'food',quantity:2,unit:'adag',quantityText:'2 adag'}).amount,null);
 assert.equal(m.infer({kind:'food',quantity:2,unit:'db',quantityText:'2 darab'}).amount,null);
 assert.equal(m.infer({kind:'food',quantity:2,unit:'dkg',quantityText:'2 dkg'}).amount,20);
 assert.equal(m.infer({kind:'food',quantity:0.5,unit:'kg',quantityText:'0,5 kg'}).amount,500);
 assert.equal(m.infer({kind:'food',quantity:1,unit:'g',quantityText:'1 g'}).amount,1);
 assert.equal(m.infer({kind:'drink',quantity:1,unit:'pohár (250 ml)'}).amount,250);
});
test('v1162 UI shows only Súly (g), NEVER Adag / súly or a default 1 g',()=>{
 const u=setupEditor();
 u.open();
 assert.match(u.dialog.markup,/Súly \(g\)/);
 assert.doesNotMatch(u.dialog.markup,/Adag \/ súly/);
 assert.equal(u.ids.get('hhDiaryEditBaselineWrapV1162').hidden,false);
 assert.equal(Number(u.ids.get('hhDiaryEditBaselineV1162').value),320);
 assert.equal(Number(u.ids.get('hhDiaryEditAmountV1161').value),320);
});
test('v1164 legacy 1 adag gets editable 320 g reference without misreading 1 as grams',()=>{
 const rec=baseRecord({quantity:undefined,unit:undefined,quantityText:'1 előre beállított adag',cookbookImport:undefined});
 const u=setupEditor(rec);u.open();
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 const baseline=u.ids.get('hhDiaryEditBaselineV1162');
 assert.equal(u.ids.get('hhDiaryEditBaselineWrapV1162').hidden,false);
 assert.equal(weight.value,'320');
 assert.equal(baseline.value,'320');
 assert.match(u.ids.get('hhDiaryEditScaleV1161').textContent,/javaslat/i);
 weight.value='120';weight.events.input();
 assert.equal(Number(u.field('kcal').value),150);
 assert.equal(Number(u.field('protein').value),9);
 u.ids.get('hhDiaryEditFormV1161').events.submit({preventDefault(){}});
 assert.equal(u.writes.length,1);
 assert.equal(u.writes[0].quantity,120);
 assert.equal(u.writes[0].unit,'g');
 assert.equal(u.writes[0].originalWeight,320);
 assert.equal(u.writes[0].baselineCorrected,false);
 assert.equal(u.writes[0].nutrients.kcal,150);
});
test('v1164 known 320 g baseline can be corrected independently to 400 g',()=>{
 const u=setupEditor();u.open();
 const baseline=u.ids.get('hhDiaryEditBaselineV1162');
 const weight=u.ids.get('hhDiaryEditAmountV1161');
 assert.equal(baseline.value,'320');
 baseline.value='400';baseline.events.input();
 assert.equal(weight.value,'320','reference correction must not overwrite consumed grams');
 assert.equal(Number(u.field('kcal').value),320,'400 kcal is now reference for 400 g');
 weight.value='200';weight.events.input();
 assert.equal(Number(u.field('kcal').value),200);
 assert.equal(Number(u.field('protein').value),12);
 u.ids.get('hhDiaryEditFormV1161').events.submit({preventDefault(){}});
 assert.equal(u.writes.length,1);
 assert.equal(u.writes[0].originalWeight,400);
 assert.equal(u.writes[0].baselineCorrected,true);
 assert.equal(u.writes[0].quantity,200);
 assert.equal(u.writes[0].nutrients.kcal,200);
});
test('v1164 existing 200 g reference stays 200 g and unknown drinks do not default to 320 ml',()=>{
 const measured=setupEditor(baseRecord({quantity:200,unit:'g',quantityText:'200 g'}));
 measured.open();
 assert.equal(measured.ids.get('hhDiaryEditBaselineV1162').value,'200');
 assert.equal(measured.ids.get('hhDiaryEditAmountV1161').value,'200');
 const noDrinkWeight=setupEditor(baseRecord({kind:'drink',quantity:undefined,unit:undefined,quantityText:'1 csésze',cookbookImport:undefined}));
 noDrinkWeight.open();
 assert.equal(noDrinkWeight.ids.get('hhDiaryEditBaselineV1162').value,'');
 assert.equal(noDrinkWeight.ids.get('hhDiaryEditAmountV1161').value,'');
 noDrinkWeight.ids.get('hhDiaryEditFormV1161').events.submit({preventDefault(){}});
 assert.equal(noDrinkWeight.writes.length,0);
});
test('v1162 source update requires physical baseline and preserves real data',()=>{
 assert.match(nutritionCore,/const reference=scaler\.validation\(payload\.originalWeight/);
 assert.match(nutritionCore,/correctedBaseline/);
 assert.match(nutritionCore,/payload\.baselineCorrected===true/);
 assert.match(nutritionCore,/diaryOriginalWeightGrams:reference/);
 assert.match(nutritionCore,/diaryWeightSource:inferred\.amount==null\?'user-confirmed'/);
 assert.match(index,/hh-diary-scale-v1161\.js\?v=1162-weight-only/);
 assert.match(index,/hh-diary-edit-v1161\.js\?v=1164-editable-320/);
});
