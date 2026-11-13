'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/wallet/smart-valet-smart-access-v13.js');
const page=read('sh9/wallet/index.html');
const demo=read('sh9/wallet/smart-valet-v1.js');
const privateJS=read('sh9/wallet/smart-valet-private-v7.js');
const idJS=read('sh9/wallet/smart-valet-identity-v11.js');
const reader=read('sh9/shared/sho-private-document-reader-v1.js');
const style=read('sh9/wallet/smart-valet-smart-access-v13.css');
function makeUI(){
 const listeners={};
 const make=tag=>{
  const e={tagName:tag,children:[],textContent:'',hidden:false,disabled:false,
   attrs:{},classList:{add(){},remove(){}},
   setAttribute(k,v){this.attrs[k]=v},
   append(...items){this.children.push(...items)},
   replaceChildren(...items){this.children=items},
   addEventListener(k,cb){(this.events??={})[k]=cb},
   closest(){return null}
  };
  return e;
 };
 const host=make('div'),badge=make('span'),title=make('h2');
 title.closest=()=>({querySelector:()=>badge});
 const document={
  readyState:'loading',addEventListener(k,cb){listeners[k]=cb},
  createElement:make,getElementById(id){return id==='svFeatured'?host:null},
  querySelector(q){return q==='#svFeatureTitle'?title:null}
 };
 return{host,badge,document};
}
function harness(){
 const ui=makeUI(),memory=new Map(),events=[];
 const fake={
  localStorage:{
   getItem:k=>memory.get(k)??null,
   setItem:(k,v)=>memory.set(k,String(v)),
   removeItem:k=>memory.delete(k)
  },
  dispatchEvent:e=>events.push(e),
  addEventListener(){},
  SHO_SMART_VALET_PREVIEW_V1:{render(){}}
 };
 const createCount={count:0};
 const URL={createObjectURL(){createCount.count++;return 'blob:test-'+createCount.count},revokeObjectURL(){}};
 vm.runInNewContext(js,{window:fake,document:ui.document,CustomEvent:class{
  constructor(type,data){this.type=type;this.detail=data?.detail}
 },URL,Blob,console},{filename:'smart-access-v13.js'});
 return{api:fake.SHO_VALET_SMART_ACCESS_V13,win:fake,memory,events,ui,createCount};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('Golden original sample fallback, while secure pin provider loads before the private gallery and IDs',()=>{
 assert.match(page,/id="svFeatured"/);
 assert.match(page,/smart-valet-smart-access-v13\.js\?v=23-keep-cloud-pins/);
 assert.match(page,/smart-valet-smart-access-v13\.css\?v=13-universal-pin/);
 assert.ok(page.indexOf('smart-valet-smart-access-v13.js?v=23-keep-cloud-pins')<
  page.indexOf('smart-valet-private-v7.js?v=10-coupon-gallery-v13-visibility'));
 assert.ok(page.indexOf('smart-valet-private-v7.js?v=10-coupon-gallery-v13-visibility')<
  page.indexOf('smart-valet-identity-v11.js?v=23-recover-cloud-id-tiles'));
 assert.match(demo,/quick\?\.renderFeatured\?\.\(\)/);
 assert.match(demo,/list\(\)\.find\(x=>x\.id===pinId\(\)\)\|\|list\(\)\[0\]/);
 assert.match(demo,/SHO_VALET_BKK_APPROVED_V5/);
 assert.match(demo,/source:'demo'/);
 assert.match(js,/return false;\s*\}/);
 assert.match(style,/sv-feature-quick-v13/);
});
test('one unified pin per profile, toggling and replacing works for every provider',()=>{
 const {api,win}=harness();
 assert.equal(api.current(),null);
 assert.equal(api.renderFeatured(),false);
 assert.equal(api.toggle({source:'identity',id:'tax'}),true);
 assert.equal(api.isPinned('identity','tax'),true);
 assert.equal(api.toggle({source:'private',id:'11111111-1111-4111-8111-111111111111'}),true);
 assert.equal(api.isPinned('identity','tax'),false);
 assert.equal(api.isPinned('private','11111111-1111-4111-8111-111111111111'),true);
 win.localStorage.setItem('hh-profile','m');
 assert.equal(api.current(),null);
 assert.equal(api.toggle({source:'identity',id:'license'}),true);
 assert.equal(api.current().id,'license');
 win.localStorage.setItem('hh-profile','z');
 assert.equal(api.current().source,'private');
 assert.equal(api.toggle({source:'private',id:'11111111-1111-4111-8111-111111111111'}),true);
 assert.equal(api.current(),null);
 assert.equal(api.renderFeatured(),false);
 win.localStorage.setItem('hh-profile','m');
 assert.equal(api.current().id,'license');
 assert.equal(api.toggle({source:'identity',id:'license'}),true);
 assert.equal(api.current(),null);
});
test('old demo pin migrates once, and unpin never brings it back',()=>{
 const {api,win,memory}=harness();
 memory.set('sho-smart-valet-demo-pin-v1:z','bkk-test');
 assert.equal(api.current().source,'demo');
 assert.equal(api.current().id,'bkk-test');
 assert.equal(memory.has('sho-smart-valet-demo-pin-v1:z'),false);
 assert.equal(api.toggle({source:'identity',id:'personal'}),true);
 assert.equal(api.isPinned('identity','personal'),true);
 api.clear();
 assert.equal(api.current(),null);
 assert.equal(memory.has('sho-smart-valet-demo-pin-v1:z'),false);
});
test('showcase does not read, decode, download or generate previews for password-protected IDs',async()=>{
 const {api,win,ui,createCount}=harness();
 let called=0;
 win.SHO_VALET_IDENTITY_V13={
  resolvePinned:async()=>({title:'Személyi igazolvány',protection_mode:'password'}),
  previewPinned:async()=>{called++;throw Error('PREVIEW_LEAK')}
 };
 api.toggle({source:'identity',id:'personal'});
 assert.equal(api.renderFeatured(),true);
 await settle();
 assert.equal(called,0);
 assert.equal(createCount.count,0);
 assert.equal(ui.badge.textContent,'KITŰZVE');
 const art=ui.host.children[1];
 assert.equal(art.children[0].textContent,'🔒');
 assert.equal(ui.host.children[0].children[1].textContent,'Személyi igazolvány');
});
test('private image pins use genuine authorized provider Blob, not public links',async()=>{
 const {api,win,ui,createCount}=harness();
 const id='22222222-2222-4222-8222-222222222222';
 let resolved=0,preview=0;
 win.SH9_VALET_PRIVATE_V7={
  resolvePinned:async()=>{resolved++;return{title:'BKK bérlet',category:'pass'}},
  previewPinned:async()=>{preview++;return new Blob([Uint8Array.from([1,2])],{type:'image/png'})}
 };
 api.toggle({source:'private',id});
 assert.equal(api.renderFeatured(),true);
 await settle();await settle();
 assert.equal(resolved,1);assert.equal(preview,1);
 assert.equal(createCount.count,1);
 assert.equal(ui.host.children[1].children[0].tagName,'img');
 assert.equal(ui.host.children[1].children[0].src,'blob:test-1');
});
test('private cards and full-screen reader provide real pin/unpin buttons, not demo-only',()=>{
 assert.match(privateJS,/actions\.append\(open,pinButton\(item\),del\)/);
 assert.match(privateJS,/wrap\.append\(button,pinButton\(item\)\)/);
 assert.match(privateJS,/label:\(\)=>pinLabel\(item\.id\)/);
 assert.match(privateJS,/reader\.open\(data,item\.file_name,\{mime:item\.mime_type,pin\}\)/);
 assert.match(privateJS,/async function resolvePinned\(id,profile\)/);
 assert.match(privateJS,/async function previewPinned\(id,profile\)/);
 assert.match(privateJS,/async function openPinned\(id,profile\)/);
 assert.match(privateJS,/await authorized\(profile\)/);
 assert.match(privateJS,/\.eq\('id',id\)\.eq\('profile_key',profile\)/);
 assert.match(reader,/btn\('shoPrPinV13'/);
 assert.match(reader,/pinAction=options\?\.pin/);
 assert.match(reader,/function showPinButton\(\)/);
 assert.match(reader,/sho-valet-pin-changed/);
});
test('all four authenticated identity types have a pin action and protected photos never enter showcase',()=>{
 assert.match(page,/id="svIdPinV13"/);
 assert.match(idJS,/w\.SHO_VALET_IDENTITY_V13=Object\.freeze\(\{resolvePinned,previewPinned,openPinned\}\)/);
 assert.match(idJS,/async function resolvePinnedRow\(type,p\)/);
 assert.match(idJS,/async function previewPinned\(type,p\)/);
 assert.match(idJS,/if\(!rec\|\|protectionMode\(rec\)!=='device'\|\|!rec\.front_saved_at\)return null/);
 assert.match(idJS,/await authorized\(p\)/);
 assert.match(idJS,/deviceKey\('get',auth\.data\.user\.id,rec\.id\)/);
 assert.match(idJS,/const photo=await decrypt\(result\.data,key,rec,'front'\)/);
 assert.match(idJS,/async function openPinned\(type,p\)/);
 assert.match(idJS,/records\.set\(type,rec\);updateTiles\(\)/);
 assert.match(idJS,/open\(type\)/);
 assert.match(js,/if\(record\.protection_mode!=='device'\)return null/);
 assert.match(js,/if\(pin\.source==='identity'&&entry\.protection_mode==='password'\)/);
 assert.match(js,/return; \/\/ no photo, image URL, cached preview or query for protected IDs/);
});
test('no service-role, public URLs or unprotected image cache; browser JS syntax passes',()=>{
 assert.doesNotMatch(js,/getPublicUrl|createSignedUrl|service_role|fetch\(|localStorage\.setItem\(.*blob|identity.*storage_path/i);
 for(const code of [js,demo,privateJS,idJS,reader])
  assert.doesNotThrow(()=>new vm.Script(code));
});

test('Pin actions use readable Hungarian labels and the quick-access module is not gated on remote Supabase load',()=>{
 assert.match(privateJS,/pin:'Kitűzés',unpin:'Kitűzés megszüntetése'/);
 assert.match(privateJS,/pin:'Pin',unpin:'Remove pin'/);
 assert.match(page,/<script defer src="\.\/smart-valet-smart-access-v13\.js\?v=23-keep-cloud-pins"><\/script>/);
 const core=page.indexOf('smart-valet-smart-access-v13.js?v=23-keep-cloud-pins');
 const cdn=page.indexOf("load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js");
 assert.ok(core>=0&&core<cdn,'Smart Access loads separately before external auth libraries');
 const nested=page.slice(cdn);
 assert.doesNotMatch(nested,/load\('\.\/smart-valet-smart-access-v13\.js/);
});
