const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const health=require(path.join(dir,'rail-health-v610.js'));
const personal=require(path.join(dir,'rail-personal-v607.js'));
const journeys=require(path.join(dir,'rail-journey-manager-v608.js'));
const backup=require(path.join(dir,'rail-backup-v609.js'));
const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const code=fs.readFileSync(path.join(dir,'rail-health-v610.js'),'utf8');
const NOW=new Date('2026-10-28T17:00:00.000Z');
function env(){
 const data=new Map(),reads=[],nodes=new Map(),writes=[];
 const storage={
  getItem:key=>{reads.push(key);return data.has(key)?data.get(key):null},
  setItem:(key,value)=>{writes.push(key);data.set(key,value)},
  removeItem:key=>{writes.push(key);data.delete(key)}
 };
 const el=id=>{
  if(!nodes.has(id)){
   const events={};
   nodes.set(id,{id,type:'',dataset:{},events,children:[],textContent:'',value:'',
    addEventListener:(name,fn)=>events[name]=fn,
    append(...children){this.children.push(...children)},
    replaceChildren(...children){this.children=[];this.append(...children)}});
  }
  return nodes.get(id);
 };
 for(const id of [
  'rail-date','rail-time','when','rail-date-trigger','rail-time-trigger',
  'dateTxt','timeTxt','profile','profile-photo','find','from','to',
  'rail-health-run','rail-health-results','rail-health-summary','rail-health-checked'
 ])el(id);
 el('rail-date').type='date';el('rail-time').type='time';el('when').type='datetime-local';
 el('rail-date').showPicker=()=>{throw Error('health check must never open native picker')};
 el('rail-time').showPicker=()=>{throw Error('health check must never open time picker')};
 const doc={
  getElementById:el,documentElement:{dataset:{profile:'z'}},
  querySelector:s=>['now','depart','arrive'].some(m=>s==='[data-mode="'+m+'"]')?{dataset:{mode:s}}:null,
  createElement:tag=>({tagName:tag,dataset:{},children:[],append(...children){this.children.push(...children)}})
 };
 const win={
  localStorage:storage,SH9_MAV_PERSONAL_V607:personal,SH9_MAV_JOURNEY_MANAGER_V608:journeys,
  SH9_MAV_BACKUP_V609:backup,SH9_MAV_PERSONAL_UI:{render(){}},
  SH9_MAV_JOURNEYS_UI:{render(){}},
  SH9_MAV_JOURNEYS_INSTANCE:{currentQuery:()=>null,showTimetable(){}},
  SH9_MAV_GTFS_CONFIG:{enabled:false},
  SH9_MAV_GTFS_CORE_V1:{route(){}},
  SH9_MAV_GOOGLE_ROUTES_CONFIG:{enabled:false,maxRequestsPerSession:6,cooldownSeconds:30}
 };
 return {data,reads,writes,nodes,el,doc,win,storage};
}
function row(report,id){const v=report.results.find(x=>x.id===id);assert.ok(v,'missing RAG check '+id);return v}
test('Phase 2H default: six local passes, two expected disabled provider warnings, no false live timetable',()=>{
 const e=env(),report=health.inspect(e.doc,e.win,NOW);
 assert.equal(report.results.length,8);
 assert.deepEqual(report.counts,{ok:6,warn:2,error:0});
 assert.equal(row(report,'calendar').state,'ok');
 assert.equal(row(report,'profile').state,'ok');
 assert.equal(row(report,'storage').state,'ok');
 assert.equal(row(report,'backup').state,'ok');
 assert.equal(row(report,'planner').state,'ok');
 assert.equal(row(report,'gtfs').state,'warn');
 assert.equal(row(report,'google').state,'warn');
 assert.equal(row(report,'traffic').state,'ok');
 assert.match(row(report,'gtfs').detail,/kikapcsolva/);
 assert.match(row(report,'google').detail,/kikapcsolva/);
});
test('Health check reads but never writes localStorage, calls fetch or invokes native pickers',()=>{
 const e=env(),now=NOW.getTime();
 personal.saveFavorite(e.storage,'z',{from:'Budapest-Keleti',to:'Kazincbarcika'});
 journeys.create(e.storage,'m',{
  from:'Budapest-Nyugati',to:'Győr',mode:'depart',when:'2026-10-30T16:55',
  ticket:'VERYPRIVATE-332',note:'SENSITIVE-NOTE-PRIVATE'
 },now,.3);
 const before=new Map(e.data);
 e.writes.length=0;
 const report=health.inspect(e.doc,e.win,NOW);
 assert.equal(report.counts.error,0);
 assert.deepEqual([...e.data],[...before]);
 assert.deepEqual(e.writes,[],'health check should not invoke write');
 const output=JSON.stringify(report);
 assert.doesNotMatch(output,/VERYPRIVATE-332|SENSITIVE-NOTE-PRIVATE|Kazincbarcika|Győr/);
 assert.equal(e.reads.length>0,true);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|setInterval\s*\(|navigator\.geolocation|\.setItem\s*\(|\.removeItem\s*\(|\.restore\s*\(|\.showPicker\s*\(|\.innerHTML\s*=/);
});
test('If native picker API is unavailable show amber, not an invented touchscreen pass',()=>{
 const e=env();delete e.el('rail-date').showPicker;
 const report=health.inspect(e.doc,e.win,NOW);
 assert.equal(row(report,'calendar').state,'warn');
 assert.match(row(report,'calendar').detail,/érintéssel/i);
 e.nodes.delete('rail-date-trigger');
 // e.el always remakes nodes so override missing getElementById explicitly.
 e.doc.getElementById=id=>id==='rail-date-trigger'?null:e.el(id);
 assert.equal(row(health.inspect(e.doc,e.win,NOW),'calendar').state,'error');
});
test('Missing profile module, damaged local lists or backup script show red diagnostic without mutations',()=>{
 const e=env();
 e.win.SH9_MAV_PERSONAL_UI=null;
 assert.equal(row(health.inspect(e.doc,e.win,NOW),'profile').state,'error');
 e.win.SH9_MAV_PERSONAL_UI={render(){}};
 e.storage.setItem(personal.favoritesKey('z'),'{corrupt');
 e.writes.length=0;
 const broken=health.inspect(e.doc,e.win,NOW);
 assert.equal(row(broken,'storage').state,'error');
 assert.equal(e.writes.length,0);
 e.win.SH9_MAV_BACKUP_V609=undefined;
 assert.equal(row(health.inspect(e.doc,e.win,NOW),'backup').state,'error');
});
test('Active providers never count as verified live connections; unsafe Google quota is red',()=>{
 const e=env();
 e.win.SH9_MAV_GTFS_CONFIG={enabled:true};
 e.win.SH9_MAV_GOOGLE_ROUTES_CONFIG={enabled:true,maxRequestsPerSession:6,cooldownSeconds:30};
 let r=health.inspect(e.doc,e.win,NOW);
 assert.equal(row(r,'gtfs').state,'warn');
 assert.equal(row(r,'google').state,'warn');
 assert.equal(row(r,'traffic').state,'warn');
 assert.match(row(r,'google').detail,/Nem történt API-próba/);
 e.win.SH9_MAV_GOOGLE_ROUTES_CONFIG={enabled:true,maxRequestsPerSession:1000,cooldownSeconds:0};
 r=health.inspect(e.doc,e.win,NOW);
 assert.equal(row(r,'google').state,'error');
 e.win.SH9_MAV_GTFS_CORE_V1=undefined;
 assert.equal(row(health.inspect(e.doc,e.win,NOW),'gtfs').state,'error');
});
test('Real UI renders 8 RAG rows on button click, never pre-populates or runs automatically',()=>{
 const e=env();
 const mounted=health.mount(e.doc,e.win);
 assert.ok(mounted);
 assert.equal(mounted.getLast(),null);
 assert.equal(e.el('rail-health-results').children.length,0);
 assert.equal(e.writes.length,0);
 e.el('rail-health-run').events.click();
 const done=mounted.getLast();
 assert.equal(done.results.length,8);
 assert.equal(e.el('rail-health-results').children.length,8);
 assert.match(e.el('rail-health-summary').textContent,/Rendben: 6 · Figyelem: 2 · Hiba: 0/);
 assert.match(e.el('rail-health-checked').textContent,/Csak helyi, olvasási vizsgálat/);
 assert.deepEqual(e.el('rail-health-results').children.map(n=>n.dataset.rag),
  ['ok','ok','ok','ok','ok','warn','warn','ok']);
 assert.equal(e.writes.length,0);
});
test('Golden Glass layout and v606 calendar, profile avatar, five-slot taskbar remain intact',()=>{
 assert.match(page,/id="rail-health-shortcut"/);
 assert.match(page,/id="rail-health-run"/);
 assert.match(page,/id="rail-health-summary"/);
 assert.match(page,/id="rail-health-results"/);
 assert.match(page,/data-go="rail-health"/);
 assert.match(page,/rail-health-v610\.js/);
 assert.match(page,/rail-health-row\[data-rag="ok"\]/);
 assert.match(page,/rail-health-row\[data-rag="warn"\]/);
 assert.match(page,/rail-health-row\[data-rag="error"\]/);
 assert.match(page,/id="rail-date-trigger"/);
 assert.match(page,/id="rail-time-trigger"/);
 assert.match(page,/bottom:9px;left:6px;width:45px/);
 assert.match(page,/rail-golden-glass-v3/);
 assert.match(page,/mav-hero-final-approved-v2\.webp/);
 const nav=page.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.equal((nav.match(/<a /g)||[]).length,5);
});
