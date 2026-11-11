import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEFAULT,HOME,REVERSE,compute,options,walkOnlyOptions,nextIndex,validConfig,full260Timetable,pair260Connections,bus260DirectionForTemplate} from "./core.mjs";
import {chooseLocation,namedPlaces,meters} from "../guardian-smart-location-v1.mjs";
const sec=(h,m,s=0)=>h*3600+m*60+s;
const ev=(id,h,m)=>[id,sec(h,m),sec(h,m)];
const data=()=>{
 const d={
  schema:"sh9.bkk.gtfs/1",source:"BKK Zrt., CC BY 4.0",
  sourceUrl:"https://bkk.hu/gtfs/budapest_gtfs.zip",license:"CC-BY-4.0",
  coverage:"stop-to-stop",live:false,
  feedStart:"2026-11-08",feedEnd:"2027-01-01",
  generatedAt:new Date().toISOString(),routes:["17","19","41","260"],
  stops:{
   k:["Kolosy tér",47.52693,19.03802],
   t:["Bécsi út / Vörösvári út",47.54100,19.03500],
   b:["Bécsi út / Vörösvári út",47.54145,19.03540],
   o:["Orbán Balázs út",47.55000,19.03000],
   ci:["Citronella utca",47.56110,19.02500],
   ko:["Kocsis Sándor út",47.56210,19.02500],
   d:["Óbudai rendelőintézet",47.53500,19.03000]
  },
  services:{s:{start:"2026-01-01",end:"2027-12-31",days:[1,1,1,1,1,1,1],exceptions:{}}},
  trips:[
   ["17","s","Bécsi út / Vörösvári út",[ev("k",16,5),ev("t",16,15)],"tram"],
   ["260","s","Harsánylejtő",[ev("b",16,20),ev("o",16,22),ev("ci",16,33)],"bus"],
   ["260","s","Óbudai rendelőintézet",[ev("ci",16,30),ev("ko",16,32),ev("d",16,45)],"bus"],
   ["260","s","Harsánylejtő",[ev("ci",16,29),ev("o",16,30)],"bus"]
  ]
 };
 return d;
};
const date="2026-11-10";
const hour=ms=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(ms);
test("target-first 260 matcher finds safe transfer with 10-minute office walk",()=>{
 const d=data();
 assert.equal(validConfig(DEFAULT,d.routes),true);
 const result=options(d,date,DEFAULT);
 assert.equal(result.matchingCount,1);
 assert.equal(result.rows.length,1);
 const match=result.rows[0];
 assert.equal(match.headsign,"Harsánylejtő");
 assert.equal(hour(match.best.feederDepartMs),"16:05");
 assert.equal(hour(match.best.leaveOfficeMs),"15:54");
 assert.equal(hour(match.departMs),"16:20");
 assert.ok(match.best.waitMin>=1&&match.best.waitMin<=3);
});
test("home walk-only reaches Citronella 260 with six-minute walk and two-minute buffer",()=>{
 const d=data();
 const r=walkOnlyOptions(d,date,HOME);
 assert.equal(r.rows.length,1);
 assert.equal(r.matchingCount,1);
 assert.equal(hour(r.rows[0].departMs),"16:30");
 assert.equal(hour(r.rows[0].best.leaveOfficeMs),"16:22");
 assert.equal(r.rows[0].best.transferWalkMin,6);
 assert.equal(r.rows[0].best.waitMin,2);
 assert.equal(compute(d,date,HOME).matchingCount,1);
});
test("wrong direction and impossible transfers do not create fabricated matches",()=>{
 const d=data();
 const wrong={...DEFAULT,targetHeadsign:"Nem létező végállomás"};
 assert.equal(options(d,date,wrong).matchingCount,0);
 const tough={...DEFAULT,maxWaitMin:1};
 assert.equal(options(d,date,tough).matchingCount,0);
 const late={...HOME,targetHeadsign:"Nem létező"};
 assert.equal(walkOnlyOptions(d,date,late).matchingCount,0);
});
test("invalid source, date or absent stops fails closed",()=>{
 const d=data();d.source="Unknown";
 assert.throws(()=>options(d,date,DEFAULT));
 const original=data();
 assert.throws(()=>options(original,"2027-02-03",DEFAULT));
 assert.throws(()=>options(original,date,{...DEFAULT,originStop:"Random stop"}));
});
test("next item is calculated from office departure, not target bus departure",()=>{
 const result=options(data(),date,DEFAULT);
 const t=result.rows[0].best.leaveOfficeMs;
 assert.equal(nextIndex(result.rows,t-1000),0);
 assert.equal(nextIndex(result.rows,t+1000),-1);
});
test("pinned timeline and Smart Trip entrypoint exist without Family Guard modifications",()=>{
 const app=readFileSync(new URL("./app.mjs",import.meta.url),"utf8");
 const page=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 assert.match(app,/setInterval\(\(\)=>updateTimeline\(Date\.now\(\)\),1000\)/);
 assert.match(app,/requestFullscreen/);
 assert.match(app,/localStorage\.setItem/);
 assert.match(page,/Smart Match Timeline/);
 assert.match(page,/Lapon belüli jelzés/);
});


