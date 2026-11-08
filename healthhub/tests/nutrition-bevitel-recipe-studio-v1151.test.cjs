'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),main=read('hh-bevitel-premium-v643.js'),
 scan=read('hh-lena-ai-scan-page-v753.js'),
 editor=read('hh-bevitel-category-studio-v644.js'),
 css=read('hh-bevitel-recipe-studio-v1151.css');
const tile=html.match(/<div class="hh-bevitel-grid"[^>]*>([\s\S]*?)\n <\/div>\n <div class="hh-bevitel-admin-row"/)?.[1]||'';
test('Four Bevitel tiles in stable 2x2 order; original three IDs, images and modes unchanged',()=>{
 assert.ok(tile,'Bevitel grid is present');
 const matches=[...tile.matchAll(/\bid="(addFood|addDrink|hhBevitelAI|hhBevitelRecipeStudioV1151)"/g)].map(x=>x[1]);
 assert.deepEqual(matches,['addFood','addDrink','hhBevitelAI','hhBevitelRecipeStudioV1151']);
 assert.equal((tile.match(/class="hh-bevitel-tile"/g)||[]).length,4);
 for(const [id,kind,src] of [
  ['addFood','food','photo-1571162188392-3b41283bcde6'],
  ['addDrink','drink','photo-1518563419477-33f2294a73c1'],
  ['hhBevitelAI','ai','photo-1551218372-063893c540ce']]){
  const chunk=tile.slice(tile.indexOf('id="'+id+'"'),tile.indexOf('</button>',tile.indexOf('id="'+id+'"')));
  assert.match(chunk,new RegExp('data-kind="'+kind+'"'));
  assert.ok(chunk.includes(src));
 }
});
test('Fourth tile opens actual existing Léna Recepttár Studio, not the personal Recipe Wheel',()=>{
 const anchor=tile.match(/<a\s+id="hhBevitelRecipeStudioV1151"[^>]*>/)?.[0];
 assert.ok(anchor);
 assert.match(anchor,/class="hh-bevitel-tile"/);
 assert.match(anchor,/data-kind="cookbook"/);
 assert.match(anchor,/href="\.\.\/\.\.\/recepttar-studio\/"/);
 assert.match(anchor,/Léna Recept Stúdió megnyitása/);
 assert.match(tile,/Léna Recept Stúdió<\/span>/);
 assert.match(tile,/lena-kitchen-banner-crisp\.png\?v=5/);
 const destination=new URL('../../recepttar-studio/','https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/nutrition/');
 assert.equal(destination.pathname,'/berlet-app/recepttar-studio/');
 assert.ok(fs.existsSync(path.resolve(root,'../../recepttar-studio/index.html')));
});
test('Golden 2x2 styling reuses existing card and profile-glass theme, preserving tap size',()=>{
 assert.match(html,/hh-bevitel-recipe-studio-v1151\.css\?v=1151-2x2-fourth-tile/);
 assert.ok(html.indexOf('hh-bevitel-premium-v643.css')<html.indexOf('hh-bevitel-recipe-studio-v1151.css'));
 assert.match(css,/\.hh-bevitel-section \.hh-bevitel-grid\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/var\(--accent\)/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 const sharedCss=read('hh-bevitel-premium-v643.css');
 assert.match(sharedCss,/\.hh-bevitel-tile\[data-kind="cookbook"\]/);
 assert.match(sharedCss,/\.hh-bevitel-photo\{/);
 assert.match(sharedCss,/\.hh-bevitel-sheen\{/);
 assert.match(sharedCss,/\.hh-bevitel-copy\{/);
});
test('Fourth tile is editable in actual embedded editor AND standalone module via existing shared Dropbox image vault',()=>{
 for(const code of [editor,html]){
  assert.match(code,/category:'food',name:'Étel',icon:'🍽️',id:'addFood'/);
  assert.match(code,/category:'drink',name:'Ital',icon:'🥤',id:'addDrink'/);
  assert.match(code,/category:'ai',name:'AI Bevitel',icon:'📷',id:'hhBevitelAI'/);
  assert.match(code,/category:'studio',name:'Léna Recept Stúdió',icon:'👩‍🍳',id:'hhBevitelRecipeStudioV1151'/);
  assert.match(code,/tileDefs\.map\(t=>\(\{\.\.\.t\}\)\)/);
  assert.match(code,/saved\[key\('tile',t\.category\)\]\?\.imageRef/);
  assert.match(code,/vault\.load\('shared',ref\)/);
  assert.match(code,/vault\.save\('shared',draft\)/);
  assert.match(code,/await synchronize\(true\)/);
 }
 assert.match(html,/id="hhBevitelMainEditorButton"[^>]+hhOpenBevitelEditor\('tile'\)/);
 assert.match(editor,/HH_BEVITEL_CATEGORY_V644=\{decorate,attachPhoto,refresh,openEditor:open/);
 assert.ok(html.includes("^(food|drink|tile|bristol)"));
});
test('Existing Food, Drink and AI scanner callbacks stay untouched; no extra photo or AI requests at page load',()=>{
 assert.match(main,/const food=\$\('addFood'\),drink=\$\('addDrink'\)/);
 assert.match(main,/const COOKBOOK_ID='__hh_lena_cookbook__'/);
 assert.match(scan,/hhBevitelAI/);
 assert.match(scan,/e\.stopImmediatePropagation\(\);open\(\)/);
 assert.doesNotMatch(css,/fetch\(|puter|txt2img/);
 new vm.Script(editor);
 new vm.Script(main);
 new vm.Script(scan);
});
