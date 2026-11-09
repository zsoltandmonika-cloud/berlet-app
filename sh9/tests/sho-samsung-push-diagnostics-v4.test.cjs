'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'sh9/notification-center/notification-push-v3.js'),'utf8');
const html=fs.readFileSync(path.join(root,'sh9/notification-center/index.html'),'utf8');
test('permission request stays bound to explicit enable click and is never automatic',()=>{
 assert.match(src,/\$\('ncPushEnable'\)\.addEventListener\('click',\(\)=>\{void enable\(\)\}\)/);
 assert.match(src,/w\.Notification\.permission==='granted'\?'granted':await w\.Notification\.requestPermission\(\)/);
 assert.doesNotMatch(src,/requestPermission\(\).*?refresh\(\)/s);
});
test('unsupported Samsung endpoint and account conflicts are explained without changing subscriptions',()=>{
 assert.match(src,/subscription_owned_by_other_user/);
 assert.match(src,/invalid_endpoint/);
 assert.match(src,/invalid_subscription_keys/);
 assert.match(src,/profile_access_denied/);
 assert.match(src,/registrationIssue\('server',err\)/);
 assert.match(src,/await error\.context\.clone\(\)\.json\(\)/);
});
test('failed registration keeps explanatory message on screen; successful refresh still occurs',()=>{
 assert.match(src,/if\(completed\)void refresh\(\);\s*else toggle\(granted&&!!publicKey,false\)/);
 assert.match(src,/\}catch\(err\)\{status\(registrationIssue\(stage,err\)\)\}/);
});
test('existing Web Push v3 service worker / profile scope is retained',()=>{
 assert.match(src,/SW='\/berlet-app\/sh9\/sw\.js',SCOPE='\/berlet-app\/sh9\/'/);
 assert.match(src,/hh-guardian-family-auth-v785/);
 assert.match(src,/functions\.invoke\('sho-webpush-v3'/);
 assert.match(html,/notification-push-v3\.js\?v=3/);
 assert.doesNotMatch(src,/service_role|SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE/);
});
