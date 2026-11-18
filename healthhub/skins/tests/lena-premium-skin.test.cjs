'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const css=fs.readFileSync(path.join(__dirname,'../lena-premium-v1.css'),'utf8');
const demo=fs.readFileSync(path.join(__dirname,'../preview.html'),'utf8');
const doc=fs.readFileSync(path.join(__dirname,'../README.md'),'utf8');
const live=fs.readFileSync(path.join(root,'sleep-premium-v1172.css'),'utf8');
const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sho=fs.readFileSync(path.join(root,'sleep-one/index.html'),'utf8');

test('V1 skin is opt-in, namespaced and profile-colored without root/global resets',()=>{
 assert.match(css,/\[data-hh-skin="lena-premium"\]/);
 assert.match(css,/\[data-hh-profile="zsolt"\]/);
 assert.match(css,/--lp-accent:#f0a5d7/);
 assert.match(css,/--lp-accent:#97d2ff/);
 assert.doesNotMatch(css,/(^|\n)\s*(html|body|:root|\*|\.hhSleepPage|#hhSleepPage|\.hh428Card)\s*\{/m);
 const rules=css.match(/[^{}]+\{[^{}]*\}/g)||[];
 assert.ok(rules.length>=48,'skin contains a reusable token/component system');
 for(const rule of rules){
  const selector=rule.slice(0,rule.indexOf('{')).trim();
  if(!selector||selector.startsWith('/*')||selector.startsWith('@'))continue;
  assert.ok(selector.includes('[data-hh-skin="lena-premium"]'),
   'component selector must stay inside opt-in skin namespace: '+selector.slice(0,80));
 }
});
test('V1 includes reusable visual building blocks and accessible mobile treatment',()=>{
 for(const component of [
  '.lp-shell','.lp-hero','.lp-eyebrow','.lp-title','.lp-panel','.lp-card',
  '.lp-card--feature','.lp-grid--three','.lp-grid--four','.lp-stat',
  '.lp-stat--highlight','.lp-stat__value','.lp-badge--accent',
  '.lp-badge--success','.lp-badge--warning','.lp-badge--muted',
  '.lp-banner','.lp-button','.lp-button--ghost','.lp-nav'
 ])assert.ok(css.includes(component),'missing '+component);
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\@media\(max-width:375px\)/);
 let level=0;for(const ch of css){if(ch==='{')level++;if(ch==='}')level--;assert.ok(level>=0,'unexpected closing CSS brace')}
 assert.equal(level,0,'balanced CSS rules');
});
test('V1 is a skin only; no health storage, permissions, network or code side effects',()=>{
 assert.doesNotMatch(css,/https?:\/\/|@import|@font-face|fetch\(|XMLHttpRequest|script\s*>|supabase|dropbox|HealthConnectClient|localStorage|indexedDB|setInterval|navigator\./i);
 assert.doesNotMatch(demo,/https?:\/\/|fetch\(|XMLHttpRequest|supabase|dropbox\.|indexedDB|localStorage|HealthConnectClient|requestPermissions|serviceWorker/i);
 assert.match(demo,/data-hh-skin="lena-premium"/);
 assert.match(demo,/data-hh-profile="monika"/);
 assert.match(demo,/data-switch="zsolt"/);
 assert.match(demo,/aria-pressed/);
 assert.match(demo,/aria-live="polite"/);
 assert.match(demo,/nem élő HealthHub adat/);
 assert.match(doc,/Sleep v1173/);
 assert.match(doc,/Opt-in only/);
});
test('Existing approved Sleep v1173 remains untouched and does not auto-import the pack',()=>{
 assert.match(live,/v1173 · Approved Léna Premium demo-fidelity/);
 assert.match(entry,/sleep-premium-v1172\.css\?v=1173-lena-demo-fidelity/);
 assert.match(sho,/sleep-premium-v1172\.css\?v=1173-lena-demo-fidelity/);
 assert.doesNotMatch(entry,/skins\/lena-premium-v1\.css/);
 assert.doesNotMatch(sho,/skins\/lena-premium-v1\.css/);
 assert.match(doc,/nem.*automatikusan bekötve/);
});
