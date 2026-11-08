'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=source('sh9/notification-center/notification-core-v1.js');
function boot(){
 const store=new Map([['hh-profile','z']]),events=[];
 const window={
  location:{href:'https://zsoltandmonika-cloud.github.io/berlet-app/sh9/notification-center/',origin:'https://zsoltandmonika-cloud.github.io'},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  addEventListener:()=>{},dispatchEvent:e=>{events.push(e.type);return true}
 };
 vm.runInNewContext(code,{window,URL,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail}}});
 return {api:window.SHO_NOTIFICATION_CORE_V1,store,events};
}
test('all seven built-in modules have grounded, same-origin canonical targets',()=>{
 const {api}=boot();
 const expected={
  'healthhub.pulse_high':'/berlet-app/healthhub/',
  'sleep.bedtime':'/berlet-app/healthhub/?sho=sleep',
  'sportcentral.match_start':'/berlet-app/sh9/sport/',
  'smarttrip.departure':'/berlet-app/sh9/smart-travel/',
  'tasks.new':'/berlet-app/sh9/family-hub/',
  'wallet.pass_expiry':'/berlet-app/sh9/?sho=wallet',
  'familyguard.arrival':'/berlet-app/healthhub/guardian/'
 };
 for(const [type,target] of Object.entries(expected)){
  assert.equal(api.moduleTarget(type),target,type);
  assert.equal(api.resolveTarget({type}),target,type+' has fallback even without an item link');
 }
 assert.equal(api.resolveTarget({type:'not-a-module.click'}),'');
});
test('tap target chooses the actual task UUID deep link when present',()=>{
 const {api}=boot();
 const id='aff0abef-bab1-4acc-a06e-112233445566';
 const item=api.publish({type:'tasks.new',profile:'z',taskId:id,title:'Új feladat'});
 assert.equal(item.targetUrl,'/berlet-app/sh9/family-hub/?task='+id);
 assert.equal(api.resolveTarget(item),item.targetUrl);
 assert.equal(api.state('z').unread,1);
 assert.equal(api.markRead('z',item.id),true);
 assert.equal(api.state('z').unread,0,'navigation marks only the selected notification read');
});
test('unvalidated task IDs fall back to the module, never become untrusted URLs',()=>{
 const {api}=boot();
 const item=api.publish({type:'tasks.new',profile:'z',taskId:'../../guardian/?foo=1'});
 assert.equal(item.targetUrl,'');
 assert.equal(api.resolveTarget(item),'/berlet-app/sh9/family-hub/');
});
test('specific deep links are honored only inside the notification source module',()=>{
 const {api}=boot();
 const direct=[
  ['tasks.due','/berlet-app/sh9/family-hub/?task=aff0abef-bab1-4acc-a06e-112233445566'],
  ['sportcentral.result','/berlet-app/sh9/sport/?fixture=123'],
  ['smarttrip.departure','/berlet-app/sh9/smart-travel/?trip=pack-1'],
  ['wallet.pass_expiry','/berlet-app/sh9/?sho=wallet'],
  ['familyguard.arrival','/berlet-app/healthhub/guardian/#guardian'],
  ['healthhub.nutrition','/berlet-app/healthhub/nutrition/']
 ];
 for(const [type,targetUrl] of direct)assert.equal(api.resolveTarget({type,targetUrl}),targetUrl,type);
});
test('external links, cross-module links, script links and encoded escape paths never redirect the tap',()=>{
 const {api}=boot();
 const wrong=[
  ['sportcentral.result','https://evil.example/app'],
  ['sportcentral.result','javascript:alert(1)'],
  ['sportcentral.result','/berlet-app/sh9/family-hub/?task=x'],
  ['tasks.new','/berlet-app/healthhub/guardian/'],
  ['familyguard.arrival','/berlet-app/sh9/sport/'],
  ['wallet.pass_expiry','/berlet-app/sh9/?sho=other'],
  ['sportcentral.broadcast','/berlet-app/sh9/sportish/'],
  ['tasks.new','/berlet-app/sh9/family-hub/../../healthhub/guardian/'],
  ['sportcentral.match_start','//evil.example/berlet-app/sh9/sport/']
 ];
 for(const [type,targetUrl] of wrong){
  assert.equal(api.resolveTarget({type,targetUrl}),api.moduleTarget(type),type+' '+targetUrl);
 }
});
test('legacy messages with no targetUrl navigate and deletion still stays per profile',()=>{
 const {api}=boot();
 const legacy=api.publish({type:'sportcentral.match_start',profile:'z',title:'Old warning'});
 const monika=api.publish({type:'tasks.new',profile:'m',title:'Her warning'});
 assert.equal(api.resolveTarget(legacy),'/berlet-app/sh9/sport/');
 api.markRead('z',legacy.id);
 assert.equal(api.state('m').unread,1);
 assert.equal(api.removeNotification('z',monika.id),false);
 assert.equal(api.state('m').unread,1);
});
test('UI uses canonical resolver and does not break single-card delete action',()=>{
 const ui=source('sh9/notification-center/notification-center-v1.js');
 const html=source('sh9/notification-center/index.html');
 const css=source('sh9/notification-center/notification-center-v1.css');
 assert.match(ui,/api\.resolveTarget\(entry\)/);
 assert.match(ui,/api\.resolveTarget\(item\)/);
 assert.match(ui,/w\.location\.assign\(destination\)/);
 assert.match(ui,/data-delete-notification-id/);
 assert.match(ui,/api\.markRead\(p,entry\.id\)/);
 assert.match(ui,/openModule:'Modul megnyitása'/);
 assert.match(html,/notification-core-v1\.js\?v=6-buddy-place-alerts/);
 assert.match(css,/\.nc-item-route/);
});
