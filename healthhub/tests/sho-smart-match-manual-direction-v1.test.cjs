'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('healthhub/guardian/smart-260-connect/app.mjs');
const page=read('healthhub/guardian/smart-260-connect/index.html');
const guardian=read('healthhub/guardian/guardian-smart-match-pin-v1.mjs');
const guardianHtml=read('healthhub/guardian/index.html');
const css=read('healthhub/guardian/smart-260-connect/manual-direction-sync-v1.css');

function manualHarness({pinned=true,loading=false,initial='monika-home-to-office'}={}){
 const routes=[
  {id:'monika-home-to-office',reverseId:'monika-260',title:'Mónika · Otthon → Munkahely',
   originLabel:'Otthon',destinationLabel:'Bécsi Corner'},
  {id:'monika-260',reverseId:'monika-home-to-office',title:'Mónika · Munkahely → Otthon',
   originLabel:'Bécsi Corner',destinationLabel:'Otthon'}
 ];
 const storage=new Map(),writes=[],location={
  href:'https://example.test/berlet-app/healthhub/guardian/smart-260-connect/?profile=m'+
   (pinned?'&pinned=1':'')+'&id='+initial
 };
 const state={items:routes,current:initial,loading,recomputePending:false,
  result:{stale:true},full260:{stale:true},lastNext:{stale:true},morganPlan:null};
 const elements={
  heroTime:{textContent:'08:00'},countdown:{textContent:'01:00'},
  heroDetail:{textContent:'OLD ROUTE'},ring:{style:{setProperty(){}}},
  timeline:{children:[],replaceChildren(){this.children=[]},append(x){this.children.push(x)}},
  status:{textContent:'OLD STATUS'}
 };
 const history={urls:[],replaceState(_,__,url){this.urls.push(url);location.href='https://example.test'+url}};
 const localStorage={
  getItem:key=>storage.get(key)||null,
  setItem(key,value){storage.set(key,value);writes.push([key,value])}
 };
 const notes=[],called=[];
 const dependencies={
  state,PROFILE:'monika',
  DEFAULT:{id:'monika-260'},REVERSE:{id:'monika-home-to-office'},
  localStorage,history,location,
  toast:x=>notes.push(x),
  persist:()=>{localStorage.setItem('sh9-smart-match-templates-v1-m',JSON.stringify(state.items));return true},
  isPinned:()=>pinned,
  hydrate:()=>called.push(['hydrate',state.current]),
  computeRoute:()=>called.push(['compute',state.current]),
  $:id=>elements[id],
  document:{createElement:()=>({className:'',textContent:''})},
  SMART_LOCATION_M_KEY:'sh9-smart-location-switch-v1-m',
  ACTIVE_PIN_KEY:'sh9-smart-match-active-pin-v1-m'
 };
 const a=app.indexOf('function publishActivePin(');
 const b=app.indexOf('function chipButtons(){',a);
 const c=app.indexOf('function pinnedRouteUrl(pinned){');
 const d=app.indexOf('function pinInterviewLink(){',c);
 assert.ok(a>=0&&b>a&&c>=0&&d>c,'Required production handlers exist');
 const keys=Object.keys(dependencies);
 const fn=new Function(...keys,
  app.slice(a,b)+'\n'+app.slice(c,d)+'\nreturn {reverseCommute,chooseManualRoute,publishActivePin,pairedTemplate,current};');
 const api=fn(...keys.map(k=>dependencies[k]));
 return {api,storage,writes,state,location,history,elements,called,notes,routes};
}

