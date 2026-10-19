'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const api=fs.readFileSync(path.join(ROOT,'../supabase/functions/hh-drive-oauth-v682/index.ts'),'utf8');
const gui=fs.readFileSync(path.join(ROOT,'hh-drive-server-oauth-v683.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
test('OAuth code model is confidential and cannot silently activate without secrets',()=>{
 for(const v of ['HH_GOOGLE_DRIVE_CLIENT_ID','HH_GOOGLE_DRIVE_CLIENT_SECRET',
  'HH_GOOGLE_DRIVE_ENCRYPTION_KEY','HH_GOOGLE_DRIVE_EXPECTED_EMAIL'])
  assert.match(api,new RegExp(v));
 assert.match(api,/if\(!canRun\(\)\)return reply\(\{configured:false/);
 assert.match(api,/AES-GCM/);
 assert.match(api,/additionalData:new TextEncoder\(\)\.encode\(userId\)/);
 assert.match(api,/refresh_ciphertext/);
 assert.doesNotMatch(gui,/localStorage\.setItem|sessionStorage\.setItem/);
 assert.doesNotMatch(api,/sk-proj-|AIza[0-9A-Za-z_-]{18,}/);
});
test('callback is single-use state with short TTL and checks exact shared Google identity',()=>{
 assert.match(api,/randomBytes\(36\)/);
 assert.match(api,/8\*60\*1000/);
 assert.match(api,/\.delete\(\)\.eq\("state_sha256",await sha\(state\)\)/);
 assert.match(api,/whoGoogle\(token\.access_token\)/);
 assert.match(api,/token\.refresh_token/);
 assert.match(api,/finish\("wrong_account"\)/);
 assert.match(api,/SCOPE="https:\/\/www\.googleapis\.com\/auth\/drive\.file"/);
 assert.match(api,/grant_type:"authorization_code"/);
 assert.match(api,/req\.method==="GET"&&\(task==="callback"\|\|u\.searchParams\.has\("state"\)\)/);
 assert.match(api,/grant_type:"refresh_token"/);
});
test('only authorized Health Vault identities can request start/status/check/disconnect',()=>{
 assert.match(api,/client\.auth\.getUser\(jwt\)/);
 assert.match(api,/hh_profile_access/);
 assert.match(api,/req\.headers\.get\("origin"\)!==ORIGIN/);
 assert.match(api,/if\(!owner\)return reply\(\{error:"health_vault_required"\},401\)/);
 assert.doesNotMatch(api,/(?:console\.log|console\.info)\(/);
});
test('UI retains controlled OAuth consent, verifies private PDF source read, and never exposes Google tokens',()=>{
 assert.match(gui,/btn\.addEventListener\('click',async function\(\)/);
 assert.match(gui,/window\.location\.assign\(address\)/);
 assert.match(gui,/var state=await send\('status'\)/);
 assert.match(gui,/var verified=await send\('check'\)/);
 assert.match(gui,/action:'archive_inventory',profile:who/);
 assert.match(gui,/hhDriveInventoryResultV686/);
 assert.match(gui,/function showInventory\(profile,message,canProbe\)/);
 assert.match(gui,/function renderInventory\(\)/);
 assert.match(gui,/régebbi Drive JSON-szinkron külön ellenőrzendő/);
 assert.doesNotMatch(gui,/google\.accounts\.oauth2/);
 assert.doesNotMatch(gui,/localStorage\.setItem|sessionStorage\.setItem/);
 assert.match(index,/v697-ask-lena-model-provenance/);
 assert.match(index,/hh-drive-server-oauth-v683\.js\?v=689-server-pdf-cleanup/);
 assert.doesNotThrow(()=>new Function(gui));
});
test('v685 Google Drive gateway is read-only, patient-scoped and checks each PDF parent',()=>{
 assert.match(api,/async function profileAllowed\(owner,profile\)/);
 assert.match(api,/\.eq\("user_id",owner\)\.eq\("profile_key",profile\)/);
 assert.match(api,/async function exactArchiveFolder\(access,profile\)/);
 assert.match(api,/f\.parents\?\.includes\(folder\)/);
 assert.match(api,/m\.parents\.includes\(folder\)/);
 assert.match(api,/if\(op==="archive_inventory"\|\|op==="archive_pdf"\|\|op==="archive_document"\)/);
 assert.match(api,/refreshedAccess\(owner\)/);
 assert.match(api,/drive_pdf_invalid_signature/);
 assert.doesNotMatch(api,/grant_type:"password"/);
});

test('v690 build metadata matches the live runtime, auto-update checker and asset cache keys',()=>{
 const updater=fs.readFileSync(path.join(ROOT,'live-v300.js'),'utf8');
 const declared=index.match(/name="healthhub-live-build" content="([^"]+)"/)[1];
 const runtime=index.match(/window\.HH_LIVE_BUILD='([^']+)'/)[1];
 const bootstrap=index.match(/var v='([^']+)'/)[1];
 assert.equal(declared,runtime);
 assert.equal(declared,'v'+bootstrap);
 assert.match(gui,/hhDrivePdfProofV688/);
 assert.match(gui,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
 assert.match(gui,/await pdfResponse\('archive_pdf',who,target\.id\)/);
 assert.match(gui,/function validateCurrentProfile\(profile\)/);
 assert.doesNotThrow(()=>new Function(gui));
 assert.match(index,/live-v300\.js\?v=687-asset-aware-auto-update/);
 assert.match(updater,/function changedPublishedModules\(html\)/);
 assert.match(updater,/recentlyAttemptedUpdate\(target,n\)/);
 assert.doesNotThrow(()=>new Function(updater));
});

test('v689 MKB ingester uses server Drive for original-only, no browser Google tokens',()=>{
 const ing=fs.readFileSync(path.join(ROOT,'knowledge-v407-ingest.js'),'utf8');
 const admin=fs.readFileSync(path.join(ROOT,'hh-mkb-batch-admin-v662.js'),'utf8');
 assert.match(ing,/driveVault\('archive_inventory',p\)/);
 assert.match(ing,/driveVault\('archive_pdf',p,file\.id\)/);
 assert.match(ing,/CORE\.isPdfSignature\(new Uint8Array\(bytes\)\)/);
 assert.match(admin,/knowledge-v407-ingest\.js\?v=696-readonly-failed-page-diagnostic/);
 assert.match(admin,/async function requireDrive\(who\)/);
 assert.doesNotMatch(ing,/hhGetGoogleDriveToken292|https:\/\/www\.googleapis\.com\/drive/);
 assert.doesNotMatch(admin,/hhGetGoogleDriveToken292/);
 assert.doesNotThrow(()=>new Function(ing));
 assert.doesNotThrow(()=>new Function(admin));
});
test('v689 Ask Léna original archive uses patient-tagged server PDF only with Vault access',()=>{
 const ev=fs.readFileSync(path.join(ROOT,'live-v364-evidence.js'),'utf8');
 assert.match(ev,/action:'archive_document',profile:p,documentId:documentId/);
 assert.match(ev,/state\.authorizedProfiles\.includes\(p\)/);
 assert.match(ev,/archive&&archive\.profile&&archive\.profile!==p/);
 assert.match(ev,/idbOriginal\(d\.id,p\)/);
 assert.doesNotMatch(ev,/hhGetGoogleDriveToken292|https:\/\/www\.googleapis\.com\/drive/);
 assert.match(api,/m\.appProperties\?\.documentId!==documentId/);
 assert.match(api,/matches\.length!==1/);
 assert.doesNotThrow(()=>new Function(ev));
});
