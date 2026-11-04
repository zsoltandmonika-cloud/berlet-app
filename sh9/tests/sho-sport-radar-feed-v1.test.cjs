'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const script=fs.readFileSync(path.join(root,'sh9/notification-center/sport-radar-feed-v1.js'),'utf8');
const nav=fs.readFileSync(path.join(root,'sh9/shared/sh9-golden-bottom-nav-v924.js'),'utf8');
test('global SHO golden nav loads feed after notification core and shared bridge',()=>{
 assert.match(nav,/function ensureSportScheduleFeed\(\)/);
 assert.match(nav,/sport-radar-bridge-v1\.js\?v=1/);
 assert.match(nav,/sport-radar-feed-v1\.js\?v=1/);
 assert.match(nav,/ensureSportScheduleFeed\(\)/);
 assert.match(script,/credentials:'omit'/);
 assert.match(script,/visibilityState==='hidden'/);
 assert.match(script,/PERIOD=5\*60\*1000/);
});
function setup(response){
 const published=[],calls=[];
 const window={
  SHO_NOTIFICATION_CORE_V1:{},
  SHO_RADAR_NOTIFICATION_BRIDGE_V1:{accept(items){published.push(items);return items.length}},
  fetch:async(url,opts)=>{calls.push({url,opts});return response},
  addEventListener(){},
  setInterval(){return 1}
 };
 const document={visibilityState:'visible',addEventListener(){}};
 vm.runInNewContext(script,{window,document,Object,Number,Date,Array,String});
 return {api:window.SHO_RADAR_NOTIFICATION_FEED_V1,published,calls,document,window};
}
test('only current official public event feed reaches the shared SHO importer',async()=>{
 const response={ok:true,async json(){return{
  version:1,generatedAt:new Date().toISOString(),
  events:[{id:'auto-123',category:'Időpont',title:'Új időpont'}]}}};
 const {api,published,calls}=setup(response);
 assert.equal(await api.check(),1);
 assert.equal(published.length,1);
 assert.equal(published[0][0].id,'auto-123');
 assert.match(calls[0].url,/^https:\/\/mecsradar\.pages\.dev\/data\/sho-schedule-notices\.json\?t=/);
 assert.equal(calls[0].opts.credentials,'omit');
 assert.equal(calls[0].opts.mode,'cors');
});
test('stale public feeds are rejected and hidden tabs cannot fetch',async()=>{
 const response={ok:true,async json(){return{
  version:1,generatedAt:'2020-01-01T00:00:00Z',events:[{id:'auto-old'}]}}};
 const {api,published,document,calls}=setup(response);
 assert.equal(await api.check(),0);
 assert.equal(published.length,0);
 document.visibilityState='hidden';
 assert.equal(await api.check(),0);
 assert.equal(calls.length,1);
});
