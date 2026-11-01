'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../../sh9/smart-travel/lena-native/handover-contract-v1101.js');
const pack=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js');

const ID='8e52a77c-1d36-4ed4-a95b-779cd5ebf751';
const route=()=>({
 schema:'sh9.trip-pack/1',title:'Teszt: Budapest → Székesfehérvár',
 travelDate:'2026-11-04',from:'Budapest, vasútállomás',to:'Székesfehérvár, vasútállomás',
 departure:'14:12',arrival:'15:15',arrivalStatus:'estimated',
 summary:'Teszt útvonal, nem valós menetrend.',
 segments:[
  {mode:'walk',line:'',from:'Budapest, otthon',to:'Budapest, vasútállomás',
   departure:'14:00',arrival:'14:12',status:'estimated',note:'Rövid gyaloglás'},
  {mode:'train',line:'99999',from:'Budapest, vasútállomás',
   to:'Székesfehérvár, vasútállomás',departure:'14:12',arrival:'15:15',
   status:'unknown',note:'Tesztjárat: csak automatikus teszteléshez'}
 ],
 alerts:[{title:'Figyelmeztetés',text:'Ez csak tesztadat.'}],alternatives:[],
 sources:[{name:'Tesztforrás',url:'https://example.org'}]
});
const envelope=()=>({
 schema:'sh9.lena-handover/1',requestId:ID,profile:'m',tripPack:route()
});
test('valid envelope reuses the original strict TripPack normalizer',()=>{
 const parsed=bridge.parseEnvelope(envelope(),pack);
 assert.equal(parsed.schema,bridge.SCHEMA);
 assert.equal(parsed.tripPack.schema,pack.SCHEMA);
 assert.equal(parsed.tripPack.segments.length,2);
 assert.equal(parsed.tripPack.travelDate,'2026-11-04');
 assert.equal(parsed.profile,'m');
 assert.ok(Object.isFrozen(parsed));
});
test('strict handover rejects invalid UUID, profile, origin, and extra fields',()=>{
 for(const patch of [
  {requestId:'abc'},{profile:'admin'},{schema:'sh9.lena-handover/2'},
  {extra:'hidden write instructions'},{tripPack:null}
 ]){
  assert.throws(()=>bridge.parseEnvelope({...envelope(),...patch},pack));
 }
 assert.throws(()=>bridge.parseEnvelope('{not json',pack));
 assert.throws(()=>bridge.parseEnvelope(envelope(),null));
 assert.throws(()=>bridge.parseEnvelope('x'.repeat(bridge.MAX_BYTES+1),pack));
});
test('transport cannot invent a timetable or accept extra statuses',()=>{
 const invalid=envelope();
 invalid.tripPack.segments=[];
 assert.throws(()=>bridge.parseEnvelope(invalid,pack));
 const wrong=envelope();
 wrong.tripPack.segments[1].from='';
 assert.throws(()=>bridge.parseEnvelope(wrong,pack));
 const parsed=bridge.parseEnvelope(envelope(),pack);
 assert.equal(parsed.tripPack.segments[1].status,'unknown');
});
test('authorization checked separately from AI-selected profile, deterministic id',()=>{
 const parsed=bridge.parseEnvelope(envelope(),pack);
 assert.throws(()=>bridge.makeRecord(parsed,[],Date.now()),/Access denied/);
 assert.throws(()=>bridge.makeRecord(parsed,['z'],Date.now()),/Access denied/);
 assert.throws(()=>bridge.makeRecord(parsed,['m'],NaN),/Trusted server timestamp/);
 const a=bridge.makeRecord(parsed,['m'],1793788800000);
 const b=bridge.makeRecord(parsed,['m','z'],1793788800000);
 assert.deepEqual(a,b);
 assert.equal(a.profile_key,'monika');
 assert.equal(a.trip_id,'tp-lena-'+ID.replace(/-/g,''));
 assert.equal(a.trip_data.savedAt,1793788800000);
 assert.equal(pack.normalize(a.trip_data).segments.length,2);
 assert.ok(bridge.isSameRequest(a,b));
});
test('same UUID with changed route cannot overwrite earlier receipt',()=>{
 const prior=bridge.makeRecord(bridge.parseEnvelope(envelope(),pack),['m'],1793788800000);
 const revised=envelope();
 revised.tripPack.summary='Different route narrative';
 const changed=bridge.makeRecord(bridge.parseEnvelope(revised,pack),['m'],1793788800000);
 assert.equal(prior.trip_id,changed.trip_id);
 assert.equal(bridge.isSameRequest(prior,changed),false);
});
test('retry of same route after user rating does not edit saved annotations',()=>{
 const earlier=bridge.makeRecord(bridge.parseEnvelope(envelope(),pack),['m'],1793788800000);
 const rated={...earlier,trip_data:{...earlier.trip_data,rating:5,ratedAt:'2026-11-04T17:20:00Z'}};
 assert.equal(bridge.isSameRequest(earlier,rated),true);
 assert.equal(bridge.fingerprint(earlier.trip_data),bridge.fingerprint(rated.trip_data));
});
test('only the actual family membership server can authorize cross-profile writes',()=>{
 const other={...envelope(),profile:'z'};
 const parsed=bridge.parseEnvelope(other,pack);
 assert.throws(()=>bridge.makeRecord(parsed,['m'],1793788800000));
 assert.equal(bridge.makeRecord(parsed,['z'],1793788800000).profile_key,'zsolt');
});
