'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'sh9/shared/sho-tv-shortcut-v1.js'),'utf8');
test('Existing mini TV-re badge is removed even if previous build already injected it',()=>{
 let removed=0;const parent={removeChild(){removed++;}};
 const existing={id:'shoTvShortcutV1',parentNode:parent};
 const document={readyState:'complete',getElementById:k=>k==='shoTvShortcutV1'?existing:null};
 const window={addEventListener(){}};
 vm.runInNewContext(source,{window,document},{timeout:500});
 assert.equal(removed,1);
 window.SHO_TV_SHORTCUT_V1.mount();
 assert.equal(removed,2);
});
test('SHO start page does not load the retired TV shortcut',()=>{
 const page=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
 assert.doesNotMatch(page,/<script[^>]+sho-tv-shortcut-v1\.js/);
});