test("reversible commute requires real inbound 260 followed by outbound 17 to Kolosy",()=>{
 const d=data();
 d.trips.push(
  ["260","s","Óbudai rendelőintézet",[ev("ci",8,8),ev("b",8,28),ev("d",8,48)],"bus"],
  ["17","s","Savoya Park",[ev("t",8,33),ev("k",8,41)],"tram"],
  ["17","s","Vörösvári út",[ev("t",8,32),ev("o",8,38)],"tram"]
 );
 assert.ok(validConfig(REVERSE,d.routes));
 const r=options(d,date,REVERSE);
 assert.equal(r.totalCount,1,"Opposite-direction 17 must be excluded");
 assert.equal(r.matchingCount,1);
 assert.equal(r.rows[0].line,"17");
 assert.equal(r.rows[0].best.feederLine,"260");
 assert.equal(r.rows[0].best.feederMode,"bus");
 assert.equal(hour(r.rows[0].best.feederDepartMs),"08:08");
 assert.equal(hour(r.rows[0].best.leaveOfficeMs),"07:56");
 assert.equal(hour(r.rows[0].arriveAtDestinationMs),"08:41");
 assert.equal(REVERSE.destinationWalkMin,10,"Kolosy → iroda 10 perc gyalog");
 assert.equal(hour(r.rows[0].departMs),"08:33");
 assert.equal(r.rows[0].best.waitMin,3);
 assert.equal(DEFAULT.reverseId,REVERSE.id);
 assert.equal(REVERSE.reverseId,DEFAULT.id);
});
test("reverse planner rejects a 17 that does not continue to Kolosy",()=>{
 const d=data();d.trips.push(
  ["260","s","Óbudai rendelőintézet",[ev("ci",8,8),ev("b",8,28),ev("d",8,48)],"bus"],
  ["17","s","Vörösvári út",[ev("t",8,33),ev("o",8,40)],"tram"]
 );
 assert.equal(options(d,date,REVERSE).totalCount,0);
});

