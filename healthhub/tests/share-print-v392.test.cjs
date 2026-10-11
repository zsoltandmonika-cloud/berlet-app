// HealthHub v392 Share + Print regression tests: synthetic samples only.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {File}=require('node:buffer');
let active='m',printed=[],shared=[],toasts=[],popupCount=0,docStore=null,blobStore=null;
const elements={};
let winObj=null;
function popup(){
 const w={closed:false,printed:false,html:'',location:{replace(v){this.uri=v}},document:{
  open(){},write(v){w.html+=v},close(){},getElementById(){return null}
 },print(){this.printed=true},focus(){},close(){this.closed=true}};
 printed.push(w);popupCount++;return w;
}
function fakeReq(value){
 const req={};
 setImmediate(()=>{req.result=value;if(req.onsuccess)req.onsuccess({target:req})});
 return req;
}
const fakeDB={objectStoreNames:{contains(s){return ['documents','documentBlobs'].includes(s)}},
 transaction(){
  return {objectStore(s){return {get(id){return fakeReq(s==='documents'?docStore:blobStore)}}}
 }},
 close(){}};
const sandbox={
 Blob,File,
 console,
 setTimeout(fn){/* timers intentionally not advanced to avoid 3min object URL wait */return 1},
 URL:{createObjectURL(){return 'blob:https://healthhub.invalid/opaque-original-file'},revokeObjectURL(){}},
 localStorage:{getItem(k){return k==='hh-profile'?active:null}},
 navigator:{share:async args=>{shared.push(args)},canShare:args=>Array.isArray(args.files)&&args.files.length>0},
 indexedDB:{open(){return fakeReq(fakeDB)}},
 document:{
  addEventListener(){},getElementById(k){return elements[k]||null},
  querySelector(){return null},
  createElement(tag){
   return {tagName:tag.toUpperCase(),style:{},className:'',setAttribute(){},
    appendChild(){},remove(){},click(){this.clicked=true}};
  },
  body:{appendChild(){}},head:{appendChild(){}}
 },
 window:{
  addEventListener(){},open:popup,toast(s){toasts.push(s)},alert(s){toasts.push(s)}
 }
};
vm.runInNewContext(fs.readFileSync('healthhub/live-v392-share-print.js','utf8'),sandbox,{filename:'live-v392-share-print.js'});
const api=sandbox.window.HH_SHARE_PRINT_V392;
function setAnswer(profile,question,answer,foot){
 active=profile==='monika'?'m':'z';
 elements.hhAi331Answer={dataset:{profile},classList:{contains:x=>x==='on'}};
 elements.hhSQ299={value:question};
 elements.hhAi331Text={innerText:answer};
 elements.hhAi331Foot={innerText:foot};
}
(async()=>{
 const huge='Személyes egészségügyi magyarázat. '.repeat(350);
 setAnswer('monika','Mit mutat a lelet? <script>alert(1)</script>',huge,'Klinikai forrás: eredeti PDF, 3. oldal');
 assert.equal(await sandbox.window.hhAskLenaShareV392(),true);
 assert.ok(shared.length===1);
 assert.ok(shared[0].text.includes(huge),'share preserves the entire response, no 600-character truncation');
 assert.ok(shared[0].text.includes('KÉRDÉS'),'full question is present');
 assert.ok(shared[0].text.includes('Klinikai forrás: eredeti PDF'));
 assert.ok(!('url' in shared[0]),'no private HealthHub URL may be copied to receiver');
 assert.equal(sandbox.window.hhAskLenaPrintV392(),true);
 assert.ok(printed[0].html.includes('&lt;script&gt;'),'print output must HTML-escape question and answer');
 assert.ok(!printed[0].html.includes('<script>alert(1)</script>'));
 assert.ok(printed[0].html.includes('Klinikai forrás: eredeti PDF'));
 assert.ok(printed[0].html.includes(huge.slice(-70)));

 // Only patient-specific local records can be shared, not cached private URLs.
 docStore={id:'monika-document-1',profile:'monika',originalName:'Mónika-lelet.pdf'};
 blobStore={id:'monika-document-1',blob:new Blob(['%PDF-1.4 synthetic clinical content'],{type:'application/pdf'})};
 assert.equal(await sandbox.window.hhDocShareV392('monika-document-1'),true);
 assert.equal(shared.length,2);
 assert.equal(shared[1].files.length,1);
 assert.equal(shared[1].files[0].name,'Mónika-lelet.pdf');
 assert.equal(shared[1].files[0].type,'application/pdf');
 assert.ok(!('url' in shared[1]));
 assert.equal(await sandbox.window.hhDocPrintV392('monika-document-1'),true);
 assert.ok(printed[1].location.uri.startsWith('blob:'),'print uses original local file not a public URL');

 active='z';
 const before=shared.length;
 assert.equal(await sandbox.window.hhDocShareV392('monika-document-1'),false,
  'fail closed when wrong profile selected');
 assert.equal(shared.length,before,'wrong profile content not shared');
 assert.equal(await sandbox.window.hhDocPrintV392('monika-document-1'),false,
  'print cannot bypass patient isolation');
 assert.ok(printed[2].closed,'blocked print popup closed after profile check');

 const text=api.formatAnswer({profile:'zsolt',question:'Kérdés?',answer:'Hosszú válasz.'});
 assert.ok(text.includes('KÉRDÉS'));
 assert.ok(text.includes('LÉNA VÁLASZA'));
 assert.ok(!api.permitted({profile:'monika'},'zsolt'));
 assert.ok(api.permitted({profile:'monika'},'monika'));
 assert.equal(api.formatAnswer({profile:'unknown',question:'x',answer:'y'}),'');
 console.log('PASS v392: Q&A full share + escaped print, original local PDF, native file share, no URLs, strict profile isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
