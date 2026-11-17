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
test('approved 12 SHO launcher tiles remain unchanged by Family Tasks work',()=>{
 const launch=read('sh9/index.html');
 assert.equal((launch.match(/class="tile"/g)||[]).length,12);
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
 assert.match(notice,/lastForegroundReadAt>=180000/);
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

test('v917 Buddy anti-spike guard keeps notifications live and avoids fake profile events',()=>{
 assert.match(notice,/w\.addEventListener\('hh-family-profile-changed',\(\)=>join\(\)\)/);
 assert.doesNotMatch(notice,/w\.addEventListener\('hh-family-profile-changed',join\)/);
 assert.match(notice,/event==='SIGNED_IN'&&joinInProgress&&!user/);
 assert.match(notice,/if\(unreadInFlight\.has\(p\)\)return unreadInFlight\.get\(p\)/);
 assert.match(notice,/const merged=new Map/);
 assert.match(notice,/newer\.filter\(e=>Number\(e\.id\)>seen\(p\)/);
 assert.match(notice,/api\.channel\('hh-family-notifier-v880-'/);
 assert.match(notice,/\.on\('postgres_changes',\{event:'INSERT'/);
 assert.match(notice,/\.on\('postgres_changes',\{event:'\*',schema:'public',table:ACK_TABLE/);
 assert.doesNotMatch(notice,/setInterval/);
});


test('assigned shopping-list preparation task opens the EXISTING shared Smart List in one tap',()=>{
 const source=read('sh9/family-hub/family-tasks-v880.js');
 const shop=read('sh9/shopping/smart-list-v1.js');
 const style=read('sh9/family-hub/family-tasks-smart-list-link-v1.css');
 const start=app.indexOf('function isSmartListAssignment(t){');
 const end=app.indexOf('function setStats(){',start);
 assert.ok(start>=0&&end>start,'Task matching is isolated and explicit');
 const match=new Function('self','isClosed',app.slice(start,end)+'\nreturn isSmartListAssignment;')(
  ()=>'monika',task=>task.status==='done'||task.status==='failed'
 );
 const task={title:'Bevásárló lista összeállítása',assigned_profile:'monika',assigned_agent:null,status:'todo'};
 assert.equal(match(task),true);
 assert.equal(match({...task,title:'Bevásárlólista összeállítása'}),true);
 assert.equal(match({...task,title:'Bevásárlási lista összeállítása'}),true);
 assert.equal(match({...task,title:'Smart List előkészítése'}),true);
 assert.equal(match({...task,assigned_profile:'zsolt'}),false,'Other assignee cannot get task CTA');
 assert.equal(match({...task,assigned_agent:'lena'}),false,'AI tasks have no external task link');
 assert.equal(match({...task,status:'done'}),false,'Completed tasks do not show CTA');
 assert.equal(match({...task,status:'failed'}),false,'Failed tasks do not show CTA');
 assert.equal(match({...task,title:'Bevásárlás a Tescóban'}),false,'Other shopping tasks remain normal');
 const linkBlock=app.slice(app.indexOf("if(isSmartListAssignment(t)){"),app.indexOf("const provenance=element",app.indexOf("if(isSmartListAssignment(t)){")));
 assert.match(linkBlock,/button\('🛒 Közös Smart List megnyitása','fh-smart-list-task-link'/);
 assert.match(linkBlock,/w\.location\.assign\('\/berlet-app\/sh9\/shopping\/smart-list\.html'\)/);
 assert.match(linkBlock,/card\.append\(listLink\)/);
 assert.doesNotMatch(linkBlock,/fetch\(|from\(TABLE\)|changeTask\(/);
 const navigations=[];
 const buttons=[];
 const fakeCard={append(node){buttons.push(node)}};
 const fakeButton=(text,cls,handler)=>({
  text,cls,type:'button',
  setAttribute(){},title:'',click:handler
 });
 const simulate=new Function('t','isSmartListAssignment','button','card','w',linkBlock);
 simulate(task,match,fakeButton,fakeCard,{location:{assign:url=>navigations.push(url)}});
 assert.equal(buttons.length,1,'Assignee sees one actionable Smart List button');
 buttons[0].click();
 assert.deepEqual(navigations,['/berlet-app/sh9/shopping/smart-list.html'],
  'Actual user click navigates to the existing shared list');
 assert.equal(task.status,'todo','Navigation never mutates task status');
 buttons.length=0;
 simulate({...task,assigned_profile:'zsolt'},match,fakeButton,fakeCard,{location:{assign:url=>navigations.push(url)}});
 assert.equal(buttons.length,0,'Wrong profile sees no button');
 assert.match(html,/family-tasks-smart-list-link-v1\.css\?v=2-highlight/);
 assert.match(style,/rgba\(34,111,119,\.88\)/);
 assert.match(style,/rgba\(144,63,133,\.84\)/);
 assert.match(style,/min-height:45px!important/);
 assert.match(html,/family-tasks-v880\.js\?v=1066-status-note-voice&smartList=2-direct-click/);
 assert.match(style,/\.fh-card \.fh-smart-list-task-link/);
 assert.match(shop,/hh_shopping_list_v1/);
 assert.match(shop,/storageKey:'hh-guardian-family-auth-v785'/);
 assert.match(source,/storageKey:'hh-guardian-family-auth-v785'/);
});


test('V1 RAG priority is separate from status; manual sorting uses cloud-backed display_rank',async()=>{
 const css=read('sh9/family-hub/family-tasks-priority-order-v1.css');
 const sql=read('supabase/migrations/20261117104547_family_tasks_preset_importance_order_v1.sql');
 assert.match(html,/family-tasks-priority-order-v1\.css\?v=1/);
 assert.match(html,/&priorityOrder=1/);
 assert.match(html,/▲ ▼ Sorrend/);
 assert.match(sql,/add column if not exists importance text not null default 'normal'/);
 assert.match(sql,/add column if not exists display_rank numeric\(14,4\)/);
 assert.match(sql,/check \(importance in \('high','medium','normal'\)\)/);
 assert.match(sql,/row_number\(\) over\(order by c\.sort_order,p\.sort_order/);
 assert.doesNotMatch(sql,/drop table|disable row level security|grant .* to anon/i);
 assert.match(css,/fh-preset-chip\[data-importance="high"\]/);
 assert.match(css,/fh-preset-chip\[data-importance="medium"\]/);
 assert.match(css,/fh-preset-chip\[data-importance="normal"\]/);
 assert.match(css,/fh-preset-order-button/);
 assert.match(css,/fh-priority-badge/);
 assert.match(app,/\.select\('id,category_id,title,sort_order,active,importance,display_rank'\)/);
 assert.match(app,/btn\.setAttribute\('aria-pressed',String\(importanceOf\(p\)===key\)\)/);
 assert.match(app,/if\(!panel\.hidden\)void loadCategories\(\)/);
 assert.match(app,/card\.dataset\.importance=kind/);
 assert.match(app,/if\(t\.status!=='todo'\)/); // existing completion-state RAG still independent
 const categories=[{id:'cat',sort_order:10,active:true}];
 const presets=[
  {id:'a',category_id:'cat',title:'A',sort_order:10,display_rank:1000,importance:'normal',active:true},
  {id:'b',category_id:'cat',title:'B',sort_order:20,display_rank:2000,importance:'medium',active:true},
  {id:'c',category_id:'cat',title:'C',sort_order:30,display_rank:3000,importance:'high',active:true}
 ];
 const begin=app.indexOf('const IMPORTANCE='), end=app.indexOf('function defaultCategory(){',begin);
 assert.ok(begin>0&&end>begin);
 const model=new Function('categoryRows','presetRows',
  app.slice(begin,end)+'\nreturn {IMPORTANCE,importanceOf,activeTaskTemplates,priorityRank,taskTemplate};')(categories,presets);
 assert.deepEqual(model.activeTaskTemplates().map(x=>x.id),['a','b','c']);
 assert.equal(model.importanceOf(presets[1]),'medium');
 assert.equal(model.importanceOf({importance:'bad'}),'normal');
 const changes=[];const notifications=[];
 const mockApi={
  from:table=>{
   assert.equal(table,'hh_family_task_presets');
   return {update:patch=>({
    eq:(column,id)=>{
     assert.equal(column,'id');
     return {select:async columns=>{
      assert.equal(columns,'id');
      Object.assign(presets.find(x=>x.id===id),patch);
      changes.push({id,...patch});
      return {data:[{id}],error:null};
     }};
    }
   })};
  }
 };
 const saveStart=app.indexOf('async function updatePresetImportance(p,next){');
 const saveEnd=app.indexOf('function renderPresetEditor(){',saveStart);
 assert.ok(saveStart>0&&saveEnd>saveStart);
 const actions=new Function('api','user','authorized','self','PRESET_TABLE','categoryFeedback',
  'loadCategories','IMPORTANCE','importanceOf','activeTaskTemplates','priorityRank',
  'let presetEditBusy=false;\n'+app.slice(saveStart,saveEnd)+'\nreturn {updatePresetImportance,movePreset};')(
   mockApi,{id:'user'},['monika'],()=> 'monika','hh_family_task_presets',
   value=>notifications.push(value),async()=>{},model.IMPORTANCE,model.importanceOf,
   model.activeTaskTemplates,model.priorityRank
  );
 await actions.movePreset(presets[2],-1);
 assert.deepEqual(model.activeTaskTemplates().map(x=>x.id),['a','c','b']);
 assert.equal(presets[2].display_rank,1500);
 await actions.updatePresetImportance(presets[0],'high');
 assert.equal(presets[0].importance,'high');
 assert.equal(changes.length,2);
 assert.ok(notifications.some(x=>/✓/.test(x)));
 // Saved task status remains a completely separate property.
 assert.equal(Object.hasOwn(presets[0],'status'),false);
});
