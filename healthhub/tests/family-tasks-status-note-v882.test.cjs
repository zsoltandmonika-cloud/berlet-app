'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/family-hub/family-tasks-v880.js');
const html=read('sh9/family-hub/index.html');
const css=read('sh9/family-hub/family-status-note-v882.css');
const sql=read('supabase/migrations/20261106122247_family_tasks_status_note_v882.sql');

test('optional free text entry is bounded and accessible, failed status asks why',()=>{
 assert.match(html,/id="fhStatusNoteDialog"[^>]*role="dialog"/);
 assert.match(html,/id="fhStatusNoteText"[^>]*maxlength="500"/);
 assert.match(html,/id="fhStatusNoteCancel"/);
 assert.match(html,/id="fhStatusNoteSave"/);
 assert.match(html,/family-tasks-v880\.js\?v=1066-status-note-voice/);
 assert.match(html,/family-status-note-v882\.css\?v=883-dictation/);
 assert.match(js,/Miért nem teljesült\?/);
 assert.match(js,/Az indoklás nem kötelező/);
 assert.match(js,/if\(k==='failed'\)openStatusNote\(t,'failed'\)/);
 assert.match(js,/context\.status===context\.task\.status&&reason===/);
 assert.match(css,/\.fh-status-note-dialog\[hidden\]/);
 assert.doesNotMatch(css,/@import|url\(/);
 new vm.Script(js);
});
test('status and note saved atomically, conflict-safe, no synthetic success',()=>{
 assert.match(js,/changeTask\(context\.task,\{status:context\.status,status_note:reason\}\)/);
 assert.match(js,/\.eq\('revision',task\.revision\)/);
 assert.match(js,/if\(!data\)\{/);
 assert.match(js,/return false/);
 assert.match(js,/if\(saved\)\{/);
 assert.match(js,/status:k,status_note:''/);
 assert.match(js,/status_note\|\|''/);
 assert.match(js,/updated_at,status_note/);
 assert.match(js,/statusNoteSaving=true/);
 assert.doesNotMatch(js,/statusNoteContext\.task\.status\s*=/);
});
test('note is visible and searchable on task cards and 30-day logbook, text injection safe',()=>{
 assert.match(js,/element\('p','fh-status-note-text','📝 '\+t\.status_note\)/);
 assert.match(js,/element\('p','fh-log-note','📝 '\+e\.current_value\.note\)/);
 assert.match(js,/e\.current_value\?\.note\|\|''/);
 assert.match(js,/t\.status_note\|\|''/);
 assert.match(js,/function element\(tag,cl,text\)/);
 assert.match(js,/n\.textContent=text/);
 assert.match(js,/\.gte\('created_at',thirty\)/);
});
test('database update is additive, existing RLS and audit are preserved',()=>{
 assert.match(sql,/add column if not exists status_note text not null default ''/);
 assert.match(sql,/char_length\(status_note\) <= 500/);
 assert.match(sql,/create or replace function hh_task_internal\.log_task_change\(\)/);
 assert.match(sql,/jsonb_build_object\('status',new\.status,'note',new\.status_note/);
 assert.match(sql,/new\.status is not distinct from old\.status and new\.status_note is distinct from old\.status_note/);
 assert.match(sql,/revoke all on function hh_task_internal\.log_task_change/);
 assert.doesNotMatch(sql,/drop table|disable row level security|drop policy|truncate|delete from|alter table.*disable trigger/i);
 assert.doesNotMatch(js,/window\.hh191|hhOpenActivity|HealthHub Activity|activity-engine-v2/);
});
