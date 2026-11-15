'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../book-studio/onedrive-books-v2.js'),'utf8');
const CID='c7f16654-67a5-4e2e-8b7e-db014598501d'; // Public app ID used as synthetic test input only.
const ACCOUNT='tester@example.com';
const SIGNED='https://private-file-cdn.example.org/temporary-test-link';
function storage(records={}){
 const map=new Map(Object.entries(records));
 return {getItem(k){return map.has(k)?map.get(k):null},setItem(k,v){map.set(k,String(v))},removeItem(k){map.delete(k)}};
}
function element(){
 return {style:{setProperty(){}},dataset:{},hidden:false,append(){},replaceChildren(){},addEventListener(){},
  setAttribute(){},querySelector(){return element()},value:'',textContent:''};
}
const reply=value=>({ok:true,async json(){return value}});
const file=(withLink=true)=>Object.assign({id:'file123',name:'Test.epub',size:32,file:{mimeType:'application/epub+zip'}},
 withLink?{'@microsoft.graph.downloadUrl':SIGNED}:{});
async function scenario({metadataMode='selected',listingLink=false,driveFallback=false}={}){
 const dom=new Map(),requests=[],accessHeaders=[];
 const localStorage=storage({'sh9-book-ms-config-v2':JSON.stringify({clientId:CID,account:ACCOUNT})});
 const sessionStorage=storage({'sh9-book-ms-access-v2':JSON.stringify({
  clientId:CID,account:ACCOUNT,accessToken:'test-access-token',expires:Date.now()+3000000})});
 const doc={getElementById(id){if(!dom.has(id))dom.set(id,element());return dom.get(id)},
  createElement(){return element()}};
 const win={
  localStorage,sessionStorage,document:doc,URL,Blob,location:{href:'https://example.net/sh9/entertainment/book-studio/',search:''},
  fetch:async(url,opts={})=>{
   const src=String(url);requests.push(src);
   accessHeaders.push(opts.headers||{});
   if(src.startsWith('https://private-file-cdn.')){
    assert.equal(opts.credentials,'omit');assert.ok(!opts.headers?.Authorization,'Never send bearer to signed download URL');
    return {ok:true,headers:{get(){return '7'}},async blob(){return new Blob(['content'])}};
   }
   assert.ok(src.startsWith('https://graph.microsoft.com/v1.0/'));
   assert.equal(opts.headers?.Authorization,'Bearer test-access-token');
   if(src.includes('/me?$select='))return reply({mail:ACCOUNT,userPrincipalName:ACCOUNT});
   if(src.includes('/root/search(q='))return reply({value:[{
    id:'folder123',name:'EBOOKS',folder:{},parentReference:{path:'/drive/root:/EBOOKS',driveId:'drive123'}
   }]});
   if(src.includes('/items/folder123/children'))return reply({value:[file(listingLink)]});
   if(src.includes('/items/file123')){
    if(driveFallback&&!src.includes('/drives/'))return {ok:false,status:404};
    if(src.includes('?select=id,'))return reply(metadataMode==='selected'?{
      id:'file123','@microsoft.graph.downloadUrl':SIGNED
    }:{id:'file123'});
    if(!src.includes('?'))return reply(metadataMode==='full'?{
      id:'file123','@microsoft.graph.downloadUrl':SIGNED
    }:{id:'file123'});
   }
   throw Error('unexpected route '+src);
  },
  SH9_BOOK_STUDIO_V1:{
   authorized:async()=>({from:()=>({select:()=>({eq:()=>({eq:()=>({limit:async()=>({data:[],error:null})})})})})}),
   openBook:async()=>{}
  }
 };
 const context={window:win,document:doc,URL,Blob,Date,console,TextEncoder,TextDecoder,setTimeout,clearTimeout};
 vm.runInNewContext(script,context,{timeout:5000});
 let b=null;
 for(let i=0;i<75;i++){
  await new Promise(resolve=>setTimeout(resolve,3));
  b=win.SH9_BOOK_STUDIO_DRIVE_V2.getBook('od_file123');
  if(b)break;
 }
 assert.ok(b,'Book appears after authenticated folder scan');
 return {b,requests,download:win.SH9_BOOK_STUDIO_DRIVE_V2.download};
}
test('Microsoft documented ?select metadata returns signed URL and the EPUB bytes can be read',async()=>{
 const s=await scenario();
 const blob=await s.download(s.b);
 assert.equal(blob.size,7);
 assert.ok(s.requests.some(x=>x.endsWith('/items/file123?select=id,@microsoft.graph.downloadUrl')));
 assert.ok(s.requests.includes(SIGNED));
 assert.ok(!s.requests.some(x=>x.includes('?$select=id,@microsoft.graph.downloadUrl')));
});
test('Graph annotation omitted from ?select falls back to full metadata',async()=>{
 const s=await scenario({metadataMode:'full'});
 const blob=await s.download(s.b);
 assert.equal(blob.size,7);
 assert.ok(s.requests.some(x=>x.endsWith('/items/file123')));
});
test('Graph metadata omits the annotation but live child item already has a temporary link',async()=>{
 const s=await scenario({metadataMode:'missing',listingLink:true});
 const blob=await s.download(s.b);
 assert.equal(blob.size,7);
 assert.ok(s.requests.includes(SIGNED));
});
test('Other-drive ID can resolve with /drives/{drive}/items/{id} route',async()=>{
 const s=await scenario({metadataMode:'selected',driveFallback:true});
 const blob=await s.download(s.b);
 assert.equal(blob.size,7);
 assert.ok(s.requests.some(x=>x.includes('/drives/drive123/items/file123?select=')));
});
test('When every Microsoft response omits a signed link, show a readable error without copying the book',async()=>{
 const s=await scenario({metadataMode:'missing',listingLink:false});
 await assert.rejects(()=>s.download(s.b),/nem küldött letöltési hivatkozást/);
 assert.ok(!s.requests.includes(SIGNED));
});
