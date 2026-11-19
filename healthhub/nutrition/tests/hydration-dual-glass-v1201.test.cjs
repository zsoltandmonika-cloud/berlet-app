'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('hh-hydration-dual-glass-v1201.css'),js=read('hh-hydration-dual-glass-v1201.js');
const core=read('nutrition-preview-v592.js');

test('the original water quick-add, save and reset IDs and handlers are unmodified',()=>{
 for(const id of ['waterQuickAdd','hhWaterSave','hhJarReset','hhWaterGoal','hhWaterLevel','hhWaterGaugeFill','hhWaterPct']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(core,/click\('waterQuickAdd',logWater250\)/);
 assert.match(core,/click\('hhJarReset',resetJar\)/);
 assert.match(core,/click\('hhWaterSave'/);
 assert.match(core,/function resetJar\(\)/);
 assert.match(core,/\$\('hhWaterLevel'\)\.style\.height=fillHeight\+'%'/);
});

test('glass action buttons are paired above target controls with visible Hungarian labels',()=>{
 const glassStart=html.indexOf('class="hh-water-glasses-v1201"');
 const add=html.indexOf('id="waterQuickAdd"',glassStart);
 const reset=html.indexOf('id="hhJarReset"',add);
 const steps=html.indexOf('id="hhWaterStepsV1201"',reset);
 const goalLabel=html.indexOf('<label for="hhWaterGoal">',steps);
 const goalSave=html.indexOf('id="hhWaterSave"',goalLabel);
 assert.ok(glassStart>=0 && add>glassStart && reset>add && steps>reset && goalLabel>steps && goalSave>goalLabel);
 const filled=html.slice(add,html.indexOf('</button>',add));
 const empty=html.slice(reset,html.indexOf('</button>',reset));
 assert.match(filled,/class="hh-glass-water-v1201"/);
 assert.match(filled,/>250 ml<\/text>/);
 assert.match(empty,/>Ürítés<\/text>/);
 assert.match(empty,/Kancsó/);
 assert.match(html,/id="hhWaterStepsCountV1201"/);
 assert.equal((html.match(/<span><\/span>/g)||[]).length>=8,true);
});

test('visual-only new CSS loaded last, exactly one wave, no pitcher/water-internals selectors',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 const token='hh-hydration-dual-glass-v1201.css?v=1201-eight-glass-levels';
 assert.equal(head.split(token).length,2);
 const links=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0]);
 assert.ok(links.some(x=>x.includes(token)),'v1201 remains loaded under v1202');
 assert.ok(links.at(-1).includes('hh-hydration-showcase-v1202.css'),
  'new v1202 hydration showcase skin wins the cascade');
 assert.match(css,/var\(--lpv-wave\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(clean,/#hhWaterLevel|#hhWaterGaugeFill|#hhWaterPct|\.hh-pitcher|\.hh-water-level|\.hh-water-gauge(?:-fill)?/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|fetch\(|postMessage|\.style\.(?:height|transform)|setInterval|setTimeout/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('existing pitcher is completely unchanged and step UI only READS its aria-label',()=>{
 assert.match(html,/<div class="hh-pitcher" role="img" aria-label="Napi folyadék cél teljesítése">/);
 assert.match(html,/<div class="hh-water-level" id="hhWaterLevel"><\/div>/);
 assert.match(html,/<div class="hh-water-gauge-fill" id="hhWaterGaugeFill"><\/div>/);
 assert.match(js,/gauge\.getAttribute\('aria-label'\)/);
 assert.match(js,/attributeFilter:\['aria-label'\]/);
 assert.match(html,/hh-hydration-dual-glass-v1201\.js\?v=1201-read-only-250-steps/);
 assert.ok(html.indexOf('nutrition-preview-v592.js')<html.indexOf('hh-hydration-dual-glass-v1201.js'));
});

test('real ml since jar empty advances in exact 250 ml increments, capped at eight, resets safely',()=>{
 const state=new Map();
 const meter={attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v)},removeAttribute(k){this.attrs.delete(k)},querySelectorAll(){return segments}};
 const segments=Array.from({length:8},()=>{const classes=new Set();return{classList:{
  add(...xs){xs.forEach(x=>classes.add(x))},
  remove(...xs){xs.forEach(x=>classes.delete(x))},
  toggle(x,on){if(on)classes.add(x);else classes.delete(x)},
  contains(x){return classes.has(x)}
 }}});
 const count={textContent:''},gauge={getAttribute(k){assert.equal(k,'aria-label');return state.get(k)||''}};
 let onMutation;
 class MutationObserver{constructor(cb){onMutation=cb}observe(node,options){assert.equal(node,gauge);assert.deepEqual(Array.from(options.attributeFilter),['aria-label'])}}
 const document={readyState:'complete',getElementById(id){return id==='hhWaterStepsV1201'?meter:id==='hhWaterStepsCountV1201'?count:null},
 querySelector(sel){return sel==='#balanceCard .hh-water-gauge'?gauge:null}};
 vm.runInNewContext(js,{document,MutationObserver});
 const setMl=n=>{state.set('aria-label','Kancsó vízszintje: '+Math.round(n/20)+'%, az utolsó ürítés óta '+new Intl.NumberFormat('hu-HU').format(n)+' ml');onMutation()};
 setMl(0);assert.equal(count.textContent,'0 / 8');assert.equal(segments.filter(x=>x.classList.contains('is-full-v1201')).length,0);
 setMl(249);assert.equal(count.textContent,'0 / 8');
 setMl(250);assert.equal(count.textContent,'1 / 8');
 setMl(1250);assert.equal(count.textContent,'5 / 8');
 assert.equal(segments.filter(x=>x.classList.contains('is-full-v1201')).length,5);
 assert.equal(meter.attrs.get('aria-valuenow'),'1250');
 setMl(2000);assert.equal(count.textContent,'8 / 8');
 setMl(3000);assert.equal(count.textContent,'8 / 8');assert.equal(meter.attrs.get('aria-valuenow'),'2000');
 setMl(0);assert.equal(count.textContent,'0 / 8');assert.equal(segments.filter(x=>x.classList.contains('is-full-v1201')).length,0);
 state.set('aria-label','Kancsó vízszintje: nincs beállított cél');onMutation();
 assert.equal(count.textContent,'— / 8');assert.equal(meter.attrs.has('aria-valuenow'),false);
});
