'use strict';
/* HealthHub Nutrition v1133 · manual input, banana guard and AI recoveries and data safety regression. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),core=read('nutrition-preview-v592.js');
const ui=read('hh-manual-intake-v1130.js'),css=read('hh-manual-intake-v1130.css');
const bevitel=read('hh-bevitel-premium-v643.js');
assert.match(core,/section\.open=matching\.length>0/);
assert.match(core,/hhDiaryEntryCount1134/);
assert.match(html,/id="hhDiaryEntryCount1134"/);
for(const [name,source] of [['manual',ui],['core',core],['bevitel',bevitel]])new vm.Script(source,{filename:name+'.js'});
const before=needle=>html.indexOf(needle);
assert.ok(before('id="hhManualLaunch1130"')<before('id="hhQuickLaunch"'));
assert.ok(before('id="hhManualLaunch1130"')<before('class="hh-bevitel-section"'));
assert.equal((html.match(/id="hhManualLaunch1130"/g)||[]).length,1);
assert.match(html,/id="hhNutritionQuickGridV1137"/);
assert.match(html,/id="hhQuickOwnFoodsV1137"/);
assert.match(html,/id="hhQuickDiaryV1137"/);
assert.match(html,/hh-nutrition-quick-glass-v1137.css\?v=1137-premium-four-tiles/);
assert.match(html,/hh-nutrition-quick-glass-v1137.js\?v=1137-quick-buttons-tada/);
assert.match(ui,/hh:nutrition:manual-saved/);
assert.match(html,/id="hhBalanceQuickAdd1139"[^>]+aria-controls="hhNutritionQuickPanelV1137"/);
assert.match(html,/id="hhNutritionQuickHeadingV1144" style="scroll-margin-top:12px"/);
assert.match(ui,/heading\.scrollIntoView\(/);
assert.match(ui,/hhBalanceQuickAdd1139'\)\?\.addEventListener\('click'/);
assert.match(html,/hh-buddy-floating-v628.css\?v=1140-swapped-buddy-quick-add/);

assert.ok(html.includes('hh-manual-intake-v1130.css?v=1138-clean-dialog'));
assert.ok(html.includes('hh-manual-intake-v1130.js?v=1147-quick-to-favorite'));
assert.match(ui,/studio\.openNewFavorite\(\);return/);
assert.match(ui,/function openLegacyManual\(\)/);
assert.ok(html.includes('nutrition-preview-v592.js?v=1150-diary-favorites-mini-art'));
assert.match(core,/HH_NUTRITION_DIARY_FAVORITE_ART_V1150\?\.attach\?\.\(left,e,active,d\)/);
assert.doesNotMatch(core,/confirm\('Törlöd a bejegyzést\?'\)/);
assert.match(core,/del\.addEventListener\('click',\(\)=>\{update\(d=>\{/);
assert.ok(html.includes('hh-bevitel-premium-v643.js?v=1130-personal-food-image'));
assert.match(css,/#hhManualLaunch1130/);
assert.match(css,/var\(--accent\)/);
for(const id of [...new Set([...ui.matchAll(/\$\('([^']+1130)'\)/g)].map(x=>x[1]))]){
 assert.ok(html.includes('id="'+id+'"'),'missing manual UI '+id);
}
assert.match(ui,/recognition\.lang='hu-HU'/);
assert.match(ui,/SpeechRecognition\|\|w\.webkitSpeechRecognition/);
assert.match(ui,/showPredictions\(\)/);
assert.match(html,/list="hhManualNames1130"/);
assert.match(ui,/\.ai\.chat\(prompt,/);
assert.match(ui,/\.generateCardImage\(/);
assert.match(ui,/\.addEventListener\('click',estimate\)/);
assert.match(ui,/\.addEventListener\('click',image\)/);
assert.match(ui,/\.addEventListener\('submit',save\)/);
assert.match(ui,/hhManualSubmit1130'\)\.addEventListener\('click',save\)/);
assert.match(html,/id="hhManualSubmit1130"/);
assert.match(html,/hhManualForm1130" novalidate/);
assert.match(html,/id="hhManualActionFeedback1135"/);
assert.match(html,/id="hhManualToast1135"/);
assert.match(core,/recordManualMeal:payload=>/);
assert.match(core,/saveManualFood:payload=>/);
assert.match(core,/source:nut\.kcal==null\?'manual-unknown':'estimated'/);
assert.match(ui,/api\(\)\.recordManualMeal\(info\)/);
assert.match(ui,/api\(\)\.saveManualFood\(/);
assert.match(ui,/api\(\)\.saveRecipe\(/);
assert.match(ui,/await lib\.upsert\(/);
assert.match(ui,/if\(info\.expectedProfile!==api\(\)\?\.getProfile\(\)\)/);
assert.match(bevitel,/own\?\.imageRef/);
assert.match(bevitel,/scope=r\.sharedId\?'shared'/);
assert.match(core,/if\(\$\('logDate'\)\)\$\('logDate'\)\.value=rec\.date/);
assert.match(core,/line\.dataset\.entryId=e\.id/);
assert.match(core,/entryFoodExplicitlyChosen/);
assert.match(core,/Előbb válaszd ki az ételt a listából/);
assert.match(core,/selected\.value!==currentFood/);
assert.match(core,/saved\.name!==name\|\|saved\.foodId!==rec\.foodId/);
assert.match(html,/id="hhManualOwnPhotoBtn1133"/);
assert.match(html,/id="hhManualOwnPhoto1133"/);
assert.match(ui,/model:'gpt-5\.4-nano'/);
assert.match(ui,/A Puter AI-keret nem elegendő/);
assert.match(ui,/await p\.ai\.chat\(prompt,\{normalize:true/);
assert.match(read('hh-shared-food-library-v1118.js'),/reuse the existing SDK tag/);
assert.match(html,/id="hhManualDiaryNotice1131"/);
assert.match(css,/#hhManualDiaryNotice1131/);
assert.ok(ui.indexOf('result=api().recordManualMeal(info)') < ui.indexOf('await lib.upsert('),
 'diary must persist before any optional cloud/catalog write');
async function scenario(options={}){
 const calls=[],elements=Object.create(null);
 const el=id=>elements[id]||(elements[id]={
  value:'',checked:false,disabled:false,hidden:false,textContent:'',dataset:{},
  src:'',close(){calls.push('close')},scrollIntoView(){calls.push('scroll')},
  classList:{add(){calls.push('highlight')}}
 });
 const doc={getElementById:el,readyState:'loading',addEventListener(){},
  querySelector:()=>({scrollIntoView(){calls.push('scroll')},classList:{add(){calls.push('highlight')}}})};
 const api={getProfile:()=>options.profile||'monika',
  recordManualMeal:()=>{calls.push('diary');if(options.diaryFails)throw Error('Storage write blocked');
   return {id:'test-diary-id',profile:'monika',date:'2026-11-02'}},
  saveManualFood:()=>{calls.push('category');if(options.categoryFails)throw Error('Category storage failed')},
  saveRecipe:()=>{calls.push('favorite')}
 };
 const w={HH_NUTRITION_QUICK_API:api,HH_NUTRITION_CLOUD_V626:{connected:()=>false}};
 const injected=ui.replace('})(window,document);',
   'window.__testSave=save; window.__setSession=p=>{session=p};})(window,document);');
 assert.notEqual(injected,ui);
 vm.runInNewContext(injected,{window:w,document:doc});
 w.__setSession('monika');
 Object.assign(el('hhManualName1130'),{value:'Rakott krumpli'});
 el('hhManualQty1130').value='250';
 el('hhManualUnit1130').value='g';
 el('hhManualMeal1130').value='Ebéd';
 el('hhManualCategory1130').value='Főételek';
 el('hhManualKcal1130').value=options.kcal||'';
 for(const k of ['Protein','Carbs','Fat'])el('hhManual'+k+'1130').value='';
 el('hhManualSaveFood1130').checked=!!options.food;
 el('hhManualFavorite1130').checked=!!options.favorite;
 el('hhManualFamily1130').checked=false;
 el('hhManualDiaryNotice1131').hidden=true;
 await w.__testSave({preventDefault(){}});
 return {calls,notice:el('hhManualDiaryNotice1131'),status:el('hhManualStatus1130')};
}
(async()=>{
 const unknown=await scenario({food:true,favorite:true});
 assert.equal(unknown.calls[0],'diary','missing kcal must not block diary');
 assert.equal(unknown.notice.hidden,false);
 assert.match(unknown.notice.textContent,/Napi naplóba mentve/);
 assert.match(unknown.notice.textContent,/kcal-adat/);
 const partial=await scenario({food:true,favorite:true,kcal:'350',categoryFails:true});
 assert.deepEqual(partial.calls.slice(0,1),['diary']);
 assert.ok(partial.calls.includes('favorite'),'failing category must not block favorite');
 assert.match(partial.notice.textContent,/saját ételkategória nem mentődött/);
 assert.match(partial.notice.textContent,/Mentve: Kedvencek/);
 const simple=await scenario();
 assert.equal(simple.calls[0],'diary');
 assert.equal(simple.notice.dataset.state,'saved');
 assert.ok(simple.calls.includes('scroll'));
 const failed=await scenario({diaryFails:true,favorite:true,kcal:'350'});
 assert.equal(failed.calls.length,1);
 assert.equal(failed.calls[0],'diary');
 assert.equal(failed.notice.hidden,true);
 assert.match(failed.status.textContent,/NEM MENTETTEM/);
 console.log('Nutrition v1133: diary-first behavior, visible confirmation, error isolation & profile checks OK');
})().catch(error=>{console.error(error);process.exitCode=1});
