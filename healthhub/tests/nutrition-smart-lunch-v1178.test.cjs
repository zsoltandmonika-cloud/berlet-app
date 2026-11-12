'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../nutrition');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const lib=require('../nutrition/hh-interfood-smart-lunch-v1178.js');
const feed=require('../nutrition/interfood-live-feed-v1176.json');
const core=read('nutrition-preview-v592.js');
const ui=read('hh-interfood-smart-lunch-v1178.js');
const css=read('hh-interfood-smart-lunch-v1178.css');
const html=read('index.html');
const live=read('hh-interfood-live-v1176.js');
const approvedRag=read('hh-buddy-rag-fullbody-v1141.css');
const example=[
'2026-11-09 Hétfő',
'**I** 1 adag Sárgabarackos gombóc*: 860 FT (860 FT)',
'(179kcal, 37.9g szénh., 3.5g fehérje, 1.4g zsír)',
'2026-11-11 Szerda',
'**F2K** 1 adag Sárgaborsó főzelék, sült oldalas: 1240 FT (1240 FT)',
'(858kcal, 57.3g szénh., 30g fehérje, 57g zsír)',
'2026-11-12 Csütörtök',
'**E2K** 1 adag Húsos, juhtúrós rakott karfiol: 1420 FT (1420 FT)',
'(378kcal, 15.3g szénh., 29.4g fehérje, 21.9g zsír)',
'2026-11-13 Péntek',
'**E4K** 1 adag Currys pulyka sárgabarackkal, mazsolás jázmin rizs: 1475 FT',
'(1475 FT)',
'(495kcal, 90.9g szénh., 24.9g fehérje, 5.4g zsír)',
].join('\n');
test('real-format Outlook Markdown: 4 separate dated meals and exact macros',()=>{
 const meals=lib.parseConfirmedOrderEmail(example);
 assert.equal(meals.length,4);
 assert.deepEqual(meals.map(x=>x.code),['I','F2K','E2K','E4K']);
 assert.deepEqual(meals.map(x=>x.menuDate),
 ['2026-11-09','2026-11-11','2026-11-12','2026-11-13']);
 assert.deepEqual(meals[1].nutrients,{kcal:858,carbs:57.3,protein:30,fat:57});
 assert.equal(meals[3].nutrients.carbs,90.9);
});
test('confirmation lines must have published nutrients; contact data never becomes a meal',()=>{
 const fake='Név: Example\nE-mail: fake@example.net\nTelefon: 1234\n'+
  '2026-11-12 Csütörtök\n**E2K** 1 adag Húsos, juhtúrós rakott karfiol: 1420 FT\n'+
  '(378kcal, 15.3g szénh., 29.4g fehérje, 21.9g zsír)';
 const parsed=lib.parseConfirmedOrderEmail(fake);
 assert.equal(parsed.length,1);
 assert.equal(JSON.stringify(parsed).includes('example.net'),false);
 assert.equal(lib.parseConfirmedOrderEmail('2026-11-12 Csütörtök\n**E2K** 1 adag Ebéd: 100 FT').length,0);
});
test('matching requires same date + code + dish name + all four macros',()=>{
 const ordered=lib.parseConfirmedOrderEmail(example);
 const matched=ordered.map(order=>lib.matchToOfficialMenu(order,feed.items));
 assert.equal(matched.length,4);
 assert.ok(matched.every(Boolean));
 assert.ok(matched.every(x=>x.imageUrl&&x.imageUrl.startsWith('https://ia.interfood.hu/api/v1/i?menu_item_id=')));
 assert.equal(matched[1].code,'F2K');
 assert.equal(matched[1].name,'Sárgaborsó főzelék, sült oldalas');
 assert.equal(matched[2].weightGrams,300);
 assert.equal(lib.matchToOfficialMenu({...ordered[1],code:'F1K'},feed.items),null);
 assert.equal(lib.matchToOfficialMenu({...ordered[1],nutrients:{...ordered[1].nutrients,kcal:999}},feed.items),null);
 assert.equal(lib.matchToOfficialMenu({...ordered[1],menuDate:'2026-11-12'},feed.items),null);
});
test('one card is on Bevitel below premium tile; the duplicate launcher and large search are hidden',()=>{
 assert.match(ui,/tile\.insertAdjacentElement\('afterend',host\)/);
 assert.match(ui,/rating:ate\?\(choices\.get\(order\.id\)\|\|null\):null/);
 assert.match(ui,/render\(\);showResult\(order,result\)/);
 assert.match(live,/area\.hidden=true/);
 assert.match(live,/duplicateLauncher\.hidden=true/);
 assert.ok(html.includes('hh-interfood-smart-lunch-v1178.js?v=1183-premium-glass-lilac-frame'));
 assert.ok(html.includes('hh-interfood-smart-lunch-v1178.css?v=1183-premium-glass-lilac-frame'));
 assert.match(css,/\.hh-sl-hero/);
});
test('diary and feedback are profile-private, explicit and idempotent',()=>{
 assert.match(core,/interfoodOrders:\[\]/);
 assert.match(core,/importConfirmedInterfoodOrder:payload=>/);
 assert.match(core,/finishInterfoodSmartOrder:payload=>/);
 assert.match(core,/current\.status!=='planned'/);
 assert.match(core,/order\.rating=ate\?rating:null/);
 assert.match(core,/id:diaryId/);
 assert.match(core,/if\(ate\)success\(\)/);
 assert.match(core,/getInterfoodCardRating:cardId=>/);
 assert.match(core,/return \{id,profile:active,status:current\.status/);
});
test('only authentic Interfood photos; no private orders, OAuth secrets or invented images in the repo',()=>{
 for(const src of [ui,core,live])new vm.Script(src);
 assert.doesNotMatch(ui,/localStorage\.setItem|client_secret|access_token|puter|api\.openai/i);
 assert.ok(ui.includes('function premiumBuddy(status)'));
 assert.match(core,/url\.hostname==='ia\.interfood\.hu'/);
 assert.doesNotMatch(ui,/monika\.lorincz@|zsolt\.monika@|customer_id|delivery_address/i);
});

function fakeJournal(){
 const store=new Map(),localStorage={
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)
 };
 const node=()=>({
  textContent:'',hidden:false,value:'',style:{},dataset:{},
  classList:{add(){},remove(){},toggle(){}},
  replaceChildren(){},append(){},addEventListener(){},querySelector(){return null},
  querySelectorAll(){return []},setAttribute(){},removeAttribute(){}
 });
 const document={readyState:'loading',addEventListener(){},
  getElementById(){return node()},querySelectorAll(){return []},createElement:node};
 let i=0;
 const window={localStorage,crypto:{randomUUID:()=>String('test-'+(++i))},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,addEventListener(){}};
 // Test-only hook in memory: never persisted to production source.
 const fixture=core.replace(/\}\)\(window\);\s*$/,'root.__testSetProfile=p=>active=p; })(window);');
 assert.notEqual(fixture,core);
 vm.runInNewContext(fixture,{window,document,localStorage,console:{warn(){}},setTimeout:()=>1,clearTimeout(){}});
 window.__testSetProfile('monika');
 return {api:window.HH_NUTRITION_QUICK_API,select:window.__testSetProfile};
}
function localIsoDay(){
 const d=new Date(),pad=n=>String(n).padStart(2,'0');
 return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
}
test('runtime: save once, diary once, optional stars, profile separation, feedback history',()=>{
 const {api,select}=fakeJournal(),day=localIsoDay(),sample={
  menuDate:day,code:'E2K',name:'Húsos, juhtúrós rakott karfiol',
  quantity:1,weightGrams:300,
  imageUrl:'https://ia.interfood.hu/api/v1/i?menu_item_id=40002&width=425&height=425',
  nutrients:{kcal:378,protein:29.4,carbs:15.3,fat:21.9}};
 const first=api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:sample});
 assert.equal(api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:sample}).duplicate,true);
 assert.equal(api.getData().interfoodCards.length,1);
 assert.equal(api.getData().entries.length,0);
 const recorded=api.finishInterfoodSmartOrder({expectedProfile:'monika',
  orderId:first.id,ate:true,rating:5});
 assert.equal(recorded.status,'consumed');
 assert.equal(api.getData().entries.length,1);
 assert.equal(api.getData().entries[0].nutrients.kcal,378);
 assert.equal(api.getInterfoodCardRating(first.cardId).average,5);
 assert.equal(api.finishInterfoodSmartOrder({expectedProfile:'monika',
  orderId:first.id,ate:true,rating:5}).duplicate,true);
 assert.equal(api.getData().entries.length,1);
 const other={...sample,code:'F2K',name:'Sárgaborsó főzelék, sült oldalas',
  imageUrl:'https://ia.interfood.hu/api/v1/i?menu_item_id=40097&width=425&height=425'};
 const second=api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:other});
 const declined=api.finishInterfoodSmartOrder({expectedProfile:'monika',orderId:second.id,ate:false});
 assert.equal(declined.status,'skipped');assert.equal(api.getData().entries.length,1);
 const withoutRating={...sample,code:'I',name:'Sárgabarackos gombóc*'};
 const third=api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:withoutRating});
 api.finishInterfoodSmartOrder({expectedProfile:'monika',orderId:third.id,ate:true});
 assert.equal(api.getData().entries.length,2);
 assert.equal(api.getData().interfoodOrders.find(x=>x.id===third.id).rating,null);
 select('zsolt');
 assert.equal(api.getInterfoodSmartOrders().length,0);
 assert.equal(api.getInterfoodCards().length,0);
 assert.throws(()=>api.finishInterfoodSmartOrder({expectedProfile:'monika',orderId:first.id,ate:true}),/Profilváltás/);
});

