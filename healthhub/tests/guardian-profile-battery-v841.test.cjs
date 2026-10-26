'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const battery=require('../guardian/guardian-profile-battery-v841.js');
const sample=(profile,percent,charge=false,age=5000)=>({
 profile_key:profile,battery_pct:percent,battery_charging:charge,
 updated_at:new Date(Date.now()-age).toISOString()
});
test('v841 battery palette, fresh timestamps and owner isolation',()=>{
 assert.equal(battery.version,'841');
 for(const [p,tone] of [[100,'green'],[70,'green'],[69,'amber'],[30,'amber'],[29,'red'],[15,'red'],[14,'critical'],[0,'critical']])assert.equal(battery.tone(p),tone);
 for(const p of [-1,101,NaN,'85',null,undefined])assert.equal(battery.tone(p),'unknown');
 assert.equal(battery.selectedProfile({getItem(){return 'm'}}),'monika');
 assert.equal(battery.selectedProfile({getItem(){return 'z'}}),'zsolt');
 assert.equal(battery.validSnapshot(sample('monika',85),'zsolt'),null);
 assert.equal(battery.validSnapshot(sample('monika',85,false,150000),'monika'),null);
 assert.equal(battery.validSnapshot(sample('monika',85,false,-10000),'monika'),null);
 assert.equal(battery.validSnapshot(sample('monika',100,true),'monika').charging,true);
 for(const p of [-1,101,80.5,'85',null,undefined])assert.equal(battery.validSnapshot(sample('monika',p),'monika'),null);
 assert.equal(battery.permitted({authenticated:false,familyAuthorized:true},'monika'),false);
 assert.equal(battery.permitted({authenticated:true,familyAuthorized:false,boundProfile:'zsolt'},'monika'),false);
 assert.equal(battery.permitted({authenticated:true,familyAuthorized:true},'monika'),true);
});
test('v841 switches from Zsolt to Monika without leaking the viewer phone reading',async()=>{
 const store={'hh-profile':'z'},events={},nodes={},reads=[];
 let reply=k=>({status:'ok',data:sample(k,k==='zsolt'?85:23,k==='monika')});
 function dom(id){
  if(!nodes[id])nodes[id]={dataset:{},style:{vals:{},setProperty(k,v){this.vals[k]=v}},
   textContent:'',setAttribute(k,v){this[k]=v},addEventListener(k,fn){events[id+':'+k]=fn}};
  return nodes[id];
 }
 const w={localStorage:{getItem(k){return store[k]||null}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'zsolt'},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},async read(k){reads.push(k);return reply(k)}},
  addEventListener(k,fn){events[k]=fn},setInterval(){return 1},setTimeout(fn){fn();return 1},
  document:{hidden:false,readyState:'complete',getElementById:dom,
   addEventListener(k,fn){events['doc:'+k]=fn}}};
 vm.runInNewContext(read('guardian-profile-battery-v841.js'),{window:w,Date,Number,Math,Promise,Object,String});
 const mod=w.HH_GUARDIAN_BATTERY_V841;
 await new Promise(setImmediate);
 assert.equal(dom('guardianBatteryTextV841').textContent,'85%');
 assert.equal(dom('guardianBatteryV841').dataset.level,'green');
 assert.match(dom('guardianBatteryV841')['aria-label'],/Zsolt/);
 store['hh-profile']='m';
 events['guardianProfileSwitch:click']();
 assert.equal(dom('guardianBatteryTextV841').textContent,'—');
 await new Promise(setImmediate);
 assert.equal(dom('guardianBatteryTextV841').textContent,'23%');
 assert.equal(dom('guardianBatteryV841').dataset.level,'red');
 assert.equal(dom('guardianBatteryV841').dataset.charging,'true');
 assert.match(dom('guardianBatteryV841')['aria-label'],/Mónika/);
 assert.deepEqual(reads,['zsolt','monika']);
 reply=k=>({status:'ok',data:sample(k,92,false,250000)});
 await mod.start().refresh();
 assert.equal(dom('guardianBatteryTextV841').textContent,'—','stale percentage must not appear live');
 reply=k=>({status:'revoked',data:null});
 await mod.start().refresh();
 assert.equal(dom('guardianBatteryTextV841').textContent,'—');
 w.HH_GUARDIAN_LIVE_V785.authenticated=false;
 await mod.start().refresh();
 assert.equal(dom('guardianBatteryTextV841').textContent,'—');
});
test('v841 switching during a pending request cannot flash wrong-owner battery',async()=>{
 const store={'hh-profile':'z'},events={},nodes={},requests=[];
 let finish;
 const w={localStorage:{getItem(k){return store[k]||null}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'zsolt'},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},read(k){requests.push(k);return k==='zsolt'?
   new Promise(r=>{finish=r}):Promise.resolve({status:'ok',data:sample('monika',63)})}},
  addEventListener(k,fn){events[k]=fn},setInterval(){return 1},setTimeout(fn){fn();return 1},
  document:{hidden:false,readyState:'complete',
   getElementById(k){return nodes[k]||(nodes[k]={dataset:{},style:{setProperty(){}},textContent:'',
    setAttribute(){},addEventListener(t,fn){events[k+':'+t]=fn}})},
   addEventListener(){}}};
 vm.runInNewContext(read('guardian-profile-battery-v841.js'),{window:w,Date,Number,Math,Promise,Object,String});
 assert.deepEqual(requests,['zsolt']);
 store['hh-profile']='m';events['guardianProfileSwitch:click']();
 finish({status:'ok',data:sample('zsolt',95)});
 for(let n=0;n<4;n++)await new Promise(setImmediate);
 assert.deepEqual(requests,['zsolt','monika']);
 assert.equal(nodes.guardianBatteryTextV841.textContent,'63%');
 assert.equal(nodes.guardianBatteryV841.dataset.level,'amber');
});
test('v841 is a scoped premium hero change, using only approved owner-bound relay',()=>{
 const html=read('index.html'),css=read('guardian-profile-battery-v841.css'),js=read('guardian-profile-battery-v841.js');
 const relay=read('guardian-native-dropbox-v156.js');
 const android=fs.readFileSync(path.join(__dirname,'../android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardNativeRelay.kt'),'utf8');
 assert.match(html,/guardian-profile-battery-v841\.css\?v=841-hero-owner-battery/);
 assert.match(html,/guardian-profile-battery-v841\.js\?v=841-per-profile-battery/);
 assert.match(html,/guardian-native-dropbox-v156\.js\?v=156-private-native-relay&battery=841/);
 assert.match(css,/\.guardian-hero>\.guardian-battery-v841/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/data-level="red"/);
 assert.match(css,/data-level="amber"/);
 assert.match(css,/data-level="critical"/);
 assert.doesNotMatch(css,/#guardianMap|\.map-follow|\.map-3d|\.map-family|\.guardian-hero-monitor|\.guardian-standard-profile/);
 assert.match(android,/isSelectedPhysicalPhone\(app, profile\)/);
 assert.match(android,/Intent\.ACTION_BATTERY_CHANGED/);
 assert.match(android,/BatteryManager\.EXTRA_LEVEL/);
 assert.match(android,/BatteryManager\.EXTRA_STATUS/);
 assert.match(android,/\.put\("battery_pct", percent \?: JSONObject\.NULL\)/);
 assert.match(android,/\.put\("battery_charging", charging \?: JSONObject\.NULL\)/);
 assert.match(relay,/profile:profile/);
 assert.match(relay,/battery_pct:Number\.isInteger\(raw\.battery_pct\)/);
 assert.doesNotMatch(js,/navigator\.getBattery|navigator\.geolocation|localStorage\.setItem|\.upsert\(|\.upload\(/);
 assert.match(html,/guardian-attribution-dot-v834\.css/);
 assert.match(html,/guardian-zoom-center-v835\.css/);
 assert.match(html,/guardian-profile-foreground-v838\.css/);
});
