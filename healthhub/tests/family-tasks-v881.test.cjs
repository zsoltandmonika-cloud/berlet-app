'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('sh9/family-hub/index.html');
const css=read('sh9/family-hub/family-tasks-v881.css');
const js=read('sh9/family-hub/family-tasks-v881.js');
const base=read('sh9/family-hub/family-tasks-v880.js');
test('SH9 still exactly nine tiles; renamed Family Hub opens tasks',()=>{
 const sh9=read('sh9/index.html');
 assert.equal((sh9.match(/class="tile"/g)||[]).length,9);
 assert.match(sh9,/data-name="Family Hub" data-href="\.\/family-hub\/"/);
 assert.doesNotMatch(sh9,/data-name="Daily Hub"/);
});
test('full S24 viewport, safe-area and scrollable vertical presets',()=>{
 assert.match(html,/fh-sheet-full-v881/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/env\(safe-area-inset-top/);
 assert.match(css,/fh-category-list-v881/);
 assert.match(css,/flex-direction:column/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/min-height:54px/);
});
test('Quick Add never focuses title on opening; user tap or mic controls keyboard',()=>{
 const show=base.match(/function showSheet\(\)[\s\S]*?function hideSheet/);
 assert.ok(show);
 assert.doesNotMatch(show[0],/\.focus\(/);
 assert.match(html,/id="fhMicV881"/);
 assert.match(js,/SpeechRecognition\|\|w\.webkitSpeechRecognition/);
 assert.match(js,/r\.lang='hu-HU'/);
 assert.match(js,/input\.focus\(\)/); // only on microphone unsupported fallback
});
test('bigger original portraits with profile colors remain controlled by v880',()=>{
 assert.match(html,/golden-standard-avatars-v529/);
 assert.match(base,/\['monika','zsolt','lena'\]/);
 assert.match(css,/fh-person \.avatar\{height:65px;width:65px/);
 assert.match(html,/fhConciergeImageV881/);
});
test('Tada plays only after successful DB insert, never a failed mutation',()=>{
 const save=base.match(/async function save\(e\)[\s\S]*?async function authSync/);
 assert.ok(save);
 assert.ok(save[0].indexOf("if(error)throw error;")<save[0].indexOf('hh-family-tasks-saved-v881'));
 assert.match(js,/addEventListener\('hh-family-tasks-saved-v881'/);
 assert.match(js,/ctx\.createOscillator\(\)/);
 assert.doesNotMatch(js,/setInterval\(/);
});
test('No changes to shared notification and 30-day logbook schemas',()=>{
 assert.match(read('sh9/family-hub/family-notifier-v880.js'),/postgre?s_changes|postgres_changes/);
 assert.match(read('supabase/migrations/20261027112000_sh9_family_tasks_v880.sql'),/interval '30 days'/);
});
