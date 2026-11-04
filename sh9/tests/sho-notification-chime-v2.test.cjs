'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const core=read('sh9/notification-center/notification-core-v1.js');
const sound=read('sh9/notification-center/notification-sound-v2.js');
const page=read('sh9/notification-center/notification-center-v1.js');
const markup=read('sh9/notification-center/index.html');
const nav=read('sh9/shared/sh9-golden-bottom-nav-v924.js');

function harness(){
 const store=new Map([['hh-profile','z']]),wl=new Map(),dl=new Map(),tones=[],counters={created:0,played:0};
 let time=10000,visibility='visible';
 const on=(map,name,handler)=>{const entries=map.get(name)||[];entries.push(handler);map.set(name,entries)};
 const fire=(map,name,event={})=>{for(const fn of map.get(name)||[])fn(event)};
 class AudioContext{
  constructor(){counters.created++;this.state='running';this.currentTime=0;this.destination={}}
  createOscillator(){return {
   frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},start(){counters.played++},stop(){}}
  }
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
 }
 class FakeDate extends Date {static now(){return time}}
 class FakeEvent{constructor(type,options){this.type=type;this.detail=options?.detail}}
 const window={
  location:{href:'https://example.org/berlet-app/sh9/notification-center/',origin:'https://example.org'},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
  addEventListener:(name,fn)=>on(wl,name,fn),
  dispatchEvent:event=>{fire(wl,event.type,event);return true},
  AudioContext
 };
 const document={
  get visibilityState(){return visibility},
  addEventListener:(name,fn)=>on(dl,name,fn)
 };
 const context={window,document,Date:FakeDate,URL,CustomEvent:FakeEvent,Promise,Math};
 vm.runInNewContext(core,context);
 vm.runInNewContext(sound,context);
 return {
  api:window.SHO_NOTIFICATION_CORE_V1,
  sound:window.SHO_NOTIFICATION_SOUND_V2,
  store,counters,tones,
  unlock:()=>fire(dl,'pointerdown'),
  advance:ms=>{time+=ms},
  setProfile:p=>store.set('hh-profile',p),
  hide:()=>{visibility='hidden'},
  show:()=>{visibility='visible'}
 };
}
test('chime is optional and profile-specific, and never fires on boot, settings changes or read state',()=>{
 const h=harness(),api=h.api;
 assert.equal(h.counters.created,0,'no autoplay context on page load');
 assert.equal(api.soundEnabled('z'),true);
 assert.equal(api.soundEnabled('m'),true);
 api.registerModule({id:'garden',name:'Kert',events:[{key:'watering',name:'Water'}]});
 api.updatePreference('z','sportcentral.result',{enabled:true});
 assert.equal(h.counters.created,0,'register and settings updates are silent');
 api.publish({profile:'z',type:'sportcentral.result',title:'Before activation'});
 assert.equal(h.counters.played,0,'first notification before user gesture is silent');
 h.unlock();
 assert.equal(h.counters.created,1);
 h.advance(700);
 const first=api.publish({profile:'z',type:'sportcentral.result',title:'After activation'});
 assert.ok(first);
 assert.equal(h.counters.played,2,'short two-tone bell once for one new event');
 api.markRead('z',first.id);
 api.acknowledge('z');
 assert.equal(h.counters.played,2,'mark read and acknowledge never replay audio');
 api.setSoundEnabled('z',false);
 h.advance(700);
 api.publish({profile:'z',type:'sportcentral.result',title:'Muted'});
 assert.equal(h.counters.played,2,'muted profile stays silent');
 assert.equal(api.soundEnabled('m'),true,'the other profile remains enabled');
 h.advance(700);
 api.publish({profile:'m',type:'sportcentral.result',title:'Other profile while Zsolt active'});
 assert.equal(h.counters.played,2,'inactive profile cannot ring');
 h.setProfile('m');
 h.advance(700);
 api.publish({profile:'m',type:'sportcentral.result',title:'Active Monika'});
 assert.equal(h.counters.played,4,'active profile receives two-tone bell');
 h.hide();
 h.advance(700);
 api.publish({profile:'m',type:'sportcentral.result',title:'Hidden browser'});
 assert.equal(h.counters.played,4,'background/hidden app never claims in-app audio');
});
test('sound preference survives local storage without mixing profiles',()=>{
 const h=harness(),api=h.api;
 assert.equal(api.setSoundEnabled('z',false),true);
 assert.equal(api.setSoundEnabled('m',true),true);
 assert.equal(api.setSoundEnabled('m','false'),false,'reject nonboolean state');
 assert.equal(h.store.get('sho-notification-v1:chime-enabled:z'),'false');
 assert.equal(h.store.get('sho-notification-v1:chime-enabled:m'),'true');
});
test('deletion operations affect only the selected profile, and do not emit sounds',()=>{
 const h=harness(),api=h.api;
 const first=api.publish({profile:'z',type:'sportcentral.result',title:'A'});
 const second=api.publish({profile:'z',type:'sportcentral.result',title:'B'});
 const other=api.publish({profile:'m',type:'sportcentral.result',title:'M'});
 assert.equal(api.removeNotification('z',other.id),false,'cross-profile ID rejected');
 assert.equal(api.removeNotification('z',first.id),true);
 assert.equal(api.removeNotification('z',first.id),false,'no double deletion');
 assert.equal(api.state('z').total,1);
 assert.equal(api.state('m').total,1);
 api.markRead('z',second.id);
 assert.equal(api.clearRead('z'),1);
 assert.equal(api.state('z').total,0);
 assert.equal(api.state('m').unread,1);
 assert.equal(api.clearRead('m'),0,'unread messages are preserved by read purge');
 assert.equal(api.clearAll('m'),1);
 assert.equal(api.clearAll('m'),0);
 assert.equal(api.state('m').unread,0);
 assert.equal(h.counters.created,0,'no sound context starts from deletion');
});
test('notification markup exposes ON/OFF, sound preview, single delete, read purge, confirm-all',()=>{
 assert.match(markup,/id="ncSoundEnabled"/);
 assert.match(markup,/id="ncSoundPreview"/);
 assert.match(markup,/id="ncClearRead"/);
 assert.match(markup,/id="ncClearAll"/);
 assert.match(markup,/id="ncConfirmCancel"/);
 assert.match(markup,/id="ncConfirmProceed"/);
 assert.match(markup,/notification-sound-v2\.js\?v=2/);
 assert.match(page,/data-delete-notification-id/);
 assert.match(page,/function deleteAllConfirmed/);
 assert.match(page,/function closeDeleteConfirmation/);
 assert.match(page,/pendingDeleteProfile!==chosenProfile\(\)/);
 assert.match(page,/setSoundEnabled\(chosenProfile\(\)/);
 assert.match(nav,/ensureNotificationSound/);
 assert.match(nav,/notification-sound-v2\.js\?v=2/);
 assert.doesNotMatch(sound,/setInterval|Notification\.requestPermission|serviceWorker\.register/);
});
