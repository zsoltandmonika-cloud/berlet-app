const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=require('../knowledge-v407-core.js');
let total=0;
function test(title,fn){fn();total++;console.log('PASS '+title)}
const read=p=>fs.readFileSync(path.resolve(__dirname,'../'+p),'utf8');
test('Ambulance identity does not certify an ECG picture',()=>{
 assert.equal(core.classify('OMSZ esetlap.pdf').hint,'none');
 assert.equal(core.classify('OMSZ esetlap.pdf').sourceClass,'unverified');
});
test('Ambulance text explicitly says ECG not performed',()=>{
 const row=core.visualSignals('OMSZ esetlap.pdf','EKG: Nem történt',{images:1,paths:12});
 assert.equal(row.capture,true);
 assert.equal(row.hint,'image_or_chart');
});
test('Negative EKG statement across line boundary is not ECG evidence',()=>{
 const row=core.visualSignals('2024 - OMSZ szállítás.pdf','EKG\nNem történt',{images:1,paths:50});
 assert.equal(row.hint,'image_or_chart');
});
test('Actual Samsung Watch ECG stays an ECG candidate, not medical diagnosis',()=>{
 const row=core.visualSignals('Samsung Watch EKG.pdf','Szinusz-ritmus',{images:1,paths:1350});
 assert.equal(row.hint,'ekg_candidate');
 assert.equal(core.classify('Samsung Watch EKG.pdf').sourceClass,'device');
});
test('OCR recognized but not verified cannot get green complete status',()=>{
 assert.equal(core.readiness({totalPages:2,pagesIndexed:2,pagesNeedingOcr:0,visualFailed:0,failedPages:0,ocrPagesPendingReview:1}),'partial');
});
test('Complete embedded-text and image capture can be marked processed',()=>{
 assert.equal(core.readiness({totalPages:2,pagesIndexed:2,pagesNeedingOcr:0,visualFailed:0,failedPages:0,ocrPagesPendingReview:0}),'complete');
});
test('Drive folder cannot be accepted from local cache without verifying parent',()=>{
 const src=read('knowledge-v407-ingest.js');
 assert.doesNotMatch(src,/if\(id\)\{folderCache\[p\]=id;return id\}/);
 assert.match(src,/filesByQuery\("name='HealthHub Lena Archive'/);
 assert.match(src,/folders\[0\]\.id;folderCache\[p\]=id/);
});
test('SHA duplicate does not pretend to have personally indexed pages',()=>{
 const src=read('knowledge-v407-ingest.js');
 assert.match(src,/pages_indexed:0,/);
 assert.match(src,/visual_pages:0,/);
 assert.match(src,/sha256===sha/);
});
test('Worker OCR pages remain flagged until reviewed',()=>{
 const src=read('knowledge-v407-ingest.js');
 assert.match(src,/ocrPagesPendingReview\+\+/);
 assert.match(src,/OCR ellenőrzendő/);
});
test('Full one-time processing does not enable the auto updater',()=>{
 const ui=read('knowledge-v407-ui.js');
 const part=ui.split('async function runFull(){')[1].split('async function listDocuments(){')[0];
 assert.doesNotMatch(part,/engine\(\)\.enable\(profile\(\),true\)/);
 assert.match(part,/engine\(\)\.run\(profile\(\)\)/);
});
test('Visual gallery does not certify images as ECG',()=>{
 const ui=read('knowledge-v407-ui.js');
 assert.match(ui,/Képtípus ellenőrzendő/);
});
test('New and existing JavaScript passes parse',()=>{
 new Function(read('knowledge-v407-core.js'));
 new Function(read('knowledge-v407-ingest.js'));
 new Function(read('knowledge-v407-ui.js'));
});
console.log('OK '+total+' v409 quality and privacy regressions');
