'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const scan=read('hh-lena-ai-scan-page-v753.js'),html=read('index.html'),
 css=read('hh-lena-ai-scan-page-v753.css');
const helper=require('../nutrition/hh-scan-favorite-save-v1149.js');
const start=scan.indexOf('async function saveFavoriteOneTap(){'),
 end=scan.indexOf('\nfunction sharedStatus(',start);
assert.ok(start>0&&end>start,'one-tap save function must exist');
const action=scan.slice(start,end);
const sample={name:'Rakott burgonya',meal:'Ebéd',unit:'g',
 items:[{name:'burgonya',grams:150,per:{kcal:90,protein:2,carbs:21,fat:0.1}},
  {name:'tejföl',grams:50,per:{kcal:198,protein:3,carbs:3,fat:20}}],
 notes:'Fotóból becsült'};
const totals=items=>Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[
 k,Math.round(items.reduce((a,x)=>a+x.grams*x.per[k]/100,0)*10)/10]));
const clone=v=>JSON.parse(JSON.stringify(v));
async function scenario(options={}){
 const calls=[],messages=[],draft=clone(options.draft||sample);
 let profile='zsolt';
 const elements={
  hhScanName753:{value:draft.name},
  hhScanMeal753:{value:draft.meal}
 };
 const cloud={connected:()=>options.offline!==true};
 const library={
  load:async force=>{
   calls.push('load:'+force);
   if(options.onLoad)profile=options.onLoad;
   if(options.failLoad)throw Error('Dropbox unavailable');
   return clone(options.existing||[]);
  },
  upsert:async payload=>{
   calls.push('upsert');
   if(options.failSave)throw Error('Dropbox write failed');
   calls.push('payload:'+JSON.stringify(payload));
   return {...payload,id:payload.id||'f-new-favorite1234'};
  },
  getItems:()=>clone(options.existing||[]),
  generateCardImage:()=>{calls.push('PAID_IMAGE');throw Error('Unexpected AI image call')}
 };
 const vault={
  connected:()=>true,
  save:async(which,image)=>{
   calls.push('photo:'+which);
   assert.match(image,/^data:image\/jpeg;base64,/);
   return {sha256:'a'.repeat(64)};
  }
 };
 const ctx={
  w:{HH_SHARED_FOOD_LIBRARY_V1118:library,
   HH_NUTRITION_CLOUD_V626:cloud,HH_NUTRITION_IMAGE_V641:vault,
   HH_NUTRITION_SCAN_FAVORITE_SAVE_V1149:helper},
  $:id=>elements[id]||(elements[id]={value:'',hidden:false,disabled:false}),
  api:()=>({getProfile:()=>profile}),
  vision:()=>({totals}),
  draft,unit:draft.unit,mode:'food',photo:options.photo?{}:null,
  sharedPhoto:async()=>({dataURL:'data:image/jpeg;base64,/9j/'}),
  sharedSelectedTags:()=>['Főételek'],quickFavoriteStatus:(m,error=false)=>messages.push({m,error}),
  quickFavoriteSignature:()=>options.invalid?'':'signature-'+draft.name,
  favoriteScanControls:()=>calls.push('controls'),
  profile:'zsolt',stage:'result',favoriteReturn:null,
  favoriteQuickSaving:false,lastSavedFavoriteSignature:'',
  sharedBusy:false,busy:false,requestId:11,page:{hidden:false},sharedId:null
 };
 await vm.runInNewContext(action+'\nsaveFavoriteOneTap()',ctx);
 return {ctx,calls,messages,last:messages.at(-1)};
}
test('Markup exposes a single prominent Favorites action without requiring the shared checkbox',()=>{
 for(const id of ['hhScanFavoriteQuickV1149','hhScanFavoriteSaveV1149','hhScanFavoriteSaveStatusV1149',
  'hhScanSharedSave753','hhScanApplyFavoriteV1148','hhScanSave753'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/id="hhScanFavoriteSaveV1149" disabled>⭐ Mentés a Kedvencekhez/);
 assert.match(html,/egy kattintás|1 kattintás/i);
 assert.match(html,/hh-scan-favorite-save-v1149\.js\?v=1149-onetap-validation/);
 assert.match(html,/hh-lena-ai-scan-page-v753\.js\?v=1149-onetap-favorites/);
 assert.match(html,/hh-lena-ai-scan-page-v753\.css\?v=1149-one-tap-favorites/);
 assert.match(css,/#hhScanFavoriteSaveV1149/);
 assert.match(css,/hhScanPage753\[data-profile="monika"\]/);
 assert.match(scan,/\$\('hhScanFavoriteSaveV1149'\)\.onclick=/);
 assert.match(scan,/const showQuick=!active&&\(stage==='result'\|\|stage==='saved'\)/);
 assert.match(scan,/\$\('hhScanSharedSection753'\)\.hidden=active/);
});
test('New scan saves reviewed recipe once, without a journal entry or extra AI generation',async()=>{
 const {ctx,calls,last}=await scenario();
 assert.deepEqual(calls.filter(x=>x.startsWith('load:')),['load:true']);
 assert.equal(calls.filter(x=>x==='upsert').length,1);
 assert.equal(calls.filter(x=>x==='PAID_IMAGE').length,0);
 const saved=JSON.parse(calls.find(x=>x.startsWith('payload:')).slice(8));
 assert.equal(saved.name,sample.name);
 assert.equal(saved.favorite,true);
 assert.equal(saved.categories[0],'Főételek');
 assert.equal(saved.nutrients.kcal,234);
 assert.equal(saved.imageRef,null);
 assert.equal(saved.ingredients.includes('150 g'),true);
 assert.equal(ctx.sharedId,'f-new-favorite1234');
 assert.equal(ctx.lastSavedFavoriteSignature,'signature-'+sample.name);
 assert.match(last.m,/Kedvencekbe mentve/);
 assert.match(last.m,/Napi naplóba nem került/);
 assert.equal(ctx.favoriteQuickSaving,false);
});
test('Existing Favorite is reused; do not overwrite nutrients or create a duplicate',async()=>{
 const existing=[{id:'f-existing123456',name:'  RAKOTT  BURGONYA ',kind:'food',
  favorite:true,nutrients:{kcal:100,protein:1,carbs:1,fat:1},categories:['Ebéd']}];
 const {ctx,calls,last}=await scenario({existing});
 assert.equal(ctx.sharedId,existing[0].id);
 assert.equal(calls.includes('upsert'),false);
 assert.match(last.m,/Nem készítettem másolatot/);
});
test('Existing non-favorite becomes Favorite, keeping its photo and macros unchanged',async()=>{
 const old={id:'f-existing123456',name:'Rakott burgonya',kind:'food',favorite:false,
  imageRef:{sha256:'b'.repeat(64)},nutrients:{kcal:100,protein:1,carbs:1,fat:1},
  categories:['Reggeli'],ingredients:'régi recept'};
 const {calls}=await scenario({existing:[old]});
 const writes=calls.filter(x=>x.startsWith('payload:'));
 assert.equal(writes.length,1);
 const row=JSON.parse(writes[0].slice(8));
 assert.equal(row.favorite,true);
 assert.equal(row.id,old.id);
 assert.equal(row.nutrients.kcal,100);
 assert.equal(row.imageRef.sha256,'b'.repeat(64));
 assert.equal(row.ingredients,'régi recept');
});
test('No Dropbox means no write; never claim a successful save after cloud failure',async()=>{
 for(const opts of [{offline:true},{failLoad:true},{failSave:true}]){
  const {calls,last,ctx}=await scenario(opts);
  assert.equal(ctx.lastSavedFavoriteSignature,'');
  assert.equal(last.error,true);
  assert.ok(!/✓ Kedvencekbe mentve/.test(last.m));
  if(opts.offline)assert.equal(calls.filter(x=>x==='upsert').length,0);
 }
});
test('Profile switched during remote refresh: fail closed before any upsert',async()=>{
 const {calls,last}=await scenario({onLoad:'monika'});
 assert.equal(calls.includes('upsert'),false);
 assert.equal(last.error,true);
 assert.match(last.m,/profil|megváltozott/i);
});
test('User-triggered one-tap reuses scanned photo but never starts AI image generation',async()=>{
 const {calls}=await scenario({photo:true});
 assert.ok(calls.includes('photo:shared'));
 assert.ok(calls.find(x=>x.startsWith('payload:')).includes('"imageRef"'));
 assert.equal(calls.includes('PAID_IMAGE'),false);
 assert.doesNotMatch(action,/generateCardImage|puter\(|recordAiMeal|recordRecipe\(|saveShared\(/);
});
test('Pure validation rejects unknown macros, missing names and bad quantities',()=>{
 assert.throws(()=>helper.makePayload({...sample,nutrients:{kcal:null,protein:0,carbs:0,fat:0}}),/kcal/);
 assert.throws(()=>helper.makePayload({...sample,nutrients:{kcal:234,protein:0,carbs:0}}),/fat/);
 assert.throws(()=>helper.makePayload({...sample,name:'x',nutrients:totals(sample.items)}),/Hiányos/);
 assert.throws(()=>helper.makePayload({...sample,items:[{name:'burgonya',grams:0}],nutrients:totals(sample.items)}),/összetevőket/);
 assert.equal(helper.findExisting([{id:'a',name:' Rakott  BURGONYA ',kind:'drink'}],sample.name,'food'),null);
 assert.equal(helper.findExisting([{id:'a',name:' Rakott  BURGONYA ',kind:'food'}],sample.name,'food').id,'a');
});
test('Previous scanner APIs and both earlier save paths remain intact',()=>{
 assert.match(scan,/function saveShared\(\)/);
 assert.match(scan,/function save\(\)/);
 assert.match(scan,/api\(\)\.recordAiMeal\(/);
 assert.match(scan,/async function applyToFavorite\(\)/);
 assert.match(scan,/function openForFavorite\(targetProfile,callback\)/);
 assert.match(scan,/function reset\(modeNext\)/);
 assert.match(scan,/lastSavedFavoriteSignature=''/);
 assert.match(scan,/if\(busy\|\|favoriteTransferBusy\|\|favoriteQuickSaving\)return/);
 assert.match(scan,/if\(favoriteQuickSaving\)return;reset\('food'\)/);
 assert.match(scan,/if\(favoriteQuickSaving\)return;reset\('barcode'\)/);
});
