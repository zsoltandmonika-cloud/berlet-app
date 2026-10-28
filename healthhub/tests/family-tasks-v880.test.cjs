'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/family-hub/index.html');
const app=read('sh9/family-hub/family-tasks-v880.js');
const notice=read('sh9/family-hub/family-notifier-v880.js');
const schema=read('supabase/migrations/20261027112000_sh9_family_tasks_v880.sql');
test('approved nine SH9 module tiles stay nine',()=>{
 const launch=read('sh9/index.html');
 assert.equal((launch.match(/class="tile"/g)||[]).length,9);
 assert.match(launch,/family-notifier-v880/);
});
test('Quick Add renders input, existing avatars, 3-state RAG and two profiles',()=>{
 assert.match(html,/id="fhTitle"/);assert.match(html,/lang="hu"/);
 assert.match(html,/golden-standard-avatars-v529/);
 assert.match(app,/'monika','zsolt','lena'/);
 assert.match(app,/status:k/);
 assert.match(app,/data-due/);
});
test('clickable sticky note with separate X and deep-link',()=>{
 assert.match(notice,/w.location.assign\(HOME\+\(taskId/);
 assert.match(notice,/event.stopPropagation\(\)/);
 assert.match(notice,/writeAck\(e.id,pkey\);markSeen\(e.id,pkey\)/);
 assert.match(notice,/holder.replaceChildren\(\);drawPending\(\)/);
 assert.match(notice,/postgre?s_changes|postgres_changes/);
});
test('RLS and immutable server-side history, 30-day read, no hidden cron',()=>{
 assert.match(schema,/enable row level security/);
 assert.match(schema,/security_invoker=true/);
 assert.match(schema,/interval '30 days'/);
 assert.match(schema,/before insert or update/);
 assert.match(schema,/after insert or update/);
 assert.match(schema,/revoke insert,update,delete on public.hh_family_task_events from authenticated/);
 assert.doesNotMatch(notice,/setInterval/);
});
test('Family Tasks notifier integrated across agreed pages',()=>{
 for(const f of ['sh9/index.html','healthhub/index.html','healthhub/guardian/index.html','healthhub/nutrition/index.html','healthhub/digital-health/index.html','sh9/smart-travel/index.html']){
  assert.match(read(f),/family-notifier-v880.js/,f);
 }
});

test('v915 firebreak avoids Auth-driven refetch loops and duplicate realtime channels',()=>{
 assert.match(app,/authSyncPending/);
 assert.match(app,/authenticatedFor===user.id&&liveChannel/);
 assert.match(app,/if\(liveChannel&&subscribedFor===user.id\)return/);
 assert.match(app,/event==='SIGNED_OUT'/);
 assert.match(app,/event==='SIGNED_IN'/);
 assert.doesNotMatch(app,/onAuthStateChange\(\(\)=>w\.setTimeout\(authSync/);
 assert.match(notice,/joinInProgress/);
 assert.match(notice,/if\(!force&&ch&&user&&profile\(\)===currentProfile\)return/);
 assert.match(notice,/lastForegroundReadAt>=45000/);
 assert.match(notice,/event==='TOKEN_REFRESHED'|Token refresh/);
 assert.doesNotMatch(notice,/onAuthStateChange\(\(\)=>w\.setTimeout\(join/);
 assert.doesNotMatch(notice,/setInterval/);
});


test('v916 explicit Family Tasks profile switch refreshes UI and profile-scoped lists',()=>{
 const start=app.indexOf("$('fhProfileSwitch').addEventListener('click',()=>{");
 assert.ok(start>=0,'Tasks profile switch handler exists');
 const end=app.indexOf('\n });',start);
 assert.ok(end>start,'profile switch handler is closed');
 const handler=app.slice(start,end);
 assert.ok(handler.includes("localStorage.setItem('hh-profile'"),'persistent profile setting');
 assert.ok(handler.includes('profileUi();'),'immediate avatar/theme update');
 assert.ok(handler.includes('hh-family-profile-changed'),'Buddy observer notified');
 assert.ok(handler.includes('authSync(true);'),'explicit profile refresh bypasses v915 fast path');
 assert.ok(!handler.includes('authSync();'),'unforced auth sync regression absent');
 assert.ok(!app.includes('setInterval('),'no polling introduced');
 const css=read('sh9/family-hub/family-tasks-v881.css');
 assert.ok(css.includes('.fh-hero .fh-owner{') && css.includes('pointer-events:auto'),
  'profile switch remains an interactive target');
});
