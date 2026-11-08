'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const studio=fs.readFileSync(path.join(root,'recepttar-studio/index.html'),'utf8');
const studioCss=fs.readFileSync(path.join(root,'recepttar-studio/styles.css'),'utf8');
const recipe=fs.readFileSync(path.join(root,'recepttar/index.html'),'utf8');
const nutrition=fs.readFileSync(path.join(root,'healthhub/nutrition/index.html'),'utf8');
test('Studio-only v1156: upper unified SHO dock is not loaded',()=>{
 assert.doesNotMatch(studio,/sh9-golden-controls-v1\.(?:css|js)/);
 assert.match(studio,/<header class="app-header">/);
 assert.match(studioCss,/\.app-header\{position:sticky;top:0;/);
 assert.match(studio,/<section class="search-section">/);
});
test('Shared bottom bar, recipe data and Golden nutrition stay unchanged',()=>{
 assert.match(studio,/sh9-golden-bottom-nav-v924\.css\?v=924-unified/);
 assert.match(studio,/sh9-golden-bottom-nav-v924\.js\?v=924-unified/);
 assert.match(studio,/<nav class="bottom-nav">/);
 assert.match(studio,/src="app\.js\?v=1154-cooked-weight&amp;nutri=1160"/);
 assert.match(studio,/hh-nutri-golden-standard-v1155\.js/);
 assert.match(studio,/hh-nutrition-export-v1154\.js/);
});
test('Other modules retain their approved upper dock',()=>{
 assert.match(recipe,/sh9-golden-controls-v1\.js/);
 assert.match(nutrition,/sh9-golden-controls-v1\.js/);
});
