'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('sh9/outlook-agenda-v1.css');
const html=read('sh9/index.html');
const js=read('sh9/sh9-info-v6.js');
const stripe=html.slice(html.indexOf('<section id="sh9InfoBar6"'),html.indexOf('</section>',html.indexOf('<section id="sh9InfoBar6"')));

test('all three SH9 fixed category labels and nameday label use identical blue',()=>{
 assert.match(css,/#sh9InfoBar6 \.sh9-info-heading,[\s\S]*#sh9NamedayCell \.sh9-nameday-label\{color:#bde4ff\}/);
 for(const label of ['DÁTUM','IDŐJÁRÁS','NAPTÁR'])
  assert.ok(stripe.includes('class="sh9-info-heading">'+label+'</span>'),label+' missing');
 assert.match(stripe,/<span class="sh9-nameday-label">NÉVNAP · <\/span>/);
 assert.doesNotMatch(stripe,/DÁTUM · NÉVNAP/);
});
test('date, Salamon, weather, and calendar values share exactly one pink color',()=>{
 assert.match(css,/#sh9NamedayCell \.sh9-info-value,\s*#sh9NamedayCell \.sh9-nameday-value,\s*#sh9WeatherCell6 \.sh9-info-value,\s*#sh9WeatherCell6 \.sh9-info-sub,\s*#sh9CalendarCell \.sh9-calendar-summary \.sh9-info-value,\s*#sh9CalendarCell \.sh9-calendar-summary \.sh9-info-sub\{color:#f4b7ea\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-sub\{color:#f4b7ea\}/);
 assert.doesNotMatch(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-sub\{color:#d8bafa\}/);
 assert.match(stripe,/id="sh9NamedayValue6" class="sh9-nameday-value"/);
 assert.match(js,/var nameEl=document\.getElementById\('sh9NamedayValue6'\)/);
 assert.match(js,/nameEl\.textContent=Array\.isArray\(names\)&&names\.length\?names\.join\(', '\):'nem elérhető'/);
 assert.doesNotMatch(js,/innerHTML\s*=|names\.join\(', '\)\+' névnap'/);
});
test('warning and error values remain meaningful, while their heading remains same blue',()=>{
 assert.match(css,/#sh9CalendarCell\[data-status="conflict"\] \.sh9-info-value\{color:#ffd6ad\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="error"\] \.sh9-info-value\{color:#ffd9d9\}/);
 assert.match(css,/#sh9WeatherCell6\[data-status="error"\] \.sh9-info-value\{color:#ffd9d9\}/);
 assert.doesNotMatch(css,/#sh9CalendarCell\[data-status="conflict"\] \.sh9-info-heading/);
});
test('cache bust, navigation, calendar sign-in, and Outlook monthly route are retained',()=>{
 assert.match(html,/outlook-agenda-v1\.css\?v=5-consistent-pink/);
 assert.match(html,/sh9-info-v6\.js\?v=10-label-value/);
 assert.match(html,/outlook-agenda-v1\.js\?v=6-persistent-ms/);
 assert.match(stripe,/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/month"/);
 assert.equal((html.match(/class="tile" type="button" data-name=/g)||[]).length,9);
 assert.equal((html.match(/data-nav="/g)||[]).length,5);
});
