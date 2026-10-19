'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'hh-pdf-device-audit-v691.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

function env(token=null){
 let active='m',calls=[],result={};
 const win={addEventListener(){},openHrDocument:function pdfFromPrivateDriveV690(){},
  HH_DROPBOX_VAULT:{connected:()=>true,accessToken:async()=> 'PRIVATE_TOKEN'},
  HH_DAILY_HEALTH_SYNC_V319:{getStatus:()=>({authenticated:true,authorizedProfiles:['monika','zsolt']}),
   stream:async(path,payload)=>{calls.push({path,payload});return{
    ok:true,status:200,json:async()=>({profile:payload.profile,files:[
     {mimeType:'application/pdf',appProperties:{profile:'monika',documentId:'M-123456'}},
     {mimeType:'application/pdf',appProperties:{profile:'monika',documentId:'M-987654'}},
     {mimeType:'application/pdf',appProperties:{profile:'zsolt',documentId:'Z-123456'}}]})}}}
 };
 const doc={readyState:'loading',addEventListener(){},querySelector:(s)=>s.includes('healthhub-live-build')?{content:'v691-cross-device-pdf-diagnostics'}:null,
  querySelectorAll:()=>[{getAttribute:()=> './live-v201.js?v=692-sha-tagged-pdf-locator'}]};
 const ls={getItem:(k)=>k==='hh-profile'?active:k==='hh-dropbox-token-v2'?(token&&JSON.stringify(token)):null};
 const fetcher=async(url,opts)=>{calls.push({url,method:opts.method,body:opts.body});
  return{ok:true,status:200,json:async()=>({'.tag':'file'})}};
 const context=vm.createContext({window:win,document:doc,localStorage:ls,crypto:webcrypto,TextEncoder,Uint8Array,
  navigator:{userAgent:'Android',clipboard:{writeText:async()=>{}}},fetch:fetcher,console,Array,Set,Map,Promise,
  MutationObserver:class{},indexedDB:{open(){throw Error('Should not open until explicit audit')}},setTimeout:()=>{}});
 const trailer=src.lastIndexOf('})();');
 assert.ok(trailer>0,'runtime wrapper ends with an IIFE');
 const instrumented=src.slice(0,trailer)+'window.__hhPdfDeviceTest691={accountFingerprint,cloudProfileExists,driveMatch,viewerRuntime,loadedViewer,build};\n'+src.slice(trailer);
 vm.runInContext(instrumented,context);
 return{audit:context.window.__hhPdfDeviceTest691,calls,setProfile(x){active=x}};
}
test('v691 is installed after original viewer and connection dashboard, has unique build',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.match(index,/v694-four-local-pdf-repair/);
 assert.match(index,/hh-pdf-device-audit-v691\.js\?v=693-sha-audit-counts/);
 assert.ok(index.indexOf('hh-pdf-device-audit-v691.js')>index.indexOf('live-v201.js'));
 assert.ok(index.indexOf('hh-pdf-device-audit-v691.js')>index.indexOf('live-v355.js'));
});
test('source is read-only: no uploading, clearing, storage writes or medical content collection',()=>{
 assert.doesNotMatch(src,/localStorage\.setItem|indexedDB\.deleteDatabase|\.clear\(|\.put\(|files\/upload|uploadJson|method:\s*'DELETE'/);
 assert.match(src,/files\/get_metadata/);
 assert.match(src,/action:'archive_inventory'/);
 assert.match(src,/getAllKeys\(\)/);
 assert.match(src,/getAll\(p\)/);
 assert.match(src,/appProperties\.documentId/);
 assert.match(src,/pdfFromPrivateDriveV690/);
 assert.doesNotMatch(src,/console\.log|console\.info|filename:|originalName|health_record_values/);
});
test('Dropbox account ID is reduced to stable pseudonymous fingerprint, not returned raw',async()=>{
 const x=env({refresh_token:'PRIVATE_REFRESH',account_id:'dbid:ABCDEFGH0123456789'});
 const fingerprint=await x.audit.accountFingerprint();
 assert.match(fingerprint,/^DBX-[0-9A-F]{12}$/);
 assert.doesNotMatch(fingerprint,/ABCDEFGH|PRIVATE/);
 assert.equal(fingerprint,await x.audit.accountFingerprint());
 assert.equal(env().audit.viewerRuntime(),true);
 assert.equal(env().audit.loadedViewer(),'692-sha-tagged-pdf-locator');
});
test('Dropbox profile path check uses only read metadata, no upload',async()=>{
 const x=env({refresh_token:'x',account_id:'dbid:ABCDEFGH0123456789'});
 assert.match(await x.audit.cloudProfileExists('monika'),/fájl létezik/);
 assert.deepEqual(x.calls.map(x=>x.url),['https://api.dropboxapi.com/2/files/get_metadata']);
 assert.deepEqual(x.calls.map(x=>JSON.parse(x.body).path),['/HealthHub/profiles/monika-vault.json']);
});
test('Drive ID match reports only aggregates for absent local PDF bytes',async()=>{
 const x=env();
 const result=await x.audit.driveMatch('monika',{ids:['M-123456','M-987654'],missingIds:['M-123456','NO-SERVER-ID']});
 assert.match(result,/3 eredeti PDF/);
 assert.match(result,/1\/2 helyben hiányzó PDF-hez pontos Drive-találat/);
 assert.doesNotMatch(result,/M-123456|NO-SERVER-ID/);
 assert.equal(x.calls[0].payload.profile,'monika');
 assert.equal(x.calls[0].payload.action,'archive_inventory');
});
test('profile switch during inventory results fails without exposing source IDs',async()=>{
 const x=env();
 x.setProfile('z');
 const result=await x.audit.driveMatch('monika',{ids:[],missingIds:[]});
 assert.match(result,/Profilváltás történt/);
});
