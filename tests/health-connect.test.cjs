const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,plan}=require('../healthhub/connect/core.js');
const now=Date.parse('2026-10-01T10:00:00Z');
const measurement={recordType:'bloodPressure',recordId:'test-001',origin:'example.synthetic',measuredAt:'2026-10-01T08:00:00Z',lastModifiedAt:'2026-10-01T08:00:00Z',systolic:120,diastolic:80};
function batch(r=measurement,extra={}) {return {format:'healthhub-health-connect',schemaVersion:1,profile:'zsolt',exportedAt:'2026-10-01T09:00:00Z',measurements:[r],...extra}}
const read=o=>parse(o,'zsolt',now).rows;
test('initial and repeated import are idempotent',()=>{const rows=read(batch());assert.equal(plan(rows,[]).add.length,1);assert.equal(plan(rows,rows).duplicate,1)});
test('other person cannot be imported',()=>assert.throws(()=>parse(batch(),'monika',now),/profil/i));
test('current-day steps update instead of duplicate',()=>{const r={...measurement,recordType:'stepsDaily',recordId:'2026-10-01@Europe/Budapest',origin:'health-connect-aggregate',steps:12,localDate:'2026-10-01',zoneId:'Europe/Budapest'};const before=read(batch(r));const after=read(batch({...r,steps:50,lastModifiedAt:'2026-10-01T09:01:00Z'},{exportedAt:'2026-10-01T09:02:00Z'}));assert.equal(plan(after,before).update.length,1);assert.equal(plan(before,after).stale,1)});
test('legacy exact duplicate is skipped, other profile is separate',()=>{const rows=read(batch());assert.equal(plan(rows,[{...rows[0],id:'legacy'}]).duplicate,1);assert.equal(plan(rows,[{...rows[0],id:'legacy',profile:'monika'}]).add.length,1)});
test('invalid numbers, dates, kinds and future data rejected',()=>{for(const change of [{systolic:NaN},{systolic:'120'},{recordType:'__proto__'},{measuredAt:'2026-02-30T00:00:00Z'},{measuredAt:'2027-01-01T00:00:00Z'},{recordId:''}])assert.throws(()=>read(batch({...measurement,...change})));});
test('conflicting identical IDs rejected',()=>assert.throws(()=>read(batch(measurement,{measurements:[measurement,{...measurement,systolic:130}]})),/Ellentmondó/));
test('record IDs are safe in existing inline detail handlers',()=>{const rows=read(batch({...measurement,recordId:`a'\"\\<script>`}));assert.doesNotMatch(rows[0].id,/[\"'\\<>]/);assert.equal(read(batch({...measurement,recordId:`a'\"\\<script>`}))[0].id,rows[0].id)});
test('empty allowed package is a no-op',()=>assert.equal(plan(read(batch(measurement,{measurements:[]})),[]).add.length,0));
