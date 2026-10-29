'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'guardian-bkk-first-paint-v957.css'),'utf8');
const live=fs.readFileSync(path.join(base,'guardian-live-pilot-v793.js'),'utf8');
const watch=fs.readFileSync(path.join(base,'guardian-bkk-watchlist-v814.js'),'utf8');

test('v957 prevents legacy 260 / 17 / 19 dark cards from flashing at FIRST paint, before late JS',()=>{
 const mode=html.indexOf("document.documentElement.dataset.sh9Transit='on'");
 const critical=html.indexOf('<style id="sh9-bkk-first-paint-v957">');
 const external=html.indexOf('<link rel="stylesheet"');
 const body=html.indexOf('<body>');
 assert.ok(mode>=0&&critical>mode&&critical<external&&external<body);
 const style=html.slice(critical,html.indexOf('</style>',critical));
 assert.match(style,/html\[data-sh9-transit="on"\] #hhTransitPanel \.hh-transit-choices/);
 assert.match(style,/html\[data-sh9-transit="on"\] #hhTransitPanel #hhTransitCardsV791\{display:none!important\}/);
 assert.match(watch,/panel\.classList\.add\('hh-bkk-watch-ready-v814'\)/);
 assert.match(html,/id="hhTransitRoute260"/);
 assert.match(html,/id="hhTransitRoute17"/);
 assert.match(html,/id="hhTransitRoute19"/);
 assert.match(css,/display:none!important/);
});

test('v957 robust one card uses critical background and overrides nested frames, not an overlay',()=>{
 const start=html.indexOf('<style id="sh9-bkk-first-paint-v957">');
 const end=html.indexOf('</style>',start);
 const style=html.slice(start,end);
 assert.match(style,/html\[data-sh9-transit="on"\] body \.shell>main>#hhTransitPanel\.hh-transit-panel\{/);
 assert.match(style,/background:linear-gradient\(138deg,var\(--hhg-panel-start/);
 for(const key of [
  '.hh-bkk-watchlist-v814',
  '#hhBkkCatalogV801',
  '#hhSmartHubDestinationV802.hh-smart-hub-v802'
 ]) {
   assert.ok(style.includes(key),key);
 }
 assert.match(css,/background-image:none!important/);
 assert.match(css,/background-color:transparent!important/);
 assert.doesNotMatch(css,/::before|::after|z-index:|position:fixed|fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(/);
 assert.match(html,/guardian-bkk-first-paint-v957\.css\?v=957/);
 assert.match(html,/guardian-bkk-control-one-card-v956\.css\?v=957-firstpaint/);
 assert.match(live,/holder\.prepend\(bar\)/);
});

test('v957 leaves Family Guard normal state and all real transit controls unchanged',()=>{
 const critical=html.slice(html.indexOf('<style id="sh9-bkk-first-paint-v957">'),html.indexOf('</style>',html.indexOf('<style id="sh9-bkk-first-paint-v957">')));
 // Every rule is scoped to the SH9 opt-in mode.
 assert.doesNotMatch(critical,/^\s*(?:body|\.shell|#hhTransitPanel)\b/m);
 assert.match(css,/:root\[data-sh9-transit="on"\] #hhTransitPanel/);
 for(const id of [
  'hhBkkWatchlistV814','hhBkkWatchToggleV858','hhBkkWatchEditV814',
  'hhBkkCatalogV801','hhBkkCatalogSearchV801','hhSmartHubDestinationV802',
  'hhSmartHubFromV806','hhSmartHubToV806','hhPlannerNowV939','hhPlannerArriveV939',
  'hhActiveTransitBoardV862','hhSmartHubTripPlansV804'
 ]) assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
 assert.equal((html.match(/<details\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
});
