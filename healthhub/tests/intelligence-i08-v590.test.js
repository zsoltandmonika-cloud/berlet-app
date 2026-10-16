/* Synthetic, no personal health data. Run: node healthhub/tests/intelligence-i08-v590.test.js */
'use strict';
const assert=require('node:assert/strict');
const NOW=Date.parse('2026-10-16T12:00:00Z'),HOUR=3600000;
global.window={HH_DW_VAULT_V507:{summary(doc,days,now){
 const hours=doc.hours.filter(h=>h.hourStartMs<=now);
 return {days,covered:hours.length,observed:hours.reduce((s,h)=>s+h.observedForegroundMs,0),
 evening:hours.reduce((s,h)=>s+h.observedForegroundMs,0)};
}}};
const engine=require('../intelligence-i08-sleep-digital-v590.js');
const h=Date.parse('2026-10-14T18:00:00Z');
const hours=[h,h+HOUR].map((hourStartMs,i)=>({
 hourStartMs,observedForegroundMs:(i+1)*900000,chatGptForegroundMs:0,sessionFragments:1
}));
const digital={schema:'healthhub.digital-wellbeing/1',
 source:'android.usage-events.observed-app-foreground',
 profileKey:'zsolt',missingIsUnknown:true,
 collectedAtMs:Date.parse('2026-10-15T07:00:00Z'),
 hours,appDetailShared:false,appHours:[]};
const ctx={profile:'zsolt',sleep:{recent:[
 {startTime:'2026-10-14T21:30:00Z',endTime:'2026-10-15T04:00:00Z',durationMin:320},
 {startTime:'2026-10-14T23:30:00Z',endTime:'2026-10-15T04:00:00Z',durationMin:180}
]}};
const payload={schema:'healthhub.ask-lena/1',profile:'zsolt',
 consent:true,sources:[],extra:[{domain:'device',label:'Meglévő',value:'Érintetlen'}]};
const snap=JSON.stringify({ctx,digital,payload});
const x=engine.enrich(payload,ctx,digital,{now:NOW});
assert.equal(x.profile,'zsolt');
assert.equal(x.linkedNights,1,'Fragmented night must not count twice');
assert.equal(x.digitalAvailable,true);
assert.ok(x.payload.extra.some(f=>f.label.includes('Digitális Wellness')));
assert.ok(x.payload.extra.some(f=>f.value.toLowerCase().includes('nem bizonyít')));
assert.ok(x.payload.extra.some(f=>f.value.includes('320 perces RÖGZÍTETT alvásszakasz')));
assert.equal(JSON.stringify({ctx,digital,payload}),snap,'Input must remain immutable');
assert.ok(x.payload.extra.every(f=>!JSON.stringify(f).includes('packageName')));
const absent=engine.enrich(payload,ctx,null,{now:NOW});
assert.equal(absent.digitalAvailable,false);
assert.equal(absent.payload,payload);
assert.throws(()=>engine.enrich({...payload,consent:false},ctx,digital,{now:NOW}),/hozzájárulással/);
assert.throws(()=>engine.enrich(payload,{...ctx,profile:'monika'},digital,{now:NOW}),/profil/);
assert.throws(()=>engine.enrich(payload,ctx,{...digital,profileKey:'monika'},{now:NOW}),/profilütközés/);
assert.throws(()=>engine.enrich(payload,ctx,{...digital,hours:[...hours,hours[0]]},{now:NOW}),/ismétlődő/);
const empty=engine.enrich(payload,ctx,{...digital,hours:[]},{now:NOW});
assert.equal(empty.digitalAvailable,false);
assert.equal(empty.linkedNights,0);
const unrelated=engine.enrich(payload,ctx,{...digital,hours:[{
 hourStartMs:Date.parse('2026-10-14T06:00:00Z'),
 observedForegroundMs:120000,chatGptForegroundMs:0,sessionFragments:1
}]},{now:NOW});
assert.equal(unrelated.linkedNights,0,'Non-evening usage cannot be paired');
const recentUploadOldMeasurement=engine.enrich(payload,ctx,{
 ...digital,collectedAtMs:Date.parse('2026-10-16T07:00:00Z'),
 hours:hours.map(a=>({...a,hourStartMs:a.hourStartMs-48*HOUR}))
},{now:NOW});
assert.equal(recentUploadOldMeasurement.digitalFresh,false,
 'Recent upload must not make an older measurement fresh');
console.log('I-08 v590: all synthetic profile, provenance, pairing, immutability and freshness tests passed.');
