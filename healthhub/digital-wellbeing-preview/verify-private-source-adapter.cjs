'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=path.join(__dirname,'private-source-adapter.js');
const code=fs.readFileSync(source,'utf8');
assert.doesNotMatch(code,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|localStorage|indexedDB/);
const adapter=require(source);
const t=Date.UTC(2026,9,25,12);
const hour=3600000;
const row=(timestamp,pkg,ms)=>({hourStartMs:timestamp,packageName:pkg,observedForegroundMs:ms,sessionFragments:1});
const doc={
  schema:adapter.SCHEMA,
  source:adapter.SOURCE,
  profileKey:'zsolt',
  collectedAtMs:t,
  retentionDays:30,
  // Budapest DST fall back: UTC 00:00 and UTC 01:00 are BOTH 02:00 local.
  hours:[row(Date.UTC(2026,9,25,0),'com.openai.chatgpt',360000),
    row(Date.UTC(2026,9,25,1),'com.microsoft.emmx',300000),
    row(Date.UTC(2026,9,25,20),'com.openai.chatgpt',120000)]
};
const permission={profileKey:'zsolt',consentConfirmed:true,nowMs:t};
const valid=adapter.validate({...doc,hours:doc.hours.slice(0,2)},permission);
const day=adapter.summarize(valid,{days:1,nowMs:t});
assert.equal(day.localToday,'2026-10-25');
assert.equal(day.todayObservedHours[2],660000);
assert.equal(day.observedForegroundMs,660000);
assert.equal(day.chatGptForegroundMs,360000);
assert.equal(day.eveningForegroundMs,0);
assert.equal(day.observedUtcHourBins,2);
assert.equal(day.todayObservedHours[6],null,'unobserved hour is unknown, not zero');
assert.equal(day.topApps.length,2);
assert.equal(day.missingIsUnknown,true);

assert.throws(()=>adapter.validate(doc,permission),/Invalid app-hour observation/,
  'future hour must be rejected');
assert.throws(()=>adapter.validate({...doc,hours:doc.hours.slice(0,2)},
  {profileKey:'monika',consentConfirmed:true,nowMs:t}),/mismatch/);
assert.throws(()=>adapter.validate({...doc,hours:doc.hours.slice(0,2)},
  {profileKey:'zsolt',consentConfirmed:false,nowMs:t}),/consent/);
const duplicate={...doc,hours:[doc.hours[0],doc.hours[0]]};
assert.throws(()=>adapter.validate(duplicate,permission),/Duplicated/);
const impossible={...doc,hours:[row(Date.UTC(2026,9,25,0),'com.openai.chatgpt',2200000),
  row(Date.UTC(2026,9,25,0),'com.microsoft.emmx',2000000)]};
assert.throws(()=>adapter.validate(impossible,permission),/exceeds hour/);
assert.throws(()=>adapter.validate({...doc,source:'samsung.digital-wellbeing-proprietary',
  hours:doc.hours.slice(0,2)},permission),/source/);
assert.throws(()=>adapter.validate({...doc,hours:doc.hours.slice(0,2),
  profileKey:'monika'},permission),/mismatch/);
assert.throws(()=>adapter.summarize(valid,{days:8,nowMs:t}),/Unsupported/);
const week=adapter.summarize(valid,{days:7,nowMs:t});
const month=adapter.summarize(valid,{days:30,nowMs:t});
assert.equal(week.observedForegroundMs,month.observedForegroundMs);
console.log('PASS Digital Wellbeing staged private source adapter: source, opt-in, profile isolation, DST, gaps, dedup, windows.');
