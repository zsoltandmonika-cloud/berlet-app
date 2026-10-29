'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-sh9-transit-v927.css'),'utf8');

test('v953 SH9 live vehicles header has a single centered white title, no Golden Standard eyebrow',()=>{
 const head=html.match(/<header id="sh9TransitHeaderV927"[\s\S]*?<\/header>/)?.[0];
 assert.ok(head,'opt-in SH9 transit header');
 assert.match(head,/<div class="sh9-transit-name-v927"><strong>SH9 Smart Travel<\/strong><\/div>/);
 assert.doesNotMatch(head,/SH9 · GOLDEN STANDARD|<small>/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9TransitHeaderV927 \.sh9-transit-name-v927\{\s*transform:translateY\(-7px\)/);
 assert.match(css,/\.sh9-transit-name-v927 strong\{\s*display:block;\s*color:#fff;\s*text-align:center/);
 assert.match(html,/guardian-sh9-transit-v927\.css\?v=953-compact-title-up/);
});

test('v953 keeps SH9-only view and leaves map, profile, traffic and normal Family Guard intact',()=>{
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9TransitHeaderV927/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
 assert.match(html,/id="sh9TransitProfileV927"/);
 assert.match(html,/id="sh9AllVehiclesToggleV928"/);
 assert.match(html,/id="sh9AllVehiclesRefreshV928"/);
 assert.match(html,/id="guardianMap"/);
 assert.match(html,/id="sh9TransitNavV927"/);
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\) #sh9TransitHeaderV927/);
 assert.doesNotMatch(css.slice(css.indexOf('/* v953')),/fetch\(|setInterval\(|watchPosition\(|new maplibregl\.Map|https?:\/\//);
});
