'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../guardian');
const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const normal=fs.readFileSync(path.join(dir,'guardian-bkk-family-one-card-v959.css'),'utf8');
const sh9=fs.readFileSync(path.join(dir,'guardian-bkk-control-one-card-v956.css'),'utf8');
const antiFlash=fs.readFileSync(path.join(dir,'guardian-bkk-first-paint-v957.css'),'utf8');
const staticWatch=fs.readFileSync(path.join(dir,'guardian-bkk-watchlist-v814.js'),'utf8');

test('v959 default /guardian/ BKK card is unified from first paint, with no legacy vehicle flash',()=>{
 const first=page.indexOf('<style id="guardian-bkk-family-first-paint-v959">');
 const firstCss=page.indexOf('<link rel="stylesheet"');
 assert.ok(first>0&&first<firstCss,'sync first paint before stylesheets');
 assert.match(page.slice(first,firstCss),/html:not\(\[data-sh9-transit="on"\]\) #hhTransitPanel \.hh-transit-choices/);
 assert.match(page.slice(first,firstCss),/#hhTransitCardsV791\{\s*display:none!important/);
 assert.match(page.slice(first,firstCss),/body \.shell>main>#hhTransitPanel\.hh-transit-panel\{/);
 assert.match(page,/guardian-bkk-family-one-card-v959\.css\?v=959-guardian-parity/);
 assert.ok(page.indexOf('guardian-bkk-family-one-card-v959.css')>page.indexOf('guardian-bkk-first-paint-v957.css'));
 assert.match(normal,/\.hh-transit-choices,\s*:root:not\(\[data-sh9-transit="on"\]\) #hhTransitPanel #hhTransitCardsV791\{\s*display:none!important/);
 assert.match(staticWatch,/panel\.classList\.add\('hh-bkk-watch-ready-v814'\)/);
 for(const id of ['hhTransitRoute260','hhTransitRoute17','hhTransitRoute19','hhTransitShow260','hhTransitShow17','hhTransitShow19'])
  assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' stays in DOM for route code');
});

test('v959 normal Family Guard matches approved SH9 structure without modifying SH9 rules',()=>{
 assert.match(normal,/:root:not\(\[data-sh9-transit="on"\]\) #hhTransitPanel\{/);
 for(const s of [
  '#hhBkkLiveBarV796','#hhBkkLiveStatusV793',
  '.hh-bkk-watchlist-v814','#hhBkkCatalogV801',
  '#hhSmartHubDestinationV802.hh-smart-hub-v802',
  '.hh-transit-v791','#hhTransitStatus.hh-transit-status','.hh-transit-credit'
 ])assert.ok(normal.includes(s),s+' is styled inside one card');
 for(const id of ['hhBkkWatchlistV814','hhBkkWatchToggleV858','hhBkkWatchEditV814',
  'hhBkkCatalogV801','hhBkkCatalogSearchV801','hhSmartHubDestinationV802',
  'hhSmartHubFromV806','hhSmartHubToV806','hhPlannerNowV939','hhPlannerDepartV939',
  'hhPlannerArriveV939','hhActiveTransitBoardV862','hhSmartHubFavoritesV806',
  'hhSmartHubTripPlansV804','hhTransitDirectionsV791','hhTransitStatus'])
  assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(normal,/:root:not\(\[data-sh9-transit="on"\]\)\[data-guardian-profile="m"\] #hhTransitPanel/);
 assert.match(normal,/background:transparent!important/);
 assert.match(normal,/border-bottom:1px solid var\(--sh9-bkk-seam\)!important/);
 assert.match(normal,/#hhTransitPanel \.hh-transit-credit a:visited/);
 assert.match(normal,/color:var\(--bk-muted\)!important/);
 assert.match(normal,/min-height:44px!important/);
 assert.match(normal,/@media\(max-width:375px\)/);
 assert.match(normal,/prefers-reduced-transparency/);
 assert.match(sh9,/:root\[data-sh9-transit="on"\] #hhTransitPanel/);
 assert.match(antiFlash,/html\[data-sh9-transit="on"\]/);
 assert.doesNotMatch(normal,/:root\[data-sh9-transit="on"\](?!\))/);
});

test('v959 one-card is purely presentational: no new tracking, network or map instances',()=>{
 for(const code of [normal, page.slice(page.indexOf('<style id="guardian-bkk-family-first-paint-v959">'),page.indexOf('</style>',page.indexOf('<style id="guardian-bkk-family-first-paint-v959">')))]){
  assert.doesNotMatch(code,/fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(|supabase\.co|new maplibregl|XMLHttpRequest/);
 }
 assert.match(page,/Forrás: <a href="https:\/\/opendata\.bkk\.hu\/data-sources"/);
 assert.match(page,/id="guardianMap"/);
 assert.match(page,/id="guardianHHNav"/);
 assert.match(page,/id="sh9TransitNavV927"/);
 assert.equal((page.match(/<section\b/g)||[]).length,(page.match(/<\/section>/g)||[]).length);
 assert.equal((page.match(/<details\b/g)||[]).length,(page.match(/<\/details>/g)||[]).length);
});
