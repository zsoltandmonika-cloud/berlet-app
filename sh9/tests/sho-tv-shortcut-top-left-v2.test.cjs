'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('sh9/shared/sho-tv-shortcut-v1.js');
test('Shared TV shortcut is premium 45x45 top-left and respects mobile safe area',()=>{
 assert.match(code,/position:fixed;left:11px;top:calc\(64px \+ env\(safe-area-inset-top,0px\)\);right:auto;bottom:auto/);
 assert.match(code,/@media\(min-width:950px\).*top:20px;left:20px;right:auto;bottom:auto/);
 assert.match(code,/@media\(max-height:420px\).*top:12px;left:12px;right:auto;bottom:auto/);
 assert.doesNotMatch(code,/bottom:calc\(88px \+ env\(safe-area-inset-bottom/);
 assert.match(code,/width:45px;height:45px/);
 assert.match(code,/backdrop-filter:blur\\(12px\\)/);
 assert.match(code,/border-radius:13px/);
});
test('Single TV button retains module-only URLs, privacy and approved inline remote exceptions',()=>{
 const mounted={},children=[];
 const element=tag=>({tagName:tag.toUpperCase(),setAttribute(){}});
 const doc={
  readyState:'complete',createElement:element,
  head:{appendChild(el){mounted[el.id]=el}},
  body:{appendChild(el){children.push(el);mounted[el.id]=el}},
  getElementById(id){return mounted[id]||null},
  querySelector(){return null}
 };
 const win={location:{pathname:'/berlet-app/sh9/'},addEventListener(){}};
 vm.runInNewContext(code,{window:win,document:doc},{timeout:500});
 assert.equal(children.length,1);
 assert.equal(children[0].href,'https://mediaradar.pages.dev/sho-family-tv/remote.html?show=home');
 assert.match(mounted.shoTvShortcutStyleV1.textContent,/safe-area-inset-top/);
 win.SHO_TV_SHORTCUT_V1.mount();
 assert.equal(children.length,1,'do not duplicate on repeated mount');
 assert.doesNotMatch(children[0].href,/token|gps|healthhub|@|code=/);
});
test('Direct and shared loaders request the cache-refreshed universal shortcut',()=>{
 const files=[
  'sh9/shared/sh9-golden-bottom-nav-v924.js',
  'sh9/shared/sh9-golden-controls-v1.js',
  'sh9/local-storage/index.html',
  'sh9/shopping/store-manager-v1.html',
  'sh9/shopping/smart-list.html',
  'sh9/shopping/tesco-pilot.html',
  'sh9/shopping/merchant-smart-v1.html',
  'sh9/entertainment/book-studio/index.html',
  'sh9/smart-travel/public-transport/smart-trip/v5/universal/index.html'
 ];
 for(const file of files){
  assert.match(read(file),/sho-tv-shortcut-v1\.js\?v=3-premium45-20261121/,file);
 }
});
