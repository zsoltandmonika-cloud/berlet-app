const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../sh9/smart-travel/public-transport/volan');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'volan-bus-info-v1.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'volan-bus-info-v1.css'), 'utf8');

test('Buszinfó is the only interactive Volán preview card', () => {
  assert.equal((html.match(/id="volan-bus-info-trigger"/g) || []).length, 1);
  assert.match(html, /<button class="volan-bus-card volan-bus-info-trigger"[^>]*aria-haspopup="dialog"/);
  assert.match(html, /<span class="volan-cardtext"><strong>Buszinfó<\/strong>/);
  assert.match(html, /<strong>Megállói indulások<\/strong>/);
  assert.match(html, /<strong>Volán menetrend<\/strong>/);
  assert.match(html, /volan-bus-info-v1\.css/);
  assert.match(html, /volan-bus-info-v1\.js/);
});

test('Golden Glass mobile dialog has accessible controls and keeps profile theming', () => {
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(script, /aria-modal=\\"true\\"/);
  assert.match(script, /aria-labelledby=\\"volan-bi-title\\"/);
  assert.match(script, /document\.addEventListener\('keydown',onKey\)/);
  assert.match(script, /e\.key==='Escape'/);
  assert.match(style, /data-profile="m"/);
  assert.match(style, /max-height:min\(92dvh,820px\)/);
});

test('Unconnected official data source cannot show fabricated amenities or times', () => {
  assert.match(script, /d\.source==='official'&&d\.verified===true/);
  assert.match(script, /'Nincs adat'/);
  assert.match(script, /'Menetrend nem ellenőrzött'/);
  assert.doesNotMatch(script, /14:15|18:05|230 km|960|supabase|fetch\(/i);
});
