import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,active,find,toTripPack,stopIds,wallEpoch}
 from '../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs';
import {normalize} from '../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs';

const NOW=Date.parse('2026-11-02T08:00:00Z');
const DATA=()=>({
 schema:'sh9.bkk.gtfs/1',
 source:'BKK Zrt., CC BY 4.0',sourceUrl:'https://bkk.hu/gtfs/budapest_gtfs.zip',
 license:'CC-BY-4.0',coverage:'stop-to-stop',live:false,
 generatedAt:'2026-11-01T06:00:00Z',
 feedStart:'2026-11-01',feedEnd:'2026-11-30',
 routes:['17','19','41','260'],
 stops:{'001':['Szentlélek tér',47.537,19.046],
  '002':['Bécsi út / Vörösvári út',47.548,19.029],
  '003':['Kolosy tér',47.527,19.036],
  '004':['Széll Kálmán tér',47.507,19.026]},
 services:{
  workdays:{start:'2026-11-01',end:'2026-11-30',
   days:[1,1,1,1,1,0,0],exceptions:{'2026-11-02':true,'2026-11-03':false}},
  sundays:{start:'2026-11-01',end:'2026-11-30',
   days:[0,0,0,0,0,0,1],exceptions:{}}
 },
 trips:[
  ['17','workdays','Bécsi út / Vörösvári út',[
   ['001',10*3600,10*3600],['003',10*3600+600,10*3600+630],['002',10*3600+1200,10*3600+1200]]],
  ['260','sundays','Szentlélek tér',[
   ['004',9*3600,9*3600],['002',9*3600+600,9*3600+600],['001',9*3600+1200,9*3600+1200]]]
 ]
});
const q=()=>({date:'2026-11-02',from:'Szentlélek tér',to:'Bécsi út / Vörösvári út',
 mode:'depart',when:'2026-11-02T08:30:00Z'});
test('BKK snapshot must be recent, fully sourced, licensed and nonlive',()=>{
 assert.equal(validate(DATA(),NOW),true);
 for(const mutation of [
  x=>x.source='unknown',x=>x.license='copyright unknown',x=>x.live=true,
  x=>x.coverage='door-to-door',x=>x.sourceUrl='https://other.invalid',
  x=>x.generatedAt='2026-01-01T00:00:00Z',
  x=>x.stops['003'][1]=200
 ]){
  const data=DATA();mutation(data);assert.equal(validate(data,NOW),false);
 }
});
test('calendar exceptions override weekdays; no invented holiday service',()=>{
 const data=DATA();
 assert.equal(active(data.services.workdays,'2026-11-02'),true);
 assert.equal(active(data.services.workdays,'2026-11-03'),false);
 assert.equal(active(data.services.sundays,'2026-11-01'),true);
 assert.equal(active(data.services.sundays,'2026-11-02'),false);
});
test('exact stop-to-stop scheduled route is valid SH9 TripPack',()=>{
 const data=DATA(),matches=find(data,q(),NOW);
 assert.equal(matches.length,1);
 assert.equal(matches[0].line,'17');
 assert.equal(matches[0].from,'Szentlélek tér');
 assert.equal(matches[0].to,'Bécsi út / Vörösvári út');
 const trip=normalize(toTripPack(q(),matches[0]));
 assert.equal(trip.segments.length,1);
 assert.equal(trip.segments[0].mode,'tram');
 assert.equal(trip.segments[0].line,'17');
 assert.equal(trip.departure,'10:00');
 assert.equal(trip.arrival,'10:20');
 assert.match(trip.summary,/nem ajtótól ajtóig/i);
 assert.equal(trip.sources[0].name,'BKK Zrt., CC BY 4.0');
});
test('unknown house address must never masquerade as a BKK stop',()=>{
 const data=DATA();
 assert.deepEqual(stopIds(data.stops,'Bécsi út'),[]);
 const own={...q(),from:'Otthon'};
 assert.deepEqual(find(data,own,NOW),[]);
 assert.throws(()=>toTripPack(own,{...find(data,q(),NOW)[0]}),/not_exact_stop_to_stop/);
});
test('no train or ferry is fabricated, bus route remains bus',()=>{
 const data=DATA();
 const bq={date:'2026-11-01',from:'Széll Kálmán tér',to:'Szentlélek tér',
  mode:'depart',when:'2026-11-01T07:30:00Z'};
 const res=find(data,bq,NOW);
 assert.equal(res.length,1);
 const trip=normalize(toTripPack(bq,res[0]));
 assert.equal(trip.segments[0].mode,'bus');
 assert.equal(trip.segments[0].line,'260');
 assert.equal(trip.alternatives.length,0);
});
test('DST and service time conversion are bounded and Budapest-local',()=>{
 assert.ok(Number.isFinite(wallEpoch('2026-11-02',10*60)));
 assert.ok(Number.isFinite(wallEpoch('2026-11-02',25*60)));
 assert.equal(Number.isNaN(wallEpoch('2026-11-02',49*60)),true);
});
test('no route if feed date out of range or service exception is removed',()=>{
 const x=DATA();
 assert.deepEqual(find(x,{...q(),date:'2026-12-01',when:'2026-12-01T08:30:00Z'},NOW),[]);
 assert.deepEqual(find(x,{...q(),date:'2026-11-03',when:'2026-11-03T08:30:00Z'},NOW),[]);
});
