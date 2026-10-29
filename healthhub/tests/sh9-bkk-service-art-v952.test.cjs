'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk/grand-concept');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'bkk-services-illustrated-v952.css'),'utf8');
const js=fs.readFileSync(path.join(base,'bkk-grand-wiring-v1.js'),'utf8');

test('Three approved BKK illustrations are present in an optimized real WebP sprite',()=>{
 const image=fs.readFileSync(path.join(base,'assets/bkk-services-triptych-v952.webp'));
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 assert.ok(image.length>3000&&image.length<16000);
 assert.match(css,/background-image:url\('\.\/assets\/bkk-services-triptych-v952\.webp'\)/);
 for(const position of ['0%','50%','100%'])
  assert.match(css,new RegExp('background-position:'+position+' center'));
});

test('Only the three service cards get larger illustrated controls; no placeholder copy remains',()=>{
 assert.match(html,/bkk-services-illustrated-v952\.css\?v=952/);
 assert.equal((html.match(/class="service" type="button"/g)||[]).length,3);
 assert.equal((html.match(/class="service-icon" aria-hidden="true"/g)||[]).length,3);
 for(const name of ['Megállói indulások','BKK menetrend','Élő járművek'])
  assert.match(html,new RegExp('class="service" type="button" data-concept="'+name+'"'));
 assert.doesNotMatch(html,/class="preview-result"|class="source"|BKK · kapcsolt szolgáltatások/);
 assert.match(css,/min-height:92px/);
 assert.match(css,/width:110px/);
 assert.match(css,/@media\(max-width:375px\)/);
});

test('BKK original planner, ticket flows, profile and bottom nav remain unchanged',()=>{
 for(const id of ['planner','depart','from','to','date','time','find','profile'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="bkkGrandTrips"/);
 assert.match(html,/class="bottom" aria-label="SH9 Golden Standard navigáció"/);
 for(const action of ['Megállói indulások','BKK menetrend','Élő járművek'])
  assert.ok(js.includes("'"+action+"'"));
 assert.doesNotMatch(css,/fetch\(|setInterval\(|supabase\.|geolocation\.|https?:\/\//);
});
