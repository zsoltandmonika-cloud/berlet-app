'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-bkk-control-one-card-v956.css'),'utf8');

test('v956 BKK Control is one outer glass card, live status first and no extra panel frames',()=>{
 assert.match(html,/guardian-bkk-control-one-card-v956\.css\?v=956-unified/);
 assert.ok(html.indexOf('guardian-bkk-control-one-card-v956.css')>html.indexOf('guardian-smart-planner-unified-v955.css'));
 assert.match(css,/:root\[data-sh9-transit="on"\] #hhTransitPanel\{[\s\S]*?border-radius:20px!important;/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #hhTransitPanel>#hhBkkLiveBarV796\{[\s\S]*?border-bottom:1px solid var\(--sh9-bkk-seam\)!important;/);
 for(const label of [
  '.hh-bkk-watchlist-v814',
  '#hhBkkCatalogV801',
  '#hhSmartHubDestinationV802.hh-smart-hub-v802'
 ]){
  assert.ok(css.includes(label+'{')||css.includes(label+','),label);
 }
 for(const section of ['.hh-bkk-watchlist-v814:has(', '#hhBkkCatalogV801{','#hhSmartHubDestinationV802.hh-smart-hub-v802{']){
  let i=css.indexOf(section);
  assert.ok(i>=0,section);
  let rule=css.slice(i,css.indexOf('}',i));
  assert.match(rule,/background:transparent!important/);
  assert.match(rule,/box-shadow:none!important/);
 }
});

test('v956 moves extra routes ahead of planner in actual DOM, keeping keyboard/tab and visual order aligned',()=>{
 const start=html.indexOf('<section id="hhTransitPanel"');
 const end=html.indexOf('</section>',html.indexOf('id="hhSmartHubDestinationV802"'))+10;
 const segment=html.slice(start,end);
 const keys=['id="hhBkkWatchlistV814"','id="hhBkkCatalogV801"','id="hhSmartHubDestinationV802"'];
 const positions=keys.map(k=>segment.indexOf(k));
 assert.ok(positions.every(i=>i>=0),JSON.stringify(positions));
 assert.ok(positions[0]<positions[1]&&positions[1]<positions[2],JSON.stringify(positions));
 assert.equal((html.match(/id="hhBkkCatalogV801"/g)||[]).length,1);
 assert.equal((html.match(/id="hhBkkWatchlistV814"/g)||[]).length,1);
 assert.equal((html.match(/id="hhSmartHubDestinationV802"/g)||[]).length,1);
 // The dynamic live bar is still prepended by the original controller.
 const live=fs.readFileSync(path.join(root,'guardian-live-pilot-v793.js'),'utf8');
 assert.match(live,/holder\.prepend\(bar\)/);
 assert.match(live,/bar\.id='hhBkkLiveBarV796'/);
});

test('v956 preserves toggles, Planner inputs, profile themes, BKK attribution and traffic',()=>{
 for(const id of [
  'hhBkkWatchToggleV858','hhBkkWatchEditV814','hhBkkWatchContentV858',
  'hhBkkCatalogSearchV801','hhBkkCatalogResultsV801','hhBkkCatalogMoreV801',
  'hhActiveTransitBoardV862','hhSmartHubFromV806','hhSmartHubToV806',
  'hhPlannerNowV939','hhPlannerDepartV939','hhPlannerArriveV939',
  'hhSmartHubFavoritesV806','hhSmartHubPriorityWalkingV805','hhSmartHubTripPlansV804'
 ]) assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/:root\[data-sh9-transit="on"\]\[data-guardian-profile="m"\] #hhTransitPanel/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css, /prefers-reduced-transparency/);
 assert.match(html,/BKK Zrt\., CC BY 4\.0/);
 assert.doesNotMatch(css,/fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(|new maplibregl|supabase\.co|https?:\/\//);
 // Regular Family Guard is isolated from one-card SH9 opt-in overrides.
 assert.ok(css.includes(':root[data-sh9-transit="on"] #hhTransitPanel'));
});
