'use strict';
// SHO v1016 regression: launch without waiting for unrelated HealthHub page load.
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const bridge=fs.readFileSync(path.join(root,'sho-entry-v1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const run=(target,available)=>{
 const calls=[],timers=[],events=[],dataset={};
 const document={readyState:'loading',documentElement:{dataset}};
 const window={location:{search:'?sho='+target},console:{warn(...args){calls.push(['warn',...args])}},
  setTimeout(fn,n){timers.push([fn,n])},addEventListener(name){events.push(name)},
  hhOpenActivity:available?()=>calls.push('activity'):undefined,
  hhOpenSleep:available?()=>calls.push('sleep'):undefined};
 vm.runInNewContext(bridge,{window,document,URLSearchParams,console});
 return {calls,timers,events,dataset,window};
};
test('Activity immediately opens without waiting for window.load',()=>{
 const v=run('activity',true);
 assert.deepEqual(v.calls,['activity']);
 assert.equal(v.dataset.shoOpened,'activity');
 assert.deepEqual(v.events,[]);
 assert.equal(v.timers.length,0);
});
test('Sleep immediately opens when available',()=>{
 const v=run('sleep',true);
 assert.deepEqual(v.calls,['sleep']);
 assert.equal(v.dataset.shoOpened,'sleep');
});
test('Delayed API preserves bounded retries without relying on whole page load',()=>{
 const v=run('activity',false);
 assert.equal(v.calls.length,0);
 assert.equal(v.timers.length,1);
 v.window.hhOpenActivity=()=>v.calls.push('activity');
 v.timers.shift()[0]();
 assert.deepEqual(v.calls,['activity']);
 assert.equal(v.dataset.shoOpened,'activity');
});
test('Normal non-SHO route does not initialize Activity',()=>{
 const v=run('other',true);
 assert.equal(v.calls.length,0);
 assert.equal(v.timers.length,0);
});
test('Priority bridge is actually injected after executable Activity tag in SHO routes',()=>{
 const begin=html.indexOf('  const shoTarget=new URLSearchParams(location.search)');
 const end=html.indexOf('  const liveWithWellbeingClick=liveWithShoPriority.replace(',begin);
 assert.ok(begin>0&&end>begin,'isolated snippet is present in inline bootstrap');
 const source=html.slice(begin,end);
 const activity='<script src="./live-v191.js?v=1017-profile-memory-verified"></script>';
 function evaluate(search){
  const context={location:{search},URLSearchParams,live:'before '+activity+' after'};
  vm.runInNewContext(source+';globalThis.result=liveWithShoPriority;',context);
  return context.result;
 }
 const prioritized=evaluate('?sho=activity');
 const launcher='<script src="./sho-entry-v1.js?v=1016-priority-boot"></script>';
 assert.ok(prioritized.includes(activity+launcher),'launcher directly follows Activity API');
 assert.equal(prioritized.split(launcher).length,2,'launcher inserted once');
 assert.ok(evaluate('?sho=sleep').includes(activity+launcher),'Sleep remains supported');
 assert.equal(evaluate('?sho=unknown'),'before '+activity+' after','regular page untouched');
});
test('HealthHub injects SHO bridge after Activity module API instead of after document.close',()=>{
 assert.match(html,/const shoBridgeScript=\(shoTarget==='activity'\|\|shoTarget==='sleep'\)/);
 assert.match(html,/const liveWithShoPriority=shoBridgeScript/);
 assert.match(html,/live\.replace\(/);
 assert.match(html,/live-v191\.js\?v=1017-profile-memory-verified/);
 assert.match(html,/sho-entry-v1\.js\?v=1016-priority-boot/);
 assert.doesNotMatch(html,/shoBridge\.src=/);
 assert.doesNotMatch(bridge,/addEventListener\('load'/);
 assert.doesNotMatch(bridge,/readyState==='complete'/);
});
