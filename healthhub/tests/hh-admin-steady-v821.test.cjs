'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const unified = read('hh-unified-admin-v745.js');
const connect = read('live-v306.js');
const index = read('index.html');

test('Admin defers layout updates while scrolling and schedules only one retry', async () => {
 const start = unified.indexOf('function queue(){');
 const end = unified.indexOf('function observe(){', start);
 assert.ok(start >= 0 && end > start);
 const source = unified.slice(start, end);
 let scrolling = true, timers = [], layoutCount = 0, scheduled = 0;
 const w = {
  hhAdminScrollActiveV748: () => scrolling,
  setTimeout: fn => { scheduled++; timers.push(fn); return scheduled; },
  clearTimeout: () => {}
 };
 const queue = new Function('w','layout','Promise',
  'let pending=false,settleTimer=null;'+source+';return queue;')(
   w, () => { layoutCount++; }, Promise);
 queue();queue();queue();
 await Promise.resolve();
 assert.equal(layoutCount, 0);
 assert.equal(scheduled, 1);
 scrolling = false;
 timers.shift()();
 await Promise.resolve();
 assert.equal(layoutCount, 1);
 assert.equal(scheduled, 1);
});

test('passive Health Connect reads do not replace controls while Admin is used', () => {
 assert.match(connect, /function adminIsBeingUsed\(\)/);
 assert.match(connect, /!adminIsBeingUsed\(\)\) refresh\(\); \}, 60000\);/);
 assert.match(connect, /panel===lastRenderedPanel&&nextMarkup===lastRenderedMarkup/);
 assert.match(connect, /panel\.contains\(document\.activeElement\)/);
 assert.match(connect, /panel\.querySelector\('#hc306refresh'\)\.onclick = refresh/);
});

test('changes are limited to Admin JS with explicit cache keys', () => {
 assert.match(index,/hh-unified-admin-v745\.js\?v=747-sh9-version-center&admin=748&steady=821/);
 assert.match(index,/live-v306\.js\?v=820-admin-stable-healthconnect&steady=821/);
 assert.doesNotMatch(unified,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
 assert.doesNotMatch(connect,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
});
