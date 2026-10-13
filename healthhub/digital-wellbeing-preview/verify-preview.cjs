'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
assert.match(html, /DEMO \/ NEM ÉLES/);
assert.match(html, /szintetikus adatokkal/i);
assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/);
assert.doesNotMatch(html, /<script[^>]+src=/);
assert.doesNotMatch(html, /<link[^>]+href=/);
const match = html.match(/<script>([\s\S]+?)<\/script>/);
assert.ok(match, 'inline preview JS script missing');
new vm.Script(match[1], {filename: 'digital-wellbeing-preview.js'});

function element(id, data = {}) {
  return {
    id,
    dataset: data,
    innerHTML: '',
    textContent: '',
    style: {},
    listeners: {},
    attrs: {},
    previousElementSibling: {style: {}},
    classList: {toggle(name, enabled) {this[name] = Boolean(enabled);}},
    setAttribute(name, value) {this.attrs[name] = value;},
    addEventListener(name, cb) {this.listeners[name] = cb;}
  };
}
const ids=['periodLabel','usage','usageSub','evening','eveningSub','chatgpt',
  'coverage','ringTotal','legend','apps','timeline','weekly','categories',
  'lenaHeading','analysisText'];
const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
const profiles=['zsolt','monika'].map(profile=>element(profile,{profile}));
const periods=['day','week','month'].map(period=>element(period,{period}));
const document={
  documentElement:{style:{setProperty(){}}},
  getElementById(id){assert.ok(elements[id], 'unknown element '+id);return elements[id];},
  querySelectorAll(selector) {
    if(selector==='[data-profile]') return profiles;
    if(selector==='[data-period]') return periods;
    throw Error('Unsupported selector '+selector);
  }
};
vm.runInNewContext(match[1], {document, console}, {timeout:2000});
assert.equal(elements.usage.textContent, '3 ó 28 p');
assert.equal(elements.evening.textContent, '1 ó 12 p');
assert.equal(elements.chatgpt.textContent, '1 ó 31 p');
assert.match(elements.analysisText.textContent,/Zsolt/);
assert.equal(profiles[0].attrs['aria-pressed'],'true');
profiles[1].listeners.click();
assert.equal(elements.usage.textContent, '2 ó 43 p');
assert.equal(elements.evening.textContent,'49 p');
assert.match(elements.analysisText.textContent,/Mónika/);
assert.equal(profiles[1].attrs['aria-pressed'],'true');
periods[1].listeners.click();
assert.equal(elements.usage.textContent,'18 ó 20 p');
assert.equal(periods[1].attrs['aria-pressed'],'true');
profiles[0].listeners.click();
assert.equal(elements.usage.textContent,'23 ó 30 p');
periods[2].listeners.click();
assert.equal(elements.usage.textContent,'98 ó 02 p');
assert.equal(elements.coverage.textContent,'638/720');
assert.ok(elements.apps.innerHTML.includes('ChatGPT'));
assert.ok(elements.categories.innerHTML.includes('Kateg'));
assert.equal((elements.timeline.innerHTML.match(/class="hour/g)||[]).length,24);
assert.equal((elements.weekly.innerHTML.match(/class="day"/g)||[]).length,7);
console.log('PASS: static privacy checks, 2-profile isolation, day/week/month controls, 24h timeline, 7d trend.');
