'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/index.html');
const agenda=read('sh9/outlook-agenda-v1.js');
const css=read('sh9/outlook-agenda-v1.css');
const native=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const light=read('sh9/android-light-browser/app/src/main/java/hu/zsoltmonika/sh9light/MainActivity.java');
const admin=read('healthhub/hh-admin-mobile-focus-v748.js');
const strip=html.slice(html.indexOf('<section id="sh9InfoBar6"'),html.indexOf('</section>',html.indexOf('<section id="sh9InfoBar6"')));

test('one tap on DÁTUM opens month, one tap on NAPTÁR opens official Outlook Agenda',()=>{
 const date=strip.match(/<a id="sh9NamedayCell"[^>]*>/)?.[0];
 const calendar=strip.match(/<a id="sh9CalendarCell"[^>]*>/)?.[0];
 assert.ok(date&&calendar);
 assert.match(date,/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/month"/);
 assert.match(calendar,/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/agenda"/);
 assert.match(calendar,/target="_blank"/);
 assert.match(calendar,/rel="noopener noreferrer external"/);
 assert.match(calendar,/data-calendar-view="agenda"/);
 assert.doesNotMatch(calendar,/aria-haspopup="dialog"|aria-controls="sh9AgendaDialog"/);
 assert.doesNotMatch(strip,/<button id="sh9CalendarCell"/);
});
test('no extra custom modal click needed; official link is real even without JavaScript',()=>{
 assert.match(agenda,/const OUTLOOK_AGENDA='https:\/\/outlook\.live\.com\/calendar\/0\/view\/agenda'/);
 assert.doesNotMatch(agenda,/card\.addEventListener\('click',show\)/);
 assert.doesNotMatch(agenda,/card\.addEventListener\('click',openPanel\)/);
 assert.match(css,/#sh9CalendarCell\.sh9-calendar-click-target\{[\s\S]*?text-decoration:none/);
 assert.match(html,/outlook-agenda-v1\.js\?v=7-direct-agenda/);
 assert.match(html,/outlook-agenda-v1\.css\?v=8-date-time-first/);
});
test('native Android handles external Outlook HTTPS in existing system browser',()=>{
 assert.match(agenda,/if\(NATIVE\)\{\s*card\.addEventListener\('click',e=>\{\s*e\.preventDefault\(\);\s*w\.location\.assign\(OUTLOOK_AGENDA\)/);
 assert.match(native,/if \(request\.isForMainFrame && u\.scheme == "https"\)/);
 assert.match(native,/Intent\(Intent\.ACTION_VIEW, u\)/);
 assert.match(light,/new Intent\(Intent\.ACTION_VIEW, uri\)/);
 assert.doesNotMatch(agenda,/searchParams\.set\('sh9external','calendar'\)/);
});
test('local private SH9 Agenda still exists for Admin Microsoft Calendar settings',()=>{
 assert.match(admin,/\.\.\/sh9\/\?sh9calendar=1/);
 assert.match(agenda,/if\(new URLSearchParams\(w\.location\.search\)\.get\('sh9calendar'\)==='1'\)show\(\)/);
 assert.match(html,/id="sh9AgendaDialog"/);
 assert.match(html,/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/agenda" target="_blank" rel="noopener noreferrer external">Outlook Agenda megnyitása/);
 assert.match(agenda,/offline_access User\.Read Calendars\.Read/);
 assert.equal([...html.matchAll(/<(?:button|a) class="tile" (?:type="button" |href="[^"]+" )?data-name="/g)].length,9);
 assert.equal((html.match(/data-nav="/g)||[]).length,5);
});
