/* SH9 Léna v1105 · Real BKK GTFS artifact smoke test.
 * Run only with freshly downloaded official BKK dataset. No network, no DB
 * writes, no paid APIs. Never asserts real-time departures.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validate,active,find,toTripPack,wallEpoch}
 from '../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs';
import {normalize}
 from '../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs';
const filename=process.argv[2];
if(!filename)throw Error('Expected official BKK snapshot path');
const bytes=fs.readFileSync(filename);
if(bytes.byteLength>9*1024*1024)throw Error('Snapshot exceeds 9 MiB');
const data=JSON.parse(bytes.toString('utf8'));
const now=Date.now();
assert.equal(validate(data,now),true,'The REAL GTFS snapshot fails the JS validation contract');
for(const line of ['17','19','41','260'])
 assert.ok(data.routes.includes(line),'Missing family line '+line);
let success=null,attempted=0;
const start=new Date();
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'});
const dateParts=Object.fromEntries(fmt.formatToParts(start).map(x=>[x.type,x.value]));
const today=[dateParts.year,dateParts.month,dateParts.day].join('-');
for(let offset=0;offset<8&&!success;offset++){
 const date=new Date(today+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()+offset);
 const ymd=date.toISOString().slice(0,10);
 if(ymd<data.feedStart||ymd>data.feedEnd)continue;
 for(const trip of data.trips){
  if(!active(data.services[trip[1]],ymd))continue;
  const events=trip[3];
  const first=events[0],last=events[events.length-1];
  if(first[2]>=24*3600||last[1]>=24*3600||last[1]<=first[2])continue;
  const from=data.stops[first[0]]?.[0],to=data.stops[last[0]]?.[0];
  if(!from||!to||from===to)continue;
  const dep=wallEpoch(ymd,first[2]/60);
  if(!Number.isFinite(dep)||dep<now-60000)continue;
  const query={date:ymd,from,to,mode:'depart',when:new Date(dep-60000).toISOString()};
  attempted++;
  const results=find(data,query,now);
  const matched=results.find(j=>j.line===trip[0]&&j.mode===trip[4]&&
   Math.abs(Date.parse(j.departure)-dep)<61000);
  if(!matched)continue;
  const pack=normalize(toTripPack(query,matched));
  assert.equal(pack.schema,'sh9.trip-pack/1');
  assert.equal(pack.segments.length,1);
  assert.equal(pack.segments[0].mode,matched.mode);
  assert.equal(pack.segments[0].status,'timetable');
  assert.equal(pack.sources[0].name,'BKK Zrt., CC BY 4.0');
  assert.match(pack.summary,/nem ajtótól ajtóig/i);
  success={serviceDate:ymd,line:matched.line,mode:matched.mode,from,to,
   depart:pack.departure,arrive:pack.arrival};
  break;
 }
}
assert.ok(success,'No real BKK GTFS trip could be converted to an SH9 TripPack');
process.stdout.write(JSON.stringify({status:'passed',scope:'real_bkk_gtfs',
 routes:data.routes,trips:data.trips.length,stops:Object.keys(data.stops).length,
 feedStart:data.feedStart,feedEnd:data.feedEnd,attempted,smoke:success},null,2)+'\n');
