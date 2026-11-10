import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEFAULT,HOME,compute,options,walkOnlyOptions,nextIndex,validConfig} from "./core.mjs";
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
