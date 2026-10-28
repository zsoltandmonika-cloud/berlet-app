const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const personal=require(path.join(root,'rail-personal-v607.js'));
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
function memory(){
 const data=new Map();
 return {data,getItem:key=>data.has(key)?data.get(key):null,setItem:(key,val)=>data.set(key,val),removeItem:key=>data.delete(key)};
}
test('v607 keeps existing 40-slot v1 favorites and isolates Mónika/Zsolt data',()=>{
 const storage=memory();
 const keyM=personal.favoritesKey('m'),keyZ=personal.favoritesKey('z');
 assert.notEqual(keyM,keyZ);
 storage.setItem(keyZ,JSON.stringify([{from:'Budapest-Keleti',to:'Kazincbarcika'},{from:'Miskolc-Tiszai',to:'Debrecen'}]));
 assert.deepEqual(personal.loadFavorites(storage,'z').map(v=>v.from),['Budapest-Keleti','Miskolc-Tiszai']);
 assert.deepEqual(personal.loadFavorites(storage,'m'),[]);
 assert.equal(personal.FAVORITES_MAX,40);
 assert.equal(personal.saveFavorite(storage,'m',{from:'Budapest-Nyugati',to:'Győr'}).ok,true);
 assert.equal(personal.loadFavorites(storage,'z').length,2);
 assert.equal(personal.loadFavorites(storage,'m').length,1);
});
test('favorites: rename, reorder, delete persist, duplicates do not damage saved routes',()=>{
 const storage=memory();
 personal.saveFavorite(storage,'z',{from:'Budapest-Keleti',to:'Kazincbarcika'});
 personal.saveFavorite(storage,'z',{from:'Miskolc-Tiszai',to:'Eger'});
 const old=storage.getItem(personal.favoritesKey('z'));
 assert.equal(personal.saveFavorite(storage,'z',{from:' budapest-keleti ',to:' kazincbarcika '}).reason,'duplicate');
 assert.equal(storage.getItem(personal.favoritesKey('z')),old);
 assert.equal(personal.renameFavorite(storage,'z',0,' Haza ❤️ '),true);
 assert.equal(personal.loadFavorites(storage,'z')[0].label,'Haza ❤️');
 assert.equal(personal.moveFavorite(storage,'z',1,-1),true);
 assert.equal(personal.loadFavorites(storage,'z')[0].from,'Miskolc-Tiszai');
 assert.equal(personal.moveFavorite(storage,'z',0,-1),false);
 assert.equal(personal.removeFavorite(storage,'z',1),true);
 assert.equal(personal.loadFavorites(storage,'z').length,1);
 assert.equal(personal.removeFavorite(storage,'z',9),false);
 assert.equal(personal.renameFavorite(storage,'z',0,'   '),false);
});
test('v607 repairs corrupt/old values and refuses cross-site text injection',()=>{
 const storage=memory();
 const key=personal.favoritesKey('z');
 storage.setItem(key,'{invalid json');
 assert.deepEqual(personal.loadFavorites(storage,'z'),[]);
 storage.setItem(key,JSON.stringify([null,{}, {from:'Budapest',to:'Budapest'},{from:'Budapest',to:'Győr',label:'<script>alert(1)</script>'},{from:'Budapest',to:'Győr'}]));
 assert.equal(personal.loadFavorites(storage,'z').length,1);
 assert.doesNotMatch(personal.loadFavorites(storage,'z')[0].label,/[<>]/);
 assert.equal(personal.saveFavorite(storage,'z',{from:'Szeged',to:'Szeged'}).reason,'invalid');
 const bad={getItem:()=>{throw Error('no storage')},setItem:()=>{throw Error('storage blocked')}};
 assert.deepEqual(personal.loadFavorites(bad,'z'),[]);
 assert.equal(personal.saveFavorite(bad,'z',{from:'Szeged',to:'Pécs'}).ok,false);
});
test('history: most recent 10, dedupe, arrival/depart selection, profile separation and clear',()=>{
 const storage=memory(),now=Date.parse('2026-10-28T17:00:00Z');
 for(let i=0;i<14;i++)assert.equal(personal.recordSearch(storage,'z',{
  from:'Budapest-Keleti',to:'Állomás '+i,mode:'depart',when:'2026-10-30T16:55'
 },now+i*1000),true);
 assert.equal(personal.loadHistory(storage,'z',now+14000).length,10);
 assert.equal(personal.loadHistory(storage,'z',now+14000)[0].to,'Állomás 13');
 const before=personal.loadHistory(storage,'z',now+14000).length;
 personal.recordSearch(storage,'z',{from:'Budapest-Keleti',to:'Állomás 13',mode:'depart',when:'2026-10-30T16:55'},now+20000);
 assert.equal(personal.loadHistory(storage,'z',now+21000).length,before);
 assert.equal(personal.loadHistory(storage,'z',now+21000)[0].timestamp,now+20000);
 assert.equal(personal.recordSearch(storage,'m',{from:'Kazincbarcika',to:'Miskolc-Tiszai',mode:'arrive',when:'2026-10-31T19:00'},now),true);
 assert.equal(personal.loadHistory(storage,'m',now+21000)[0].mode,'arrive');
 assert.equal(personal.loadHistory(storage,'z',now+21000).length,10);
 assert.equal(personal.removeHistory(storage,'z',0),true);
 assert.equal(personal.loadHistory(storage,'z',now+21000).length,9);
 assert.equal(personal.clearHistory(storage,'z'),true);
 assert.deepEqual(personal.loadHistory(storage,'z',now+21000),[]);
 assert.equal(personal.loadHistory(storage,'m',now+21000).length,1);
});
test('now mode history reruns at the new time; future and invalid timestamps rejected',()=>{
 const storage=memory(),now=Date.now();
 assert.equal(personal.recordSearch(storage,'z',{from:'Budapest-Keleti',to:'Kazincbarcika',mode:'now'},now),true);
 const [item]=personal.loadHistory(storage,'z');
 assert.equal(item.mode,'now');
 assert.equal(item.when,'');
 assert.equal(personal.recordSearch(storage,'z',{from:'Budapest-Keleti',to:'Kazincbarcika',mode:'arrive'},now),false);
 assert.equal(personal.historyItem({from:'Keleti',to:'Nyugati',mode:'depart',when:'2026-11-01T12:00',timestamp:now+90000000},now),null);
});
test('Golden Glass UI contains accessible favorite edits/history without touching native date picker',()=>{
 assert.match(page,/id="rail-history-list"/);
 assert.match(page,/id="rail-history-clear"/);
 assert.match(page,/Kedvencek PRO/);
 assert.match(page,/rail-personal-v607\.js/);
 assert.match(page,/window\.SH9_MAV_PERSONAL_UI\?\.render\(\)/);
 assert.match(page,/window\.SH9_MAV_PLANNER_V607=Object\.freeze/);
 assert.match(page,/id="swap" class="swap" title="Oda-vissza iránycsere · dátum és időpont megmarad"/);
 assert.match(page,/bottom:9px;left:6px;width:45px/);
 assert.match(page,/mav-hero-final-approved-v2\.webp/);
 assert.match(page,/rail-golden-glass-v3/);
 assert.match(page,/id="rail-date-trigger"/);
 assert.match(page,/openNativeRailPicker\(input\)/);
});
test('UI mounting records valid searches and reloads separate profile history on demand',()=>{
 const storage=memory(),elements=new Map(),operations=[];
 class Fake{
  constructor(name){this.name=name;this.children=[];this.events={};this.className='';this.value='';this.dataset={};this.disabled=false;this.classList={remove(){},add(){}}}
  addEventListener(name,fn){this.events[name]=fn}
  setAttribute(name,val){this[name]=val}
  append(...values){this.children.push(...values)}
  replaceChildren(...values){this.children=[];this.append(...values)}
  querySelector(){return null}
  click(){this.events.click?.()}
  scrollIntoView(){}
  focus(){}
 }
 const el=id=>{if(!elements.has(id))elements.set(id,new Fake(id));return elements.get(id)};
 ['favlist','rail-history-list','find','favorite-add','rail-history-clear','from','to','when','planner'].forEach(el);
 el('from').value='Budapest-Keleti';el('to').value='Kazincbarcika';
 el('when').value='2026-10-30T16:55';
 let mode='arrive';
 const doc={getElementById:el,createElement:tag=>new Fake(tag),documentElement:{dataset:{profile:'z'}},
  querySelectorAll:()=>[]};
 const ui=personal.mount(doc,{localStorage:storage,SH9_MAV_PLANNER_V607:{
  toast:s=>operations.push(s),applyRoute:route=>operations.push(route)
 },SH9_MAV_JOURNEYS_INSTANCE:{currentQuery:()=>({from:el('from').value,to:el('to').value,mode,when:'2026-10-30T15:55:00Z'})}});
 assert.ok(ui);
 el('favorite-add').click();
 assert.equal(ui.loadFavorites().length,1);
 el('find').click();
 assert.equal(ui.loadHistory().length,1);
 assert.equal(ui.loadHistory()[0].mode,'arrive');
 doc.documentElement.dataset.profile='m';ui.render();
 assert.equal(ui.loadFavorites().length,0);
 assert.equal(ui.loadHistory().length,0);
 el('favorite-add').click();el('find').click();
 assert.equal(ui.loadFavorites().length,1);
 assert.equal(ui.loadHistory().length,1);
 doc.documentElement.dataset.profile='z';ui.render();
 assert.equal(ui.loadFavorites()[0].to,'Kazincbarcika');
 assert.equal(ui.loadHistory()[0].when,'2026-10-30T16:55');
});
