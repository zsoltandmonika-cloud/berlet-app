'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/index.html');
const css=read('sh9/sh9-info-profile-accent-v921.css');
const shared=read('sh9/shared/sh9-golden-controls-v1.js');
test('SH9 v921 profile colors apply only to the three middle rows',()=>{
 assert.match(css,/:root\{\s*--sh9-info-profile-value:#79bfff/);
 assert.match(css,/:root\[data-sh9-golden-profile="m"\]\{\s*--sh9-info-profile-value:#f9a6d3/);
 for(const id of ['sh9Date6','sh9Weather6','sh9CalendarValue'])
  assert.ok(css.includes('#sh9InfoBar6 #'+id),id);
 assert.match(css,/color:var\(--sh9-info-profile-value\)!important/);
 assert.doesNotMatch(css,/#sh9InfoBar6 \.sh9-info-heading/);
 assert.match(shared,/d\.documentElement\.setAttribute\('data-sh9-golden-profile',current\)/);
 assert.match(shared,/hh-family-profile-changed/);
 assert.match(shared,/storage/);
});
test('SH9 v921 lower descriptions remain white with same structure and layout',()=>{
 for(const id of ['sh9Nameday6','sh9NamedayValue6','sh9WeatherDetail6','sh9CalendarSub'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const selector of [
  '#sh9InfoBar6 #sh9Nameday6',
  '#sh9InfoBar6 #sh9WeatherDetail6',
  '#sh9InfoBar6 #sh9CalendarSub'
 ])assert.ok(css.includes(selector),selector);
 assert.match(css,/color:#fff!important/);
 assert.doesNotMatch(css,/(?:height|width|margin|padding|position|font-size)\s*:/);
 assert.ok(html.includes('sh9-info-profile-accent-v921.css?v=921-zsolt-blue-monika-pink'));
 assert.ok(html.indexOf('sh9-info-profile-accent-v921.css')>html.indexOf('outlook-agenda-v1.css'));
 assert.ok(html.indexOf('sh9-info-profile-accent-v921.css')>html.indexOf('sh9-golden-controls-v1.css'));
 assert.equal((html.match(/class="tile"/g)||[]).length,9);
 assert.equal((html.match(/data-nav="/g)||[]).length,5);
});