test('v1181: undo restores planned status, removes calories and rating, and re-confirms without duplicate IDs',()=>{
 const {api,select}=fakeJournal(),day=localIsoDay();
 const meal={menuDate:day,code:'E2K',name:'Húsos, juhtúrós rakott karfiol',
  quantity:1,weightGrams:300,nutrients:{kcal:378,protein:29.4,carbs:15.3,fat:21.9}};
 const order=api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:meal});
 assert.equal(api.finishInterfoodSmartOrder({expectedProfile:'monika',
  orderId:order.id,ate:true,rating:4}).status,'consumed');
 assert.equal(api.getData().entries.filter(x=>!x.deleted).length,1);
 assert.equal(api.getInterfoodCardRating(order.cardId).average,4);
 const undone=api.undoInterfoodSmartOrder({expectedProfile:'monika',orderId:order.id});
 assert.equal(undone.status,'planned');
 let data=api.getData();
 assert.equal(data.entries.filter(x=>!x.deleted).length,0);
 assert.equal(data.entries[0].deleted,true);
 assert.equal(data.interfoodOrders[0].rating,null);
 assert.equal(data.interfoodOrders[0].completedAt,null);
 assert.equal(api.getInterfoodCardRating(order.cardId).count,0);
 assert.throws(()=>api.undoInterfoodSmartOrder({expectedProfile:'monika',orderId:order.id}),/Csak az imént/);
 assert.equal(api.importConfirmedInterfoodOrder({expectedProfile:'monika',order:meal}).duplicate,true);
 assert.equal(api.getData().interfoodOrders[0].status,'planned');
 const confirmed=api.finishInterfoodSmartOrder({expectedProfile:'monika',
  orderId:order.id,ate:true,rating:2});
 assert.equal(confirmed.status,'consumed');
 data=api.getData();
 assert.equal(data.entries.filter(x=>!x.deleted).length,1);
 assert.equal(data.entries.length,1); // old tombstone revived, never a duplicate diary ID
 assert.equal(data.entries[0].deleted,false);
 assert.equal(data.entries[0].nutrients.kcal,378);
 assert.equal(api.getInterfoodCardRating(order.cardId).average,2);
 select('zsolt');
 assert.throws(()=>api.undoInterfoodSmartOrder({expectedProfile:'monika',orderId:order.id}),/Profilváltás/);
});
test('v1181: feedback is optional browser capability; undo is not a mere visual deletion',()=>{
 assert.ok(ui.includes('navigator?.vibrate'));
 assert.ok(ui.includes('AudioContext||root.webkitAudioContext'));
 assert.ok(ui.includes('undoInterfoodSmartOrder({expectedProfile:profile,orderId:order.id})'));
 assert.ok(ui.includes('Visszavonás'));
 assert.ok(core.includes('logged.deleted=true'));
 assert.ok(core.includes("order.status='planned'"));
 assert.ok(core.includes('stampAfter(current.updatedAt,entry.updatedAt)'));
 assert.ok(html.includes('undo=1181'));
 assert.ok(css.includes('.hh-sl-undo-actions'));
});

