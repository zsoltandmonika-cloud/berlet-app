'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'ask-lena-mkb-v676.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
test('Ask Léna evidence lens deploys after timeline and integrity auditor',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.match(index,/v677-one-shot-mkb-ai-consent/);
 assert.ok(index.indexOf('mkb-timeline-v674.js')<index.indexOf('ask-lena-mkb-v676.js'));
 assert.ok(index.indexOf('mkb-evidence-audit-v675.js')<index.indexOf('ask-lena-mkb-v676.js'));
 assert.match(source,/healthhub:ask-lena-open/);
 assert.match(source,/hhAskMkbBtn676/);
});
test('no silent external AI transfer, local storage writes or background scanning',()=>{
 assert.doesNotMatch(source,/\.stream\(/);
 assert.doesNotMatch(source,/fetch\(/);
 assert.doesNotMatch(source,/method:\s*['"](?:POST|PATCH|DELETE|PUT)['"]/);
 assert.doesNotMatch(source,/localStorage\.setItem|sessionStorage\.setItem/);
 assert.doesNotMatch(source,/setInterval/);
 assert.doesNotMatch(source,/console\.(?:log|info|debug)/);
 assert.match(source,/button\.addEventListener\('click',read\)/);
 assert.match(source,/nem küldöm automatikusan az AI-nak/);
});
test('every Vault request remains bound to active user-visible profile and source/page QA',()=>{
 assert.match(source,/authorizedProfiles\.includes\(p\)/);
 assert.match(source,/profile_key=eq\./);
 assert.match(source,/check\(p,v\)/);
 assert.match(source,/sourceIds|var sid=/);
 assert.match(source,/auditor\.audit\(facts,ev,sources,docs,pages,digest\)/);
 assert.match(source,/crypto\.subtle\.digest\('SHA-256'/);
 assert.match(source,/window\.addEventListener\('healthhub:profile-changed',reset\)/);
 assert.match(source,/window\.addEventListener\('healthhub:central-auth-changed',reset\)/);
});
test('patient text is rendered via textContent and review status is explicit',()=>{
 assert.match(source,/\.textContent=/);
 assert.doesNotMatch(source,/\.innerHTML\s*=/);
 assert.match(source,/Szakmai ellenőrzésre vár/);
 assert.match(source,/if\(version===v&&profile\(\)===p\)/);
});