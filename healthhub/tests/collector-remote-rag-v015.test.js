'use strict';
// Pure-source RAG regression tests against the admin production implementation.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = readFileSync(join(__dirname, '../live-v305.js'), 'utf8');
const begin = source.indexOf('function rag305(type,d){');
const end = source.indexOf('function ragBadge305(', begin);
assert.ok(begin >= 0 && end > begin, 'RAG function present in Admin');
const rag = vm.runInNewContext(source.slice(begin, end) + '\nrag305;');

function iso(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}
function device({
  phoneAge = 0.2, uploadAge = 0.5, readAge = 1,
  dayAge = 0, sdk = true, enabled = true, token = true,
  error = 'none', needsUserAction = false
} = {}) {
  const latest = new Date(Date.now() - dayAge * 86400000).toISOString().slice(0,10);
  const health = {
    autoEnabled: enabled,
    lastUploadAt: uploadAge == null ? null : iso(uploadAge),
    lastReadAt: iso(readAge),
    latestDataDay: latest, errorKind: error, needsUserAction
  };
  const samsung = {
    autoEnabled: enabled, sdkIncluded: sdk,
    lastVerifiedUploadAt: uploadAge == null ? null : iso(uploadAge),
    lastReadAt: iso(readAge),
    latestDataDay: latest, errorKind: error
  };
  return {deviceType:'android',lastSeenAt: iso(phoneAge),collectorTelemetry:{
    schema:'healthhub.collector.telemetry/1',
    connectedToDropbox:token, healthConnect:health,samsung
  }};
}
test('valid recent device read and uploaded measurement is green', () => {
  const d=device();
  assert.equal(rag('phone',d).level,'green');
  assert.equal(rag('health',d).level,'green');
  assert.equal(rag('samsung',d).level,'green');
  assert.equal(rag('dropbox',d).level,'green');
});
test('old cloud data is NOT green merely because phone checked in', () => {
  assert.equal(rag('samsung',device({uploadAge:10})).level,'amber');
  assert.equal(rag('health',device({uploadAge:30})).level,'red');
});
test('file is fresh but measurement belongs to an old day: amber', () => {
  assert.equal(rag('samsung',device({dayAge:8})).level,'amber');
  assert.equal(rag('health',device({dayAge:8})).level,'amber');
});
test('fresh cloud upload without a recent source READ: amber', () => {
  assert.equal(rag('samsung',device({readAge:13})).level,'amber');
});
test('missing data must be unknown or amber, not success', () => {
  assert.equal(rag('samsung',device({uploadAge:null})).level,'amber');
  assert.equal(rag('health',{lastSeenAt:iso(0.2)}).level,'unknown');
  assert.equal(rag('samsung',device({sdk:false})).level,'unknown');
  assert.equal(rag('samsung',device({enabled:false})).level,'unknown');
});
test('permission and persistent errors require action', () => {
  assert.equal(rag('health',device({needsUserAction:true})).level,'red');
  assert.equal(rag('samsung',device({error:'sdk'})).level,'red');
  assert.equal(rag('dropbox',device({token:false})).level,'red');
});
test('phone has aged out and Dropbox heartbeat is not falsely green', () => {
  const d=device({phoneAge:10});
  assert.equal(rag('phone',d).level,'red');
  assert.equal(rag('dropbox',d).level,'amber');
});
test('future data timestamps never imply good status', () => {
  const d=device();d.collectorTelemetry.samsung.lastReadAt=iso(-48);
  assert.equal(rag('samsung',d).level,'amber');
});
