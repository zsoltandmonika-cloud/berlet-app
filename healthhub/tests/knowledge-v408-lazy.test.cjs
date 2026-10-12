const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const source=fs.readFileSync(path.resolve(__dirname,'../live-v294b.js'),'utf8');
const core=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-core.js'),'utf8');
const ingest=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ingest.js'),'utf8');
const ui=fs.readFileSync(path.resolve(__dirname,'../knowledge-v407-ui.js'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('All existing and new scripts parse',()=>{new Function(source);new Function(core);new Function(ingest);new Function(ui)});
test('Stable v403 HTML build and Ask Léna script remain untouched',()=>{
 assert.match(index,/healthhub-live-build" content="v403"/);
 assert.match(index,/live-v331\.js\?v=403-stable/);
});
test('User opt-in is the only lazy-loader trigger',()=>{
 const loads=[];
 const document={documentElement:{dataset:{}},head:{appendChild(e){loads.push(e.src);if(e.onload)e.onload()}},getElementById(){return null},createElement(){return{}}};
 const env={document,window:{addEventListener(){},renderHealthSection:undefined},localStorage:{getItem(){return null}},setTimeout(){},CustomEvent:function(){}};
 new Function('window','document','localStorage','setTimeout','CustomEvent',source)(env.window,document,env.localStorage,env.setTimeout,env.CustomEvent);
 assert.equal(loads.length,0);
});
test('Three knowledge modules are dynamically loaded in prerequisite order',()=>{
 const one=source.indexOf("load('./knowledge-v407-core.js");
 const two=source.indexOf("load('./knowledge-v407-ingest.js");
 const three=source.indexOf("load('./knowledge-v407-ui.js");
 assert.ok(one>=0&&two>one&&three>two);
});
test('Failed lazy load can be retried safely',()=>{
 assert.match(source,/kbLoadPromise=null;throw e/);
});
test('New UI requires explicit interaction, not implicit full-index run',()=>{
 assert.match(source,/id="hhKbOpen294"/);
 assert.match(source,/kb\.onclick=function/);
 assert.doesNotMatch(source,/HH_KB_INGEST_V407\.run\(/);
});
console.log('OK '+passed+' lazy v408 loader checks');
