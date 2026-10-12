const assert=require('node:assert/strict');
const core=require('../knowledge-v407-core.js');
const fs=require('node:fs'),path=require('node:path');
let ok=0;
function t(label,fn){fn();ok++;console.log('PASS '+label)}
const files=[
 {id:'x1',name:'archive.pdf',size:3000},
 {id:'x2',name:'Samsung Watch EKG.pdf',size:350000},
 {id:'x3',name:'OMSZ sürgősségi esetlap.pdf',size:330000},
 {id:'x4',name:'OMSZ esetlap 2.pdf',size:315000},
 {id:'x5',name:'Samsung Watch EKG.pdf',size:360000}
];
t('OMSZ candidate order smallest first',()=>{
 const rows=core.pilotCandidates(files,'omsz');
 assert.equal(rows.length,2);assert.equal(rows[0].id,'x4');
});
t('Watch EKG candidate order smallest first',()=>{
 const rows=core.pilotCandidates(files,'watch-ekg');
 assert.equal(rows.length,2);assert.equal(rows[0].id,'x2');
});
t('Pilot type is whitelist-only',()=>{
 assert.equal(core.pilotCandidates(files,'all').length,0);
 assert.equal(core.pilotCandidates(files,'').length,0);
});
t('Input metadata never mutated by sorting',()=>{
 const snapshot=JSON.stringify(files);core.pilotCandidates(files,'omsz');
 assert.equal(JSON.stringify(files),snapshot);
});
t('One-OMSZ pilot is always bounded to one PDF',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ingest.js'),'utf8');
 assert.match(source,/opts\.pilotType\?1:/);
 assert.match(source,/CORE\.pilotCandidates\(remaining,opts\.pilotType\)/);
});
t('UI pilot never opts user into auto indexing',()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ui.js'),'utf8');
 assert.match(ui,/data-kb="pilot-ekg"/);assert.match(ui,/data-kb="pilot-omsz"/);
 const pilot=ui.split('async function runPilot(type){')[1].split('async function runFull(){')[0];
 assert.match(pilot,/maxDocs:1/);assert.doesNotMatch(pilot,/\.enable\(/);
});
console.log('OK '+ok+' targeted pilots');