test("260 full timetable is bus-first and preserves unmatched departures",()=>{
 const d=data();
 // Three 260 buses, only one has a safe 17 tram connection.
 d.trips.push(["260","s","Harsánylejtő",[ev("b",10,20),ev("o",10,32),ev("ci",10,45)],"bus"]);
 const route={...DEFAULT,startHour:0,endHour:24};
 const connections=compute(d,date,route);
 const bus=full260Timetable(d,date,"home");
 const paired=pair260Connections(bus,connections,route);
 assert.equal(bus.stop,"Bécsi út / Vörösvári út");
 assert.deepEqual(bus.rows.map(x=>hour(x.departMs)),["10:20","16:20"]);
 assert.equal(paired.rows.length,2);
 assert.equal(paired.rows.filter(x=>x.connectionOk).length,1);
 assert.equal(paired.rows[0].match,null,"Unmatched scheduled bus must remain visible");
 assert.equal(hour(paired.rows[1].leaveMs),"15:54","Do not mislabel 15:54 as the bus departure");
 assert.equal(hour(paired.rows[1].departMs),"16:20");
 assert.equal(hour(paired.rows[1].arriveAtDestinationMs),"16:33",
  "Official 260 arrival at Citronella available for +10min home walk");
 assert.equal(bus260DirectionForTemplate(DEFAULT),"home");
 assert.equal(bus260DirectionForTemplate(REVERSE),"work");
});
test("260 inbound timetable uses Citronella departure, not Orbán Balázs arrival",()=>{
 const d=data();
 d.trips.push(["260","s","Óbudai rendelőintézet",[
  ev("ci",8,7),ev("o",8,17),ev("b",8,20),ev("d",8,27)
 ],"bus"]);
 const bus=full260Timetable(d,date,"work");
 const matched=pair260Connections(bus,compute(d,date,{...HOME,startHour:0,endHour:24}),
  {...HOME,startHour:0,endHour:24});
 assert.deepEqual(bus.rows.map(x=>hour(x.departMs)),["08:07"]);
 assert.equal(hour(matched.rows[0].departMs),"08:07");
 assert.equal(hour(matched.rows[0].leaveMs),"07:55");
 assert.equal(HOME.originWalkMin,10,"Otthon → Citronella 10 perc gyalog");
 assert.equal(matched.rows[0].connectionOk,true);
});
test("full 260 preserves both directions while excluding opposite terminus",()=>{
 const d=data();
 const towardHome=full260Timetable(d,date,"home");
 const towardWork=full260Timetable(d,date,"work");
 assert.equal(towardHome.rows.length,1);
 assert.equal(towardWork.rows.length,0,
  "Synthetic inbound route missing Bécsi via direction: do not fabricate buses");
 assert.equal(towardHome.rows[0].headsign,"Harsánylejtő");
 assert.throws(()=>full260Timetable(d,date,"wrong"));
});

test("the two Bécsi GTFS platforms do not hide a genuine tram-to-260 match",()=>{
 const d=data();
 d.trips=d.trips.filter(x=>x[0]!=="260"||x[2]!=="Harsánylejtő");
 d.trips.push(["260","s","Harsánylejtő",[
  ev("b",16,20),ev("t",16,22),ev("o",16,25),ev("ci",16,36)
 ],"bus"]);
 const timetable=full260Timetable(d,date,"home");
 const connections=compute(d,date,{...DEFAULT,startHour:0,endHour:24});
 const paired=pair260Connections(timetable,connections,DEFAULT);
 assert.equal(timetable.rows.length,1,"Two platforms are ONE actual bus");
 assert.equal(timetable.rows[0].platforms.length,2);
 assert.equal(hour(timetable.rows[0].departMs),"16:22",
  "Unmatched default is final GTFS boarding platform");
 assert.equal(paired.rows[0].connectionOk,true);
 assert.equal(hour(paired.rows[0].departMs),"16:20",
  "Matched row displays EXACT accessible platform time, not 16:22");
 assert.equal(paired.rows[0].stopId,"b");
});


test("Smart Location reads only fresh, authorized native Monika fix near saved home and work",()=>{
 const now=Date.parse("2026-11-11T08:00:00Z");
 // Synthetic fixture coordinates, not either household member's live position.
 const slots=[
  {label:"Otthon",place:{name:"Teszt Otthon",lat:47.55,lng:19.01}},
  {label:"Mónika munkahely",place:{name:"Teszt Munkahely",lat:47.51,lng:19.02}}
 ];
 const home={profile:"monika",source:"HH One Native GPS",lat:47.5501,lng:19.0101,accuracy:12,ts:now-1000};
 const office={...home,lat:47.5101,lng:19.0201};
 assert.ok(meters(slots[0].place,slots[1].place)>600);
 assert.equal(chooseLocation(home,slots,now).routeId,"monika-home-to-office");
 assert.equal(chooseLocation(office,slots,now).routeId,"monika-260");
 assert.equal(chooseLocation({...home,profile:"zsolt"},slots,now),null);
 assert.equal(chooseLocation({...home,source:"Family Live"},slots,now),null);
 assert.equal(chooseLocation({...home,accuracy:90},slots,now),null);
 assert.equal(chooseLocation({...home,ts:now-76000},slots,now),null);
 assert.equal(chooseLocation({...home,lat:47.53,lng:19.015},slots,now),null);
 assert.equal(chooseLocation(home,[...slots,slots[0]],now),null,
  "Ambiguous home labels must never silently select a GPS route");
 assert.equal(chooseLocation(home,[],now),null);
 assert.equal(namedPlaces(slots).home.lat,47.55);
});
