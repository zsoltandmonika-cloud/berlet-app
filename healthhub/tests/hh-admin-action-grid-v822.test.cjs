'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('hh-admin-mobile-focus-v748.js');
const index=read('index.html');

test('direct Admin buttons use legible 2x3 responsive grid on phones, not six slivers',()=>{
 const start=source.indexOf('// v822: direct actions must not shrink');
 const end=source.indexOf("css.push('#'+ID+' #hhUsageOpenV870",start);
 assert.ok(start>0&&end>start,'v822 styles are injected before Usage Control');
 const css=source.slice(start,end);
 assert.match(css,/\.hhQuickDirectV748\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.hhQuickDirectV748 button\{box-sizing:border-box;display:flex;align-items:center/);
 assert.match(css,/min-height:84px/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/button\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(min-width:720px\)/);
 assert.doesNotMatch(css,/\.hhQuickDirectV748\{display:flex/);
 assert.doesNotMatch(css,/\.hhQuickDirectV748 button\{flex:1/);
});

test('all original Admin shortcuts keep their actions and Android-only restrictions',()=>{
 for(const name of [
  '📱 Eszközregiszter megnyitása',
  '📦 APK és OTA állapot',
  '🛠️ Léna Service Portal',
  '📱 HH One Connect megnyitása',
  '☁️ Dropbox kapcsolat javítása',
  '📦 Dropbox-ellenőrzés előkészítése · Mónika'
 ])assert.ok(source.includes(name),name);
 assert.match(source,/native\.hidden=!\/Android\/i/);
 assert.match(source,/actions\.appendChild\(native\)/);
 assert.match(source,/actions\.appendChild\(dropboxReview\)/);
 assert.match(source,/cloudFix\.addEventListener\('click',\(\)=>openTarget/);
 assert.match(source,/panel\.appendChild\(actions\)/);
 assert.doesNotMatch(source,/location\.reload\(|localStorage\.clear|indexedDB\.deleteDatabase/);
});

test('app busts Admin CSS-in-JS cache while GPS routes remain outside patch',()=>{
 assert.match(index,/hh-admin-mobile-focus-v748\.js\?v=748[^"']*actionGrid=822/);
 assert.match(index,/guardian-gps-routes-v1177\.js|healthhub\//);
});
