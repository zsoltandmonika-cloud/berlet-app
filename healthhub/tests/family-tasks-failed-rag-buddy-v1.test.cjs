'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/family-hub/index.html');
const tasks=read('sh9/family-hub/family-tasks-v880.js');
const notify=read('sh9/family-hub/family-notifier-v880.js');
const css=read('sh9/family-hub/family-tasks-rag-buddy-v1.css');
const original=read('healthhub/nutrition/hh-buddy-rag-fullbody-v1141.css');
const sql=read('sh9/family-hub/sql/failed-task-outcome-v1.sql');
test('fourth failed task outcome is a closed, counted state, not overdue',()=>{
 assert.match(tasks,/failed:'🔻 Nem teljesült'/);
 assert.match(tasks,/isClosed=t=>t\.status==='done'\|\|t\.status==='failed'/);
 assert.match(tasks,/!isClosed\(t\)&&Date\.parse\(t\.due_at\)<Date\.now\(\)/);
 assert.match(tasks,/'fhFailedCount','failed'/);
 assert.match(html,/id="fhFailedCount"/);
 assert.match(tasks,/\['failed','🔻 Nem teljesült'\]/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(tasks,/t\.status==='failed'\?'✕ Nem teljesült':'✓ Kész'/);
 assert.match(tasks,/!isClosed\(task\)\)return/);
});
test('approved 3-state RAG mascot sprite is identical, no new character generated',()=>{
 const match=s=>s.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/);
 assert.ok(match(original)&&match(css));
 assert.equal(match(css)[0],match(original)[0]);
 assert.match(css,/background-size:100% 300%/);
 for(const [status,frame] of [['done','happy'],['progress','regular'],['failed','sad']]){
  assert.match(tasks,new RegExp(status+":'"+frame+"'"));
  assert.match(css,new RegExp('data-face="'+frame+'"'));
 }
 assert.match(tasks,/buddy\.setAttribute\('aria-label','Buddy mókus: '/);
 assert.match(notify,/buddy\.dataset\.face=mood/);
 assert.match(notify,/status==='failed'\)return '😔 A feladat lezárva: Nem teljesült.'/);
 assert.match(notify,/fh-note-buddy-rag/);
 assert.match(notify,/family-tasks-rag-buddy-v1\.css\?v=1-approved-rag/);
});
test('unfinished todo remains neutral and failure stays distinct',()=>{
 assert.match(tasks,/todo:'⚪ Még nem kezdte'/);
 assert.match(html,/⚪ Teendő/);
 assert.match(css,/data-status="todo"\]\.active/);
 assert.match(css,/data-status="failed"\]\.active/);
 assert.match(css,/data-face="sad"/);
});
test('server accepts only four known statuses, timestamps closed outcomes and preserves RLS',()=>{
 assert.match(sql,/check \(status in \('todo','progress','done','failed'\)\)/);
 assert.match(sql,/new\.status in \('done','failed'\)/);
 assert.match(sql,/old\.status/);
 assert.match(sql,/raise exception 'Actor profile not authorized'/);
 assert.match(sql,/raise exception 'Assignee profile not authorized'/);
 assert.match(sql,/Task identity immutable/);
 assert.match(sql,/alter policy hh_ft_hidden_insert_profile/);
 assert.match(sql,/t\.status in \('done','failed'\)/);
 assert.doesNotMatch(sql,/drop policy|disable row level security/i);
});
test('global Buddy scripts refresh without modifying unrelated module logic',()=>{
 const files=[
  'sh9/index.html','sh9/smart-travel/index.html','healthhub/index.html',
  'healthhub/guardian/index.html','healthhub/nutrition/index.html',
  'healthhub/digital-health/index.html','sh9/family-hub/index.html'
 ];
 for(const file of files)assert.match(read(file),
  /family-notifier-v880\.js\?v=919-failed-closure-rag/,file);
 assert.match(html,/family-tasks-v880\.js\?v=1064-failed-closure-rag/);
 assert.match(html,/family-tasks-rag-buddy-v1\.css\?v=1-approved-rag/);
 assert.doesNotMatch(tasks,/setInterval\(/);
 assert.doesNotMatch(notify,/setInterval\(/);
});
