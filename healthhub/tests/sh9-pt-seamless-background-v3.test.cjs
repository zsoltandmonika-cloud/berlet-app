const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const page=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'public-transport-grand-v2.css'),'utf8');
const js=fs.readFileSync(path.join(base,'public-transport-smart-trip-v1.js'),'utf8');

test('Public Transport extends the approved hero behind all four controls without distortions',()=>{
 assert.match(page,/src="\.\/public-transport-approved-hero-v5\.avif\?v=5"/);
 assert.match(page,/public-transport-grand-v2\.css\?v=5-approved-art/);
 assert.match(css,/\.shell\.transport-grand::before\{/);
 assert.match(css,/background-image:url\("\.\/public-transport-approved-poster-v5\.avif\?v=5"\)/);
 assert.match(css,/background-repeat:no-repeat/);
 assert.match(css,/filter:blur\(15px\) saturate\(1\.44\) brightness\(\.82\)/);
 assert.match(css,/\.shell\.transport-grand::after\{/);
 assert.match(css,/\.transport-grand \.transport-visual>img\{[^}]*object-fit:contain/);
 assert.match(css,/\.transport-grand \.transport-choice\{[^}]*backdrop-filter:blur\(18px\)/);
 assert.equal((page.match(/class="transport-choice /g)||[]).length,4);
});
test('All Smart Trip planner controls and scrolling continue on tall and short screens',()=>{
 for(const id of ['smartTripOpen','smartTripPanel','smartTripFrom','smartTripDestination','smartTripDate','smartTripTime','smartTripSave','smartTripJourneys']){
  assert.ok(page.includes('id="'+id+'"'));
 }
 assert.match(css,/@media\(max-height:755px\)\{\s*\.shell\.transport-grand\{[\s\S]*?height:auto/);
 assert.match(css,/min-height:100dvh/);
 assert.match(css,/overflow:hidden/);
 assert.match(css,/padding-bottom:calc\(75px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.doesNotMatch(css,/setInterval|fetch\(/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|setInterval\(|watchPosition/);
});
