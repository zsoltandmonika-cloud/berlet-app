'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'../guardian');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');

test('Watchlist is on canonical Family Guard, reuses verified BKK catalog with editable per-profile entries',()=>{
 const html=read('index.html'),catalog=read('guardian-bkk-catalog-v801.js');
 const style=read('guardian-bkk-watchlist-v814.css');
 assert.match(html,/id="hhBkkWatchlistV814"/);
 assert.match(html,/id="hhBkkWatchEditV814"/);
 assert.match(html,/guardian-bkk-watchlist-v814.js\?v=817-1-41-static/);
 assert.match(html,/guardian-bkk-watchlist-v814.css\?v=814/);
 assert.match(html,/guardian-bkk-catalog-v801.js\?v=817-1-41-static/);
 assert.match(style,/hh-bkk-watch-ready-v814 \.hh-transit-choices/);
 assert.match(style,/#hhTransitCardsV791/);
 assert.match(catalog,/const STORE='hh-bkk-route-favorites-v801'/);
 assert.match(catalog,/get favoriteIds/);
 assert.match(catalog,/removeFavoriteKey/);
 assert.match(catalog,/moveFavoriteKey/);
 assert.match(catalog,/routeByKey/);
 assert.match(catalog,/hh-bkk-watchlist-v814-changed/);
 assert.match(catalog,/FEATURED=new Set\(\['bus:260','tram:17','tram:19','tram:1','tram:41'\]\)/);
});

test('Watchlist renders, reorders, edits and removes with no GPS or fabricated live status',()=>{
 const source=read('guardian-bkk-watchlist-v814.js');
 const all={},winEvents={},actions=[];
 function element(id){
  const e={id,children:[],attrs:{},events:{},value:'zsolt',hidden:false,disabled:false,open:false,
   classList:{tags:new Set(),add(v){this.tags.add(v)}},parentNode:null,
   setAttribute(k,v){this.attrs[k]=v},
   addEventListener(k,fn){this.events[k]=fn},
   append(...kids){this.children.push(...kids)},
   replaceChildren(...kids){this.children=kids},
   scrollIntoView(){},focus(){},
   after(x){actions.push('moved-catalog')},
   click(){this.events.click?.()}
  };
  return e;
 }
 for(const id of ['hhTransitPanel','hhBkkWatchlistV814','hhBkkWatchRowsV814',
  'hhBkkWatchCountV814','hhBkkWatchEditV814','hhBkkCatalogV801',
  'hhBkkCatalogSearchV801','hhTransitProfileV791','hhTransitShow260'])
  all[id]=element(id);
 const common=element('parent');
 all.hhBkkWatchlistV814.parentNode=common;
 all.hhBkkCatalogV801.parentNode=common;
 all.hhTransitShow260.events.click=()=>actions.push('show-260');
 const doc={readyState:'complete',getElementById(id){return all[id]||null},
   createElement(tag){return element(tag)},addEventListener(){}};
 const entries={
  'bus:260':{mode:'bus',id:'260',name:'260 bus',directions:['Óbuda','Harsánylejtő']},
  'hev:H5':{mode:'hev',id:'H5',name:'HÉV',directions:['Szentendre','Batthyány tér']},
  'tram:17':{mode:'tram',id:'17',name:'17 tram',directions:['Bécsi út']}
 };
 const lists={zsolt:['bus:260','hev:H5'],monika:['tram:17']};
 let profile='zsolt';
 function notify(){winEvents['hh-bkk-watchlist-v814-changed']?.()}
 const api={get favoriteIds(){return [...lists[profile]]},get loaded(){return true},
  routeByKey(k){return entries[k]||null},
  setProfile(p){if(p!==profile){profile=p;notify()}},
  removeFavoriteKey(k){lists[profile]=lists[profile].filter(id=>id!==k);notify();return true},
  moveFavoriteKey(k,delta){const items=lists[profile],i=items.indexOf(k),j=i+delta;
   if(i<0||j<0||j>=items.length)return false;
   [items[i],items[j]]=[items[j],items[i]];notify();return true}
 };
 const w={HH_BKK_CATALOG_V801:api,localStorage:{getItem(){return 'z'}},
  addEventListener(k,fn){winEvents[k]=fn}};
 vm.runInNewContext(source,{window:w,document:doc});
 assert.equal(all.hhBkkWatchlistV814.hidden,false);
 assert.equal(all.hhTransitPanel.classList.tags.has('hh-bkk-watch-ready-v814'),true);
 assert.equal(all.hhBkkWatchRowsV814.children.length,2);
 assert.equal(all.hhBkkWatchRowsV814.children[1].children[0].textContent,'H5');
 assert.equal(all.hhBkkWatchRowsV814.children[1].children[2].children.length,3,
   'no fake live route action for unsupported HÉV');
 assert.equal(all.hhBkkWatchRowsV814.children[0].children[2].children.length,4,
   'supported 260 has real static route action');
 all.hhBkkWatchRowsV814.children[0].children[2].children[0].click();
 assert.deepEqual(actions.filter(x=>x==='show-260'),['show-260']);
 all.hhBkkWatchRowsV814.children[1].children[2].children[0].click();
 assert.deepEqual(lists.zsolt,['hev:H5','bus:260']);
 all.hhBkkWatchEditV814.click();
 assert.equal(all.hhBkkCatalogV801.open,true);
 assert.equal(all.hhBkkWatchEditV814.attrs['aria-expanded'],'true');
 all.hhBkkWatchRowsV814.children[0].children[2].children[2].click();
 assert.deepEqual(lists.zsolt,['bus:260']);
 all.hhTransitProfileV791.value='monika';
 all.hhTransitProfileV791.events.change();
 assert.equal(all.hhBkkWatchRowsV814.children.length,1);
 assert.equal(all.hhBkkWatchRowsV814.children[0].children[0].textContent,'17');
 assert.match(source,/FEATURED=new Set\(\['bus:260','tram:17','tram:19','tram:1','tram:41'\]\)/);
 assert.doesNotMatch(source,/navigator\.geolocation|watchPosition|sendBeacon|access_token|refresh_token/);
});
