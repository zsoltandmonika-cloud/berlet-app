'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const studioHTML=read('../recepttar-studio/index.html');
const studioJS=read('../recepttar-studio/app.js');
const studioBridge=read('../recepttar-studio/hh-nutrition-export-v1154.js');
const math=read('nutrition/hh-cookbook-portion-math-v1154.js');
const nutritionHTML=read('nutrition/index.html');
const importer=read('nutrition/hh-cookbook-import-v1154.js');
const core=read('nutrition/nutrition-preview-v592.js');
const bevitel=read('nutrition/hh-bevitel-premium-v643.js');
const art=read('nutrition/hh-diary-favorites-art-v1150.js');

test('All new and existing touched JavaScript parses',()=>{
 for(const [name,source] of Object.entries({studioJS,studioBridge,math,importer,core,bevitel,art}))
  assert.doesNotThrow(()=>new vm.Script(source,{filename:name+'.js'}),name);
});
test('320 g cooked-food proportional maths, no fabricated zero or ambiguous yield',()=>{
 const scope={window:{}};vm.runInNewContext(math,scope);
 const api=scope.window.HH_COOKBOOK_PORTION_MATH_V1154;
 const example={servings:'4 fő',finishedWeightGrams:1600,
  perServing:{kcal:400,protein_g:20,carbs_g:40,fat_g:12,fiber_g:4}};
 const out=api.calculate(example,320);
 assert.equal(out.grams,320);
 assert.equal(out.nutrients.kcal,320);
 assert.equal(out.nutrients.protein,16);
 assert.equal(out.nutrients.carbs,32);
 assert.equal(out.nutrients.fat,9.6);
 assert.equal(out.nutrients.fiber,3.2);
 assert.equal(api.servingCount('8 stangli'),8);
 for(const invalid of [
  {...example,finishedWeightGrams:undefined},
  {...example,finishedWeightGrams:0},
  {...example,servings:'4–6 fő'},
  {...example,perServing:{...example.perServing,kcal:undefined}},
  {...example,finishedWeightGrams:250}
 ])assert.throws(()=>api.calculate(invalid,320));
});
test('Food > Cookbook enters Studio in explicit profile-bound import mode only',()=>{
 assert.match(bevitel,/picked\.category===COOKBOOK_ID/);
 assert.match(bevitel,/\.\.\/\.\.\/recepttar-studio\//);
 assert.match(bevitel,/target\.searchParams\.set\('hhNutritionImport','1'\)/);
 assert.match(bevitel,/target\.searchParams\.set\('profile',profile\)/);
 assert.match(bevitel,/target\.searchParams\.set\('meal',selectedMeal\)/);
 assert.match(nutritionHTML,/id="hhBevitelRecipeStudioV1151"/);
 assert.match(nutritionHTML,/href="\.\.\/\.\.\/recepttar-studio\//);
});
test('Studio remains normally browsable, import mode requires explicit query and single card click',()=>{
 assert.match(studioHTML,/hh-cookbook-portion-math-v1154\.js/);
 assert.match(studioHTML,/hh-nutrition-export-v1154\.js/);
 assert.ok(studioHTML.indexOf('hh-cookbook-portion-math-v1154.js')<studioHTML.indexOf('app.js?v=1154'));
 assert.ok(studioHTML.indexOf('app.js?v=1154')<studioHTML.indexOf('hh-nutrition-export-v1154.js'));
 assert.match(studioJS,/a\.dataset\.recipeId=r\.id/);
 assert.match(studioJS,/LENA_RECIPE_NUTRITION_EXPORT_V1154/);
 assert.match(studioHTML,/hhAdd320ButtonV1160/);
 assert.match(studioBridge,/source\(\)\?\.currentRecipeId\?\.\(\)/);
 assert.match(studioBridge,/importMode=params\.get\('hhNutritionImport'\)==='1'/);
 assert.match(studioBridge,/if\(importMode\)d\.addEventListener\('click',[\s\S]*?,true\)/);
 assert.match(studioBridge,/e\.target\.closest\('\.fav'\)/);
 assert.match(studioBridge,/HH_COOKBOOK_PORTION_MATH_V1154\.calculate\(n,320\)/);
 assert.match(studioBridge,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(payload\)\)/);
 assert.doesNotMatch(studioBridge,/\.recordCookbookPortion\(/);
});
test('Cooked yield saves only after Puter verification; no assumption from recipe count',()=>{
 assert.match(studioHTML,/id="nutriFinishedWeightV1154"/);
 assert.match(studioHTML,/id="nutriSaveWeightV1154"/);
 assert.match(studioJS,/async function saveFinishedWeightV1154/);
 assert.match(studioJS,/puter\.kv\.set\(NUTRI_KEY_PREFIX\+id,next\)/);
 assert.match(studioJS,/puter\.kv\.get\(NUTRI_KEY_PREFIX\+id\)/);
 assert.match(studioJS,/finishedWeightGrams/);
});
test('Nutrition imports one profile-specific immutable snapshot using the existing diary',()=>{
 assert.match(nutritionHTML,/hh-cookbook-import-v1154\.js/);
 assert.match(core,/recordCookbookPortion:payload=>/);
 assert.match(core,/payload\?\.expectedProfile!==active/);
 assert.match(core,/id:recId,createdAt:now,updatedAt:now,date:localDate\(\)/);
 assert.match(core,/update\(d=>\{if\(!d\.entries\.some\(x=>x\.id===recId\)\)/);
 assert.match(core,/cookbookImport:\{token,recipeId:sourceId,finishedWeightGrams,grams,imageRef\}/);
 assert.match(importer,/api\.getProfile\(\)!==item\.profile/);
 assert.match(importer,/vault\.save\(item\.profile,item\.image\)/);
 assert.match(importer,/api\.recordCookbookPortion/);
 assert.match(importer,/sessionStorage\.removeItem\(KEY\)/);
 assert.match(importer,/item\.grams!==320/);
 assert.match(importer,/8\*60\*1000/);
});
test('Imported image in same blue/pink Golden Glassy diary frame, fallback for PDF',()=>{
 assert.match(art,/entry\.cookbookImport\?\.recipeId/);
 assert.match(art,/imageRef:entry\.cookbookImport\.imageRef\|\|null/);
 assert.match(art,/scope:'personal'/);
 assert.match(studioBridge,/imageMissing:!image/);
 assert.match(studioBridge,/imageMissingReason/);
 assert.match(importer,/item\.imageMissing/);
 assert.match(nutritionHTML,/hh-diary-favorites-art-v1150\.css/);
});
