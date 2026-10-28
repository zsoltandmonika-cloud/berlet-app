const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const folder=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const css=fs.readFileSync(path.join(folder,'mav-hero-ratio-v2.css'),'utf8');
const data=fs.readFileSync(path.join(folder,'assets/mav-hero-final-approved-v2.webp'));

test('MÁV final user-approved hero is a real optimized WebP image, not the screenshot',()=>{
 assert.ok(data.length>200000);
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.match(html,/<img class="hero-img" src="\.\/assets\/mav-hero-final-approved-v2\.webp\?v=2" width="1671" height="941"/);
 assert.match(html,/mav-hero-ratio-v2\.css\?v=2/);
});

test('MÁV hero preserves exact 1671 × 941 source aspect on every S24 layout size',()=>{
 assert.match(css,/\.hero\{[\s\S]*?height:auto !important;/);
 assert.match(css,/aspect-ratio:1671 \/ 941/);
 assert.match(css,/\.hero > img\.hero-img\{[\s\S]*?height:auto !important;/);
 assert.match(css,/object-fit:contain !important/);
 assert.match(css,/@media \(min-height:860px\), \(min-height:900px\), \(max-height:740px\)/);
 const lastHeadStyle=html.lastIndexOf('</style>');
 const styleLink=html.indexOf('href="./mav-hero-ratio-v2.css?v=2"');
 assert.ok(lastHeadStyle>=0&&styleLink>lastHeadStyle,'ratio override must load after golden CSS');
});

test('MÁV approved hero swap leaves live planner and all navigation intact',()=>{
 for(const id of ['profile','signal','planner','from','to','swap','when','find','favlist','save'])assert.ok(html.includes('id="'+id+'"'));
 for(const action of ['timetable','liveTrains','tickets'])assert.ok(html.includes('data-rail-action="'+action+'"'));
 assert.match(html,/class="hero"/);
 assert.match(html,/<nav class="bottom"/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|supabase|watchPosition|setInterval/);
});
