'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const core=require('../../sh9/shopping/three-store-links-v2.js');
const app=read('sh9/shopping/three-store-bridge-v2.js');
const html=read('sh9/shopping/three-store-bridge-v2.html');
const home=read('sh9/shopping/index.html');
const entry=read('sh9/shopping/three-store-entry-v2.css');
const controller=read('sh9/shopping/store-connect-v2.js');

test('Native Tesco and Auchan links contain exact multiword search, not a selected SKU',()=>{
 const q='laktózmentes UHT tej 1,5% 1 l';
 assert.equal(core.destination('tesco',q),
  'https://bevasarlas.tesco.hu/shop/hu-HU/search?query='+encodeURIComponent(q));
 assert.equal(core.browseTerms(q),'laktózmentes UHT tej');
 assert.equal(core.destination('auchan',q),
  'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(encodeURIComponent('laktózmentes UHT tej')));
 assert.match(core.destination('auchan',q),/lakt%25C3%25B3zmentes/);
 assert.equal(core.browseTerms('100% arabica szemes kávé 1 kg'),'arabica szemes kávé');
 assert.ok(!core.destination('auchan',q).includes('1%252C5'));
 assert.equal(core.destination('auchan','100% arabica szemes kávé 1 kg'),
  'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(encodeURIComponent('arabica szemes kávé')));
 assert.equal(core.destination('tesco','x'),'');
 assert.equal(core.destination('auchan','x'),'');
 assert.equal(core.destination('other','tej'),'');
 assert.equal(core.stores.length,3);
 assert.deepEqual(core.stores.map(s=>s.key),['tesco','auchan','spar']);
});
test('SPAR actually transfers the query to a clearly labeled Wolt-only external web search, keeping official venue link separate',()=>{
 const q='laktózmentes UHT tej 1,5% 1 l',url=core.destination('spar',q);
 assert.ok(url.startsWith('https://www.google.com/search?q='));
 assert.ok(decodeURIComponent(url).includes('site:wolt.com/hu/hun/budapest/venue/spar laktózmentes UHT tej'));
 assert.notEqual(core.destination('spar','kávé'),core.destination('spar','tej'));
 assert.equal(core.SPAR_URL,'https://wolt.com/hu/hun/budapest/brand/spar');
 assert.equal(core.destination('spar',''),'');
 assert.equal(core.stores[2].type,'indexed');
 assert.match(core.stores[2].note,/Google webes találatok/);
 assert.match(app,/merchant-venue/);
 assert.doesNotMatch(app,/wolt\.com[^'"]*\?q=|spar\.hu\/onlineshop/);
});
test('Golden home still has exactly one fixed-height action row, 12-store grid and existing connections',()=>{
 assert.match(home,/id="shoStoreGrid"/);
 assert.match(home,/id="shoThreeStoreV2"/);
 assert.match(home,/three-store-bridge-v2\.html/);
 assert.match(home,/basket-matrix-v1\.html/);
 assert.match(home,/data-sho-connect-refresh/);
 assert.match(home,/three-store-entry-v2\.css\?v=1/);
 assert.match(home,/threeStore=1/);
 assert.match(entry,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(entry,/height:34px!important/);
 assert.doesNotMatch(entry,/\.sho-store-grid\s*\{/);
 assert.match(controller,/shoThreeStoreV2/);
 assert.match(controller,/encodeURIComponent\(q\)/);
 assert.match(home,/id="shoCatalogSort"/);
});
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.hidden=false;this.value='';this.href='';this.textContent='';this.disabled=false;this.className='';}
 append(...a){this.children.push(...a)}
 replaceChildren(...a){this.children=[...a]}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
 scrollIntoView(){}
 click(){this.events.click?.({preventDefault(){}})}
}
function harness({signed=true,query='',rows=null}={}){
 const ids=Object.fromEntries(['storeResults','searchForm','familyItems','cloudStatus',
  'selection','searchInput','resultTitle','moreItems','reloadList'].map(k=>[k,new Node()]));
 let data=rows||[
  {id:'a',name:'Laktózmentes UHT tej 1,5% 1 l',quantity:2,unit:'db'},
  {id:'b',name:'100% arabica szemes kávé 1 kg',quantity:1,unit:'db'}
 ];
 const ops=[],location={href:'https://example.test/berlet-app/sh9/shopping/three-store-bridge-v2.html'+(query?'?q='+encodeURIComponent(query):'')};
 location.search=new URL(location.href).search;
 const history={state:null,replaceState(state,unused,url){location.href='https://example.test'+url;location.search=new URL(location.href).search}};
 const cloud={
  auth:{async getUser(){return signed?{data:{user:{id:'member'}},error:null}:{data:{user:null},error:{message:'login'}}}},
  from(table){
   ops.push(['from',table]);
   if(table==='hh_profile_access'){
    return {select(){return {eq:async()=>({data:signed?[{profile_key:'monika'}]:[],error:null})}}};
   }
   assert.equal(table,'hh_shopping_list_v1');
   const q={
    select(fields){ops.push(['select',fields]);return q},
    eq(field,val){ops.push(['eq',field,val]);return q},
    order(field){ops.push(['order',field]);return q},
    async range(a,b){ops.push(['range',a,b]);return {data:data.slice(a,b+1),error:null}}
   };return q;
  }
 };
 const d={getElementById:id=>ids[id]||null,createElement:tag=>new Node(tag)};
 const w={
  location,history,
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'test-public'},
  supabase:{createClient(){return cloud}},
  sessionStorage:{getItem(){return null}},navigator:{vibrate(){}},
  SHOP_THREE_STORE_LINKS_V2:core,
  addEventListener(k,fn){this.events[k]=fn},
  events:{}
 };
 vm.runInNewContext(app,{window:w,document:d,URL,URLSearchParams,Intl,Date,console,encodeURIComponent});
 return {ids,w,ops,data};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('RLS-authenticated Smart List appears as selectable, read-only products; no fake prices or cart status',async()=>{
 const {ids,w,ops}=harness({query:'arabica'});
 await settle();await settle();
 assert.equal(ids.familyItems.children.length,2);
 assert.match(ids.cloudStatus.textContent,/2 aktív termék/);
 assert.equal(ids.storeResults.children.length,3);
 const tesco=ids.storeResults.children[0].children[2];
 assert.ok(tesco.href.includes('query=arabica'));
 assert.ok(ids.storeResults.children[2].children[2].href.startsWith('https://www.google.com/search?q='));
 assert.equal(ids.storeResults.children[2].children[1].children[2].href,core.SPAR_URL);
 ids.familyItems.children[0].click();
 assert.ok(w.location.href.includes('item=a'));
 assert.ok(w.location.href.includes('q=Lakt'));
 assert.ok(ids.storeResults.children[1].children[2].href.startsWith('https://auchan.hu/shop/search?'));
 assert.deepEqual(ops.filter(x=>x[0]==='from').map(x=>x[1]),
  ['hh_profile_access','hh_shopping_list_v1']);
 assert.equal(ops.filter(x=>x[0]==='eq'&&x[1]==='done')[0][2],false);
 assert.equal(ops.some(x=>['update','insert','delete','upsert'].includes(x[0])),false);
 assert.doesNotMatch(html,/Élő ár: \d|Már kosárban|Rendelés kész/);
});
test('No login means no displayed private list; manual Tesco and Auchan search still works',async()=>{
 const {ids}=harness({signed:false,query:'tej'});
 await settle();await settle();
 assert.match(ids.cloudStatus.textContent,/Családi bejelentkezés szükséges/);
 assert.equal(ids.familyItems.children.length,1);
 assert.match(ids.familyItems.children[0].textContent,/csak bejelentkezve/);
 assert.ok(ids.storeResults.children[0].children[2].href.includes('query=tej'));
});
test('No query disables 3 search actions but SPAR official Wolt venue remains separately accessible',async()=>{
 const {ids}=harness({signed:true});
 await settle();await settle();
 assert.equal(ids.storeResults.children[0].children[2].attrs['aria-disabled'],'true');
 assert.equal(ids.storeResults.children[1].children[2].attrs['aria-disabled'],'true');
 assert.equal(ids.storeResults.children[2].children[2].attrs['aria-disabled'],'true');
 assert.equal(ids.storeResults.children[2].children[1].children[2].href,core.SPAR_URL);
 assert.match(html,/nem változtatja a közös lista/);
 assert.match(html,/Élő ár szerinti összehasonlítás még nem elérhető/);
});
