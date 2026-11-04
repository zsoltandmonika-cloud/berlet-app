'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/shared/sh9-golden-bottom-nav-v924.js');
const CENTER='/berlet-app/sh9/notification-center/';
function runOn(pathname){
 const seen=[],hooks={},loaded=[],store=new Map([['hh-profile','z']]);
 function entry(id,label){
  const attrs=new Map([['aria-label',label]]);
  return {id,tagName:'BUTTON',dataset:{sh9BottomRole:id==='navHome'?'home':id==='navAsk'?'ask':undefined},
   textContent:label,matches:q=>q==='a,button',getAttribute:k=>attrs.get(k)||null,
   setAttribute:(k,v)=>attrs.set(k,v),addEventListener:(k,fn,capture)=>hooks[id+':'+k]={fn,capture},
   querySelector:q=>({textContent:label,set textContent(v){this.value=v}})};
 }
 const home=entry('navHome','Kezdőlap'),ask=entry('navAsk','Kérdezd Lénát'),bell=entry('alerts','Értesítések');
 const nav={children:[home,ask,bell],dataset:{sh9GoldenBottomNav:'on'},
  classList:{contains:()=>false},hasAttribute:()=>false,closest:()=>null};
 const body={dataset:{},appendChild:()=>{}};
 const document={
  readyState:'complete',body,head:{appendChild:e=>loaded.push(e.src)},
  documentElement:{setAttribute:()=>{}},
  querySelectorAll:()=>[nav],querySelector:()=>null,
  createElement:()=>({dataset:{},setAttribute(){},addEventListener(){}})
 };
 const window={
  location:{pathname,assign:x=>seen.push(x)},
  localStorage:{getItem:k=>store.get(k)||null},
  addEventListener:()=>{},history:{length:2}
 };
 vm.runInNewContext(js,{window,document,URL,MutationObserver:undefined});
 const handler=hooks['alerts:click'];
 if(handler){
  const e={preventDefault(){},stopImmediatePropagation(){},stopPropagation(){}};
  handler.fn(e);
 }
 return {seen,handler,loaded};
}
test('all SHO module bells navigate to the same live center',()=>{
 for(const path of ['/berlet-app/sh9/','/berlet-app/sh9/sport/',
  '/berlet-app/sh9/smart-travel/','/berlet-app/sh9/family-hub/',
  '/berlet-app/sh9/notification-center/','/berlet-app/sh9/sho-preview/']){
  const state=runOn(path);
  assert.ok(state.handler?.capture,'missing capture for '+path);
  assert.equal(state.seen[0],CENTER,path);
  assert.ok(state.loaded.some(x=>x.includes('notification-core-v1.js')),'missing shared inbox on '+path);
 }
});
test('existing HealthHub and Guardian bell handlers are not hijacked',()=>{
 for(const path of ['/berlet-app/healthhub/','/berlet-app/healthhub/guardian/']){
  const state=runOn(path);
  assert.equal(state.handler,undefined,path);
  assert.equal(state.seen.length,0,path);
 }
});
test('legacy placeholders removed and scripts use updated cache versions',()=>{
 const travel=read('sh9/smart-travel/index.html'),tasks=read('sh9/family-hub/family-tasks-v880.js');
 const taskPage=read('sh9/family-hub/index.html');
 assert.match(travel,/case 'Értesítések':go\('\.\.\/notification-center\/'\);break;/);
 assert.doesNotMatch(travel,/Az SH9 értesítési központja még fejlesztés alatt áll/);
 assert.match(tasks,/fhNavNotifications/);
 assert.match(tasks,/location\.assign\('\/berlet-app\/sh9\/notification-center\/'\)/);
 assert.doesNotMatch(tasks,/Az SH9 értesítési központja még fejlesztés alatt áll/);
 assert.match(taskPage,/sh9-golden-bottom-nav-v924\.js\?v=928-global-notifications/);
 assert.match(taskPage,/family-tasks-v880\.js\?v=1063-notifications-live/);
 for(const p of ['sh9/index.html','sh9/sho-preview/index.html','sh9/sport/index.html','sh9/notification-center/index.html'])
  assert.match(read(p),/sh9-golden-bottom-nav-v924\.js\?v=928-global-notifications/,p);
});
