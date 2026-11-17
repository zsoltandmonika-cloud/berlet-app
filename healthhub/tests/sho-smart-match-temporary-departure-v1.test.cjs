/* Focused regression tests for optional Smart Match temporary departure selection.
 * This test requires no BKK API/network, GPS, browser or production account.
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {Script}=require('node:vm');
const ROOT=join(__dirname,'..');
const read=path=>readFileSync(join(ROOT,path),'utf8');
const keyFor=p=>'sh9-smart-match-departure-focus-v1-'+p;
const saved=new Map();
globalThis.localStorage={
 getItem:key=>saved.has(key)?saved.get(key):null,
 setItem:(key,value)=>saved.set(key,String(value)),
 removeItem:key=>saved.delete(key)
};
let util;
test('exact verified departure is isolated per profile, follows Citronella alias, expires at bus + 2 minutes',async()=>{
 util=await import(pathToFileURL(join(ROOT,'guardian/smart-match-departure-focus-v1.mjs')).href);
 const now=Date.parse('2026-11-17T08:23:00Z');
 const depart=Date.parse('2026-11-17T09:52:00Z');
 const payload={routeId:'monika-home-to-office',serviceDate:util.focusDate(depart),kind:'260',
  departMs:depart,displayMs:depart,leaveMs:depart-12*60000,
  stop:'Citronella utca',direction:'work',line:'260',tramLine:'41',tramDepartMs:depart+16*60000};
 assert.equal(util.saveDepartureFocus('monika',payload,now),true);
 assert.equal(util.readDepartureFocus('m','home-citronella-260',now)?.departMs,depart);
 assert.equal(util.readDepartureFocus('zsolt',null,now),null);
 assert.ok(util.readDepartureFocus('monika',null,depart+120000-1));
 assert.equal(util.readDepartureFocus('monika',null,depart+120000),null);
 assert.equal(saved.has(keyFor('m')),false);
 assert.equal(util.saveDepartureFocus('m',payload,depart+120000),false);
 assert.equal(util.saveDepartureFocus('m',{...payload,routeId:'../../override'},now),false);
 assert.ok([...saved.keys()].every(k=>k.startsWith('sh9-smart-match-departure-focus-v1-')));
});
test('future date allowed, malformed data discarded; storage failure does not claim success',()=>{
 const now=Date.parse('2026-11-17T08:23:00Z'),depart=now+24*3600000;
 const payload={routeId:'monika-260',serviceDate:util.focusDate(depart),kind:'260',
  departMs:depart,displayMs:depart,leaveMs:depart-12*60000,
  stop:'Váradi utca',direction:'home',line:'260',tramLine:'',tramDepartMs:null};
 assert.equal(util.saveDepartureFocus('m',payload,now),true);
 assert.equal(util.readDepartureFocus('m','monika-260',now)?.departMs,depart);
 saved.set(keyFor('m'),'{bad-json');
 assert.equal(util.readDepartureFocus('m',null,now),null);
 assert.equal(saved.has(keyFor('m')),false);
});
test('timeline pin writes and verifies before automatic Family Guard return',()=>{
 const app=read('guardian/smart-260-connect/app.mjs');
 const core=read('guardian/smart-260-connect/core.mjs');
 const page=read('guardian/smart-260-connect/index.html');
 assert.match(app,/function addDeparturePinButton\(/);
 assert.match(app,/if\(!saveDepartureFocus\(PROFILE,record,now\)\)/);
 assert.ok(app.indexOf('saveDepartureFocus(PROFILE,record,now)')<
  app.indexOf('location.assign("/berlet-app/healthhub/guardian/")'));
 assert.match(app,/state\.full260\?\.rows\.some\(x=>x\.departMs===record\.departMs&&x\.connectionOk/);
 assert.match(app,/const pinnedIndex=pinned\?\.kind==="260"/);
 assert.match(app,/const pinnedIndex=pinned\?\.kind==="other"/);
 assert.match(app,/syncDeparturePinButtons\(now\)/);
 assert.match(page,/departure-pin-v1\.css\?v=1/);
 assert.match(page,/app\.mjs\?v=1141-one-tap-departure-focus/);
 assert.match(core,/export .*full260Timetable/);
});
test('Family Guard mirrors focus and expires without new network or GPS',()=>{
 const guardian=read('guardian/guardian-smart-match-pin-v1.mjs');
 const hero=read('guardian/guardian-smart-match-micro-v1.js');
 const index=read('guardian/index.html');
 assert.match(guardian,/function renderTemporaryDeparture\(/);
 assert.match(guardian,/if\(renderTemporaryDeparture\(\)\)return/);
 assert.match(guardian,/if\(wasManual&&state\.item&&!state\.loading&&!state\.loaded\)/);
 assert.match(guardian,/data\.temporaryPin="on"/);
 assert.match(guardian,/setInterval\(\(\)=>\{if\(state\.visible\)renderClock\(\)\},10000\)/);
 assert.match(hero,/manual\?"📌 SMART MATCH":"SMART MATCH"/);
 assert.match(index,/guardian-smart-match-pin-v1\.mjs\?v=949-temporary-departure/);
 assert.match(index,/guardian-smart-match-micro-v1\.js\?v=5-temporary-departure/);
 assert.doesNotMatch(hero,/\bfetch\(/);
});
test('changed modules parse without syntax errors in a source-only VM',()=>{
 for(const file of ['guardian/smart-match-departure-focus-v1.mjs',
  'guardian/smart-260-connect/app.mjs','guardian/guardian-smart-match-pin-v1.mjs',
  'guardian/guardian-smart-match-micro-v1.js']){
  const js=read(file).replace(/^\s*import .+;\s*$/gm,'').replace(/^export /gm,'')
   .replace(/import\.meta\.url/g,'"about:blank"');
  assert.doesNotThrow(()=>new Script(js,{filename:file}),file);
 }
});
