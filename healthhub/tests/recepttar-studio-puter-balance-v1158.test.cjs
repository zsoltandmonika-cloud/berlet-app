'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'recepttar-studio/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'recepttar-studio/hh-puter-balance-chip-v1158.css'),'utf8');
const js=fs.readFileSync(path.join(root,'recepttar-studio/hh-puter-balance-chip-v1158.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function boot(remaining,signed=true){
 const callbacks={};
 const badge={hidden:true,attributes:{},title:'',setAttribute(k,v){this.attributes[k]=v;},
  addEventListener(k,f){callbacks[k]=f}};
 const body={attributes:{},setAttribute(k,v){this.attributes[k]=v}};
 const doc={readyState:'complete',body,hidden:false,getElementById:id=>id==='lenaPuterBalanceV1158'?badge:null,
  addEventListener(k,f){callbacks['document-'+k]=f}};
 const win={puter:{auth:{isSignedIn:()=>signed,getMonthlyUsage:async()=>({allowanceInfo:{remaining}})}},
  addEventListener(k,f){callbacks['window-'+k]=f}};
 vm.runInNewContext(js,{window:win,document:doc,console});
 return {badge,body,callbacks,win};
}
test('v1158 is only a tiny, local, hidden-by-default billing status; provider dialogs stay untouched',()=>{
 assert.match(html,/id="lenaPuterBalanceV1158"[^>]*hidden/);
 assert.match(html,/hh-puter-balance-chip-v1158.css/);
 assert.match(html,/hh-puter-balance-chip-v1158.js/);
 assert.match(css,/width:26px!important;height:26px!important/);
 assert.match(css,/left:5px!important/);
 assert.match(css,/#lenaPuterBalanceV1158\[hidden\]/);
 assert.doesNotMatch(css,/puter-ui|requestUpgrade|dialog\s*\{|iframe\s*\{|\.modal|body\s*\{/i);
 assert.doesNotMatch(js,/requestUpgrade|\.style\.|MutationObserver|setInterval|signIn\(/);
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.doesNotMatch(html,/sh9-golden-controls-v1\.(?:js|css)/);
 assert.match(html,/sh9-golden-bottom-nav-v924.js/);
});
test('Real low balance reveals a small accessible indicator',async()=>{
 const ui=boot(0);
 await flush();
 assert.equal(ui.badge.hidden,false);
 assert.equal(ui.badge.attributes['aria-label'],'Puter AI-keret alacsony');
 assert.equal(ui.body.attributes['data-lena-puter-low-balance'],'on');
 assert.match(ui.badge.title,/Puter keret: \$0\.00/);
});
test('Adequate balance and no user sign-in never show warning',async()=>{
 const ok=boot(25000000);await flush();
 assert.equal(ok.badge.hidden,true);
 const signedOut=boot(0,false);await flush();
 assert.equal(signedOut.badge.hidden,true);
});
