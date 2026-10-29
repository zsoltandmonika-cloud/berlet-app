'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk/grand-concept');
const guardian=path.resolve(__dirname,'../guardian');
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');
const html=read(root,'index.html'),js=read(root,'bkk-grand-search-picker-v4.js'),css=read(root,'bkk-grand-search-picker-v4.css');
const hh=read(guardian,'index.html');
test('BKK Grand uses original fields and the existing tested HealthHub geocoder',()=>{
 for(const id of ['from','to','date','time'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(html,/guardian-smart-hub-fields-v806\.js\?v=bkk-grand-photon-favorites-v4/);
 assert.match(html,/bkk-grand-search-picker-v4\.js\?v=4-predict-top-picker/);
 assert.match(js,/HH_SMART_HUB_FIELDS_V806/);
 assert.match(js,/core\.favoriteSuggestions/);
 assert.match(js,/core\.normalizeResults/);
 assert.match(js,/core\.searchUrl/);
 assert.match(js,/input\[key\]\.value=label/);
 assert.doesNotMatch(js,/createElement\('input'\)/);
});
test('BKK Grand predictive search moves REAL input to top and keeps list keyboard-safe',()=>{
 assert.match(js,/slot\.append\(input\[key\]\)/);
 assert.match(js,/dock\.append\(results\)/);
 assert.match(js,/visualViewport/);
 assert.match(js,/height-12/);
 assert.match(js,/fieldAnchor\.parentNode\.insertBefore/);
 assert.match(js,/listAnchor\.parentNode\.insertBefore/);
 assert.match(js,/btn\.addEventListener\('click'/);
 assert.match(css,/#bkkGrandKeyboardDockV4\[hidden\]/);
 assert.match(css,/overflow-y:auto!important/);
 assert.doesNotMatch(js,/watchPosition\(|getCurrentPosition\(|setInterval\(/);
});
test('BKK Grand and Guardian native date/time open on actual taps',()=>{
 for(const id of ['bkkGrandDateTriggerV4','bkkGrandTimeTriggerV4']){
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,new RegExp("picker\\(\\$\\('"+id+"'\\)"));
 }
 assert.match(js,/field\.showPicker\(\)/);
 assert.match(css,/pointer-events:none!important/);
 const guardianJs=read(guardian,'guardian-bkk-golden-planner-v968.js');
 for(const id of ['hhBkkGoldenDateTriggerV970','hhBkkGoldenTimeTriggerV970'])
  assert.ok(guardianJs.includes(id));
 assert.match(guardianJs,/field\.showPicker\(\)/);
 assert.match(hh,/v=970-picker-safe/);
 assert.match(hh,/v=969-golden-predictive-keyboard-top/);
});
