'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const production=fs.readFileSync(path.join(root,'activity-one/index.html'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'activity-engine-v2.js'),'utf8');
const full=fs.readFileSync(path.join(root,'live-v191.js'),'utf8');
test('Activity One is a full manual-capable lightweight route using the verified v2 engine',()=>{
 assert.match(production,/activity-profile-test\/activity-engine-v2\.js\?v=2/);
 assert.match(production,/activity-fast\/vault-read-v3\.js/);
 assert.match(production,/activity-premium-glass-v533\.js/);
 assert.doesNotMatch(production,/window\.hh191ManualSave=function/);
 assert.doesNotMatch(production,/a191Card\.manual\{display:none/);
 assert.match(engine,/window\.hh191ManualSave=function/);
 assert.match(engine,/MANUAL_KEY\+pkey\(\)/);
 assert.match(engine,/window\.hh191Profile=function/);
 assert.match(engine,/window\.hh191SourceDetails=function/);
 assert.match(engine,/async function downloadCanonicalCloud\(profile\)/);
 assert.match(full,/var LOCAL_MEMO_TTL_MS=45000/);
});
test('Activity One does not run the heavy Home bootstrap or introduce synthetic measurements',()=>{
 assert.doesNotMatch(production,/HHB13_0[0-9]|HH_CHUNKS|document\.open\(\)|premium-glass-home-v520/);
 assert.doesNotMatch(production,/\bfastReadSnapshot\b|\bfastSaveSnapshot\b/);
 assert.match(engine,/if\(row\.value&&row\.value\.profile===profile\)/);
 assert.match(engine,/tx=db\.transaction\(\['imports','activity'\],'readonly'\)/);
 assert.match(engine,/Dropbox-export NEM igazolt/);
});
