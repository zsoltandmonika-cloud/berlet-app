'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),vision=read('hh-food-vision-v750.js');
const diary=read('nutrition-preview-v592.js'),gateway=read('hh-bevitel-premium-v643.js');
const style=read('hh-food-vision-v750.css');
assert.match(html,/hh-food-vision-v750\.js\?v=750-vision-confirmed/);
assert.match(html,/hh-food-vision-v750\.css\?v=750-premium-ai/);
assert.match(html,/Fotós ételfelismerés · AI/);
assert.doesNotMatch(html,/AI Bevitel, fotós felismerés: hamarosan/);
assert.match(gateway,/HH_FOOD_VISION_V750/);
assert.match(diary,/recordAiMeal:payload/);
assert.match(diary,/payload\.expectedProfile!==active/);
assert.match(diary,/if\(row\.aiVision&&window\.HH_FOOD_VISION_V750/);
assert.match(diary,/confirmedByUser:true/);
assert.match(diary,/source:'estimated'/);
assert.match(style,/hhVisionCommit750/);
assert.doesNotMatch(vision,/localStorage\.setItem|Dropbox-API-Arg|indexedDB\.open/);
assert.match(vision,/new File\(\[blob\]/); // fresh JPEG strips original EXIF metadata
assert.match(vision,/ai\.listModels\(\)/);
assert.match(vision,/PREFERRED/);
assert.match(vision,/puter\.ai\.chat\(prompt\(\),activeFile,false/);
new vm.Script(vision);
new vm.Script(diary);
new vm.Script(gateway);
const window={};
const doc={readyState:'loading',addEventListener:()=>{}};
vm.runInNewContext(vision,{window,document:doc,Date,JSON,Array,Set,Math,Number,String,Intl});
const A=window.HH_FOOD_VISION_V750;
assert.equal(A.version,'750');
const out=A.parse({message:{content:'Here is JSON: {"name":"Csirkemell rizzsel","items":[{"name":"rizs","grams":150,"per100":{"kcal":130,"protein":2.7,"carbs":28,"fat":0.3},"uncertain":true},{"name":"csirkemell","grams":120,"per100":{"kcal":165,"protein":31,"carbs":0,"fat":3.6}}],"notes":"Az olaj nem látszik."}' }});
assert.equal(out.items.length,2);
assert.equal(out.items[0].uncertain,true);
const n=A.totals(out.items);
assert.equal(n.kcal,393);
assert.equal(n.protein,41.3);
assert.equal(n.carbs,42);
assert.equal(n.fat,4.8);
assert.throws(()=>A.parse('{"items":[]}'));
assert.throws(()=>A.parse('{"items":[{"name":"krumpli","grams":999999,"per100":{}}]}'));
const unknown=A.parse('{"name":"Saláta","items":[{"name":"öntet","grams":60,"per100":{"kcal":null,"protein":null,"carbs":null,"fat":null}}]}');
assert.equal(A.totals(unknown.items).kcal,null); // unknown is not 0 kcal
(async()=>{
 const models=[
  {id:'openai/gpt-5.6-luna',vision:true},{id:'google/gemini-3.8-flash',vision:true},
  {id:'openai/gpt-6.1-sol',vision:false}
 ];
 const choices=await A.availableModels({ai:{listModels:async()=>models}});
 assert.equal(choices[0],'google/gemini-3.8-flash');
 assert.equal(choices[1],'openai/gpt-5.6-luna');
 assert.equal(choices.length,2);
 await assert.rejects(A.availableModels({ai:{listModels:async()=>{throw Error('offline')}}}),/offline/);
 console.log('PASS Nutrition v750: real photo UI hookup, strict JSON, transparent estimates, provider discovery, safe profile-specific confirmation, photo EXIF removal.');
})().catch(e=>{console.error(e);process.exitCode=1});
