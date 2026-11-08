'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../guardian');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const schedule=require('../guardian/guardian-bkk-timetable-v859.js');
const routes=['218','923','934'];
test('v1170 verified BKK planned timetable extends to screenshot lines without fictional schedules',()=>{
 const py=read('build-bkk-timetable-v859.py');
 const js=read('guardian-bkk-timetable-v859.js');
 for(const id of routes){
  assert.match(py,new RegExp('"'+id+'"'));
  assert.match(js,new RegExp("'"+id+"'"));
 }
 assert.match(py,/Only timetable|Targeted planned stop times/);
 assert.match(js,/feedType!=='BKK GTFS schedule - planned departures, NOT realtime'/);
 assert.match(js,/row\[0\]/);
});
test('v1170 accepts real-provider-shaped extra route rows only with valid timestamp and stop order',()=>{
 const now=Date.parse('2026-11-08T19:00:00Z'),minute=Math.floor(now/60000);
 const trips=[];
 for(let i=0;i<55;i++)trips.push([routes[i%3],'official-'+i,[
  ['STOP_A',minute+20+i,minute+20+i],['STOP_B',minute+37+i,minute+37+i]
 ]]);
 const doc={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
  feedType:'BKK GTFS schedule - planned departures, NOT realtime',
  generatedAt:new Date(now-5*60000).toISOString(),
  days:['2026-11-08'],trips};
 const checked=schedule.validate(doc,now);
 assert.ok(checked);
 assert.equal(checked.trips.length,55);
 assert.ok(routes.every(line=>checked.trips.some(t=>t.line===line)));
 assert.equal(schedule.validate({...doc,generatedAt:new Date(now-40*3600000).toISOString()},now),null);
 const orig=checked.trips[0],bad=['218','fake',[['STOP_A',minute+32,minute+34],['STOP_B',minute+31,minute+35]]];
 const invalid=schedule.validate({...doc,trips:[bad,...doc.trips.slice(1)]},now);
 assert.ok(invalid);assert.equal(invalid.trips.length,54);
 assert.equal(invalid.trips.some(x=>x.tripId==='fake'),false);
});
