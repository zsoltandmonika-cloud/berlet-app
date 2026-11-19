'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'hh-hydration-title-golden-v1208.css'),'utf8');
const core=fs.readFileSync(path.join(base,'hh-hydration-showcase-v1202.js'),'utf8');
const legacy=fs.readFileSync(path.join(base,'nutrition-preview-v592.js'),'utf8');
test('editorial golden title uses the approved kicker, heading and explanatory copy',()=>{
 assert.match(html,/class="hh-showcase-kicker-v1202">💧 Táplálkozás · Hidratáció<\/span>/);
 assert.match(html,/<h3>Folyadékbevitel<\/h3>/);
 assert.match(html,/<p>Napi hidratáltságod nyomon követése<\/p>/);
 assert.match(css,/linear-gradient\(106deg,#fff/);
 assert.match(css,/background-clip:text/);
 assert.match(css,/hh-showcase-header-v1202::after/);
 assert.match(css,/letter-spacing:\.09em/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
});
test('CSS is opt-in and confined to header, preserving pitcher, glass, RAG and diary',()=>{
 const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.match(stripped,/body\[data-lp-v2="on"\]\[data-lp-module="nutrition"\]/);
 for(const selector of ['hh-jug-image-v1202','hh-jug-tap-v1202','hh-glass-tap-v1202',
  'hhWaterLevel','hhWaterGaugeFill','hhBuddyMood','waterQuickAdd','hhJarReset','hhShowcaseBarV1202'])
  assert.ok(!stripped.includes(selector),'no forbidden selector '+selector);
 assert.match(stripped,/pointer-events:none/);
 assert.equal((stripped.match(/\{/g)||[]).length,(stripped.match(/\}/g)||[]).length);
 assert.match(core,/oldAdd\.click\(\)/);
 assert.match(core,/oldReset\.click\(\)/);
 assert.match(core,/for\(var i=0;i<=8;i\+\+\)buildFrame\(i\)/);
 assert.match(legacy,/tone\('splash'\)/);
});
test('title CSS loads once, before unchanged last hydration CSS to preserve approved cascade',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 const title='hh-hydration-title-golden-v1208.css?v=1208-premium-heading';
 const prior='hh-hydration-showcase-v1202.css?v=1205-jug-plus5-watermotion';
 assert.equal(head.split(title).length,2);
 assert.ok(head.indexOf(title)<head.indexOf(prior));
 const links=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0]);
 assert.ok(links.at(-1).includes(prior));
});
