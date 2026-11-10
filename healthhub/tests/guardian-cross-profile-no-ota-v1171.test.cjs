'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const guardian=read('guardian/guardian.js');
const live=read('guardian/guardian-live-v785.js');
const html=read('guardian/index.html');
function part(src,from,to){
 const i=src.indexOf(from),j=src.indexOf(to,i+from.length);
 assert.ok(i>=0&&j>i,'Expected functions: '+from+' -> '+to);
 return src.slice(i,j);
}
test('Profile switch is view-only and never calls GPS Stop for an already bound owner',()=>{
 const events=[],store=new Map([['hh-profile','z']]);
 const w={
  localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>{store.set(k,v)}},
  HH_GUARDIAN_LIVE_V785:{boundProfile:'zsolt',onProfileChanged(){events.push('owner-notified')}},
  HH_GUARDIAN_TRANSIT_V790:{setProfile(){}}
 };
 const ctx={w,active:true,marker:{remove(){events.push('marker-cleared')}},map:{easeTo(){}},
  neutral:[0,0],name:()=>store.get('hh-profile')==='m'?'Mónika':'Zsolt',
  stop(temporary){events.push('STOP:'+temporary)},clear(){events.push('clear')},
  tapSound(){},theme(){},renderButtons(){},applyGoldenMapStyle(){},
  report(){},$:()=>({textContent:''}),follow:false,threeD:true,hasFix:true,lastBrowserFixAt:4};
 vm.runInNewContext(part(guardian,'function switchProfile(){','/* Family Guard v773'),ctx);
 vm.runInNewContext('switchProfile()',ctx);
 assert.equal(store.get('hh-profile'),'m');
 assert.equal(events.filter(x=>x.startsWith('STOP:')).length,0,'Switch must not stop own watch');
 assert.ok(events.includes('marker-cleared'));
 assert.ok(events.includes('owner-notified'));
});
test('Physical owner GPS positions continue publishing but never paint as remote person',()=>{
 const sent=[],w={HH_GUARDIAN_LIVE_V785:{
  boundProfile:'zsolt',onGpsFix(pos){sent.push(pos)}
 }};
 const ctx={w,active:true,name:()=> 'Mónika'};
 vm.runInNewContext(part(guardian,'function onPosition(pos){','function tryNetworkFix(){'),ctx);
 const pos={timestamp:100,coords:{latitude:47,longitude:19,accuracy:8}};
 vm.runInNewContext('onPosition(pos)',{...ctx,pos});
 assert.equal(sent.length,1);
 assert.equal(sent[0],pos);
});
test('Switching viewed profile preserves approved owner uploader',()=>{
 const events=[];
 const ctx={
  locationReads:{clear(){events.push('cache-cleared')}},
  bound:()=> 'zsolt',
  sharing:true,sharingProfile:'zsolt',access:['zsolt','monika'],
  stopSharing(){events.push('STOP_OR_DELETE')},
  removePeer(){events.push('peer-cleared')},
  setPeerState(){},gpsInfo(){},updateUi(){},resetPolling(){},
  loadSettings(){},resumeOwnPhoneAutoFollow(){}
 };
 vm.runInNewContext(part(live,'function onProfileChanged(){','function onGpsFix(pos){'),ctx);
 vm.runInNewContext('onProfileChanged()',ctx);
 assert.ok(!events.includes('STOP_OR_DELETE'),'View switch must not revoke sharing or delete GPS row');
 assert.ok(events.includes('peer-cleared'));
 assert.match(part(live,'function onGpsFix(pos){','function syncSettings(){'),/sharingProfile!==bound\(\)/);
 assert.doesNotMatch(part(live,'function onGpsFix(pos){','function syncSettings(){'),/sharingProfile!==self\(\)/);
});
test('Follow button tracks the other owner even if own GPS watch is active',()=>{
 const events=[];
 const remote={preventWrongDeviceGps:()=>true,requestFollow(){events.push('remote-follow');return true}};
 const ctx={w:{HH_GUARDIAN_PROFILE_FOLLOW_V837:remote},active:true,follow:false,
  renderButtons(){},notifySettings(){},report(){events.push('report')},
  start(){events.push('LOCAL_START')},marker:null,map:null};
 vm.runInNewContext(part(guardian,'function enableFollow(){','function tapSound(){'),ctx);
 vm.runInNewContext('enableFollow()',ctx);
 assert.equal(ctx.follow,true);
 assert.deepEqual(events,['remote-follow']);
});
test('One web-only release refreshes both scripts without APK or native settings changes',()=>{
 assert.match(html,/guardian\.js\?v=1171-cross-profile-owner-preservation/);
 assert.match(html,/guardian-live-v785\.js\?v=1171-view-only-switch-keeps-gps/);
 assert.doesNotMatch(live,/eval\(|new Function\(/);
});
