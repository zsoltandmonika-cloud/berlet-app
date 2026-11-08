'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),wheel=read('hh-quick-recipe-wheel-v635.js'),
 scan=read('hh-lena-ai-scan-page-v753.js'),css=read('hh-lena-ai-scan-page-v753.css');
const map=require('../nutrition/hh-scan-to-favorite-v1148.js');
const sample={name:'Rakott burgonya',meal:'Ebéd',unit:'g',notes:'Fotó alapján becsült',
 items:[
  {name:'Burgonya',grams:150,per:{kcal:90,protein:2,carbs:21,fat:0.1}},
  {name:'Tejföl',grams:50,per:{kcal:198,protein:3,carbs:3,fat:20}}
 ]};
const total=items=>Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[
 k,Math.round(items.reduce((sum,x)=>sum+x.grams*x.per[k]/100,0)*10)/10
]));
test('Pure mapper copies AI Scan review into Favorites editor without writing anything',()=>{
 const input=JSON.parse(JSON.stringify(sample)),out=map.mapDraft(input,total);
 assert.equal(out.name,'Rakott burgonya');
 assert.equal(out.meal,'Ebéd');assert.equal(out.category,'Főételek');
 assert.equal(out.kind,'food');assert.equal(out.nutrients.kcal,234);
 assert.equal(out.nutrients.protein,4.5);
 assert.equal(out.nutrients.carbs,33);
 assert.equal(out.nutrients.fat,10.2);
 assert.match(out.ingredients,/Burgonya · 150 g/);
 assert.match(out.ingredients,/Tejföl · 50 g/);
 assert.match(out.description,/AI Scan · becsült adag/);
 assert.equal(out.imageData,null);
 assert.deepEqual(input,sample,'must not mutate original scanned data');
 const drink=map.mapDraft({...sample,name:'Narancslé',unit:'ml'},total);
 assert.equal(drink.category,'Italok');assert.equal(drink.kind,'drink');
 assert.match(drink.ingredients,/150 ml/);
});
test('No false zero for unknown values; fail closed on invalid macronutrients',()=>{
 assert.throws(()=>map.mapDraft(sample,()=>({kcal:null,protein:0,carbs:0,fat:0})),/kcal/);
 assert.throws(()=>map.mapDraft(sample,()=>({kcal:NaN,protein:0,carbs:0,fat:0})),/kcal/);
 assert.throws(()=>map.mapDraft(sample,()=>({kcal:6000,protein:0,carbs:0,fat:0})),/kcal/);
 assert.throws(()=>map.mapDraft(sample,()=>({kcal:10,protein:501,carbs:0,fat:0})),/protein/);
 assert.throws(()=>map.mapDraft({...sample,items:[{name:'Rizs',grams:0}]},total),/mennyiségét/);
 assert.throws(()=>map.mapDraft({...sample,meal:'Unknown'},total),/étkezés/);
 assert.throws(()=>map.mapDraft({...sample,name:'a'},total),/név/);
 assert.throws(()=>map.mapDraft({...sample,items:[]},total),/Hiányos/);
});
test('Only current personal Favorites editor exposes AI Scan button; preserve other editor and controls',()=>{
 assert.match(html,/id="hhQuickAIScanV1148"/);
 assert.match(html,/id="hhQuickImagePortalOpen"/);
 assert.match(html,/id="hhQuickEditorForm"/);
 assert.match(html,/id="hhQuickAdd"/);
 assert.match(wheel,/\$\('hhQuickAIScanV1148'\)\.hidden=common/);
 assert.match(wheel,/\$\('hhQuickAIScanV1148'\)\.addEventListener\('click',launchFavoriteAiScan\)/);
 assert.match(wheel,/scanner\.openForFavorite\(profile,result=>/);
 assert.match(wheel,/dlg\.close\(\)/);
 assert.match(wheel,/if\(!dlg\.open\)dlg\.showModal\(\)/);
 assert.match(wheel,/api\.getProfile\(\)!==profile\|\|editing\?\.id!==draftId/);
 assert.match(wheel,/még NINCS MENTVE/);
 assert.match(wheel,/photoData=result\.imageData;photoRemoved=false/);
 assert.match(wheel,/api\.saveRecipe\(q\)/);
 assert.match(wheel,/\$\('hhQuickRecord'\)\.addEventListener\('click',recordSelected\)/);
});
test('Existing single Scan remains source of truth; Favorite mode gates unintended persistence',()=>{
 for(const id of ['hhScanApplyFavoriteV1148','hhScanSave753','hhScanSharedSave753',
  'hhScanSharedSection753','hhScanTabFood753','hhScanTabBarcode753','hhScanBack753'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/hh-scan-to-favorite-v1148\.js\?v=1148-scan-favorite-draft/);
 assert.match(html,/hh-lena-ai-scan-page-v753\.js\?v=1149-onetap-favorites/);
 assert.match(html,/hh-lena-ai-scan-page-v753\.css\?v=1149-one-tap-favorites/);
 assert.match(scan,/function openForFavorite\(targetProfile,callback\)/);
 assert.match(scan,/function applyToFavorite\(\)/);
 assert.match(scan,/function favoriteScanControls\(\)/);
 assert.match(scan,/\$\('hhScanSharedSection753'\)\.hidden=active/);
 assert.match(scan,/\$\('hhScanSave753'\)\.hidden=active/);
 assert.match(scan,/\$\('hhScanApplyFavoriteV1148'\)\.onclick=/);
 assert.match(scan,/bridge\.mapDraft\(/);
 assert.match(scan,/items=>vision\(\)\.totals\(items\)/);
 assert.match(scan,/finishFavoriteScan\(data\)/);
 assert.match(scan,/function save\(\)/);
 assert.match(scan,/api\(\)\.recordAiMeal\(/);
 assert.match(scan,/w\.HH_LENA_AI_SCAN_V753=\{version:'753',gtin,nutrients,product,lookup,open,openForFavorite,init\}/);
 assert.match(css,/hhScanApplyFavoriteV1148/);
 assert.doesNotMatch(scan.slice(scan.indexOf('async function applyToFavorite(){'),scan.indexOf('function openForFavorite(')),/recordAiMeal|uploadSharedFoods|api\(\)\.saveRecipe|generateCardImage|puter\(\)/);
});
test('Scan navigation back, profile switch and no-implicit-charge protections',()=>{
 assert.match(scan,/const context=favoriteReturn;favoriteReturn=null;fromTile=false/);
 assert.match(scan,/context\.callback\(null\)/);
 assert.match(scan,/context\.profile===api\(\)\?\.getProfile\(\)\?result:null/);
 assert.match(scan,/profile!==favoriteReturn\.profile\|\|profile!==api\(\)\?\.getProfile\(\)/);
 assert.match(scan,/if\(busy\|\|favoriteTransferBusy\|\|favoriteQuickSaving\)return/);
 assert.match(scan,/if\(!page\|\|w\.location\.hash!==PAGE\)throw Error/);
 assert.match(scan,/favoriteReturn=null/);
 assert.match(scan,/w\.history\.replaceState/);
 assert.match(scan,/sharedPhoto\(false\)/);
 assert.match(html,/id="hhScanApplyFavoriteV1148" hidden/);
 assert.match(css,/#hhScanApplyFavoriteV1148\[hidden\]/);
 // Loaded only; SDK never called by the Favorites editor click itself.
 const launch=wheel.slice(wheel.indexOf('function launchFavoriteAiScan(){'),wheel.indexOf('\nfunction showEditor(',wheel.indexOf('function launchFavoriteAiScan(){')));
 assert.doesNotMatch(launch,/\.ai\.chat|\.ai\.txt2img|recordRecipe\(|recordAiMeal\(/);
});
