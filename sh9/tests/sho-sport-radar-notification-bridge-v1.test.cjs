'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
function setup(){
 const saved=new Map(),items=[];
 const win={localStorage:{
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
 },SHO_NOTIFICATION_CORE_V1:{
  publish(payload){items.push(payload);return {id:'published-'+items.length}},
  preference:()=>({enabled:true})
 }};
 vm.runInNewContext(read('sh9/notification-center/sport-radar-bridge-v1.js'),{
  window:win,Date,JSON,Number,Array,Object,String,Set,URLSearchParams
 });
 return {api:win.SHO_RADAR_NOTIFICATION_BRIDGE_V1,items,saved};
}
const valid=(id='auto-123')=>({
 id,category:'Időpont',title:'Új időpont: Vasas – UTE',
 body:'Korábban 17:00, most 18:00',
 createdAt:new Date().toISOString(),
 target:{nav:'program',matchId:'vasas-obuda-2026-11-11-ute'}
});
test('SHO Sport parent validates iframe origin and source before import',()=>{
 const html=read('sh9/sport/index.html');
 assert.match(html,/event\.origin!==origin\|\|event\.source!==frame\.contentWindow/);
 assert.match(html,/data\.action==='notifications'/);
 assert.match(html,/SHO_RADAR_NOTIFICATION_BRIDGE_V1\?\.accept\(data\.messages\)/);
 assert.match(html,/notification-core-v1\.js\?v=5-sport-schedule/);
 assert.match(html,/sport-radar-bridge-v1\.js\?v=1/);
 assert.match(html,/sportView/);
 const core=read('sh9/notification-center/notification-core-v1.js');
 assert.match(core,/key:'schedule_change'/);
 assert.match(core,/id:'sportcentral'/);
 const inbox=read('sh9/notification-center/notification-center-v1.js');
 assert.match(inbox,/api\.resolveTarget\(entry\)/);
});
test('radar time-change notice is published to both family profiles and deduplicated',()=>{
 const {api,items}=setup();
 assert.equal(api.accept([valid()]),2);
 assert.deepEqual(items.map(x=>x.profile),['z','m']);
 for(const entry of items){
  assert.equal(entry.type,'sportcentral.schedule_change');
  assert.equal(entry.dedupeKey,'radar:auto-123');
  assert.match(entry.targetUrl,/^\/berlet-app\/sh9\/sport\/\?sportView=program&matchId=/);
 }
 assert.equal(api.accept([valid()]),0,'reload must not replay the same message');
 assert.equal(items.length,2);
});
test('cup date messages are linked to the actual Sport Central cup view',()=>{
 const {api,items}=setup();
 const m={...valid('auto-cup1'),category:'Kupa időpont',target:{nav:'cup',matchId:'cup-match-42'}};
 assert.equal(api.accept([m]),2);
 assert.match(items[0].targetUrl,/sportView=cup/);
 assert.match(items[0].targetUrl,/matchId=cup-match-42/);
});
test('stale, spoofed, oversized and unrelated notifications are discarded',()=>{
 const {api,items}=setup();
 assert.equal(api.accept([
  {...valid('auto-old'),createdAt:'2020-01-01T00:00:00Z'},
  {...valid('auto-future'),createdAt:'2099-01-01T00:00:00Z'},
  {...valid('auto-other'),category:'Végeredmény'},
  {...valid('bad<script>')},
  {...valid('auto-big'),body:'x'.repeat(321)},
  {...valid('auto-missing'),title:''}
 ]),0);
 assert.equal(items.length,0);
});
test('malicious match IDs never become navigation parameters',()=>{
 const {api,items}=setup();
 assert.equal(api.accept([{...valid('auto-safe'),target:{nav:'program',matchId:'../../admin?token=123'}}]),2);
 assert.equal(items[0].targetUrl,'/berlet-app/sh9/sport/?sportView=program');
});
