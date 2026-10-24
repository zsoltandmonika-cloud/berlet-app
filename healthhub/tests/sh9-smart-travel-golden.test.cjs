const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const page=fs.readFileSync(path.join(root,'sh9/smart-travel/index.html'),'utf8');
const launcher=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
test('SH9 Smart Travel Golden page has nine tiles with Ask Léna in the center',()=>{
 const names=[...page.matchAll(/class="st-tile(?: st-tile-lena)?" data-name="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(names,['Trip Planner','Public Transport','Road Travel','Air Travel','Ask Léna','Taxi','Shared Mobility','My Trips','My Places']);
});
test('SH9 Smart Travel uses existing Family Guard modules and canonical ChatGPT shortcut',()=>{
 assert.match(page,/\#hhSmartHubDestinationV802/);
 assert.match(page,/\#hhTransitPanel/);
 assert.match(page,/\#hhSmartHubFavoritesV806/);
 assert.match(page,/chatgpt-project-shortcut-v712\.js/);
 assert.match(page,/data-name="Ask Léna"/);
 assert.match(launcher,/data-name="Smart Travel" data-href="\.\/smart-travel\/"/);
});
test('SH9 Smart Travel keeps standard navigation and profile switch',()=>{
 assert.equal([...page.matchAll(/data-nav="/g)].length,5);
 for(const label of ['Kezdőlap','Idővonal','Vissza','Értesítések','Admin'])assert.match(page,new RegExp('data-nav="'+label+'"'));
 assert.match(page,/hh-profile/);
 assert.match(page,/id="stProfile"/);
 assert.match(page,/SH9_Smart_Travel_Hero_1402x1122\.png/);
});

// Live clocks remain independent of the user's timezone and respect DST.
test('SH9 Smart Travel hero title and clock strip are in the approved slots',()=>{
 assert.match(page,/<div class="st-hero-title"><h1>Smart Travel<\/h1>/);
 assert.match(page,/<section class="st-world"/);
 assert.equal([...page.matchAll(/data-st-zone="/g)].length,4);
 assert.match(page,/href="https:\/\/www\.flightradar24\.com\/"/);
 assert.match(page,/world-clocks-v2\.js/);
 assert.doesNotMatch(page,/<header class="st-head">/);
});
test('SH9 world clocks handle winter and summer offsets including DST',()=>{
 const clocks=require('../../sh9/smart-travel/world-clocks-v2.js');
 const winter=new Date('2026-01-15T12:00:00Z');
 const summer=new Date('2026-07-15T12:00:00Z');
 assert.deepEqual(clocks.ZONES,['America/New_York','Europe/London','Europe/Paris','Europe/Budapest']);
 assert.deepEqual(clocks.ZONES.map(z=>clocks.cityTime(z,winter)),['07:00','12:00','13:00','13:00']);
 assert.deepEqual(clocks.ZONES.map(z=>clocks.cityTime(z,summer)),['08:00','13:00','14:00','14:00']);
 assert.equal(clocks.cityTime('fake/zone',winter),null);
});
