'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
const v305=fs.readFileSync(path.join(base,'live-v305.js'),'utf8');
const one=fs.readFileSync(path.join(base,'hh-one-rag-v500.js'),'utf8');
const home=fs.readFileSync(path.join(base,'index.html'),'utf8');
for(const n of ["'ota'","'diagnostics'","verifiedPhoneRegistry()","eligiblePhone(d,r,profileScope)"])
 assert.ok(v305.includes(n),'Missing safe remote scope or registry gate: '+n);
assert.match(v305,/if\(scope==='diagnostics'&&selected\.some/,'native diag capability must be checked');
assert.match(v305,/d\.capabilities\.includes\('diagnostics'\)/,'opt-in native status');
assert.match(v305,/Number\(d\.buildCode\)<21/,'new diag requires updated agent');
assert.match(v305,/if\(scope==='ota'&&selected\.some/,'OTA requires compatible Connect');
assert.match(one,/Number\(d\.buildCode\)>=20/,'OTA should work on current Connect v0.14');
assert.match(one,/sendRemote\(p,d\.deviceId,'ota'\)/);
assert.match(one,/sendRemote\(p,d\.deviceId,'diagnostics'\)/);
assert.match(one,/root\.hhOrchestratorDispatchScope355\(owner,id,kind\)/);
assert.match(one,/state\.registry\.activePhones\[owner\]===id/,'prevent sending to other device');
assert.match(one,/root\.confirm\(/,'operator confirmation required');
assert.match(one,/NEM automatikus telepítés/);
assert.match(one,/if\(diag&&st\.state==='done'/,'show actual result only on completed phone reply');
assert.match(home,/live-v305\.js\?v=502-remote-diag-ota/);
assert.match(home,/hh-one-rag-v500\.js\?v=504-glass-top-left/);
assert.equal(home.match(/healthhub-live-build" content="([^"]+)"/)?.[1],
 'v'+home.match(/var v='([^']+)'/)?.[1]);
console.log('HH One v502 web-only remote OTA/diagnostics status UI PASS.');
