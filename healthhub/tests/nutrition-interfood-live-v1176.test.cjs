'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../nutrition');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const ui=read('hh-interfood-live-v1176.js');
const saved=read('hh-interfood-diary-v1175.js');
const core=read('nutrition-preview-v592.js');
const art=read('hh-diary-favorites-art-v1150.js');
const html=read('index.html'),css=read('hh-interfood-live-v1176.css');
const lib=require('../nutrition/hh-interfood-live-v1176.js');
const food=(i,nutrient=true)=>({
 id:'if-sp-'+i,code:'SP'+i,name:'Étel '+i,category:'Sport és egészség',
 menuDate:'2026-11-11',week:46,sourceUrl:'https://rendel.interfood.hu/',
 imageUrl:'https://rendel.interfood.hu/images/'+i+'.jpg',
 nutritionBasis:nutrient?'published-per-serving':'not-published',
 nutrients:{kcal:nutrient?481+i:null,protein:nutrient?45:null,
 carbs:nutrient?24:null,fat:nutrient?25:null}
});
const feed=()=>({schemaVersion:'healthhub.interfood.live/1',updatedAt:new Date().toISOString(),
 sourceUrl:'https://rendel.interfood.hu/',week:46,selectedDate:null,
 items:Array.from({length:12},(_,i)=>food(i+1))});
test('real public meal data required, no stale or fabricated feed',()=>{
 const ok=lib.validateFeed(feed());
 assert.equal(ok.items.length,12);
 assert.equal(ok.items[0].nutrients.kcal,482);
 assert.equal(ok.meta.week,46);
 assert.throws(()=>lib.validateFeed({...feed(),updatedAt:'2026-01-01T00:00:00Z'}),/elavult/);
 assert.throws(()=>lib.validateFeed({...feed(),items:[food(1)]}),/nem ellenőrizhető/);
 assert.throws(()=>lib.validateFeed({...feed(),items:Array.from({length:12},(_,i)=>food(i+1,false))}),/Hiányos/);
});
test('unknown nutrients remain null, public artwork is whitelisted to Interfood',()=>{
 const item=lib.cleanFood({...food(3,false),imageUrl:'https://evil.example/steal.jpg'});
 assert.equal(item.imageUrl,null);
 assert.equal(item.nutrients.kcal,null);
 assert.equal(item.nutritionBasis,'not-published');
 assert.equal(lib.validPhotoURL('https://cdn.interfood.hu/meal/20.webp'),'https://cdn.interfood.hu/meal/20.webp');
 assert.equal(lib.validPhotoURL('javascript:alert(1)'),null);
 assert.equal(lib.validPhotoURL('https://interfood.hu.evil.example/a.jpg'),null);
});
test('one click adds a card to the existing private family diary and does not log consumption',()=>{
 assert.match(core,/importInterfoodLiveCard:payload=>/);
 assert.match(core,/sourceKey===stampKey/);
 assert.match(core,/saveInterfoodCard\(\{/);
 assert.match(ui,/importInterfoodLiveCard\(\{/);
 assert.match(ui,/UI\(\)\?\.refreshCards\?\.\(\)/);
 const method=core.slice(core.indexOf('importInterfoodLiveCard:payload=>'),core.indexOf('attachInterfoodCardPhoto:payload=>'));
 assert.doesNotMatch(method,/recordInterfoodMeal|d\.entries\.push/);
 assert.match(saved,/refreshCards:renderCards/);
});
test('original Premium hero remains unchanged; the smart page has text, image, nutrition and direct link',()=>{
 assert.match(html,/id="hhInterfoodTileV1173"[^>]*href="https:\/\/rendel\.interfood\.hu\/"/);
 assert.match(html,/interfood-logo-v1174.webp/);
 assert.match(html,/hh-interfood-live-v1176\.js\?v=1176-smart-auto/);
 assert.match(html,/hh-interfood-live-v1176\.css\?v=1176-smart-auto/);
 assert.match(ui,/Interfood Live étlap/);
 assert.match(ui,/Rendelés az Interfoodnál/);
 assert.match(ui,/validPhotoURL\(raw\.imageUrl\)/);
 assert.match(ui,/id="hhIfLiveCategory1176"/);
 assert.match(ui,/id="hhIfLiveSearch1176"/);
 assert.match(ui,/id="hhIfLiveCards1176"/);
 assert.match(core,/imageUrl:card\.imageUrl/);
 assert.match(art,/entry\.interfood\?\.imageUrl/);
 assert.match(css,/@media\(max-width:420px\)/);
});
test('safe UI: no credential collection, no client-side external site scraping, no Puter',()=>{
 for(const src of [ui,core,saved,art])new vm.Script(src);
 assert.doesNotMatch(ui, /puter|OAuth|password|fetch\(['"]https:\/\/rendel\.interfood/gi);
 assert.match(ui,/credentials:'omit'/);
 assert.match(ui,/aria-live="polite"/);
});