test('v1182 premium RAG Buddy reuses original approved sprite for every Smart Lunch outcome',()=>{
 assert.ok(html.includes('hh-buddy-rag-fullbody-v1141.css?v=1182-shared-premium-rag'));
 assert.ok(approvedRag.includes('--hh-premium-rag-sprite:url("data:image/webp;base64,'));
 assert.equal(approvedRag.split('data:image/webp;base64,').length-1,1);
 assert.ok(approvedRag.includes('background-image:var(--hh-premium-rag-sprite)'));
 assert.ok(css.includes('background-image:var(--hh-premium-rag-sprite)'));
 for(const pair of [
  ['green','center top'],['amber','center center'],['red','center bottom']
 ]){
  assert.ok(css.includes('.hh-sl-rag-buddy[data-rag="'+pair[0]+'"]'));
  assert.ok(css.includes('background-position:'+pair[1]));
 }
 assert.ok(ui.includes("inner.dataset.rag=result.status==='consumed'?'green':'amber'"));
 assert.ok(ui.includes("inner.append(premiumBuddy(inner.dataset.rag))"));
 assert.ok(ui.includes("done.append(premiumBuddy('amber'))"));
 assert.ok(ui.includes("inner.dataset.rag='red'"));
 assert.ok(ui.includes("showFailure(String(e?.message||e))"));
 assert.ok(!ui.includes('family-success-buddy-v881.webp'));
 assert.ok(!css.includes('.hh-sl-buddy{'));
 new vm.Script(ui);
});

