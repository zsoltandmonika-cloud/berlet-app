'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sw=read('sh9/sw.js');
const html=read('sh9/notification-center/index.html');
const client=read('sh9/notification-center/notification-push-v3.js');
const server=read('supabase/functions/sho-webpush-v3/index.ts');
const migration=read('supabase/migrations/20261104083000_sho_web_push_v3_pilot.sql');

function worker(){
 const events=new Map(),calls=[],opened=[];
 const location=new URL('https://example.org/berlet-app/sh9/sw.js');
 const self={
  location,registration:{scope:'https://example.org/berlet-app/sh9/',showNotification:async(title,opts)=>calls.push({title,opts})},
  clients:{matchAll:async()=>[],openWindow:async(url)=>opened.push(url)},
  addEventListener:(type,fn)=>events.set(type,fn)
 };
 const caches={};
 vm.runInNewContext(sw,{self,caches,URL,fetch:()=>{}});
 return {events,calls,opened};
}
test('SW keeps narrow previous shell cache and supports push in scope',()=>{
 assert.match(sw,/const CACHE='sh9-install-shell-v2-sho-fancy'/);
 assert.match(sw,/!ALLOWED\.has/);
 assert.match(sw,/addEventListener\('push'/);
 assert.match(sw,/addEventListener\('notificationclick'/);
 assert.doesNotMatch(sw,/HealthHub\/profiles|cache\.put\([^)]*subscription/i);
});
test('generic message appears when the page is closed; cannot render arbitrary content',async()=>{
 const {events,calls,opened}=worker();
 let pending;
 events.get('push')({data:{json:()=>({kind:'sho-test-v3',body:'PRIVATE INFO',url:'https://evil.example'})},waitUntil:p=>pending=p});
 await pending;
 assert.equal(calls.length,1);
 assert.equal(calls[0].title,'SHO · Smart Hub One');
 assert.doesNotMatch(calls[0].opts.body,/PRIVATE INFO/);
 assert.equal(calls[0].opts.data.url,'https://example.org/berlet-app/sh9/notification-center/');
 let click;
 events.get('notificationclick')({notification:{data:calls[0].opts.data,close(){}},waitUntil:p=>click=p});
 await click;
 assert.equal(opened[0],'https://example.org/berlet-app/sh9/notification-center/');
});
test('unknown push messages cannot display anything',async()=>{
 const {events,calls}=worker();
 let promise;
 events.get('push')({data:{json:()=>({kind:'health',title:'test'})},waitUntil:p=>promise=p});
 await promise;
 assert.equal(calls.length,0);
});
test('client never requests permission or registers without an explicit enabled click',()=>{
 assert.match(client,/\$\('ncPushEnable'\)\.addEventListener\('click',/);
 assert.match(client,/Notification\.requestPermission\(\)/);
 assert.match(client,/getSubscription\(\)/);
 assert.match(client,/\.pushManager\.subscribe\(/);
 assert.match(client,/\.unsubscribe\(\)/);
 assert.match(client,/w\.HH_GUARDIAN_LIVE_V785\?\.getClient/);
 assert.match(client,/hh-guardian-family-auth-v785/);
 assert.doesNotMatch(client,/service_role|SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE/);
 assert.match(html,/id="ncPushEnable"/);
 assert.match(html,/id="ncPushDisable"/);
 assert.match(html,/id="ncPushTest"/);
 assert.match(html,/notification-push-v3\.js\?v=3/);
});
test('backend requires real JWT, explicit profile membership, restricts SSRF, and sends generic lockscreen text',()=>{
 assert.match(server,/admin\.auth\.getUser\(token\)/);
 assert.match(server,/hh_profile_access/);
 assert.match(server,/profile_access_denied/);
 assert.match(server,/subscription_owned_by_other_user/);
 assert.match(server,/\.protocol!=='https:'/);
 assert.match(server,/fcm\.googleapis\.com/);
 assert.match(server,/webpush\.sendNotification/);
 assert.match(server,/Próbaértesítés/);
 assert.doesNotMatch(server,/input\.body|input\.title|input\.message/);
 assert.match(server,/verify_jwt/); // documented auth comment
});
test('pilot tables are RLS-locked, service role only, no public subscription exposure',()=>{
 assert.match(migration,/sho_push_devices_v3 enable row level security/);
 assert.match(migration,/sho_push_vapid_v3 enable row level security/);
 assert.match(migration,/revoke all on public\.sho_push_devices_v3 from public, anon, authenticated/);
 assert.match(migration,/revoke all on public\.sho_push_vapid_v3 from public, anon, authenticated/);
 assert.match(migration,/grant select,insert,update,delete on public\.sho_push_devices_v3 to service_role/);
 assert.doesNotMatch(migration,/create policy/);
});
