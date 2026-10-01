/* Health Connect v1: strict local interchange; no network or DOM dependencies. */
(function(root) {
'use strict';
const fields = {
  bloodPressure: {systolic:[20,350], diastolic:[10,250]},
  heartRate: {pulse:[1,400]}, weight: {weightKg:[0.1,650]},
  bloodGlucose: {bloodGlucose:[0.1,100]}, oxygenSaturation: {oxygenSaturation:[0,100]},
  stepsDaily: {steps:[0,250000]}
};
const fail = s => {throw Error(s)};
const str = (v,max=400) => typeof v==='string' && v.length>0 && v.length<=max;
function date(v) {
 if(!str(v,50)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10)) fail('Hibás időpont a Health Connect-fájlban.');
 return new Date(v).toISOString();
}
function parse(o, profile, now=Date.now()) {
 if(!o||o.format!=='healthhub-health-connect'||o.schemaVersion!==1) fail('Nem támogatott Health Connect-fájl.');
 if(!['zsolt','monika'].includes(profile)||o.profile!==profile) fail('Eltérő profil! Válts a fájl tulajdonosának profiljára, majd válaszd ki újra a fájlt.');
 const exportedAt=date(o.exportedAt);
 if(Date.parse(exportedAt)>now+300000) fail('A fájl exportideje a jövőben van.');
 if(!Array.isArray(o.measurements)||o.measurements.length>200000) fail('Túl nagy vagy hibás adatcsomag.');
 const map=new Map();
 for(const r of o.measurements) {
  if(!r||!Object.hasOwn(fields,r.recordType)||!str(r.recordId)||!str(r.origin)) fail('Hibás rekordazonosító vagy adattípus.');
  const measuredAt=date(r.measuredAt), modified=date(r.lastModifiedAt);
  if(Date.parse(measuredAt)>now+300000) fail('Jövőbeli mérés található a fájlban.');
  const key=JSON.stringify([profile,r.origin,r.recordType,r.recordId]);
  const row={id:'hc:'+encodeURIComponent(key).replace(/'/g,'%27'),profile,measuredAt,source:'Health Connect',notes:'Health Connect · '+r.origin,
    hcRecordType:r.recordType,hcRecordId:r.recordId,hcOrigin:r.origin,hcModifiedAt:modified,hcExportedAt:exportedAt};
  for(const [f,[min,max]] of Object.entries(fields[r.recordType])) {
   if(typeof r[f]!=='number'||!Number.isFinite(r[f])||r[f]<min||r[f]>max) fail('Érvénytelen mérési érték: '+f);
   row[f]=r[f];
  }
  if(r.recordType==='stepsDaily') {
   if(!Number.isInteger(row.steps)||!/^\d{4}-\d{2}-\d{2}$/.test(r.localDate)||!str(r.zoneId,100)) fail('Hibás napi lépésösszesítés.');
   try { new Intl.DateTimeFormat('en',{timeZone:r.zoneId}); } catch { fail('Hibás időzóna.'); }
   row.localDate=r.localDate;row.zoneId=r.zoneId;
  }
  const prior=map.get(key);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(row)) fail('Ellentmondó rekordok azonos forrásazonosítóval.');
  map.set(key,row);
 }
 return {profile,exportedAt,rows:[...map.values()],warnings:Array.isArray(o.warnings)?o.warnings.filter(x=>str(x,500)).slice(0,20):[]};
}
function valueKey(r) {
 return JSON.stringify([r.profile,r.measuredAt,...['systolic','diastolic','pulse','weightKg','bloodGlucose','oxygenSaturation','steps'].map(k=>r[k]??null)]);
}
function contentKey(r) { return JSON.stringify([valueKey(r),r.localDate??null,r.zoneId??null]); }
function plan(rows,existing) {
 const byId=new Map(existing.map(r=>[r.id,r]));
 const byValue=new Map(existing.map(r=>[valueKey(r),r]));
 const result={add:[],update:[],duplicate:0,stale:0};
 for(const row of rows) {
  const old=byId.get(row.id);
  if(old) {
   if(contentKey(old)===contentKey(row)) result.duplicate++;
   else if((old.hcExportedAt||'')>row.hcExportedAt||(old.hcModifiedAt||'')>row.hcModifiedAt) result.stale++;
   else result.update.push(row);
  } else if(byValue.has(valueKey(row))) result.duplicate++;
  else { result.add.push(row);byValue.set(valueKey(row),row); }
 }
 return result;
}
const api={parse,plan,valueKey};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HHConnectCore=api;
})(typeof window!=='undefined'?window:globalThis);
