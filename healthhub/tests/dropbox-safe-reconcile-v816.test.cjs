'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'live-v161.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'device-registry-v401.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt'), 'utf8');
const oldToken = {access_token:'old-access', refresh_token:'old-refresh', account_id:'dbid-old-cEjkW3UM', expires_at:9999999999999};
function storage(initial={}) {
 const m = new Map(Object.entries(initial));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),dump:()=>Object.fromEntries(m)};
}
function makeApp({callback=false,accountId='dbid-new-QbVL0JOo',expected='QbVL0JOo'}={}) {
 const state='web_123456789012345678901234';
 const pk={verifier:'test-pkce',state,expectedSuffix:expected,createdAt:Date.now()};
 const local=storage({'hh-dropbox-token-v2':JSON.stringify(oldToken),...(callback?{'hh-dropbox-pkce-v2':JSON.stringify(pk)}:{})});
 const session=storage();
 const location={href:'https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/'+(callback?'?code=good-code-1234&state='+state:'')};
 let redirects=0;
 let fetches=0;
 const doc={documentElement:{dataset:{}},getElementById:()=>null,createElement:()=>({textContent:'',id:''}),head:{appendChild:()=>{}}};
 const win={location,healthSectionKind:'other',addEventListener:()=>{},toast:()=>{}};
 const ctx={window:win,document:doc,location,localStorage:local,sessionStorage:session,
  Date,Promise,URL,URLSearchParams,TextEncoder,console,
  setTimeout:()=>1,btoa:s=>Buffer.from(s,'binary').toString('base64'),
  crypto:{getRandomValues:b=>b.fill(42),subtle:{digest:async()=>new Uint8Array(32).buffer}},
  history:{replaceState:()=>{redirects++;}},
  fetch:async()=>{fetches++;return{ok:true,json:async()=>({access_token:'new-access',refresh_token:'new-refresh',
    expires_in:14400,account_id:accountId})};}
 };
 vm.runInNewContext(source,ctx);
 return {win,local,location,get redirects(){return redirects},get fetches(){return fetches}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('verified new account is the only condition that replaces the previous web token',async()=>{
 const app=makeApp({callback:true});await tick();
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-token-v2')).refresh_token,'new-refresh');
 assert.equal(app.local.getItem('hh-dropbox-pkce-v2'),null);
 assert.equal(app.local.getItem('hh-dropbox-account-repair-note-v1'),null);
 assert.equal(app.redirects,1);
});
test('matched Dropbox reauthorization enables read-only verification before any local merge',async()=>{
 const app=makeApp({callback:true});await tick();
 assert.equal(app.win.HH_DROPBOX_VAULT.readOnlyVerification(),true);
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-readonly-reconcile-v1')).expectedSuffix,'QbVL0JOo');
 await assert.rejects(app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/test.json',{ok:true}),/ellenőrző mód/);
 assert.equal(await app.win.HH_DROPBOX_VAULT.autoSync('monika','startup'),false);
 app.win.hhDropboxApproveReconcile();
 assert.equal(app.local.getItem('hh-dropbox-readonly-reconcile-v1'),null);
 assert.equal(app.win.HH_DROPBOX_VAULT.readOnlyVerification(),false);
});
test('read-only mode permits only explicitly confirmed device-registry metadata and backups',async()=>{
 const app=makeApp({callback:true});await tick();
 assert.equal(app.win.HH_DROPBOX_VAULT.readOnlyVerification(),true);
 await assert.rejects(app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/profiles/monika-health-connect.json',{}),/ellenőrző mód/);
 await assert.rejects(app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/profiles/monika-vault.json',{}),/ellenőrző mód/);
 await assert.rejects(app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/orchestrator/commands/unsafe.json',{}),/ellenőrző mód/);
 await app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/orchestrator/device-registry-v401.json',{schema:'healthhub.device_registry/1'});
 await app.win.HH_DROPBOX_VAULT.uploadJson('/HealthHub/orchestrator/device-registry-backup-2026-11-09T22-04-42-381Z-abcdef.json',{previous:{}});
 assert.equal(app.win.HH_DROPBOX_VAULT.readOnlyVerification(),true);
});
test('read-only reconciliation must also suppress background Health Connect imports',()=>{
 const importer=fs.readFileSync(path.join(root,'live-v165.js'),'utf8');
 assert.match(importer,/HH_DROPBOX_VAULT\?\.readOnlyVerification\?\.\(\)/);
 assert.match(source,/requireVaultWriteAllowed\(\)/);
});

test('different Dropbox account never overwrites existing refresh token',async()=>{
 const app=makeApp({callback:true,accountId:'dbid-other-cEjkW3UM'});await tick();
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-token-v2')).refresh_token,'old-refresh');
 assert.match(app.local.getItem('hh-dropbox-account-repair-note-v1'),/kapott cEjkW3UM, várt QbVL0JOo/);
 assert.equal(app.redirects,1);
});
test('account ID missing from OAuth response is fail-closed',async()=>{
 const app=makeApp({callback:true,accountId:''});await tick();
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-token-v2')).refresh_token,'old-refresh');
 assert.match(app.local.getItem('hh-dropbox-account-repair-note-v1'),/ismeretlen/);
});
test('explicit account switch only starts browser auth; invalid suffix leaves old credentials intact',async()=>{
 const app=makeApp();
 await assert.rejects(app.win.HH_DROPBOX_VAULT.switchToAccount('BAD'),/8 karakter/);
 assert.equal(app.location.href,'https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/');
 await app.win.HH_DROPBOX_VAULT.switchToAccount('QbVL0JOo');
 assert.match(app.location.href,/force_reapprove=true/);
 assert.match(app.location.href,/oauth2\/authorize/);
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-pkce-v2')).expectedSuffix,'QbVL0JOo');
 assert.equal(JSON.parse(app.local.getItem('hh-dropbox-token-v2')).refresh_token,'old-refresh');
});
test('admin and native repair refuse silent profile changes or remote deletion',()=>{
 assert.match(registry,/Biztonságos Dropbox-egyeztetés/);
 assert.match(registry,/data-hh-reg-action="account-switch"/);
 assert.match(registry,/switchToAccount\(expected\)/);
 assert.doesNotMatch(registry,/localStorage\.clear\(|indexedDB\.deleteDatabase\(/);
 assert.match(main,/dropbox_last_repair_status_v1/);
 assert.match(main,/showDropboxRepairStatus\(status\.text\.toString\(\)\)/);
 assert.match(main,/dropbox_expected_account_suffix_v1/);
 assert.match(main,/A korábbi Dropbox-kapcsolat megmaradt/);
 assert.doesNotMatch(source,/localStorage\.clear\(|indexedDB\.deleteDatabase\(/);
});

test('Admin account reconciliation remains available when the legacy Dropbox device registry is missing',()=>{
 assert.match(registry,/if\(cloud\(\)\)\{\s+if\(nativeCount===0\)/);
 assert.doesNotMatch(registry,/if\(registry&&cloud\(\)&&nativeCount===0\)/);
 assert.match(registry,/A Dropbox-fiók ellenőrzése a régi eszközregiszter betöltése nélkül is elérhető/);
 assert.match(registry,/data-hh-reg-action="account-switch"/);
 assert.match(registry,/switchToAccount\(expected\)/);
 assert.doesNotMatch(registry,/localStorage\.clear\(|indexedDB\.deleteDatabase\(/);
});