test('v1183 approved premium-glass facelift uses authentic Interfood photo and responsive lilac frame',()=>{
 assert.ok(html.includes('hh-interfood-smart-lunch-v1178.css?v=1183-premium-glass-lilac-frame'));
 assert.ok(html.includes('hh-interfood-smart-lunch-v1178.js?v=1183-premium-glass-lilac-frame'));
 for(const item of [
  "const kcal=text('div','','hh-sl-kcal')",
  "const macros=text('div','','hh-sl-macro-row')",
  "'hh-sl-macro-chip'",
  "'hh-sl-weight-chip'",
  "info.append(metrics);hero.append(info,cardImage(order));card.append(hero)",
  "img.src=order.imageUrl",
  "root.HH_INTERFOOD_SMART_LUNCH_V1178=Object.freeze"
 ])assert.ok(ui.includes(item),item);
 for(const item of [
  'v1183 · approved Smart Lunch premium-glass facelift',
  '.hh-sl-kicker', '.hh-sl-kcal', '.hh-sl-macro-row',
  '.hh-sl-macro-chip', '.hh-sl-weight-chip',
  '.hh-sl-image', 'rgba(255,184,230,.92)',
  '@media(max-width:380px)'
 ])assert.ok(css.includes(item),item);
 assert.ok(ui.includes("fmt(order.nutrients?.kcal==null?null:order.nutrients.kcal*order.quantity)"));
 assert.ok(ui.includes("fmt(order.nutrients?.[key]==null?null:order.nutrients[key]*order.quantity)"));
 assert.ok(ui.includes("undoInterfoodSmartOrder({expectedProfile:profile,orderId:order.id})"));
 assert.ok(ui.includes("starFeedback()"));
 assert.ok(ui.includes("inner.append(premiumBuddy(inner.dataset.rag))"));
 assert.ok(!ui.includes('localStorage.setItem'));
 new vm.Script(ui);
});
