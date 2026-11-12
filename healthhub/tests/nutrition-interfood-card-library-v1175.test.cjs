'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../nutrition');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');
const html=read('index.html'),core=read('nutrition-preview-v592.js'),
 ui=read('hh-interfood-diary-v1175.js'),css=read('hh-interfood-diary-v1175.css');
const diaryArt=read('hh-diary-favorites-art-v1150.js');
const parser=require('../nutrition/hh-interfood-diary-v1175.js');

test('separate Interfood Ételeim page preserves original Premium tile and official link',()=>{
 assert.match(html,/id="hhInterfoodTileV1173"[^>]+href="https:\/\/rendel\.interfood\.hu\/"/);
 assert.match(html,/interfood-logo-v1174\.webp/);
 assert.match(html,/hh-interfood-diary-v1175\.js\?v=1184-premium-photo-repair/);
 assert.match(html,/hh-interfood-diary-v1175\.css\?v=1184-premium-photo-repair/);
 assert.match(ui,/id='hhInterfoodLibraryV1175'/);
 assert.match(ui,/Interfood ételeim/);
 assert.match(ui,/id="hhIfCards1175"/);
 assert.match(ui,/id="hhIfSearch1175"/);
});
test('editor has a picture, four nutrients, separate card save and exactly three opt-in checks',()=>{
 assert.match(ui,/id="hhIfCardPhoto1175"/);
 assert.match(ui,/id="hhIfPhoto1175"/);
 assert.match(ui,/id="hhIfPreviewKcal1175"/);
 assert.match(ui,/id="hhIfPreviewProtein1175"/);
 assert.match(ui,/id="hhIfPreviewCarbs1175"/);
 assert.match(ui,/id="hhIfPreviewFat1175"/);
 const ids=[...ui.matchAll(/<input type="checkbox" id="(hhIfSave[A-Za-z]+1175)"/g)].map(x=>x[1]);
 assert.deepEqual(ids,['hhIfSaveFood1175','hhIfSaveFavorite1175','hhIfSaveFamily1175']);
 assert.match(ui,/Mentés az Interfood ételeim közé/);
 assert.match(ui,/function logCard\(/);
});
test('parser reads copied published-serving nutrition and retains unknown numbers as null',()=>{
 const sample='D9 - Kemencében sült csirkemell, görög saláta\n481 kcal · 45 g fehérje · 24 g szénhidrát · 25 g zsír';
 const parsed=parser.parseMenuCopy(sample);
 assert.equal(parsed.code,'D9');
 assert.equal(parsed.name,'Kemencében sült csirkemell, görög saláta');
 assert.deepEqual(parsed.nutrients,{kcal:481,protein:45,carbs:24,fat:25});
 const limited=parser.parseMenuCopy('D9 - Főétel\nKemencében sült csirkemell, görög saláta\n481 kcal');
 assert.equal(limited.name,parsed.name);
 assert.equal(limited.nutrients.protein,null);
 assert.deepEqual(parser.scale({kcal:481,protein:45,carbs:null,fat:25},.5),
  {kcal:240.5,protein:22.5,carbs:null,fat:12.5});
});
test('saved cards share existing revision-safe per-profile Nutrition cloud journal',()=>{
 assert.match(core,/quickRecipes:\[\],interfoodCards:\[\]/);
 assert.match(core,/\['entries','body','catalog','units','quickRecipes','interfoodCards','interfoodOrders'\]/);
 assert.match(core,/getInterfoodCards:\(\)=>clone\(read\(active\)\.interfoodCards/);
 assert.match(core,/saveInterfoodCard:payload=>/);
 assert.match(core,/deleteInterfoodCard:payload=>/);
 assert.match(core,/attachInterfoodCardPhoto:payload=>/);
 assert.match(core,/recordInterfoodCard:payload=>/);
 assert.match(core,/if\(payload\?\.expectedProfile!==active\)throw Error\(/);
 assert.match(core,/source:sourceKey\?'interfood-live':'interfood-user-saved'/);
 assert.match(core,/update\(d=>\{/);
 const portion=core.slice(core.indexOf('saveInterfoodCard:payload=>'),core.indexOf('/* v1178 · Smart Lunch:'));
 assert.doesNotMatch(portion,/recordInterfoodMeal|recordInterfoodCard|d\.entries\.push/);
});
test('logging a saved card is an explicit one-click action with a source snapshot',()=>{
 assert.match(ui,/api\(\)\.recordInterfoodCard\(/);
 assert.match(ui,/button\.disabled=true/);
 assert.match(core,/token:payload\.token,code:card\.code,name:card\.name/);
 assert.match(core,/cardId:card\.id,imageRef:card\.imageRef/);
 assert.match(core,/source:'interfood-import'/);
 assert.match(diaryArt,/if\(entry\.interfood\?\.imageRef\|\|entry\.interfood\?\.imageUrl\)/);
});
test('three optional exports use existing supported APIs, never invent grams',()=>{
 assert.match(ui,/saveManualFood\(\{/);
 assert.match(ui,/saveRecipe\(\{/);
 assert.match(ui,/shared\(\)\.upsert\(\{/);
 assert.match(ui,/if\(data\.weightGrams==null\)/);
 assert.match(ui,/if\(!ready\)/);
 assert.match(ui,/const ready=KEYS\.every/);
 assert.match(ui,/vault\(\)\.save\(owner,photoData\)/);
 assert.match(ui,/vault\(\)\.save\('shared',photoData\)/);
 assert.doesNotMatch(ui,/fetch\('https:\/\/rendel\.interfood\.hu|localStorage\.setItem/);
});
test('page stays scoped, accessible on mobile, and JS parses',()=>{
 for(const source of [core,ui,diaryArt])new vm.Script(source);
 assert.match(css,/#hhInterfoodLibraryV1175/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(ui,/setAttribute\('aria-label','Interfood ételeim'\)/);
 assert.match(ui,/aria-live="polite"/);
});

test('v1184 premium Interfood gallery is compact, has clickable image previews and explicit logging',()=>{
 assert.ok(ui.includes("frame=doc.createElement('button')"));
 assert.ok(ui.includes("frame.addEventListener('click'"));
 assert.ok(ui.includes("photoDlg.id='hhIfPhotoViewerV1184'"));
 assert.ok(ui.includes('showPhoto(photoSrcById.get(card.id),card.name)'));
 assert.ok(ui.includes("log.textContent='✓ Naplóba'"));
 assert.ok(ui.includes("recordInterfoodCard({expectedProfile:owner"));
 assert.ok(css.includes('v1184 · Smart Lunch-aligned premium Interfood saved-meal gallery'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(css.includes('aspect-ratio:1/1'));
 assert.ok(css.includes('hh-if-photo-loaded-v1184'));
 assert.ok(css.includes('#hhIfPhotoViewerV1184'));
 assert.ok(css.includes('@media(max-width:365px)'));
 assert.ok(html.includes('hh-interfood-diary-v1175.js?v=1184-premium-photo-repair'));
 assert.ok(html.includes('hh-interfood-diary-v1175.css?v=1184-premium-photo-repair'));
 new vm.Script(ui);
});
