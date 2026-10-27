'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('sh9/family-hub/family-tasks-v880.js');
const html=read('sh9/family-hub/index.html');
const css=read('sh9/family-hub/family-tasks-v880.css');
const voice=read('sh9/family-hub/family-quick-add-v881.js');
test('SH9 keeps exactly nine primary modules and routes Daily Hub',()=>{
 const launch=read('sh9/index.html');
 assert.equal((launch.match(/class="tile"/g)||[]).length,9);
 assert.match(launch,/data-name="Daily Hub" data-href="\.\/daily-hub\/"/);
 const daily=read('sh9/daily-hub/index.html');
 assert.match(daily,/Napi feladatok/);
 assert.match(daily,/href="\.\.\/family-hub\/"/);
});
test('Quick Add fills phone fullscreen while preserving task IDs and auth',()=>{
 assert.match(css,/height:100dvh;max-height:none/);
 assert.match(css,/\.fh-sheet form\{flex:1;min-height:0;overflow:auto/);
 assert.match(html,/family-tasks-v880.js\?v=881/);
 assert.match(html,/id="fhTitle"/);
 assert.doesNotMatch(app,/setTimeout\(\(\)=>\$\('fhTitle'\)\.focus\(\),50\)/);
 assert.match(app,/api\.from\(TABLE\)\.insert\(payload\)/);
 assert.match(app,/auth\.getUser\(\)/);
});
test('vertical category picker and generous profile photographs',()=>{
 assert.match(css,/\.fh-chip-row\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/\.fh-person \.avatar\{width:62px;height:62px/);
 assert.match(html,/görgesd lefelé/);
});
test('photo assets are the user-approved files, not random new avatars',()=>{
 for(const name of ['lena-family-concierge-v881.webp','buddy-success-v881.webp']){
  assert.ok(fs.statSync(path.join(root,'sh9/family-hub/assets',name)).size>1000);
  assert.match(html,new RegExp(name));
 }
});
test('Hungarian mic is opt-in, success sound follows successful save',()=>{
 assert.match(html,/id="fhMic"/);
 assert.match(voice,/r\.lang='hu-HU'/);
 assert.match(voice,/webkitSpeechRecognition/);
 assert.match(voice,/mic\.addEventListener\('click',dictation\)/);
 assert.match(voice,/AudioContext/);
 assert.match(app,/new CustomEvent\('hh-family-task-saved'/);
 assert.match(voice,/hh-family-task-saved/);
 assert.match(html,/id="fhSuccessBuddy"/);
});
