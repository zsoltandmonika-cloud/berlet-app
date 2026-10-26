'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'../guardian');
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
const trio=require('../guardian/guardian-live-trio-v845.js');
const NOW=Date.parse('2026-10-26T10:00:00Z');
const st=(start,end,code=4)=>({
 id:'sleep-real',startTime:start,endTime:end,
 stages:[{stage:code,startTime:start,endTime:end}]
});
const night=(hours,end='2026-10-26T05:30:00Z')=>{
 const finish=Date.parse(end);return [st(new Date(finish-hours*3600000).toISOString(),end)];
};
const activity=(date,kcal,update=NOW-10000,p='zsolt')=>({
 profile:p,date,kind:'total_burned_kcal',kcal,updatedAt:new Date(update).toISOString()
});
const diary=(date,kcal,p='zsolt')=>({
 schemaVersion:'healthhub.nutrition/1',profileKey:p,
 entries:[{id:'meal',date,nutrients:{kcal},deleted:false}]
});
test('v845 selected owner and last-main-night index mirrors HealthHub v382/v428',()=>{
 assert.equal(trio.version,'845');
 assert.equal(trio.profileKey({getItem:()=> 'm'}),'monika');
 assert.equal(trio.profileKey({getItem:()=> 'z'}),'zsolt');
 assert.equal(trio.sleepIndex(night(8),NOW).score,100);
 assert.equal(trio.sleepIndex(night(8),NOW).tone,'good');
 assert.equal(trio.sleepIndex(night(6.5),NOW).score,79);
 assert.equal(trio.sleepIndex(night(6.5),NOW).tone,'warn');
 assert.equal(trio.sleepIndex(night(5.5),NOW).score,59);
 assert.equal(trio.sleepIndex(night(5.5),NOW).tone,'bad');
 assert.equal(trio.sleepIndex(night(8).map(x=>({...x,stages:[]})),NOW),null);
 assert.equal(trio.sleepIndex(night(8).map(x=>({...x,stages:x.stages.map(z=>({...z,stage:1}))})),NOW),null);
 assert.equal(trio.sleepIndex(night(8,'2026-10-21T05:30:00Z'),NOW),null);
 assert.equal(trio.sleepIndex([st('2026-10-25T12:00:00Z','2026-10-25T12:50:00Z')],NOW),null);
 const short=night(8)[0];
 short.stages=[{stage:4,startTime:short.startTime,endTime:new Date(Date.parse(short.startTime)+60*60000).toISOString()}];
 assert.equal(trio.sleepIndex([short],NOW),null,'incomplete stage coverage is unknown');
});
test('v845 Nutrition sign-based RAG follows actual HH Body net energy, never guesses',()=>{
 const day='2026-10-26',p='zsolt';
 const d=diary(day,1700),a=activity(day,2200);
 assert.deepEqual(trio.nutritionBalance(p,d,a,NOW),
  {net:-500,date:day,tone:'good',source:'Nutrition · mai bevitel − becsült teljes energiafelhasználás'});
 assert.equal(trio.nutritionBalance(p,diary(day,2300),a,NOW).tone,'bad');
 assert.equal(trio.nutritionBalance(p,diary(day,2200),a,NOW).tone,'warn');
 assert.equal(trio.nutritionBalance('monika',d,a,NOW),null,'no cross-person Nutrition data');
 assert.equal(trio.nutritionBalance(p,diary('2026-10-25',1700),a,NOW),null,'old intake cannot count as today');
 assert.equal(trio.nutritionBalance(p,diary(day,1700),activity(day,2200,NOW-7*3600000),NOW),null,'old burn data');
 assert.equal(trio.nutritionBalance(p,d,activity(day,2200,NOW,'monika'),NOW),null,'other owner burn data');
 assert.equal(trio.nutritionBalance(p,{...d,entries:[]},a,NOW),null,'missing meals are not zero kcal');
 assert.equal(trio.nutritionBalance(p,d,null,NOW),null);
});
test('v845 Health heart uses conservative daily RAG and separate real Sleep score',()=>{
 const sleep={score:92,tone:'good'},good={net:-200,tone:'good'},bad={net:150,tone:'bad'};
 assert.deepEqual(trio.healthState(sleep,good),{tone:'good',score:92,factors:['Sleep','Nutrition']});
 assert.deepEqual(trio.healthState(sleep,bad),{tone:'bad',score:92,factors:['Sleep','Nutrition']});
 assert.deepEqual(trio.healthState({score:59,tone:'bad'},good),
  {tone:'bad',score:59,factors:['Sleep','Nutrition']});
 assert.deepEqual(trio.healthState(sleep,null),{tone:'good',score:92,factors:['Sleep']});
 assert.deepEqual(trio.healthState(null,bad),{tone:'bad',score:null,factors:['Nutrition']});
 assert.deepEqual(trio.healthState(null,null),{tone:'unknown',score:null,factors:[]});
});
test('v845 GPS state requires correct owner, bounded accuracy, fresh valid fix',()=>{
 const p='zsolt',now=NOW;
 const fix=(age)=>({profile_key:p,latitude:47.51,longitude:19.02,accuracy_m:9,
  updated_at:new Date(now-age).toISOString()});
 assert.equal(trio.gpsState(fix(9000),null,p,now).state,'online');
 assert.equal(trio.gpsState(fix(65000),null,p,now).state,'stale');
 assert.equal(trio.gpsState(null,fix(65000),p,now).state,'online');
 assert.equal(trio.gpsState(null,fix(150000),p,now).state,'stale');
 assert.equal(trio.gpsState(null,fix(650000),p,now).state,'unknown');
 assert.equal(trio.gpsState(fix(1000),null,'monika',now).state,'unknown');
 assert.equal(trio.gpsState(fix(1000),null,p,now,now-100).state,'unknown');
 assert.equal(trio.gpsState({...fix(1000),accuracy_m:200},null,p,now).state,'unknown');
 assert.equal(trio.permitted({authenticated:false,familyAuthorized:true},p),false);
 assert.equal(trio.permitted({authenticated:true,boundProfile:'monika'},p),false);
 assert.equal(trio.permitted({authenticated:true,familyAuthorized:true},p),true);
});
test('v845 renders one hero Battery tile, GPS and Health, with exact popup rows',()=>{
 const html=read('index.html'),css=read('guardian-live-trio-v845.css'),
  code=read('guardian-live-trio-v845.js');
 for(const path of ['guardian-live-trio-v845.css','guardian-live-trio-v845.js'])
  assert.match(html,new RegExp(path.replaceAll('.','\\.')));
 assert.equal((html.match(/id="guardianBatteryV841"/g)||[]).length,1);
 assert.equal((html.match(/id="guardianTrioV845"/g)||[]).length,1);
 const b=html.indexOf('id="guardianBatteryV841"'),
  g=html.indexOf('id="guardianGpsCardV845"'),h=html.indexOf('id="guardianHealthCardV845"');
 assert.ok(b>0&&g>b&&h>g,'Battery → GPS → Health order');
 assert.match(html,/guardianHealthSleepRowV845/);
 assert.match(html,/guardianHealthNutriRowV845/);
 assert.match(html,/guardianHealthPopupV845/);
 assert.match(css,/guardian-hero>\.hh-guardian-trio-v845/);
 assert.match(css,/guardian-hero>\.hh-guardian-health-popup-v845/);
 assert.match(html,/guardian-live-trio-v845\.css\?v=848-smaller-captions/);
 assert.ok(css.includes('top:calc(21.1% + 3px)!important'));
 assert.ok(css.includes('top:calc(21% + 3px)!important'));
 assert.ok(css.includes('height:14.8%!important'));
 assert.ok(css.includes('height:16%!important'));
 assert.ok(css.includes('font-size:clamp(9px,1.4vw,15px)!important'));
 assert.ok(css.includes('font-size:9px!important'));
 assert.ok(css.includes('font:620 clamp(7px,.86vw,9px)/1.1'));
 assert.ok(css.includes('font-size:6.5px!important;line-height:1.08!important'));
 assert.ok(css.includes('background:linear-gradient(145deg,rgba(42,78,151,.51),rgba(12,32,82,.64))!important'));
 assert.ok(css.includes('backdrop-filter:blur(18px) saturate(1.38)!important'));
 assert.ok(css.includes('background:linear-gradient(140deg,rgba(35,65,131,.82),rgba(11,29,75,.88))!important'));

 assert.match(css,/\.hh-gps-v845\[data-state="stale"\]/);
 assert.match(code,/gpsCard\.dataset\.state=g\.state/);
 assert.match(code,/health\.textContent=sleep\?String\(sleep\.score\):'—'/);
 assert.match(code,/batteryCaption\.textContent=owner\+' Mobil'/);
 assert.match(html,/guardian-live-trio-v845\.js\?v=848-score-mobile-label/);
 assert.match(code,/scoreText\.textContent=sleep\?sleep\.score\+' \/ 100'/);
 assert.doesNotMatch(code,/health\.textContent=sleep\?sleep\.score\+'\/100'/);
 assert.match(html,/guardian-live-trio-v845\.js\?v=848-score-mobile-label/);
 assert.match(css,/\.hh-health-v845:focus-visible/);
 assert.match(code,/heart\.addEventListener\('click'/);
 assert.match(code,/pop\.addEventListener\('click',close\)/);
 assert.match(code,/const profileButton=d\.getElementById\('guardianProfileSwitch'\)/);
 assert.doesNotMatch(code,/navigator\.getBattery|navigator\.geolocation|\.upload\(|\.upsert\(|setRemoteMarkerPreferred/);
 for(const legacy of ['guardianProfileSwitch','guardianMap','guardian-profile-battery-v841.js'])
  assert.match(html,new RegExp(legacy.replaceAll('.','\\.')));
 assert.ok(read('guardian-polish-v767.css').includes('guardian-family-hero-approved-v768.avif'));
 assert.ok(!css.includes('background-image:')&&!css.includes('hero-approved-v768.avif'));
});
test('v845 mini Health card toggles a real, profile-scoped expanded glass view',async()=>{
 const els=new Map(),listeners={};
 const make=id=>{
  if(!els.has(id))els.set(id,{id,dataset:{},hidden:false,textContent:'',
   attrs:{},handlers:{},
   setAttribute(k,v){this.attrs[k]=v},
   addEventListener(k,fn){this.handlers[k]=fn}});
  return els.get(id);
 };
 const ids=['guardianTrioV845','guardianGpsTextV845','guardianHealthTextV845','guardianHealthCardV845',
 'guardianHealthPopupV845','guardianHealthSleepDetailV845','guardianHealthSleepMetaV845',
 'guardianHealthNutriDetailV845','guardianHealthNutriMetaV845','guardianHealthNoteV845',
 'guardianHealthSleepRowV845','guardianHealthNutriRowV845','guardianBatteryCaptionV845',
 'guardianProfileSwitch'];
 ids.forEach(make);
 const store={'hh-profile':'z'};
 const sleepRows=night(8);
 const localDocs={zsolt:diary('2026-10-26',2300,'zsolt'),
 monika:diary('2026-10-26',1100,'monika')};
 const doc={
  hidden:false,readyState:'complete',
  getElementById:id=>make(id),
  addEventListener(k,fn){listeners['doc:'+k]=fn}
 };
 const w={document:doc,localStorage:{
  getItem:k=>store[k]||null,
  setItem:(k,v)=>store[k]=v
 },HH_GUARDIAN_LIVE_V785:{
  authenticated:true,familyAuthorized:true,boundProfile:'zsolt',
  getClient(){return {from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:null,error:null})}}}}}}}}
 },HH_DROPBOX_VAULT:{
  connected(){return true},
  async downloadJson(path){
   if(path.endsWith('health-connect.json'))
    return {profile:path.includes('monika')?'monika':'zsolt',records:{sleepSessions:sleepRows}};
   if(path.endsWith('nutrition.json'))return localDocs[path.includes('monika')?'monika':'zsolt'];
   return null;
  }
 },HH_GUARDIAN_NATIVE_V156:{connected(){return false}},
 addEventListener(k,fn){listeners[k]=fn},
 setInterval(){return 0},
 setTimeout(fn){fn();return 0}};
 store['hh-nutrition-total-energy-zsolt']=JSON.stringify(activity('2026-10-26',2200,NOW-20000));
 store['hh-nutrition-total-energy-monika']=JSON.stringify(activity('2026-10-26',2200,NOW-20000,'monika'));
 // Time is dynamic: do not assert a 2026-10-26 measurement is current on later dates.
 vm.runInNewContext(read('guardian-live-trio-v845.js'),{window:w,Date,Number,String,Math,Promise,Intl,
  URLSearchParams,Object,Array});
 const mod=w.HH_GUARDIAN_TRIO_V845;
 assert.equal(make('guardianHealthPopupV845').hidden,true);
 make('guardianHealthCardV845').handlers.click();
 assert.equal(make('guardianHealthPopupV845').hidden,false);
 assert.equal(make('guardianHealthCardV845').attrs['aria-expanded'],'true');
 make('guardianHealthPopupV845').handlers.click();
 assert.equal(make('guardianHealthPopupV845').hidden,true);
 make('guardianHealthCardV845').handlers.click();
 store['hh-profile']='m';
 make('guardianProfileSwitch').handlers.click();
 assert.equal(make('guardianHealthPopupV845').hidden,true);
 assert.equal(make('guardianHealthTextV845').textContent,'—');
 assert.equal(make('guardianBatteryCaptionV845').textContent,'Mónika Mobil');
 w.HH_GUARDIAN_LIVE_V785.authenticated=false;
 listeners['hh-guardian-auth-changed']();
 assert.equal(make('guardianHealthTextV845').textContent,'—');
});