test('one tap reverses morning to homebound route even WHILE a prior BKK fetch is loading',()=>{
 const h=manualHarness({pinned:true,loading:true});
 h.api.reverseCommute();
 assert.equal(h.state.current,'monika-260');
 assert.equal(h.storage.get('sh9-smart-location-switch-v1-m'),'off',
  'Manual override explicitly turns Smart Location off until re-enabled');
 assert.equal(h.storage.get('sh9-smart-match-active-pin-v1-m'),'monika-260',
  'The same active pin consumed by Family Guard is updated');
 assert.ok(JSON.parse(h.storage.get('sh9-smart-match-templates-v1-m')).some(t=>t.id==='monika-260'));
 assert.ok(h.writes.findIndex(([k])=>k==='sh9-smart-match-templates-v1-m')<
  h.writes.findIndex(([k])=>k==='sh9-smart-match-active-pin-v1-m'),
  'Guardian must see the template library BEFORE the new active pin');
 assert.equal(new URL(h.history.urls.at(-1),'https://example.test').searchParams.get('id'),'monika-260');
 assert.equal(new URL(h.history.urls.at(-1),'https://example.test').searchParams.get('pinned'),'1');
 assert.equal(h.state.recomputePending,true,'old in-flight route will be recomputed after loading');
 assert.equal(h.state.full260,null,'old route timetable must be invalidated');
 assert.equal(h.elements.heroTime.textContent,'--:--','old direction time cannot survive');
 assert.equal(h.elements.heroDetail.textContent,'Az új irány menetrendjének ellenőrzése…');
 assert.equal(h.called.filter(x=>x[0]==='compute').length,0,
  'Do not fight an in-progress GTFS load; queue exactly one fresh recomputation');
 assert.ok(h.notes.some(x=>x.includes('Munkahely → Otthon')));
});
test('reverse is also actionable from NORMAL non-pinned view and syncs saved current selection',()=>{
 const h=manualHarness({pinned:false,loading:false,initial:'monika-260'});
 h.api.reverseCommute();
 assert.equal(h.state.current,'monika-home-to-office');
 assert.equal(h.storage.get('sh9-smart-match-active-pin-v1-m'),'monika-home-to-office');
 assert.equal(new URL(h.history.urls.at(-1),'https://example.test').searchParams.get('id'),
  'monika-home-to-office');
 assert.equal(new URL(h.history.urls.at(-1),'https://example.test').searchParams.has('pinned'),false);
 assert.equal(h.called.filter(x=>x[0]==='compute').length,1);
 assert.match(css,/body:not\(\.pinned\) main>\.v33-titlebar #reverseBtn:not\(\[hidden\]\)/);
 assert.match(css,/display:grid!important/);
});
test('returning to office direction updates active pin again without modifying saved route templates',()=>{
 const h=manualHarness({pinned:true,loading:false});
 h.api.reverseCommute();
 h.api.reverseCommute();
 assert.equal(h.state.current,'monika-home-to-office');
 assert.equal(h.storage.get('sh9-smart-match-active-pin-v1-m'),'monika-home-to-office');
 assert.deepEqual(h.routes.map(r=>r.id),['monika-home-to-office','monika-260']);
 assert.match(page,/manual-direction-sync-v1\.css\?v=1/);
 assert.match(page,/app\.mjs\?v=1142-inline-pin&manualDirection=1/);
});
test('full view queues and rejects old in-flight timetable; Guardian rejects old-route departure focus',()=>{
 assert.match(app,/function reverseCommute\(\)\{\n const opposite=pairedTemplate\(current\(\)\)/);
 assert.doesNotMatch(app,/function reverseCommute\(\)\{\n if\(!isPinned\(\)\|\|state\.loading\)return/);
 assert.match(app,/if\(state\.loading\)state\.recomputePending=true/);
 assert.match(app,/if\(state\.recomputePending\)\{\s*state\.recomputePending=false;\s*void computeRoute\(\)/);
 assert.match(app,/await loadFeed\(\);\s*\/\/ A direction button can be tapped[\s\S]{0,230}if\(current\(\)\?\.id!==item\.id\)return/);
 assert.match(app,/const routeAtRequest=state\.current/);
 assert.match(guardian,/readDepartureFocus\(activeProfile\(\),state\.item\?\.id\|\|null,now\)/);
 assert.match(guardian,/note:"⇄ "\+stageText\(item\)\+" · menetrend ellenőrzése"/);
 assert.match(guardian,/if\(!active\)\{/);
 assert.match(guardian,/if\(active==="monika-260"\)return OFFICE_TO_HOME/);
 assert.match(guardian,/if\(active==="monika-home-to-office"\)return HOME_TO_OFFICE/);
 assert.doesNotMatch(guardian,/if\(!active\|\|active==="monika-260"\)/);
 assert.match(guardianHtml,/manualSync=1/);
});
test('no new background GPS, network, auth or Supabase writes are introduced by manual route button',()=>{
 const a=app.indexOf('function chooseManualRoute(item){');
 const b=app.indexOf('function chipButtons(){',a);
 const handler=app.slice(a,b);
 assert.doesNotMatch(handler,/getCurrentPosition|watchPosition|fetch\(|supabase|\\.from\(|setInterval|requestFollow/);
 assert.match(handler,/localStorage\.setItem\(SMART_LOCATION_M_KEY,"off"\)/);
 assert.match(handler,/publishActivePin\(\{force:true\}\)/);
});
