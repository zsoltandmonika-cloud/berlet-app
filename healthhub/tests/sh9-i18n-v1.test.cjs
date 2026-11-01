'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const core=read('sh9/sh9-i18n-v1.js'),page=read('sh9/index.html'),
 css=read('sh9/sh9-i18n-v1.css'),travel=read('sh9/smart-travel/index.html'),
 info=read('sh9/sh9-info-v6.js');
class Element{
 constructor(attributes={},text=''){this.attrs={...attributes};this.textContent=text;this.title='';this.events={}}
 getAttribute(key){return this.attrs[key]??null}
 setAttribute(key,val){this.attrs[key]=String(val)}
 addEventListener(type,callback){this.events[type]=callback}
 click(){this.events.click?.()}
}
function mount(initial){
 const date=new Element({'data-i18n':'info.date'},'DÁTUM'),
 home=new Element({'data-i18n':'nav.home'},'Kezdőlap'),
 aria=new Element({'data-i18n-aria':'aria.grid'},''),
 hu=new Element({'data-sh9-lang':'hu'}),en=new Element({'data-sh9-lang':'en'});
 const store=new Map(initial?[['sh9-language-v1',initial]]:[]),events={},dispatched=[];
 const document={readyState:'complete',documentElement:{lang:'hu'},
  querySelectorAll(selector){
   return selector==='[data-i18n]'?[date,home]:
    selector==='[data-i18n-aria]'?[aria]:
    selector==='[data-sh9-lang]'?[hu,en]:[];
  }};
 const window={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  addEventListener:(k,fn)=>{events[k]=fn},dispatchEvent:e=>dispatched.push(e.type)};
 class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail}}
 vm.runInNewContext(core,{window,document,CustomEvent,Intl,Date});
 return {date,home,aria,hu,en,store,events,dispatched,document,api:window.SH9_I18N_V1};
}
test('approved SH9 launcher stays nine tiles; OTA and routes preserved',()=>{
 assert.equal((page.match(/class="tile"/g)||[]).length,9);
 assert.match(page,/id="sh9OtaIndicatorV1043"/);
 assert.match(page,/href="\.\.\/healthhub\/guardian\/"/);
 assert.match(page,/href="\.\/smart-travel\/"/);
 assert.match(page,/id="sh9LanguageSwitchV1"/);
 assert.equal((page.match(/data-sh9-lang=/g)||[]).length,2);
 assert.ok(page.indexOf('sh9-i18n-v1.js')<page.indexOf('sh9-info-v6.js'));
 assert.match(css,/\.sh9-language-v1/);
});
test('single stored HU / en-CA switch changes display but no data or API calls',()=>{
 const s=mount();
 assert.equal(s.home.textContent,'Kezdőlap');
 s.en.click();
 assert.equal(s.api.getLanguage(),'en');
 assert.equal(s.document.documentElement.lang,'en-CA');
 assert.equal(s.home.textContent,'Home');
 assert.equal(s.date.textContent,'DATE');
 assert.equal(s.aria.getAttribute('aria-label'),'SH9 nine modules');
 assert.equal(s.en.getAttribute('aria-pressed'),'true');
 assert.equal(s.hu.getAttribute('aria-pressed'),'false');
 assert.equal(s.store.get('sh9-language-v1'),'en');
 s.hu.click();
 assert.equal(s.home.textContent,'Kezdőlap');
 assert.equal(s.document.documentElement.lang,'hu-HU');
 assert.equal(s.store.get('sh9-language-v1'),'hu');
});
test('saved locale hydrates in other SH9 modules and responds to cross-tab sync',()=>{
 const s=mount('en');
 assert.equal(s.home.textContent,'Home');
 assert.equal(s.api.t('travel.planner'),'Your trip planner');
 s.events.storage({key:'sh9-language-v1',newValue:'hu'});
 assert.equal(s.home.textContent,'Kezdőlap');
 assert.match(travel,/\.\.\/sh9-i18n-v1\.js/);
 assert.match(travel,/data-i18n="travel.planner"/);
});
test('static translations and weather language changes require no AI, GPS or new cloud storage',()=>{
 assert.doesNotMatch(core,/navigator\.geolocation|fetch\s*\(|supabase\.|openai\.|setInterval\s*\(/);
 assert.match(info,/sh9:languagechange/);
 assert.match(info,/window\.SH9Weather/);
 assert.match(info,/Intl\.DateTimeFormat\(fmtLocale\(\)/);
});


test('launchpad keeps stable identifiers but shows concise translated family module labels',()=>{
 const expected=[
  ['health','Egészség','Health'],['guard','Biztonság','Safety'],['travel','Utazás','Travel'],['sports','Sport','Sports'],
  ['daily','Családi aktualitások','Family Updates'],
  ['people','Kapcsolatok','People'],['lifestyle','Életmód','Lifestyle']
 ];
 assert.match(page,/data-name="HealthHub" aria-label="Egészség megnyitása" data-i18n-aria="module\.ariaHealth"/);
 assert.match(page,/data-name="Family Guard" aria-label="Biztonság megnyitása" data-i18n-aria="module\.ariaGuard"/);
 assert.match(page,/data-name="Smart Travel"[^>]*data-i18n-aria="module\.ariaTravel"/);
 assert.match(page,/href="\.\/smart-travel\/"/);
 const count=[...page.matchAll(/class="mod-name" data-i18n="module\.([^"]+)"/g)];
 assert.equal(count.length,9);
 for(const [key,hu,en] of expected){
  assert.ok(page.includes('data-i18n="module.'+key+'">'+hu+'</span>'));
  const local=mount('en');
  assert.equal(local.api.t('module.'+key),en);
  assert.equal(local.api.translations.hu['module.'+key],hu);
 }
 assert.match(travel,/<title data-i18n="travel\.pageTitle">SH9 · Utazás<\/title>/);
 assert.match(travel,/data-i18n-aria="travel\.heroAria"/);
});


test('Travel tile displays Tömegközlekedés / Public Transport while preserving its original route',()=>{
 assert.match(travel,/data-name="Public Transport" data-href="\.\/public-transport\/" aria-label="Tömegközlekedés megnyitása" data-i18n-aria="travel\.publicAria"/);
 assert.match(travel,/<strong data-i18n="travel\.publicTitle">Tömegközlekedés<\/strong>/);
 const lang=mount('en');
 assert.equal(lang.api.t('travel.publicTitle'),'Public Transport');
 assert.equal(lang.api.t('travel.publicAria'),'Open Public Transport');
 assert.equal(lang.api.translations.hu['travel.publicTitle'],'Tömegközlekedés');
});

test('SH9 Travel titles: HU / en-CA labels match the approved simple module names',()=>{
 const approved=[
  ['Road Travel','road','Autózás','Road Travel'],
  ['Air Travel','air','Repülés','Air Travel'],
  ['My Trips','trips','Utazásaink','My Trips'],
  ['My Places','places','Kedvenc helyek','My Places'],
  ['Shared Mobility','shared','Megosztott járművek','Shared Mobility']
 ];
 const hu=mount('hu').api,en=mount('en').api;
 for(const [internal,key,local,english] of approved){
  assert.ok(travel.includes('data-name="'+internal+'"'));
  assert.ok(travel.includes('<strong data-i18n="travel.'+key+'Title">'+local+'</strong>'));
  assert.equal(hu.t('travel.'+key+'Title'),local);
  assert.equal(en.t('travel.'+key+'Title'),english);
  assert.equal(hu.t('travel.'+key+'Aria'),local+' megnyitása');
 }
 assert.match(travel,/data-name="My Trips" data-href="\.\/my-trips\/"/);
 assert.match(travel,/data-name="My Places" data-href="\.\.\/\.\.\/healthhub\/guardian\/#hhSmartHubFavoritesV806"/);
 assert.match(travel,/data-name="Shared Mobility" data-pending="true"/);
 assert.match(travel,/showPending\(b\.dataset\.name,b\)/);
});

test('SH9 Shopping takes the centre tile; Ask Léna replaces Timeline in the bottom bar',()=>{
 const titles=[...page.matchAll(/class="mod-name" data-i18n="([^"]+)">([^<]+)<\/span>/g)];
 assert.equal(titles.length,9);
 assert.equal(titles[4][1],'module.shopping');
 assert.equal(titles[4][2],'Bevásárlás');
 assert.match(page,/data-name="Shopping" aria-label="Bevásárlás megnyitása" data-i18n-aria="module\.ariaShopping"/);
 assert.equal((page.match(/data-nav="/g)||[]).length,5);
 assert.match(page,/data-nav="Ask Léna" aria-label="Ask Léna megnyitása" data-i18n-aria="nav\.ariaAsk"/);
 assert.doesNotMatch(page,/data-nav="Idővonal"/);
 assert.doesNotMatch(page,/data-name="Ask Léna"/);
 assert.match(page,/b\.dataset\.name==='Ask Léna'\|\|b\.dataset\.nav==='Ask Léna'/);
 assert.match(page,/sh9-ai-taskbar-v1\.css/);
 assert.match(page,/data-name="Shopping"[^>]*>/);
 assert.ok(!page.includes('data-name="Shopping" data-href='));
 const hu=mount('hu').api,en=mount('en').api;
 assert.equal(hu.t('module.shopping'),'Bevásárlás');
 assert.equal(en.t('module.shopping'),'Shopping');
 assert.equal(hu.t('nav.ask'),'Ask Léna');
 assert.equal(en.t('nav.ariaAsk'),'Open Ask Léna');
});


test('SH9 v907 profile pill is same 90x47 Golden Glass size as the HU/CA control',()=>{
 assert.match(page,/id="sh9LauncherProfileV1"/);
 assert.match(page,/sh9-launcher-profile-v1\.js\?v=907-profile-toggle/);
 assert.ok(page.indexOf('sh9LauncherProfileV1')>page.indexOf('sh9HeaderControlsV2'));
 assert.match(css,/#sh9HeaderControlsV2 #sh9LanguageSwitchV1[\\s\\S]*?width:90px;height:47px/);
 assert.match(css,/\.hero #sh9LauncherProfileV1[\\s\\S]*?width:90px;height:47px/);
 assert.match(css,/#sh9LauncherProfileV1\[data-profile="m"\]/);
 assert.equal((page.match(/class="tile"/g)||[]).length,9);
 assert.equal((page.match(/data-nav="/g)||[]).length,5);
});
test('SH9 v907 profile switch toggles canonical shared preference and respects HU/EN',()=>{
 const source=read('sh9/sh9-launcher-profile-v1.js');
 const pill=new Element(),mark=new Element(),name=new Element();
 pill.dataset={};
 const nodes={sh9LauncherProfileV1:pill,sh9LauncherProfileMarkV1:mark,sh9LauncherProfileNameV1:name};
 const store=new Map(),events={},dispatched=[];
 let language='hu';
 const document={readyState:'complete',getElementById:id=>nodes[id]||null};
 const window={
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  SH9_I18N_V1:{getLanguage:()=>language},
  addEventListener:(key,fn)=>{events[key]=fn},
  dispatchEvent:event=>dispatched.push(event.type)
 };
 class CustomEvent{constructor(type,opts){this.type=type;this.detail=opts?.detail}}
 vm.runInNewContext(source,{window,document,CustomEvent});
 assert.equal(name.textContent,'Zsolt');
 assert.equal(mark.textContent,'Z');
 assert.equal(pill.getAttribute('data-profile'),'z');
 pill.click();
 assert.equal(store.get('hh-profile'),'m');
 assert.equal(name.textContent,'Mónika');
 assert.equal(mark.textContent,'M');
 assert.equal(pill.getAttribute('data-profile'),'m');
 assert.equal(pill.getAttribute('aria-label'),'Profilváltás Zsolt profiljára');
 assert.deepEqual(dispatched,['hh-family-profile-changed']);
 language='en';
 events['sh9:languagechange']();
 assert.equal(pill.getAttribute('aria-label'),'Switch profile to Zsolt');
 pill.click();
 assert.equal(store.get('hh-profile'),'z');
 assert.equal(name.textContent,'Zsolt');
 assert.equal(dispatched.length,2);
 store.set('hh-profile','m');
 events.storage({key:'hh-profile'});
 assert.equal(name.textContent,'Mónika');
 assert.doesNotMatch(source,/fetch\s*\(|supabase\.|geolocation|setInterval\s*\(/);
});


test('SH9 v908 profile pill moves down exactly 15px and uses profile-specific Golden Glass accents',()=>{
 const bottom=css.match(/\.hero #sh9LauncherProfileV1\{[\s\S]*?bottom:(-?\d+)px;/);
 assert.ok(bottom);
 assert.equal(Number(bottom[1]),-6,'9px - 15px = -6px (exact shift)');
 assert.match(css,/\.wrap>\.hero:has\(#sh9LauncherProfileV1\)\{overflow:visible\}/);
 assert.match(css,/\.hero #sh9LauncherProfileV1\[data-profile="z"\]\{/);
 assert.match(css,/\.hero #sh9LauncherProfileV1\[data-profile="m"\]\{/);
 assert.match(css,/#sh9LauncherProfileMarkV1\{/);
 assert.match(css,/width:90px;height:47px;min-width:90px;max-width:90px/);
 assert.match(page,/sh9-i18n-v1\.css\?v=908-profile-colors-offset/);
 assert.equal((page.match(/class="tile"/g)||[]).length,9);
 assert.equal((page.match(/data-nav="/g)||[]).length,5);
});
