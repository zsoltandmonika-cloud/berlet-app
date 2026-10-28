const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public-transport-grand-v2.css'),'utf8');
const js=fs.readFileSync(path.join(root,'public-transport-smart-trip-v1.js'),'utf8');
test('Four authentic user-art neon cards have actual optimized assets',()=>{
 const names=['bkk','mav','volan','smarttrip'];
 for(const name of names){
  const filepath=path.join(root,'assets',name+'-golden-card-v1.webp');
  const asset=fs.readFileSync(filepath);
  assert.ok(asset.length>7000&&asset.length<35000,name+' optimized file size');
  assert.equal(asset.subarray(0,4).toString(),'RIFF');
  assert.equal(asset.subarray(8,12).toString(),'WEBP');
  assert.ok(html.includes('src="./assets/'+name+'-golden-card-v1.webp"'));
 }
 assert.equal((html.match(/class="choice-art"/g)||[]).length,4);
 assert.equal((html.match(/class="transport-choice /g)||[]).length,4);
 assert.deepEqual([...html.matchAll(/data-service="([^"]+)"/g)].map(m=>m[1]),['bkk','mav','volan']);
});
test('Buttons are separately clickable, accessible and keep Smart Trip functionality',()=>{
 assert.match(html,/data-service="bkk" href="\.\/bkk\/grand-concept\/"/);
 assert.match(html,/data-service="mav" href="\.\/mav\/"/);
 assert.match(html,/data-service="volan" href="\.\/volan\/"/);
 assert.match(html,/id="smartTripOpen" type="button" aria-controls="smartTripPanel" aria-expanded="false"/);
 assert.match(html,/id="smartTripForm"/);
 assert.match(html,/id="smartTripSave"/);
 assert.match(html,/class="transport-screenreader-title"/);
 assert.doesNotMatch(html,/<header class="transport-title">/);
 assert.doesNotMatch(html,/class="transport-foot"/);
 assert.match(css,/\.transport-grand \.transport-options\.transport-neon-options\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.transport-grand \.transport-neon-options \.choice-art\{/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/\.transport-grand \.transport-neon-options \.transport-choice:focus-visible/);
 assert.match(html,/public-transport-grand-v2\.css\?v=4-neon-art-cards/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('Image-only presentation does not introduce polling or provider traffic',()=>{
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|setInterval\(|watchPosition|supabase\./);
 assert.doesNotMatch(css,/https?:\/\//);
});
