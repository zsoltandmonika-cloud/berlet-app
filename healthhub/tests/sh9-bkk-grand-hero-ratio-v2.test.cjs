const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk/grand-concept');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'bkk-hero-ratio-v2.css'),'utf8');
const img=fs.readFileSync(path.join(base,'assets/bkk-hero-final-approved-v2.webp'));

test('BKK Grand final user-approved image is an actual WebP',()=>{
 assert.ok(img.length>250000);
 assert.equal(img.toString('ascii',0,4),'RIFF');
 assert.equal(img.toString('ascii',8,12),'WEBP');
 assert.match(html,/src="\.\/assets\/bkk-hero-final-approved-v2\.webp\?v=2" width="1672" height="941"/);
 assert.match(html,/bkk-hero-ratio-v2\.css\?v=2/);
});

test('BKK Grand image retains original 1672x941 ratio on Samsung phone sizes',()=>{
 assert.match(css,/\.hero\{[\s\S]*?height:auto !important/);
 assert.match(css,/aspect-ratio:1672 \/ 941/);
 assert.match(css,/\.hero > img\.hero-img\{[\s\S]*?height:auto !important/);
 assert.match(css,/object-fit:contain !important/);
 assert.match(css,/@media \(min-height:860px\), \(min-height:900px\), \(max-height:740px\)/);
 const lastStyle=html.lastIndexOf('</style>');
 const cssLink=html.indexOf('href="./bkk-hero-ratio-v2.css?v=2"');
 assert.ok(cssLink>lastStyle,'ratio CSS is loaded after all inline Golden Shell rules');
});

test('Existing BKK Grand functionality and legacy BKK page remain',()=>{
 for(const id of ['profile','planner','from','to','date','time','swap','find','bkkGrandTrips'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.equal((html.match(/data-mode="(?:now|depart|arrive)"/g)||[]).length,3);
 for(const action of ['Menetrend','Kedvencek','Élő járművek','Jegyek'])assert.ok(html.includes('data-concept="'+action+'"'));
 assert.match(html,/bkk-grand-wiring-v1\.js/);
 assert.match(html,/golden-carbon-parity-v1\.css/);
 const classic=fs.readFileSync(path.resolve(base,'../index.html'),'utf8');
 assert.match(classic,/src="\.\/bkk-hero-approved\.webp"/);
 assert.doesNotMatch(css,/fetch\(|setInterval|watchPosition|supabase/);
});
