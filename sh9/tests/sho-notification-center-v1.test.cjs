'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const code=source('sh9/notification-center/notification-core-v1.js');
function boot(store=new Map()){
 const listeners=new Map();
 const window={
  location:{href:'https://zsoltandmonika-cloud.github.io/berlet-app/sh9/notification-center/',origin:'https://zsoltandmonika-cloud.github.io'},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  addEventListener:(n,fn)=>listeners.set(n,fn),
  dispatchEvent:()=>true
 };
 vm.runInNewContext(code,{window,URL,CustomEvent:class{constructor(type){this.type=type}}});
 return {api:window.SHO_NOTIFICATION_CORE_V1,window,store};
}
test('built-in categories and subcategories are present without fabricated notifications',()=>{
 const {api}=boot();
 assert.ok(api.modules().length>=7);
 assert.ok(api.definitions().length>=18);
 assert.ok(api.definitions().some(d=>d.id==='healthhub.pulse_high'&&d.group.hu==='Szív és keringés'));
 assert.ok(api.definitions().some(d=>d.id==='smarttrip.departure'));
 assert.equal(api.state('z').unread,0);
 assert.equal(api.state('m').unread,0);
});
test('profile isolation extends to rules, inbox, badges and read states',()=>{
 const {api}=boot();
 assert.equal(api.updatePreference('z','sportcentral.match_start',{enabled:false}),true);
 assert.equal(api.preference('z','sportcentral.match_start').enabled,false);
 assert.equal(api.preference('m','sportcentral.match_start').enabled,true);
 assert.equal(api.publish({type:'sportcentral.match_start',profile:'z',title:'Disabled'}),null);
 assert.ok(api.publish({type:'sportcentral.match_start',profile:'m',title:'Mónika demo',demo:true}));
 assert.equal(api.state('m').unread,1);
 assert.equal(api.state('z').unread,0);
 assert.equal(api.state('m').attention,1);
 api.acknowledge('m');
 assert.equal(api.state('m').attention,0,'opening bell stops pulse, not unread count');
 assert.equal(api.state('m').unread,1,'opening bell does not mark a notification read');
 const first=api.list('m')[0];
 assert.equal(api.markRead('m',first.id),true);
 assert.equal(api.state('m').unread,0);
 assert.equal(api.state('z').unread,0);
});
test('external module manifests register dynamically, survive reload, and validate values',()=>{
 const {api,store}=boot();
 const manifest={id:'garden',name:{hu:'Kert',en:'Garden'},icon:'leaf',
  events:[{key:'water',group:{hu:'Locsolás',en:'Watering'},name:{hu:'Ideje locsolni',en:'Time to water'},
   settings:[{key:'leadMinutes',kind:'select',options:[15,30],default:15}]}]};
 assert.equal(api.registerModule(manifest),true);
 assert.equal(api.updatePreference('z','garden.water',{leadMinutes:30}),true);
 assert.equal(api.updatePreference('z','garden.water',{leadMinutes:-1}),false);
 const second=boot(store).api;
 assert.ok(second.modules().some(m=>m.id==='garden'));
 assert.equal(second.preference('z','garden.water').leadMinutes,30);
 assert.equal(second.registerModule({...manifest,id:'healthhub'}),false,'builtin module cannot be overwritten');
 assert.equal(second.registerModule({id:'bad<script>',events:[]}),false);
});
test('medical notifications stay disabled until there is a safe authenticated delivery backend',()=>{
 const {api}=boot();
 assert.equal(api.publish({type:'healthhub.pulse_high',profile:'m',title:'Sensitive medical detail'}),null);
 assert.equal(api.state('m').unread,0);
});
test('inbox rejects off-site and script targets and avoids duplicate emissions',()=>{
 const {api}=boot();
 const first=api.publish({type:'sportcentral.result',profile:'z',title:'Result',targetUrl:'javascript:alert(1)',dedupeKey:'fixture-34'});
 assert.ok(first);assert.equal(first.targetUrl,'');
 assert.equal(api.publish({type:'sportcentral.result',profile:'z',title:'Duplicate',dedupeKey:'fixture-34'}),null);
 const second=api.publish({type:'sportcentral.result',profile:'z',targetUrl:'https://evil.example/x'});
 assert.equal(second.targetUrl,'');
 const third=api.publish({type:'sportcentral.result',profile:'z',targetUrl:'/berlet-app/sh9/sport/'});
 assert.equal(third.targetUrl,'/berlet-app/sh9/sport/');
});
test('dedicated center preserves 12-tile launcher, shared dock and canonical alerts',()=>{
 const html=source('sh9/notification-center/index.html'),home=source('sh9/index.html');
 const shared=source('sh9/shared/sh9-golden-bottom-nav-v924.js');
 const stylesheet=source('sh9/shared/sh9-golden-bottom-nav-v924.css');
 const wiring=source('sh9/sho-preview/sho-wiring-v2.js');
 assert.match(html,/Notification Center/);
 assert.match(html,/class="nc-hero hero"/);
 assert.match(html,/notification-core-v1\.js/);
 assert.match(html,/sh9-golden-controls-v1\.js/);
 assert.match(shared,/NOTIFICATIONS=HOME\+'notification-center\/'/);
 assert.match(shared,/ensureNotificationCore/);
 assert.match(shared,/w\.SHO_NOTIFICATION_CORE_V1\?\.acknowledge/);
 assert.match(shared,/stopImmediatePropagation/);
 assert.match(stylesheet,/shoBellAttentionPulse 1\.5s/);
 assert.match(stylesheet,/prefers-reduced-motion:reduce/);
 assert.match(wiring,/\$\('alerts'\)\.onclick=\(\)=>goto\(SH9\+'notification-center\/'\)/);
 assert.equal((home.match(/<button class="tile" data-module=/g)||[]).length,12,'no additional launcher tile');
});
