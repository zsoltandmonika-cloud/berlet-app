'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('sh9/wallet/index.html');
const demo=read('sh9/wallet/smart-valet-v1.js');
const controller=read('sh9/wallet/smart-valet-extra-v15.js');
const quick=read('sh9/wallet/smart-valet-smart-access-v13.js');
const css=read('sh9/wallet/smart-valet-extra-v15.css');
test('Health and bank categories load genuine secure-card controller, not generic upload',()=>{
 assert.match(page,/smart-valet-extra-v15\.css\?v=16-unified-optical/);
 assert.match(page,/load\('\.\/smart-valet-extra-v15\.js\?v=23-keep-cloud-pass-list'/);
 assert.ok(page.indexOf('smart-valet-extra-v15.js')>page.indexOf('smart-valet-identity-v11.js'));
 assert.match(demo,/addPanel\.hidden=\['identity','health','card'\]\.includes\(kind\)/);
 assert.match(controller,/sho-valet-filter-change/);
 assert.match(controller,/\['health','card','pass'\]\.includes\(category\)/);
 assert.match(controller,/id="svExtraAddV15"/);
 assert.match(page,/id="svExtraFrontV15"/);
 assert.match(page,/id="svExtraBackV15"/);
 assert.match(page,/id="svExtraLast4V15"/);
 assert.match(css,/sv-extra-bank-art-v15/);
});
test('Health photos and privacy-masked bank scans encrypt before storage; no PAN/CVV fields',()=>{
 assert.match(controller,/crypto\.subtle\.deriveKey/);
 assert.match(controller,/name:'PBKDF2'/);
 assert.match(controller,/name:'AES-GCM'/);
 assert.match(controller,/iterations:ITER/);
 assert.match(controller,/ITER=310000/);
 assert.match(controller,/const front=await imageBlob\(files\.front,cat==='pass'\)/);
 assert.match(controller,/rec\.front_cipher=await encrypt\(front,key,rec,'front'\)/);
 assert.match(controller,/rec\.last_four=last\|\|null/);
 assert.match(controller,/const rec=\{id:w\.crypto\.randomUUID\(\),profile_key:p,category:cat,title,issuer:null,last_four:null/);
 assert.doesNotMatch(controller,/getPublicUrl|createSignedUrl|service_role|CVV\s*[:=]\s*\w/i);
});
test('Existing Guardian auth and RLS profile ownership are enforced',()=>{
 assert.match(controller,/hh-guardian-family-auth-v785/);
 assert.match(controller,/hh_profile_access/);
 assert.match(controller,/profile_key/);
 assert.match(controller,/\.eq\('profile_key',p\)/); // Authenticated client validates its profile before reading
});
test('Quick access accepts a UUID extra card, with locked health but no preview',async()=>{
 const listeners={},cache=new Map(),host={children:[],classList:{add(){},remove(){}},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x}};
 const badge={textContent:''},title={closest(){return {querySelector(){return badge}}}};
 const make=tag=>({tagName:tag,children:[],classList:{add(){},remove(){}},attrs:{},
  append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},
  addEventListener(){},setAttribute(k,v){this.attrs[k]=v},textContent:''});
 const document={readyState:'loading',createElement:make,addEventListener(n,fn){listeners[n]=fn},
  getElementById(id){return id==='svFeatured'?host:null},
  querySelector(s){return s==='#svFeatureTitle'?title:null}};
 const window={
  localStorage:{getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,String(v)),removeItem:k=>cache.delete(k)},
  addEventListener(){},dispatchEvent(){},SHO_SMART_VALET_PREVIEW_V1:{render(){}}
 };
 const urls={count:0,createObjectURL(){this.count++;return 'blob:local'},revokeObjectURL(){}};
 vm.runInNewContext(quick,{window,document,CustomEvent:class{},URL:urls,Blob,console});
 const q=window.SHO_VALET_SMART_ACCESS_V13;
 const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 assert.equal(q.toggle({source:'extra',id:uuid}),true);
 assert.equal(q.isPinned('extra',uuid),true);
 assert.equal(q.toggle({source:'extra',id:'not-a-uuid'}),false);
 window.SHO_VALET_EXTRA_V15={
  resolvePinned:async()=>({title:'Egészségpénztár',protection_mode:'password'}),
  previewPinned:async()=>{throw Error('must never preview protected health card')}
 };
 assert.equal(q.renderFeatured(),true);
 await new Promise(done=>setImmediate(done));
 assert.equal(urls.count,0);
 assert.equal(host.children[1].children[0].textContent,'🔒');
 window.localStorage.setItem('hh-profile','m');
 assert.equal(q.current(),null);
 window.localStorage.setItem('hh-profile','z');
 assert.equal(q.toggle({source:'extra',id:uuid}),true);
 assert.equal(q.current(),null);
});
test('Browser source syntax is valid and exact v13 API remains backward compatible',()=>{
 for(const source of [controller,quick,demo])assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(quick,/if\(pin\.source==='identity'&&entry\.protection_mode==='password'\)/);
 assert.match(quick,/if\(pin\.source==='extra'&&entry\.protection_mode==='password'\)/);
 assert.match(quick,/sho-valet-extra-ready/);
});
