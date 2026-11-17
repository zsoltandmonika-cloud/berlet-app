'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const code=read('sh9/shopping/basket-matrix-v1.js');
const html=read('sh9/shopping/basket-matrix-v1.html');
const css=read('sh9/shopping/basket-match-v20.css');
const index=read('sh9/shopping/index.html');
const urls=require('../../sh9/shopping/three-store-links-v2.js');
const stores=[
 {key:'tesco',name:'Tesco',enabled:true,domain:'bevasarlas.tesco.hu'},
 {key:'auchan',name:'Auchan',enabled:true,domain:'auchan.hu'},
 {key:'kifli',name:'Kifli',enabled:true,domain:'kifli.hu'},
 {key:'aldi',name:'ALDI',enabled:true,domain:'shop.aldi.hu'}
];
const records=[
 {id:'a',name:'Laktózmentes UHT tej 1,5% 1 l',unit:'db',quantity:2,done:false,category:'Élelmiszer'},
 {id:'b',name:'100% arabica szemes kávé 1 kg',unit:'db',quantity:1,done:false,category:'Élelmiszer'},
 {id:'c',name:'Kenyér',unit:'db',quantity:1,done:true,category:'Élelmiszer'}
];
class Node {
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.attrs={};this.events={};this.textContent='';this.hidden=false;this.open=false;
  this.className='';this.classList={toggle:()=>{}};this.href='';this.title='';this.dataset={};
 }
 replaceChildren(...x){this.children=x}
 append(...x){this.children.push(...x)}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
 click(){this.events.click?.({preventDefault(){}})}
}
async function flush(){await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve))}
function setup({cached=false,cloudFail=false}={}){
 const ids=Object.fromEntries(['syncStatus','productsCount','storesCount','routesCount','results','focusDuo','focusAll','basketModeCaption'].map(x=>[x,new Node(x)]));
 const queries=[],from=[],writes=[];
 const family={
  auth:{getUser:async()=>({data:{user:{id:'familyuser'}},error:null})},
  from(name){
   from.push(name);
   if(name==='hh_profile_access')
    return {select:()=>({eq:async()=>({data:[{profile_key:'zsolt'}],error:null})})};
   const q={
    doneFilter:null,
    select(){return this},
    eq(k,v){queries.push({table:name,key:k,val:v});if(k==='done')this.doneFilter=v;return this},
    order(){return this},
    async range(){
     if(cloudFail&&name==='hh_shopping_list_v1')return {error:{message:'network failed'},data:null};
     if(name==='hh_shopping_list_v1')return {data:records.filter(x=>this.doneFilter===false?x.done===false:true),error:null};
     return {data:[],error:null}
    },
    update(){writes.push('update');return this},insert(){writes.push('insert');return this},delete(){writes.push('delete');return this}
   };
   return q;
  }
 };
 const cache=cached?{
  read:async (uid,key)=>key==='list'?{rows:records,syncedAt:'2026-11-17T08:00:00Z'}:null,
  write:async()=>true
 }:null;
 const win={
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'test'},
  supabase:{createClient:()=>family},
  SHOP_STORE_REGISTRY_V1:{current:()=>stores,sync:async()=>stores},
  SHOP_LOCAL_FIRST_V1:cache,
  SHOP_THREE_STORE_LINKS_V2:urls,
  SHOP_MERCHANT_SEARCH_V1:{url:(key,shop,term)=>'https://www.google.com/search?q='+encodeURIComponent(key+':'+term)},
  SHOP_SMART_LIST_ICONS_V1:{forProduct:()=> '🛒'},
  sessionStorage:{getItem:()=>null}
 };
 const doc={getElementById:id=>ids[id]||null,createElement:tag=>new Node(tag)};
 vm.runInNewContext(code,{window:win,document:doc,URL,Date,Intl,encodeURIComponent,console});
 return {ids,queries,from,writes};
}
function itemRows(ids){
 return ids.results.children.filter(x=>x.tag==='details');
}
test('Golden home keeps its one Basket Match shortcut; V2.0 changes only Basket Matrix',()=>{
 assert.match(index,/class="sho-basket-matrix"/);
 assert.doesNotMatch(index,/id="shoThreeStoreV2"|data-sho-connect-refresh/);
 assert.match(html,/id="focusDuo"/);assert.match(html,/id="focusAll"/);
 assert.match(html,/basket-match-v20.css/);
 assert.match(html,/three-store-links-v2.js/);
 assert.match(html,/basket-matrix-v1.js\?v=20-tesco-auchan/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:44px/);
 assert.match(html,/Árösszehasonlítás: még nem aktív/);
});
test('active shared Smart List only, default one-tap Tesco+Auchan with authoritative search URLs',async()=>{
 const {ids,queries,writes}=setup();await flush();
 const lines=itemRows(ids);
 assert.equal(lines.length,2);
 assert.equal(ids.productsCount.textContent,2);
 assert.equal(ids.storesCount.textContent,2);
 assert.equal(ids.routesCount.textContent,4);
 assert.equal(ids.focusDuo.attrs['aria-pressed'],'true');
 assert.equal(ids.focusAll.attrs['aria-pressed'],'false');
 assert.ok(lines.every(x=>x.open));
 const shops=lines[0].children.find(x=>x.className==='shops');
 assert.equal(shops.children.length,2);
 const tesco=shops.children[0].children[0],auchan=shops.children[1].children[0];
 assert.equal(tesco.href,urls.destination('tesco',records[0].name));
 assert.equal(auchan.href,urls.destination('auchan',records[0].name));
 assert.ok(shops.children[0].children[0].children.some(x=>x.textContent==='🔎 Keresés'));
 assert.ok(queries.some(q=>q.table==='hh_shopping_list_v1'&&q.key==='done'&&q.val===false));
 assert.deepEqual(writes,[]);
});
test('all-stores mode is reversible and does not change the family list or brand store links',async()=>{
 const {ids}=setup();await flush();
 ids.focusAll.click();
 assert.equal(ids.storesCount.textContent,4);
 assert.equal(ids.routesCount.textContent,8);
 assert.equal(itemRows(ids)[0].open,false);
 assert.equal(itemRows(ids)[0].children.find(x=>x.className==='shops').children.length,4);
 assert.equal(ids.focusAll.attrs['aria-pressed'],'true');
 ids.focusDuo.click();
 assert.equal(ids.storesCount.textContent,2);
 assert.equal(ids.routesCount.textContent,4);
 assert.equal(itemRows(ids)[0].open,true);
 assert.equal(ids.focusDuo.attrs['aria-pressed'],'true');
});
test('offline cache excludes purchased items and cannot masquerade as live data or merchant offers',async()=>{
 const {ids}=setup({cached:true,cloudFail:true});await flush();
 assert.equal(itemRows(ids).length,2);
 assert.equal(ids.productsCount.textContent,2);
 assert.match(ids.syncStatus.textContent,/Helyi kosármásolatot használunk/);
 assert.match(html,/Nincs összekötött, ellenőrzött Tesco\/Auchan ár/);
});
test('no invented prices, no manual entry, no mutations and no checkout routes',()=>{
 assert.doesNotMatch(code,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|shopCart\.add|checkout\(/);
 assert.doesNotMatch(code,/manualPrice|parsePrice|input\.value\s*=\s*price/);
 assert.match(code,/verifiedCount\(item,shop\)/);
 assert.match(code,/source!=='merchant'/);
 assert.match(code,/const list=await fetchEvery\(db,LIST,[^;]+,true\)/);
 assert.match(code,/mode==='all'\?shops:shops\.filter/);
});
