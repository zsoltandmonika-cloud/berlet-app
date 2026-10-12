const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../knowledge-v407-core.js');
let pass=0;
function test(name,fn){fn();pass++;console.log('PASS '+name)}
test('OMSZ identity is only a review candidate',()=>{
 const x=core.classify('2024-06-17 - OMSZ - Melléklet.pdf');
 assert.equal(x.sourceClass,'unverified');assert.equal(x.review,true);
});
test('Samsung EKG is device evidence, not a certified hospital report',()=>{
 const x=core.classify('Samsung Watch EKG.pdf');
 assert.equal(x.sourceClass,'device');assert.equal(x.hint,'ekg_candidate');
});
test('AI summary remains secondary evidence',()=>{
 assert.equal(core.classify('Léna orvosi magyarázata.pdf').sourceClass,'secondary_summary');
});
test('Hospital style filename cannot itself certify source',()=>{
 assert.equal(core.classify('Kórházi zárójelentés.pdf').sourceClass,'unverified');
});
test('EKG drawings are screen-captured even with no embedded XObject',()=>{
 const x=core.visualSignals('OMSZ EKG.pdf','12 elvezetéses EKG',{images:0,paths:180});
 assert.equal(x.capture,true);assert.equal(x.hint,'ekg_candidate');
});
test('Embedded XObject image becomes a visual candidate',()=>{
 assert.equal(core.visualSignals('Labor.pdf','vizsgálat',{images:1,paths:10}).capture,true);
});
test('Large vector graphic can be identified without bitmap',()=>{
 assert.equal(core.visualSignals('Rajz.pdf','',{images:0,paths:241}).capture,true);
});
test('A text-only page is not mislabeled as an image',()=>{
 assert.equal(core.visualSignals('Lelet.pdf','csak szöveg',{images:0,paths:2}).capture,false);
});
test('All pages + OCR + visual success required for green checkmark',()=>{
 assert.equal(core.readiness({totalPages:3,pagesIndexed:3,pagesNeedingOcr:0,failedPages:0,visualFailed:0}),'complete');
});
test('Missing OCR blocks complete status',()=>{
 assert.equal(core.readiness({totalPages:3,pagesIndexed:3,pagesNeedingOcr:1,failedPages:0,visualFailed:0}),'partial');
});
test('Unstored image blocks complete status',()=>{
 assert.equal(core.readiness({totalPages:2,pagesIndexed:2,pagesNeedingOcr:0,failedPages:0,visualFailed:1}),'partial');
});
test('Incomplete page count blocks complete status',()=>{
 assert.equal(core.readiness({totalPages:12,pagesIndexed:10,failedPages:0}),'partial');
});
test('SHA-256 binary encoded hex is deterministic',()=>{
 assert.equal(core.checksumBytes(Uint8Array.from([0,1,254,255])),'0001feff');
});
test('Profile identity is explicit and restricted',()=>{
 assert.equal(core.allowedProfile('monika'),true);assert.equal(core.allowedProfile('zsolt'),true);
 assert.equal(core.allowedProfile('admin'),false);
});
test('External JS parses without loading private health files',()=>{
 const js=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ingest.js'),'utf8');
 new Function(js);
 const ui=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ui.js'),'utf8');
 new Function(ui);
});
test('Private image route stays authenticated and profile-scoped',()=>{
 const svc=fs.readFileSync(path.resolve(__dirname,'../central-vault/daily-health-sync.js'),'utf8');
 assert.match(svc,/hh-kb-visuals/);assert.match(svc,/await ensureToken\(\)/);
 assert.match(svc,/Authorization:'Bearer '/);
});
test('No public medical image bucket',()=>{
 const sql=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/20261012150000_healthhub_v407_kb_visuals.sql'),'utf8');
 assert.match(sql,/hh-kb-visuals','hh-kb-visuals');assert.match(sql,/false,12000000/);
 assert.match(sql,/hh_profile_access/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
});
test('Page-level search index uses full page_text not a short excerpt field',()=>{
 const sql=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/20261012150000_healthhub_v407_kb_visuals.sql'),'utf8');
 assert.match(sql,/to_tsvector\('simple',page_text\)/);
 assert.match(sql,/page_text text NOT NULL/);
});
test('No direct AI clinical interpretation during source extraction',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ingest.js'),'utf8');
 assert.doesNotMatch(src,/api\.openai\.com|chat\/completions|interpretEkg/);
});
console.log('OK '+pass+' multimodal KB regression tests');
