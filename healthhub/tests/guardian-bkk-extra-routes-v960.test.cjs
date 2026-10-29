'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-bkk-extra-routes-order-v960.css'),'utf8');
const watch=fs.readFileSync(path.join(root,'guardian-bkk-watchlist-v814.js'),'utf8');
const catalog=fs.readFileSync(path.join(root,'guardian-bkk-catalog-v801.js'),'utf8');

test('v960 extra BKK routes are directly above Favorite Places and below time selector in the SAME Planner',()=>{
 const ids=['hhBkkWatchlistV814','hhSmartHubDestinationV802','hhPlannerTimeV939',
    'hhPlannerNowV939','hhBkkCatalogV801','hhSmartHubFavoritesV806','hhSmartHubTripPlansV804'];
 const positions=ids.map(id=>html.indexOf('id="'+id+'"'));
 assert.ok(positions.every(i=>i>=0),JSON.stringify(positions));
 assert.ok(positions.every((value,i)=>i===0||positions[i-1]<value),JSON.stringify(positions));
 assert.match(html,/<\/details>\s*<details id="hhSmartHubFavoritesV806"/);
 assert.match(html,/<section id="hhSmartHubDestinationV802"[\s\S]*<details id="hhBkkCatalogV801"[\s\S]*<details id="hhSmartHubFavoritesV806"/);
 assert.equal((html.match(/id="hhBkkCatalogV801"/g)||[]).length,1);
 assert.equal((html.match(/id="hhSmartHubFavoritesV806"/g)||[]).length,1);
 assert.equal((html.match(/<details\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
});

test('v960 Watchlist Edit still opens the moved catalog and scrolls/focuses the live search',()=>{
 assert.match(watch,/const favorites=\$\('hhSmartHubFavoritesV806'\)/);
 assert.match(watch,/if\(favorites&&editor\.nextElementSibling!==favorites\)favorites\.before\(editor\)/);
 assert.doesNotMatch(watch,/section\.after\(editor\)/);
 assert.match(watch,/editor\.open=!editor\.open/);
 assert.match(watch,/editor\.scrollIntoView\?\.\(\{behavior:'smooth',block:'nearest'\}\)/);
 assert.match(watch,/\$\('hhBkkCatalogSearchV801'\)\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(html,/aria-controls="hhBkkCatalogV801"/);
 assert.match(html,/guardian-bkk-watchlist-v814\.js\?v=960-editor-anchors-before-favorites/);
 for(const id of ['hhBkkCatalogSearchV801','hhBkkCatalogResultsV801','hhBkkCatalogMetaV801',
   'hhBkkCatalogMoreV801','hhBkkWatchToggleV858','hhBkkWatchEditV814'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(catalog,/hhBkkCatalogResultsV801/);
});

test('v960 keeps both profile themes and unified glass, with a minimum 44px tap target',()=>{
 assert.match(html,/guardian-bkk-extra-routes-order-v960\.css\?v=960/);
 assert.ok(html.indexOf('guardian-bkk-extra-routes-order-v960.css')>html.indexOf('guardian-bkk-family-one-card-v959.css'));
 assert.match(css,/#hhSmartHubDestinationV802\.hh-smart-hub-v802 > #hhBkkCatalogV801\.hh-bkk-catalog-v801/);
 assert.match(css,/border-top:1px solid var\(--sh9-planner-seam/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/box-shadow:none!important/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/focus-visible/);
 assert.match(css,/\.hh-bkk-catalog-body-v801/);
 assert.doesNotMatch(css,/fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(|supabase\.co|new maplibregl/);
 assert.match(html,/guardian-bkk-control-one-card-v956\.css/);
 assert.match(html,/guardian-bkk-family-one-card-v959\.css/);
});
