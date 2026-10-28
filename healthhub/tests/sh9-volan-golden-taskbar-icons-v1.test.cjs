const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const volan=fs.readFileSync(path.join(base,'volan/index.html'),'utf8');
const mav=fs.readFileSync(path.join(base,'mav/index.html'),'utf8');

function taskbar(source){
  const nav=source.match(/<nav class="bottom"[^>]*>[\s\S]*?<\/nav>/);
  assert.ok(nav,'Golden Standard bottom navigation must exist');
  return nav[0];
}
function icon(source,name){
  const script=source.match(/const paths=\{[\s\S]*?\};/);
  assert.ok(script,'Icon path definitions must exist');
  const pathRe=new RegExp('(?:^|[,{])'+name+":'([^']+)'");
  const hit=script[0].match(pathRe);
  return hit?.[1]||null;
}
test('Volán taskbar has the canonical five links with correct labels and destinations',()=>{
 const nav=taskbar(volan);
 assert.deepEqual([...nav.matchAll(/data-icon="([^"]+)"/g)].map(x=>x[1]),['home','clock','back','bell','settings']);
 assert.equal((nav.match(/<a /g)||[]).length,5);
 for(const text of ['Kezdőlap','Idővonal','Vissza','Értesítések','Admin'])assert.ok(nav.includes(text),text);
 assert.ok(nav.includes('href="../../../"'));
 assert.ok(nav.includes('href="../"'));
 assert.ok(nav.includes('sh9nav=timeline'));
 assert.ok(nav.includes('sh9nav=notifications'));
 assert.ok(nav.includes('sh9nav=admin'));
});
test('Every Volán taskbar icon exists and matches the original MÁV Golden Standard SVG',()=>{
 const keys=['home','clock','back','bell','settings'];
 for(const key of keys){
  assert.ok(icon(volan,key),'Volán '+key+' would otherwise silently display the fallback bus pictogram');
  assert.equal(icon(volan,key),icon(mav,key),key+' icon must be pixel-identical to MÁV');
 }
});
test('Volán taskbar geometry, profiles, hero, planner and live-data behavior are unchanged',()=>{
 const sharedCss='.bottom{grid-template-columns:repeat(5,minmax(0,1fr));height:calc(60px + env(safe-area-inset-bottom,0px));';
 assert.ok(volan.includes(sharedCss));
 assert.ok(mav.includes(sharedCss));
 assert.ok(volan.includes('volan-hero-final-approved-v2.webp?v=2'));
 assert.ok(volan.includes('volan-hero-ratio-v2.css?v=2'));
 assert.ok(volan.includes('id="profile"'));
 assert.ok(volan.includes('id="planner"'));
 for(const id of ['from','to','rail-date','rail-time','find'])assert.ok(volan.includes('id="'+id+'"'));
 assert.equal((taskbar(volan).match(/<a /g)||[]).length,(taskbar(mav).match(/<a /g)||[]).length);
});
