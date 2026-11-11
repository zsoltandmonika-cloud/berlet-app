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
 assert.match(core,/imageUrl=item\.imageUrl/); // no alternate source needed
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
