'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('sh9/wallet/index.html');
const code=read('sh9/wallet/smart-valet-identity-v11.js');
const css=read('sh9/wallet/smart-valet-identity-v11.css');
const migration=read('supabase/migrations/20261105183000_sho_valet_id_v12_optional_password.sql');
function fakeIDB(){
 const keys=new Map();
 const db={
  objectStoreNames:{contains(name){return name==='keys'}},
  createObjectStore(){},
  transaction(name,mode){
   assert.equal(name,'keys');
   const tr={oncomplete:null,onerror:null,onabort:null,objectStore(){
    return {
     get(k){return run(()=>keys.get(k))},
     put(v,k){return run(()=>{keys.set(k,v);return k})},
     delete(k){return run(()=>{keys.delete(k)})}
    };
    function run(fn){
     const req={result:undefined,onsuccess:null,onerror:null};
     queueMicrotask(()=>{req.result=fn();req.onsuccess?.();queueMicrotask(()=>tr.oncomplete?.())});
     return req;
    }
   }};
   return tr;
  },close(){}
 };
 return{keys,open(name,version){
   assert.equal(name,'sho-valet-private-identity-device-v12');
   assert.equal(version,1);
   const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null};
   queueMicrotask(()=>{req.onupgradeneeded?.();req.onsuccess?.()});
   return req;
 }};
}
function probe(){
 const mock=fakeIDB();
 const source=code.replace(/\}\)\(window,document\);\s*$/,
  'window.__probe={derive,encrypt,decrypt,deviceAESKey,deviceKey,protectionMode,keyID};})(window,document);');
 assert.notEqual(source,code);
 const window={
  crypto:webcrypto,indexedDB:mock,
  localStorage:{getItem(){return 'z'}},
  HH_CENTRAL_VAULT:{}
 };
 const document={readyState:'loading',addEventListener(){}};
 vm.runInNewContext(source,{window,document,Blob,Uint8Array,TextEncoder,TextDecoder,atob,btoa,URL,Array,queueMicrotask},
  {filename:'v12-policy-probe'});
 return{...window.__probe,mock};
}
test('v12 protection checkbox is optional but defaults to protected and min 8',()=>{
 assert.match(page,/id="svIdPasswordEnabledV12" checked/);
 assert.match(page,/id="svIdPasswordFieldsV12"/);
 assert.match(page,/id="svIdDeviceHintV12"/);
 assert.match(page,/id="svIdPassV11" minlength="8"/);
 assert.match(page,/id="svIdPassConfirmV11" minlength="8"/);
 assert.match(code,/const mode=\$\('svIdPasswordEnabledV12'\)\.checked\?'password':'device'/);
 assert.match(code,/if\(mode==='password'\)\{/);
 assert.match(code,/if\(password\.length<8\)/);
 assert.match(code,/password!==\$\('svIdPassConfirmV11'\)\.value/);
 assert.match(code,/function updatePasswordSwitch\(\)/);
 assert.match(code,/\$\('svIdPasswordFieldsV12'\)\.hidden=!checked/);
 assert.match(code,/\$\('svIdDeviceHintV12'\)\.hidden=checked/);
 assert.match(css,/\.sv-id-protection-switch-v12/);
 assert.match(css,/\.sv-id-device-hint-v12/);
 assert.match(page,/smart-valet-identity-v11\.js\?v=12-optional-password/);
 assert.match(page,/smart-valet-identity-v11\.css\?v=12-password-switch/);
 assert.doesNotMatch(page,/get\('idPilot'\)===/);
});
test('old password cards stay password protected; their front never becomes a tile preview',()=>{
 assert.match(migration,/protection_mode text not null default 'password'/);
 assert.match(code,/function protectionMode\(rec\)\{return rec\?\.protection_mode==='device'\?'device':'password'\}/);
 assert.match(code,/if\(mode==='device'\)showPreview\(type,draft\.front\)/);
 assert.match(code,/if\(mode==='device'\)showPreview\(type,front\)/);
 assert.match(code,/if\(!rec\|\|protectionMode\(rec\)!=='device'\|\|!photoBlob/);
 assert.match(code,/if\(protectionMode\(rec\)!=='device'\|\|!rec\.front_saved_at\)continue/);
 assert.match(code,/if\(item&&protectionMode\(item\)==='password'\)removeTilePreview\(kind\)/);
 assert.match(code,/clearTilePreviews\(\)/);
 assert.match(code,/pagehide',\(\)=>\{close\(\);clearTilePreviews\(\)\}/);
 assert.equal(probe().protectionMode({}), 'password');
 assert.equal(probe().protectionMode({protection_mode:'password'}),'password');
 assert.equal(probe().protectionMode({protection_mode:'device'}),'device');
});
test('8-character password derives a nonextractable AES-256-GCM key and seven characters fail',async()=>{
 const p=probe();
 const s=webcrypto.getRandomValues(new Uint8Array(16));
 const key=await p.derive('12345678',s);
 assert.equal(key.extractable,false);
 assert.equal(key.algorithm.name,'AES-GCM');
 await assert.rejects(p.derive('1234567',s),/SHORT_PASS/);
 const rec={profile_key:'zsolt',doc_type:'license',id:'deadcafe-1111-4111-8111-111111111111'};
 const plain=new Blob([Uint8Array.from([1,2,3,4,5])],{type:'image/jpeg'});
 const enc=await p.encrypt(plain,key,rec,'front');
 const dec=await p.decrypt(enc,key,rec,'front');
 assert.deepEqual(new Uint8Array(await dec.arrayBuffer()),new Uint8Array(await plain.arrayBuffer()));
 const wrong=await p.derive('abcdefgh',s);
 await assert.rejects(p.decrypt(enc,wrong,rec,'front'),/BAD_PASS/);
});
test('device mode retains AES-GCM encryption without password and stores only a nonextractable CryptoKey',async()=>{
 const p=probe(),key=await p.deviceAESKey();
 assert.equal(key.extractable,false);
 assert.equal(key.algorithm.name,'AES-GCM');
 const rec={profile_key:'monika',doc_type:'personal',id:'ddaa1234-1111-4111-8111-111111111111'};
 const owner='signed-in-owner-uuid';
 assert.equal(p.keyID(owner,rec.id),owner+'|'+rec.id);
 await p.deviceKey('put',owner,rec.id,key);
 assert.equal(p.mock.keys.size,1);
 const restored=await p.deviceKey('get',owner,rec.id);
 assert.equal(restored,key);
 assert.equal(await p.deviceKey('get','another-user',rec.id),undefined);
 const original=new Blob([Uint8Array.from([10,20,30])],{type:'image/jpeg'});
 const encrypted=await p.encrypt(original,restored,rec,'front');
 assert.equal(encrypted.type,'application/octet-stream');
 const recovered=await p.decrypt(encrypted,restored,rec,'front');
 assert.deepEqual(new Uint8Array(await recovered.arrayBuffer()),new Uint8Array(await original.arrayBuffer()));
 await assert.rejects(p.decrypt(encrypted,restored,{...rec,profile_key:'zsolt'},'front'),/BAD_PASS/);
 await p.deviceKey('delete',owner,rec.id);
 assert.equal(p.mock.keys.size,0);
});
test('no cloud key storage, no public pictures, and device key loss is explicitly disclosed',()=>{
 assert.match(code,/function openKeyDB\(\)/);
 assert.match(code,/indexedDB\.open\(KEY_DB,1\)/);
 assert.match(code,/generateKey\(\{name:'AES-GCM',length:256\},false/);
 assert.match(code,/deviceKey\('put',deviceOwner,uuid,key\)/);
 assert.match(code,/deviceKey\('get',auth\.data\.user\.id,id\)/);
 assert.match(code,/deviceKey\('delete',auth\.data\.user\.id,item\.id\)/);
 assert.match(code,/if\(!key\|\|key\.extractable\|\|key\.algorithm\?\.name!=='AES-GCM'\)throw Error\('NO_DEVICE_KEY'\)/);
 assert.match(page,/Böngészőadatok törlése vagy telefoncsere esetén/);
 assert.match(code,/await authorized\(p\)/);
 assert.match(code,/from\('hh_profile_access'\)/);
 assert.match(code,/status\(human\(e\),true\)/);
 assert.doesNotMatch(code,/localStorage\.setItem|sessionStorage\.setItem|service_role|getPublicUrl|createSignedUrl|exportKey\(|URLSearchParams\(location\.search\)\.get\('idPilot'\)/i);
 assert.doesNotMatch(migration,/disable row level security|grant .* to anon|storage\.buckets|delete from|truncate|drop table/i);
 assert.match(migration,/check \(protection_mode in \('password','device'\)\)/);
 assert.match(page,/svIdDeleteLockedV12/);
});
test('JS parses for production',()=>{
 assert.doesNotThrow(()=>new vm.Script(code));
});


test('Corrected Lakcímkártya / Address card label preserves saved encrypted tax-type originals',()=>{
 const demo=read('sh9/wallet/smart-valet-v1.js');
 const legacy=read('supabase/migrations/20261105175000_sho_valet_identity_e2ee_v11.sql');
 assert.match(page,/data-id-type="tax"[\s\S]*?data-i18n="taxId">Lakcímkártya/);
 assert.match(demo,/taxId:'Lakcímkártya'/);
 assert.match(demo,/taxId:'Address card'/);
 assert.match(code,/tax:\['Lakcímkártya','Address card'\]/);
 assert.match(code,/TYPES=\['license','personal','taj','tax'\]/);
 assert.match(code,/rec\.doc_type/);
 assert.match(code,/function protectionMode\(rec\)/);
 assert.match(legacy,/doc_type in \('license','personal','taj','tax'\)/);
 assert.doesNotMatch(page,/data-i18n="taxId">Adókártya/);
 assert.doesNotMatch(demo,/taxId:'Adókártya'|taxId:'Tax card'/);
 assert.match(page,/smart-valet-v1\.js\?v=10-coupons-id-subgroups-lakcim/);
 assert.match(page,/smart-valet-identity-v11\.js\?v=12-optional-password-lakcim/);
});
