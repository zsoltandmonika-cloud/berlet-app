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
 assert.doesNotMatch(core,/fetch\(|geolocation|supabase|openai|setInterval/);
 assert.match(info,/sh9:languagechange/);
 assert.match(info,/window\.SH9Weather/);
 assert.match(info,/Intl\.DateTimeFormat\(fmtLocale\(\)/);
});
