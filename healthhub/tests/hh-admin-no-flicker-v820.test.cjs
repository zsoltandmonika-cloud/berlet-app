'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const auto = read('live-v300.js');
const health = read('live-v306.js');
const menu = read('hh-admin-mobile-focus-v748.js');
const index = read('index.html');
const script = auto.slice(auto.indexOf('function adminInUse()'), auto.indexOf('// Verify loaded versioned assets'));

test('admin open or inline workflow prevents automatic full-page reload', () => {
  assert.ok(script.includes('function adminInUse()'));
  assert.ok(script.includes('function safeForAutoReload()'));
  const state = {inline:'no',open:false,tag:'DIV'};
  const doc = {
    documentElement:{dataset:{get hhInlineAdmin(){return state.inline}}},
    activeElement:{get tagName(){return state.tag}},
    getElementById:id=>id==='haOv'?{classList:{contains:k=>k==='on'&&state.open}}:null
  };
  const api = new Function('document', script + ';return {adminInUse,safeForAutoReload};')(doc);
  assert.equal(api.safeForAutoReload(), true);
  state.inline='yes';
  assert.equal(api.adminInUse(), true);
  assert.equal(api.safeForAutoReload(), false);
  state.inline='no'; state.open=true;
  assert.equal(api.safeForAutoReload(), false);
  state.open=false;state.tag='INPUT';
  assert.equal(api.safeForAutoReload(), false);
  state.tag='DIV';
  assert.equal(api.safeForAutoReload(), true);
});
test('asset-only updates are queued while Admin is open and safely resumed afterwards', () => {
  assert.match(auto,/if\(adminInUse\(\)\)\{[\s\S]*?hh-pending-admin-refresh-v1/);
  assert.match(auto,/if\(!safeForAutoReload\(\)\)\{[\s\S]*?hh-pending-admin-refresh-v1/);
  assert.match(auto,/function resumePendingUpdate\(\)/);
  assert.match(auto,/sessionStorage\.removeItem\('hh-pending-admin-refresh-v1'\)/);
  assert.match(auto,/setInterval\(resumePendingUpdate,15000\)/);
});
test('15-second health panel refresh never destroys unchanged controls', () => {
  assert.match(health,/panel===lastRenderedPanel&&nextMarkup===lastRenderedMarkup/);
  assert.match(health,/hhAdminScrollActiveV748/);
  assert.match(health,/lastRenderedMarkup=nextMarkup/);
  assert.match(health,/opened\.forEach\(i=>\{if\(details\[i\]\)details\[i\]\.open=true\}\)/);
});
test('Admin has quick Dropbox review navigation but does NOT send a command automatically', () => {
  const start=menu.indexOf('function openDropboxReview()');
  const end=menu.indexOf('const REPAIR_TARGETS=',start);
  assert.ok(start>0 && end>start);
  const shortcut=menu.slice(start,end);
  assert.match(shortcut,/select\('devices',false\)/);
  assert.match(shortcut,/scope\.value='dropbox_account_review'/);
  assert.match(shortcut,/scrollIntoView/);
  assert.doesNotMatch(shortcut,/dispatch\('monika'\)|uploadJson|window\.confirm|deleteFile/);
  assert.match(menu,/hhAdminDropboxReviewShortcutV749/);
});
test('live entry point busts caches for the stability patch', () => {
  assert.match(index,/live-v300\.js\?v=820-admin-workflow-no-reload/);
  assert.match(index,/live-v306\.js\?v=820-admin-stable-healthconnect/);
  assert.match(index,/hh-admin-mobile-focus-v748\.js\?v=748[^"']*ux=820-dropbox-shortcut/);
});
