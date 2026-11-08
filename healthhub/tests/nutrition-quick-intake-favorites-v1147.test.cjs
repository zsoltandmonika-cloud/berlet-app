'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const get=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=get('index.html'),manual=get('hh-manual-intake-v1130.js'),
 wheel=get('hh-quick-recipe-wheel-v635.js');
function part(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'cannot extract '+start);
 return source.slice(a,b);
}
test('Quick Intake has direct Favorites create screen semantics and preserved independent tiles',()=>{
 const tile=html.match(/<button[^>]*id="hhManualLaunch1130"[^>]*>/)?.[0];
 assert.ok(tile,'Quick Intake tile exists');
 assert.match(tile,/aria-controls="hhQuickDialog"/);
 assert.match(tile,/aria-label="Gyors bevitel: új kedvenc hozzáadása"/);
 assert.match(html,/<strong>Gyors bevitel<\/strong><small>＋ Új kedvenc · mentés<\/small>/);
 assert.match(html,/hh-quick-recipe-wheel-v635\.js\?v=114(?:7-favorite-create-launch|8-favorite-scan-bridge)/);
 assert.match(html,/hh-manual-intake-v1130\.js\?v=1147-quick-to-favorite/);
 assert.match(html,/id="hhQuickLaunch"/);
 assert.match(html,/id="hhQuickOwnFoodsV1137"/);
 assert.match(html,/id="hhQuickDiaryV1137"/);
});
test('Existing Quick Intake button delegates to Favorites and never opens manual form on healthy path',()=>{
 const fn=part(manual,'function open(){','\nfunction speechResult');
 const calls=[];
 const scope={
  w:{HH_NUTRITION_FAVORITES_STUDIO_V1147:{openNewFavorite(){calls.push('favorites:create')}}},
  $:id=>({hidden:false,textContent:''})
 };
 vm.runInNewContext(fn+'\nopen();',scope);
 assert.deepEqual(calls,['favorites:create']);
 assert.match(manual,/\$\('hhManualLaunch1130'\)\.addEventListener\('click',open\)/);
 assert.match(manual,/function openLegacyManual\(\)/);
 assert.doesNotMatch(fn,/recordManualMeal|saveRecipe|hhManualDialog1130.*showModal/);
});
test('If Favorites editor is missing, Quick Intake fails closed with visible error, no other dialog',()=>{
 const fn=part(manual,'function open(){','\nfunction speechResult');
 const messages=[],toast={hidden:true,textContent:'',dataset:{}};
 vm.runInNewContext(fn+'\nopen();',{
  w:{},$:id=>id==='hhManualToast1135'?toast:null
 });
 assert.equal(toast.hidden,false);
 assert.match(toast.textContent,/Kedvencek hozzáadása.*nem töltődött be/);
});
test('Favorites creates a new profile-scoped draft without a second form or diary record',()=>{
 const fn=part(wheel,'function openNewFavoriteFromQuickIntake(){',
  '\nwindow.HH_NUTRITION_FAVORITES_STUDIO_V1147');
 const calls=[],nodes=new Map();
 const scope={editSaving:false,orderSaving:false,busy:false,editing:null,
  quickIntakeDraftId:'',
  showDialog(){calls.push('favorites:modal')},
  showEditor(id,create){
   calls.push('favorites:editor');
   assert.equal(id,null);assert.equal(create,true);
   scope.editing={id:'quick:new-test'}
  },
  $:id=>{
   if(!nodes.has(id))nodes.set(id,{textContent:''});
   return nodes.get(id);
  }
 };
 vm.runInNewContext(fn+'\nopenNewFavoriteFromQuickIntake();',scope);
 assert.deepEqual(calls,['favorites:modal','favorites:editor']);
 assert.equal(scope.quickIntakeDraftId,'quick:new-test');
 assert.match(nodes.get('hhQuickStudioHeading').textContent,/Új kedvenc/);
 assert.match(nodes.get('hhQuickEditStatus').textContent,/Kedvencekbe teszi/);
 assert.match(nodes.get('hhQuickEditStatus').textContent,/Kész gombbal/);
});
test('Quick create detects duplicate, reuses existing favorite and requires explicit Kész for diary',()=>{
 assert.match(wheel,/const quickCreate=quickIntakeDraftId===editing\.id/);
 assert.match(wheel,/if\(quickCreate&&name\.length>=2\)/);
 assert.match(wheel,/activeRecipes\(\)\.find\(q=>q\.id!==editing\.id/);
 assert.match(wheel,/normalized\(q\.name\)===normalized\(name\)/);
 assert.match(wheel,/showWheel\(original\.id\)/);
 assert.match(wheel,/Már szerepel a Kedvencekben/);
 assert.match(wheel,/api\.saveRecipe\(q\)/);
 assert.match(wheel,/Kedvencekbe mentve · a Kész gombbal/);
 assert.match(wheel,/\$\('hhQuickRecord'\)\.addEventListener\('click',recordSelected\)/);
 assert.match(wheel,/function recordSelected\(\)/);
 assert.doesNotMatch(part(wheel,'function openNewFavoriteFromQuickIntake(){',
  '\nwindow.HH_NUTRITION_FAVORITES_STUDIO_V1147'),/recordSelected\(|recordManualMeal\(|recordRecipe\(/);
 assert.match(wheel,/quickIntakeDraftId='';shell\.dataset\.mode='wheel'/);
 assert.match(wheel,/const common=!!q\.shared/);
 assert.match(wheel,/\$\('hhQuickSharedControls'\)\.hidden=!common/);
});
