'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('sh9/shared/sho-tv-shortcut-v1.js');
test('TV-re compact shortcut is globally disabled and cannot create DOM controls',()=>{
 const nodes={};let appended=0;
 const d={readyState:'complete',getElementById:k=>nodes[k]||null,body:{appendChild(){appended++}}};
 const w={addEventListener(){}};
 vm.runInNewContext(code,{window:w,document:d},{timeout:500});
 assert.equal(w.SHO_TV_SHORTCUT_V1.disabled,true);
 assert.equal(appended,0);
 w.SHO_TV_SHORTCUT_V1.mount();
 assert.equal(appended,0);
 assert.doesNotMatch(code,/createElement\('a'\)|sho-tv-shortcut-v1\{position:/);
});
test('Both shared loaders stop creating small TV-re buttons',()=>{
 for(const path of ['sh9/shared/sh9-golden-controls-v1.js','sh9/shared/sh9-golden-bottom-nav-v924.js']){
  const text=read(path);
  assert.match(text,/function ensureShoTvShortcut/);
  assert.doesNotMatch(text,/script\.src=['"]\/berlet-app\/sh9\/shared\/sho-tv-shortcut-v1\.js/);
  assert.match(text,/removeChild\(badge\)/);
 }
});
test('Every former direct-loader page no longer loads small TV-re JavaScript',()=>{
 for(const p of [
  'sh9/index.html','sh9/local-storage/index.html','sh9/shopping/store-manager-v1.html',
  'sh9/shopping/smart-list.html','sh9/shopping/tesco-pilot.html',
  'sh9/shopping/merchant-smart-v1.html','sh9/entertainment/book-studio/index.html',
  'sh9/smart-travel/public-transport/smart-trip/v5/universal/index.html'
 ])assert.doesNotMatch(read(p),/<script[^>]+sho-tv-shortcut-v1\.js/,p);
});
