'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const moduleSrc = read('hh-development-charter-admin-v658.js');
const liveIndex = read('index.html');
const charter = read('docs/healthhub-governance-v1.md');

test('Admin charter source parses and is loaded once, after the standard profile module', () => {
  assert.doesNotThrow(() => new vm.Script(moduleSrc));
  assert.equal(liveIndex.split('hh-development-charter-admin-v658.js').length - 1, 1);
  assert.ok(liveIndex.indexOf('hh-development-charter-admin-v658.js') > liveIndex.indexOf('hh-profile-standard-v652.js'));
  assert.match(liveIndex, /v666-ekg-pdf-recovery/);
});

test('Governance charter names three pillars in admin and Github documentation', () => {
  for (const pillar of ['Gondoskodás', 'Adatismeret', 'Intelligencia']) {
    assert.ok(moduleSrc.includes(pillar), 'admin omits: ' + pillar);
    assert.ok(charter.includes(pillar), 'documentation omits: ' + pillar);
  }
});

test('Admin charter is restricted to visible HH Admin and live data requires verified profile grant', () => {
  assert.match(moduleSrc, /getElementById\('haOv'\)/);
  assert.match(moduleSrc, /getElementById\('haBody'\)/);
  assert.match(moduleSrc, /classList\.contains\('on'\)/);
  assert.match(moduleSrc, /s\.authenticated/);
  assert.match(moduleSrc, /authorizedProfiles\.includes\(p\)/);
  assert.match(moduleSrc, /profile_key=eq\./);
});

test('Dashboard is read-only and keeps private source data out of code and permanent client storage', () => {
  assert.doesNotMatch(moduleSrc, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  assert.doesNotMatch(moduleSrc, /localStorage\.setItem/);
  assert.doesNotMatch(moduleSrc, /console\.(?:log|info|debug)/);
  assert.doesNotMatch(moduleSrc, /service_role|OPENAI_API_KEY|Bearer \+|sha256:[a-f0-9]{64}/);
});

test('Explicit opt-in and no silent medical photo archiving remain documented', () => {
  assert.match(moduleSrc, /külön hozzájárulással/);
  assert.match(charter, /tartalomspecifikus hozzájárulás/);
  assert.match(charter, /nem tekinthető késznek/);
});

test('Agile policy preserves honest five-stage release status', () => {
  for (const stage of ['CODED', 'TESTED', 'DEPLOYED', 'LIVE VERIFIED', 'USER ACCEPTED']) {
    assert.ok(moduleSrc.includes(stage), 'HH Admin lacks ' + stage);
    assert.ok(charter.includes(stage), 'GitHub charter lacks ' + stage);
  }
  assert.match(moduleSrc, /Trial &amp; error/);
  assert.match(moduleSrc, /confirmedDuplicates/);
  assert.match(moduleSrc, /SHA-256 ellenőrizve/);
  assert.match(charter, /no micromanagement/);
});
