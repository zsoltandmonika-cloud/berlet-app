'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const follow=require('../guardian/guardian-profile-follow-v837.js');
const read=file=>fs.readFileSync(path.join(__dirname,'../guardian',file),'utf8');
const rec=(profile,source,age=1000,latitude=47.52693,longitude=19.03802)=>({
  profile_key:profile,source,latitude,longitude,accuracy_m:8,
  updated_at:new Date(Date.now()-age).toISOString(),speed_kmh:0
});
test('v1173: Monika browser/Supabase home fix is never a trusted remote pin',()=>{
 const home=rec('monika','Family Live',1000,47.49,19.0);
 const choice=follow.resolveSources(home,null,'monika');
 assert.equal(choice.fix,null);
 assert.equal(choice.conflict,false);
});
test('v1173: Monika valid native office GPS wins even over newer wrong browser fix',()=>{
 const home=rec('monika','Family Live',100,47.49,19.0);
 const office=rec('monika','HH One Native GPS',3000);
 const choice=follow.resolveSources(home,office,'monika');
 assert.equal(choice.fix?.source,'HH One Native GPS');
 assert.equal(choice.fix?.lat,47.52693);
 assert.equal(choice.fix?.lng,19.03802);
});
test('v1173: Monika expired or revoked native fix never falls back to unverified home',()=>{
 const home=rec('monika','Family Live',200);
 const expired=rec('monika','HH One Native GPS',90000);
 assert.equal(follow.resolveSources(home,expired,'monika').fix,null);
 assert.equal(follow.resolveSources(home,null,'monika').fix,null);
});
test('v1173: Zsolt existing verified Outlook/Family Live path stays unchanged',()=>{
 const z=rec('zsolt','Family Live',1000,47.51,19.04);
 assert.equal(follow.resolveSources(z,null,'zsolt').fix?.source,'Family Live');
 const native=rec('zsolt','HH One Native GPS',500,47.51,19.04);
 assert.equal(follow.resolveSources(z,native,'zsolt').fix?.source,'HH One Native GPS');
});
test('v1173: both Family Guard viewers fail closed for unverified Monika browser GPS',()=>{
 const live=read('guardian-live-v785.js');
 const f=read('guardian-profile-follow-v837.js');
 const html=read('index.html');
 assert.match(live,/const \{data,error\}=k==='monika'\?\{data:null,error:null\}:await readSharedLocation\(k\)/);
 assert.match(live,/let selected=k==='monika'\?\(nativeFix&&peerSnapshot\(nativeFix\)\?\.live\?nativeFix:null\):data/);
 assert.match(f,/showUnavailable\(k,k==='monika'\?null:db,native\)/);
 assert.match(html,/guardian-live-v785\.js\?v=[^"\n]*owner=v1173/);
 assert.match(html,/guardian-profile-follow-v837\.js\?v=[^"\n]*owner=v1173/);
 assert.doesNotMatch(f,/navigator\.geolocation|watchPosition|\.upsert\(|files\/upload/);
});
