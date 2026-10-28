const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'bkk-grand-v2.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'bkk-grand-v2.js'),'utf8');
test('BKK V2 Grand Control keeps BKK legacy flows, profile and official source',()=>{
 assert.match(html,/src="\.\/bkk-hero-approved\.webp"/);
 assert.match(html,/id="profileLabel"/);
 assert.match(html,/id="favoriteRoutes"/);
 assert.match(html,/id="routeSearch"/);
 assert.match(html,/id="bkkPdfOverlay"/);
 assert.match(html,/bkk-pdf-viewer-v923\.js/);
 assert.match(html,/healthhub\/guardian\/#hhSmartHubDestinationV802/);
 assert.match(html,/healthhub\/guardian\/\?sh9Transit=1/);
 assert.match(html,/function officialScheduleUrl\(route\)/);
});
test('BKK V2 does not alter four existing first-fold actions',()=>{
 const fold=html.match(/<div class="bkk-first-fold">([\s\S]*?)<\/section>\s*<\/div>\s*<section id="favorites">/);
 assert.ok(fold);
 assert.equal((fold[1].match(/<a class="glass" href=/g)||[]).length,4);
 for(const word of ['Élő BKK térkép','Útvonaltervező','Következő járat','Kedvenceim'])assert.ok(fold[1].includes('<strong>'+word+'</strong>'));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/--bkk2-glass:/);
 assert.match(css,/:root\[data-profile="m"\]/);
});
test('All six transport modes work locally, with no extra backend requests',()=>{
 for(const type of ['all','bus','tram','metro','hev','trolley'])assert.match(html,new RegExp('data-bkk-mode="'+type+'"'));
 assert.equal((html.match(/data-bkk-mode="/g)||[]).length,6);
 assert.match(js,/card\.dataset\.mode===selected/);
 assert.match(js,/MutationObserver/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|supabase\.|setInterval\(|navigator\.geolocation/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
