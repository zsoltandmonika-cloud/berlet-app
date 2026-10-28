const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const folder=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/volan');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const css=fs.readFileSync(path.join(folder,'volan-hero-ratio-v2.css'),'utf8');
const image=fs.readFileSync(path.join(folder,'assets/volan-hero-final-approved-v2.webp'));

test('Volán final uploaded 1670x942 source is a WebP asset and displays in exact proportions',()=>{
 assert.ok(image.length>200000 && image.length<600000);
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.match(html,/id="volan-hero" class="hero-img" src="\.\/assets\/volan-hero-final-approved-v2\.webp\?v=2" width="1670" height="942"/);
 assert.match(html,/volan-hero-ratio-v2\.css\?v=2/);
});
test('Volán Golden mobile hero cannot crop or stretch on S24 Ultra',()=>{
 assert.match(css,/\.hero\{[\s\S]*?height:auto !important/);
 assert.match(css,/aspect-ratio:1670 \/ 942/);
 assert.match(css,/\.hero > img#volan-hero\.hero-img\{[\s\S]*?height:auto !important/);
 assert.match(css,/object-fit:contain !important/);
 assert.match(css,/@media \(min-height:860px\), \(min-height:900px\), \(max-height:740px\)/);
 assert.ok(html.indexOf('href="./volan-hero-ratio-v2.css?v=2"')>html.lastIndexOf('</style>'));
});
test('Volán functions and Golden Glass controls are retained',()=>{
 for(const id of ['volan-hero','profile','planner','from','to','swap','rail-date','rail-time','find'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const mode of ['now','depart','arrive'])assert.ok(html.includes('data-mode="'+mode+'"'));
 assert.match(html,/class="quick"/);
 assert.match(html,/class="depart glass"/);
 assert.match(html,/class="bottom"/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|supabase|watchPosition|setInterval/);
});
