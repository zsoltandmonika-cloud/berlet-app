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
test('UI does not replace the existing Drive importer or open Google without click',()=>{
 assert.match(gui,/btn\.addEventListener\('click',async function\(\)/);
 assert.match(gui,/window\.location\.assign\(address\)/);
 assert.match(gui,/var state=await send\('status'\)/);
 assert.match(gui,/var verified=await send\('check'\)/);
 assert.match(gui,/A meglévő Drive-kapcsolat változatlan/);
 assert.doesNotMatch(gui,/google\.accounts\.oauth2/);
 assert.doesNotMatch(gui,/localStorage\.setItem|sessionStorage\.setItem/);
 assert.match(index,/v683-server-google-oauth-staged/);
 assert.match(index,/hh-drive-server-oauth-v683\.js\?v=684-refresh-verified/);
 assert.doesNotThrow(()=>new Function(gui));
});