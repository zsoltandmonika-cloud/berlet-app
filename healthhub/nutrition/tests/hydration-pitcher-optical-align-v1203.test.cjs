'use strict';
/* v1203: optical pitcher/glass baseline only; geometry and click contracts stay. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const css=read('hh-hydration-showcase-v1202.css');
const html=read('index.html');
const code=read('hh-hydration-showcase-v1202.js');
const nutrition=read('nutrition-preview-v592.js');

test('only the pitcher artwork is optically lowered, with bounded narrow-screen offset',()=>{
 assert.ok(css.includes('position:relative;top:calc(clamp(49px,17vw,70px) + 5px);z-index:1;'),'exact additional +5px on every mobile width');
 assert.ok(css.includes('width:min(100%,223px);top:calc(clamp(45px,15vw,59px) + 5px)'),'exact additional +5px on narrow devices');
 assert.match(css,/\.hh-showcase-stage-v1202\{\s*display:grid;grid-template-columns:minmax\(0,1\.46fr\) minmax\(100px,\.86fr\)/);
 assert.match(css,/\.hh-jug-tap-v1202\{\s*position:relative;isolation:isolate;display:flex/);
 assert.match(css,/\.hh-glass-tap-v1202\{\s*display:flex;flex-direction:column/);
 assert.match(css,/\.hh-showcase-summary-v1202\{/);
});

test('new CSS version is loaded once so Android will not keep the previous positioning',()=>{
 assert.equal(html.split('hh-hydration-showcase-v1202.css?v=1205-jug-plus5-watermotion').length,2);
});

test('the existing pitcher tap, glass tap, eight 250ml stages and mute-aware SFX remain unchanged',()=>{
 for(const id of ['hhJugTapV1202','hhGlassTapV1202','hhJugFrameV1202','hhShowcaseTotalV1202','hhWaterLevel','hhWaterGaugeFill','hhJarReset','waterQuickAdd']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(code,/jug\.addEventListener\('click',function\(\)\{oldReset\.click\(\);\}\)/);
 assert.match(code,/glass\.addEventListener\('click',function\(\)\{oldAdd\.click\(\);\}\)/);
 assert.match(code,/for\(var i=0;i<=8;i\+\+\)buildFrame\(i\)/);
 assert.match(nutrition,/click\('hhJarReset',resetJar\)/);
 assert.match(nutrition,/click\('waterQuickAdd',logWater250\)/);
 assert.match(nutrition,/tone\('splash'\)/);
 assert.match(nutrition,/success\('water'\)/);
});
