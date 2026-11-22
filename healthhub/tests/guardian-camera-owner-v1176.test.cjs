'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../guardian');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const own=read('guardian.js'),follow=read('guardian-profile-follow-v837.js');
function part(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Expected '+a+' to '+b);return src.slice(i,j)}
function feedLocal({agent,owner,profile='Mónika'}){
 const sent=[],moves=[],removed=[],current=new Date().getTime();
 const m={remove(){removed.push(true)},setLngLat(v){moves.push(v)},getElement(){return {}}};
 const ctx={w:{navigator:{userAgent:agent},HH_GUARDIAN_LIVE_V785:{boundProfile:owner,onGpsFix(pos){sent.push(pos)}}},name:()=>profile,active:true,marker:m,hasFix:true,lastBrowserFixAt:current,map:{easeTo(opts){moves.push(opts)}},renderButtons(){},report(){},$:()=>({textContent:''})};
 vm.runInNewContext(part(own,'function remoteOnlyMonikaView(){','function tryNetworkFix(){'),ctx);
 const pos={timestamp:current,coords:{latitude:47.49,longitude:19.01,accuracy:8}};
 ctx.pos=pos;vm.runInNewContext('onPosition(pos)',ctx);
 return{ctx,sent,moves,removed};
}
test('v1176: an active desktop GPS watcher cannot steal Monika remote camera when desktop claims Monika',()=>{
 const t=feedLocal({agent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome',owner:'monika'});
 assert.equal(t.moves.length,0);
 assert.equal(t.removed.length,1);
 assert.equal(t.ctx.hasFix,false);
 assert.equal(t.ctx.lastBrowserFixAt,0);
 assert.equal(t.sent.length,0);
});
test('v1176: unknown physical owner cannot publish or paint home as Monika',()=>{
 const t=feedLocal({agent:'Mozilla/5.0 (Windows NT 10.0) Edge',owner:null});
 assert.equal(t.moves.length,0);
 assert.equal(t.sent.length,0);
 assert.equal(t.removed.length,1);
});
test('v1176: Zsolt Android local watch keeps publishing his own fix while viewing Monika, never recenters',()=>{
 const t=feedLocal({agent:'Mozilla/5.0 (Linux; Android 16; SM-S928B)',owner:'zsolt'});
 assert.equal(t.sent.length,1);
 assert.equal(t.moves.length,0);
});
test('v1176: pressing Follow on desktop with Monika selected never starts local browser geolocation',()=>{
 const events=[],ctx={w:{HH_GUARDIAN_PROFILE_FOLLOW_V837:{preventWrongDeviceGps(){return false},requestFollow(){events.push('native-follow');return true}},navigator:{userAgent:'Windows Edge'},HH_GUARDIAN_LIVE_V785:{boundProfile:null}},name:()=> 'Mónika',follow:false,active:false,marker:null,map:{easeTo(){events.push('home-camera')}},renderButtons(){},notifySettings(){},report(){},start(){events.push('LOCAL_GPS_START')}};
 vm.runInNewContext(part(own,'function remoteOnlyMonikaView(){','function onPosition(pos){'),ctx);
 vm.runInNewContext(part(own,'function enableFollow(){','function tapSound(){'),ctx);
 vm.runInNewContext('enableFollow()',ctx);
 assert.deepEqual(events,['native-follow']);
 assert.equal(ctx.follow,true);
});
test('v1176: remote Monika native office fix overrides even fresh local home GPS timestamp',async()=>{
 const hits=[],store={getItem(){return 'm'}},date=Date.now();
 const widgets={};
 const node=()=>({textContent:'',hidden:false,className:'',dataset:{},append(){},appendChild(){},addEventListener(){},setAttribute(){},removeAttribute(){}});
 const d={hidden:false,readyState:'loading',addEventListener(){},getElementById(k){return widgets[k]||(widgets[k]=node())},createElement:node};
 const w={navigator:{userAgent:'Mozilla/5.0 (Windows NT 10.0)'},document:d,localStorage:store,
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(c){hits.push(c.center)}},lastGpsFixAt:date-100,getLocationSettings(){return{follow_map:true}},setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'zsolt',getClient(){return{}}},
  HH_GUARDIAN_GPS_ROUTER_V1177:{connected(){return true},forProfile(){return {name:'Mónika GPS',activeReadAccount:'gmail'}},async read(){return{status:'ok',data:{profile_key:'monika',latitude:47.52693,longitude:19.03802,accuracy_m:40,updated_at:new Date().toISOString(),source:'HH One Native GPS'}}}},
  maplibregl:{Marker:class{setLngLat(){return this}addTo(){return this}remove(){}}},
  setInterval(){},setTimeout(fn){fn()},addEventListener(){}
 };
 vm.runInNewContext(follow,{window:w,Date,Math,Number,Promise,Object});
 const ctrl=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 for(let i=0;i<40;i++)await Promise.resolve();
 assert.equal(ctrl.ready,true);
 assert.equal(ctrl.preventWrongDeviceGps(),true);
 assert.ok(hits.length>0);
 assert.deepEqual(Array.from(hits.at(-1)),[19.03802,47.52693]);
});
test('v1176: scripts are cache-busted without changing phone app or Dropbox credentials',()=>{
 const html=read('index.html');
 assert.match(html,/guardian\.js\?v=[^"\n]*camera=1176/);
 assert.match(html,/guardian-profile-follow-v837\.js\?v=[^"\n]*camera=v1176/);
 assert.match(own,/if\(remoteOnlyMonikaView\(\)\)/);
 assert.match(follow,/const localFixAt=\(\)=>0/);
 assert.doesNotMatch(follow,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(/);
});
