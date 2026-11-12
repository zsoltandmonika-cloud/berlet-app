'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../nutrition');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const live=read('hh-interfood-live-v1176.js');
const saved=read('hh-interfood-diary-v1175.js');
const core=read('nutrition-preview-v592.js');
const css=read('hh-interfood-live-v1176.css');
const html=read('index.html');
const lib=require('../nutrition/hh-interfood-live-v1176.js');
const savedLib=require('../nutrition/hh-interfood-diary-v1175.js');
const officialFeed=JSON.parse(read('interfood-live-feed-v1176.json'));
const official='https://ia.interfood.hu/api/v1/i?menu_item_id=40004&width=425&height=425';
test('interfood official menu photo URL is accepted without a file extension',()=>{
 assert.equal(lib.validPhotoURL(official),official);
 const meal=lib.cleanFood({
  id:'if-e3-2026-11-11-40004',code:'E3',name:'Zöldséges kuszkusz sült csirkecombbal',
  menuDate:'2026-11-11',week:46,weightGrams:480,imageUrl:official,
  nutrients:{kcal:879,protein:68,carbs:93,fat:24},
  nutritionBasis:'published-per-serving'
 });
 assert.equal(meal.imageUrl,official);
 assert.equal(meal.weightGrams,480);
 assert.equal(meal.nutrients.protein,68);
});
test('only exact public Interfood image endpoint and safe query parameters allowed',()=>{
 for(const bad of [
  'https://evil.example/api/v1/i?menu_item_id=40004&width=425&height=425',
  'https://ia.interfood.hu.evil.example/api/v1/i?menu_item_id=40004&width=425&height=425',
  'http://ia.interfood.hu/api/v1/i?menu_item_id=40004&width=425&height=425',
  'https://ia.interfood.hu/api/v1/i?menu_item_id=0&width=425&height=425',
  'https://ia.interfood.hu/api/v1/i?menu_item_id=40004&width=5000&height=5000',
  'https://ia.interfood.hu/api/v1/i?menu_item_id=40004&width=425&height=425&redirect=https://evil.example',
  'https://ia.interfood.hu/api/v1/i?menu_item_id=40004&height=425',
 ])assert.equal(lib.validPhotoURL(bad),null,bad);
});
test('full original Interfood photo saved in diary and existing cards can be backfilled',()=>{
 assert.match(core,/syncInterfoodLivePhotos:payload=>/);
 assert.match(core,/imageUrl:item\.imageUrl/); // no alternate source needed
 assert.match(core,/imageUrl:card\.imageUrl/);
 assert.match(core,/imageUrl,sourceKey/);
 assert.match(core,/sourceKey===stampKey/);
 assert.match(live,/syncInterfoodLivePhotos\(\{expectedProfile:currentProfile,items\}\)/);
 assert.match(saved,/function loadPublicPhoto/);
 assert.match(saved,/id="hhIfCardPhoto1175"/);
});
test('the Live flow never asks to upload or paste when a card is auto-imported',()=>{
 assert.match(saved,/const live=Boolean\(card\?\.sourceKey\)/);
 assert.match(saved,/photoInput\.hidden=live/);
 assert.match(saved,/paste\.hidden=live/);
 assert.match(saved,/hhIfParse1175'\)\.hidden=live/);
 assert.match(saved,/Hivatalos Interfood fotó/);
 assert.match(css,/\.hh-if-live-fallback-v1176/);
 assert.match(css,/hhIfPhotoCaption1175/);
 assert.match(css,/hh-if-upload-v1175\[hidden\]/);
 assert.match(html,/hh-interfood-live-v1176\.js\?v=1177-official-photos/);
 assert.match(html,/nutrition-preview-v592\.js\?[^"]*interfood-photo=1177/);
});
test('original hero and one-click, separate conscious diary logging remain',()=>{
 assert.match(html,/id="hhInterfoodTileV1173"[^>]+href="https:\/\/rendel\.interfood\.hu\/"/);
 assert.match(html,/interfood-logo-v1174\.webp/);
 assert.match(live,/importInterfoodLiveCard\(\{/);
 assert.match(saved,/recordInterfoodCard\(\{/);
 assert.match(core,/importInterfoodLiveCard:payload=>/);
 const method=core.slice(core.indexOf('importInterfoodLiveCard:payload=>'),core.indexOf('attachInterfoodCardPhoto:payload=>'));
 assert.doesNotMatch(method,/recordInterfoodMeal\(\{|entries\.push/);
 for(const js of [live,saved,core])new vm.Script(js);
});

test('v1184 uses verified alternate official food photo with identical original image ID',()=>{
 const e4k=officialFeed.items.find(x=>x.code==='E4K'&&x.menuDate==='2026-11-13');
 assert.ok(e4k);
 assert.equal(e4k.name,'Currys pulyka sárgabarackkal, mazsolás jázmin rizs');
 const card={id:'test-card',code:e4k.code,name:e4k.name,menuDate:e4k.menuDate};
 const photos=savedLib.verifiedPhotoVariants(card,officialFeed.items);
 assert.equal(photos.length,2);
 assert.equal(photos[0],e4k.imageUrl);
 assert.ok(photos.some(u=>u.includes('menu_item_id=40018')));
 assert.ok(photos.some(u=>u.includes('menu_item_id=40023')));
 assert.deepEqual(savedLib.verifiedPhotoVariants({...card,name:'Másik étel'},officialFeed.items),[]);
 assert.deepEqual(savedLib.verifiedPhotoVariants({...card,menuDate:'2026-11-18'},officialFeed.items),[]);
 assert.deepEqual(savedLib.verifiedPhotoVariants({...card,code:'F2K'},officialFeed.items),[]);
});
test('v1184 image loader uses layout-visible fetch; never replaces failed photos with generated food',()=>{
 assert.ok(saved.includes("img.hidden=false;"));
 assert.ok(saved.includes("img.classList.remove('hh-if-photo-loaded-v1184')"));
 assert.ok(saved.includes("img.classList.add('hh-if-photo-loaded-v1184')"));
 const loader=saved.slice(saved.indexOf('function loadPhotoSrc('),saved.indexOf('function loadPublicPhoto('));
 assert.ok(loader.indexOf('img.hidden=false;') < loader.indexOf('img.src=src;'));
 assert.ok(saved.includes('const items=await officialPhotos()'));
 assert.ok(saved.includes('verifiedPhotoVariants(card,items)'));
 assert.ok(saved.includes("fallback.textContent='Hivatalos fotó nem elérhető'"));
 assert.ok(saved.includes("img.loading='eager'"));
 assert.ok(!saved.includes("loading='lazy';img.decoding='async'"));
 assert.ok(!saved.includes('api.openai'));
 new vm.Script(saved);
});
