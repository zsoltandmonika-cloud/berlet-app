'use strict';
/* v868 theme contract: the global Family Guard profile owns ALL neutral glass.
 * BKK's optional local selector changes route PREFS, never paint.
 * No user data, GPS, remote credentials or browser state are used by these tests.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('guardian/guardian-theme-final-lock-v868.css');
const html=read('guardian/index.html');
const core=read('guardian/guardian.js');
const bkk=read('guardian/guardian-bkk-polish-v855.css');
const note=read('guardian/guardian-bkk-status-glass-v867.css');
const transport=read('guardian/guardian-transit-v791.js');

test('single canonical global-profile authority, blue Zsolt and pink Mónika',()=>{
 assert.match(core,/documentElement\.dataset\.guardianProfile=monika\?'m':'z'/);
 assert.match(css,/:root\[data-guardian-profile="z"\]\{[\s\S]*?--hhg-accent:#78b4e6/);
 assert.match(css,/:root\[data-guardian-profile="m"\]\{[\s\S]*?--hhg-accent:#dc8fc0/);
 assert.match(css,/:root\[data-guardian-profile\] #hhSmartHubDestinationV802/);
 assert.match(css,/:root\[data-guardian-profile\] #hhTransitPanel\{/);
 assert.match(css,/:root\[data-guardian-profile\] #hhTransitPanel \.hh-transit-v791/);
 assert.match(css,/:root\[data-guardian-profile\] :is\(\.guardian-landmarks,\.hh-arrival-studio,\.family-panel,\.gps-panel\)/);
 assert.match(css,/:root\[data-guardian-profile\] #hhTransitPanel #hhTransitStatus/);
 assert.match(css,/:root\[data-guardian-profile\] #hhTransitPanel \.hh-transit-credit/);
 // Credit text sits directly on the DARK page, unlike dark ink on glass cards.
 assert.match(css,/--hhg-credit:#d9eaff/);
 assert.match(css,/--hhg-credit:#ffe2f1/);
 assert.match(css,/--hhg-credit-link:#a7deff/);
 assert.match(css,/--hhg-credit-link:#ffb8df/);
 assert.match(css,/\.hh-transit-credit\{\s*color:var\(--hhg-credit\)!important/);
 assert.match(css,/\.hh-transit-credit a:visited\{\s*color:var\(--hhg-credit-link\)!important/);
});
test('BKK local data selection must never override the global glass colours',()=>{
 assert.doesNotMatch(bkk,/#hhTransitPanel\[data-bkk-profile=/);
 assert.doesNotMatch(bkk,/\.hh-transit-v791\[data-bkk-profile=/);
 assert.doesNotMatch(note,/#hhTransitPanel\[data-bkk-profile=/);
 assert.match(bkk,/:root\[data-guardian-profile="z"\] #hhTransitPanel/);
 assert.match(bkk,/:root\[data-guardian-profile="m"\] #hhTransitPanel/);
 assert.match(transport,/setAttribute\('data-bkk-profile',profile\)/);
 assert.match(transport,/selectionByProfile\[profile\]/);
});
test('global hero switch also updates BKK route data and browser storage switch',()=>{
 assert.match(core,/HH_GUARDIAN_TRANSIT_V790\?\.setProfile\?\.\(next==='m'\?'monika':'zsolt'\)/);
 assert.match(core,/HH_GUARDIAN_TRANSIT_V790\?\.setProfile\?\.\(name\(\)==='Mónika'\?'monika':'zsolt'\)/);
 assert.match(core,/localStorage\.setItem\('hh-profile',next\)/);
});
test('v868 style loads last in head; route identities and GPS semantics remain intact',()=>{
 const i=html.indexOf('guardian-theme-final-lock-v868.css?v=869-high-contrast-bkk-credit');
 assert.ok(i>html.indexOf('guardian-bkk-status-glass-v867.css'));
 assert.ok(i>html.indexOf('guardian-final-panels-glass-v861.css'));
 assert.ok(i>html.indexOf('guardian-soft-glass-v852.css'));
 assert.ok(i<html.indexOf('</head>'));
 assert.match(bkk,/data-bkk-mode="tram"/);
 assert.match(bkk,/#ffd23a/);
 assert.doesNotMatch(css,/#guardianMap|#guardianHHNav|\.hh-gps-pin-v845|\.hh-health-heart-v845/);
 assert.match(html,/id="guardianProfileSwitch"/);
});
