'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'public-transport-smoked-glass-v950.css'),'utf8');

test('v950 adopts exact SH9 Launchpad navy and is loaded last for transport only',()=>{
 const sh9=fs.readFileSync(path.resolve(__dirname,'../../sh9/index.html'),'utf8');
 assert.match(sh9,/body\{background:#0b1425\}/);
 assert.match(css,/--sh9-pt-smoked:#0b1425/);
 assert.match(css,/\.shell\.transport-grand/);
 const source=html.indexOf('public-transport-smart-trip-mobile-v3.css?v=3');
 const style=html.indexOf('public-transport-smoked-glass-v950.css?v=951-deep-smoked-unified-nav');
 assert.ok(source>=0&&style>source);
});

test('v950 keeps four original approved image assets and all user navigation',()=>{
 for(const id of ['bkk','mav','volan','smarttrip']){
  assert.match(html,new RegExp('src="\\./assets/'+id+'-approved-card-v5\\.webp"'));
  assert.match(css,new RegExp('url\\("\\./assets/'+id+'-approved-card-v5\\.webp"\\)'));
 }
 assert.match(html,/data-service="bkk" href="\.\/bkk\/grand-concept\/"/);
 assert.match(html,/data-service="mav" href="\.\/mav\/"/);
 assert.match(html,/data-service="volan" href="\.\/volan\/"/);
 assert.match(html,/id="smartTripOpen"/);
 assert.equal([...html.matchAll(/class="transport-choice /g)].length,4);
});

test('v950 keeps bright original image content above dim backdrop, with modest glass border',()=>{
 assert.match(css,/\.transport-choice::before\{/);
 assert.match(css,/linear-gradient\(rgba\(11,20,37,\.92\),rgba\(11,20,37,\.92\)\)/);
 assert.match(css,/\.transport-choice::after\{/);
 assert.match(css,/\.transport-choice \.choice-art\{/);
 assert.match(css,/-webkit-mask-image:/);
 assert.match(css,/filter:none!important/);
 assert.match(css,/border:1px solid var\(--sh9-pt-edge\)/);
});

test('v950 has no new data access, GPS access, animation loops or image URLs',()=>{
 assert.doesNotMatch(css,/https?:\/\/|fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(|url\(data:/);
});

/* v951 acceptance: the live SH9 Launcher palette remains identical and no
   all-card opacity/filter affects the original user-approved foreground images. */
test('v951 has exactly the shared SH9 navigation color and very low neon rim',()=>{
 assert.match(css,/\.transport-grand \.nav\{\s*background:rgba\(15,30,54,\.97\)!important/);
 assert.match(css,/border-top:1px solid rgba\(140,198,243,\.25\)!important/);
 assert.match(css,/--sh9-pt-edge:rgba\(174,148,220,\.105\)/);
 assert.match(css,/--sh9-pt-edge:rgba\(197,137,189,\.105\)/);
 assert.match(css,/filter:saturate\(\.18\)/);
 assert.match(css,/box-shadow:none!important/);
 assert.match(css,/\.transport-choice \.choice-art\{[\s\S]*?filter:none!important/);
});
