'use strict';
/* v1138: hydration button-only skin. Never touch pitcher or the water math. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../nutrition');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const html=read('index.html'),css=read('hh-hydration-button-glass-v1138.css');
const js=read('nutrition-preview-v592.js'),prior=read('hh-hydration-rag-v631.css');
const ids=['waterQuickAdd','hhWaterSave','hhJarReset'];
for(const id of ids){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'original button ID: '+id);
 assert.ok(css.includes('#'+id),'visual skin missing: '+id);
}
assert.match(html,/hh-hydration-button-glass-v1138\.css\?v=1138-aqua-buttons-only/);
assert.equal((html.match(/hh-hydration-button-glass-v1138\.css/g)||[]).length,1);
assert.doesNotMatch(css,/\.hh-pitcher|\.hh-water-level|#hhWaterLevel|#hhWaterGaugeFill|#hhWaterAmount|#hhWaterGoal/);
assert.doesNotMatch(css,/grid-template-columns|position:fixed|\.hh-hydration-side/);
assert.match(js,/click\('waterQuickAdd',logWater250\)/);
assert.match(js,/click\('hhJarReset',resetJar\)/);
assert.match(js,/click\('hhWaterSave'/);
assert.match(prior,/#balanceCard \.hh-water-preset #waterQuickAdd/);
assert.match(prior,/#balanceCard \.hh-water-preset #hhJarReset/);
assert.match(css,/html\[data-profile="monika"\]/);
assert.match(css,/var\(--accent\)/);
assert.match(css,/prefers-reduced-motion/);
console.log('Nutrition v1138: aqua buttons scoped to three existing controls; water pitcher and JS untouched');
