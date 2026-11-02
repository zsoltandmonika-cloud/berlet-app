'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/shared/sh9-golden-bottom-nav-v924.js');
const css=read('sh9/shared/sh9-golden-bottom-nav-v924.css');
const active=[
 'index.html','healthhub/index.html','healthhub/guardian/index.html',
 'healthhub/digital-health/index.html','healthhub/digital-health/time-machine-v534.html',
 'healthhub/digital-wellbeing-preview/index.html','healthhub/nutrition/index.html',
 'healthhub/nutrition-preview/index.html','healthhub/nutrition/index-v621-test.html',
 'healthhub/usage-control/index.html','recepttar/index.html','recepttar-studio/index.html',
 'sh9/index.html','sh9/family-hub/index.html','sh9/smart-travel/index.html',
 'sh9/smart-travel/my-trips/index.html','sh9/smart-travel/public-transport/index.html',
 'sh9/smart-travel/public-transport/bkk/index.html',
 'sh9/smart-travel/public-transport/bkk/grand-concept/index.html',
 'sh9/smart-travel/public-transport/mav/index.html',
 'sh9/smart-travel/public-transport/volan/index.html',
 'sh9/smart-travel/public-transport/smart-trip/index.html'
];
test('v924: shared nav CSS and JS reach all 22 active roots and category leaves',()=>{
 assert.equal(active.length,22);
 for(const filename of active){
  const html=read(filename),count=filename==='healthhub/index.html'?2:1;
  assert.equal((html.match(/sh9-golden-bottom-nav-v924\.css\?v=924-unified/g)||[]).length,count,filename+' CSS');
  assert.equal((html.match(/sh9-golden-bottom-nav-v924\.js\?v=924-unified/g)||[]).length,count,filename+' JS');
 }
});
test('v924: Home and Ask icons are frameless, 28px, profile aware; Ask text matches',()=>{
 assert.match(css,/:root\{--sh9-global-bottom-accent:#79bfff\}/);
 assert.match(css,/:root\[data-sh9-golden-profile="m"\]\{--sh9-global-bottom-accent:#f9a6d3\}/);
 for(const role of ['home','ask'])assert.ok(css.includes('[data-sh9-bottom-role="'+role+'"]'));
 assert.match(css,/width:28px!important;height:28px!important/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/box-shadow:none!important/);
 assert.match(css,/filter:none!important/);
 assert.match(css,/#sh9GlobalNavV24/); // Override pre-existing ID-based white discs.
 assert.match(css,/> \[data-sh9-bottom-role="ask"\] :is\(span,small\)/);
 assert.match(css,/color:var\(--sh9-global-bottom-accent\)!important/);
 assert.doesNotMatch(css,/data-sh9-bottom-role="back"|data-sh9-bottom-role="notifications"|data-sh9-bottom-role="admin"/);
});
test('v924: native remaining nav controls preserved, Ask handled safely',()=>{
 assert.match(js,/const NAVS=/);
 assert.match(js,/if\(home\.dataset\.sh9BottomRole!=='home'\)/);
 assert.match(js,/if\(askNode\.dataset\.sh9BottomRole!=='ask'\)/);
 assert.match(js,/askNode\.addEventListener\('click',ask,true\)/);
 assert.match(js,/const wasNativeAsk=!!nativeAsk/);
 assert.match(js,/askNode\.id==='navAsk'/);
 assert.match(js,/api&&typeof api\.openProject==='function'/);
 assert.match(js,/w\.location\.assign\(ASK_FALLBACK\)/);
 assert.match(js,/MutationObserver/);
 assert.match(js,/existing\.remove\(\)/);
 assert.doesNotMatch(js,/fetch\s*\(|supabase\.|navigator\.geolocation|setInterval\s*\(/);
 assert.match(js,/w\.addEventListener\?\.\('storage'/);
 assert.match(js,/w\.SH9_GOLDEN_BOTTOM_NAV_V924=Object\.freeze/);
});
test('v924: safe and strict Time Machine still permits local shared stylesheet',()=>{
 const page=read('healthhub/digital-health/time-machine-v534.html');
 assert.match(page,/default-src 'none'/);
 assert.match(page,/style-src 'self' 'unsafe-inline'/);
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/script-src 'self'/);
});
