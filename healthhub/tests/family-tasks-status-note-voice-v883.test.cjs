'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('sh9/family-hub/family-tasks-v880.js');
const html=read('sh9/family-hub/index.html');
const css=read('sh9/family-hub/family-status-note-v882.css');
const begin=source.indexOf('function stopStatusNoteDictation(){');
const finish=source.indexOf('function closeStatusNote(){',begin);
const voice=source.slice(begin,finish);

function makeSpeechHarness(initial='',supported=true){
 const latest={rec:null};
 const attrs={};
 const button={
  classList:{_classes:new Set(),add(x){this._classes.add(x)},remove(x){this._classes.delete(x)},contains(x){return this._classes.has(x)}},
  setAttribute(k,v){attrs[k]=v}
 };
 const field={value:initial,inputCount:0,dispatchEvent(){this.inputCount++}};
 const status={textContent:''},modal={hidden:false};
 const elements={
  fhStatusNoteVoice:button,fhStatusNoteVoiceStatus:status,
  fhStatusNoteText:field,fhStatusNoteDialog:modal
 };
 class FakeRecognition{
  constructor(){latest.rec=this;this.started=false;this.aborted=false}
  start(){this.started=true}
  abort(){this.aborted=true}
 }
 const environment={
  w:supported?{SpeechRecognition:FakeRecognition}:{},
  $:id=>elements[id],
  statusNoteContext:{task:{id:'test'}},
  statusNoteSaving:false,
  statusNoteRecognition:null,
  Event:class Event{constructor(type,opts){this.type=type;this.bubbles=!!opts?.bubbles}}
 };
 vm.runInNewContext(voice,environment,{filename:'status-voice-extracted.js'});
 return {environment,field,status,button,attrs,modal,latest};
}

test('microphone lives beside optional status note and only loads existing script',()=>{
 assert.ok(begin>0&&finish>begin,'dictation helpers present');
 assert.match(html,/id="fhStatusNoteVoice"[^>]*aria-pressed="false"/);
 assert.match(html,/id="fhStatusNoteVoiceStatus"[^>]*aria-live="polite"/);
 assert.match(html,/id="fhStatusNoteText"[^>]*maxlength="500"/);
 assert.match(html,/family-tasks-v880\.js\?v=1066-status-note-voice/);
 assert.match(html,/family-status-note-v882\.css\?v=883-dictation/);
 assert.match(css,/\.fh-status-note-microphone\.listening/);
 assert.match(css,/width:48px;height:48px/);
 assert.match(source,/\$\('fhStatusNoteVoice'\)\.addEventListener\('click',startStatusNoteDictation\)/);
 assert.match(source,/rec\.lang='hu-HU'/);
 assert.doesNotMatch(voice,/from\(TABLE\)|status_note:reason|\.update\(/);
 new vm.Script(source);
});

test('Hungarian speech is appended, editable and not saved automatically',()=>{
 const {environment:env,field,status,attrs,button,latest}=makeSpeechHarness('Már egyeztettem.');
 env.startStatusNoteDictation();
 const rec=latest.rec;
 assert.ok(rec?.started,'recognizer started by user action');
 assert.equal(rec.lang,'hu-HU');
 assert.equal(rec.continuous,false);
 assert.equal(rec.interimResults,false);
 assert.equal(attrs['aria-pressed'],'true');
 assert.ok(button.classList.contains('listening'));
 rec.onresult({results:[[{transcript:'A szolgáltató lemondta az időpontot.'}]]});
 assert.equal(field.value,'Már egyeztettem. A szolgáltató lemondta az időpontot.');
 assert.equal(field.inputCount,1);
 assert.match(status.textContent,/mentés még nem történt/);
 rec.onend();
 assert.equal(attrs['aria-pressed'],'false');
 assert.ok(!button.classList.contains('listening'));
});

test('500-char limit is enforced for spoken additions without overwriting the note',()=>{
 const {environment:env,field,status,latest}=makeSpeechHarness('x'.repeat(497));
 env.startStatusNoteDictation();
 latest.rec.onresult({results:[[{transcript:'abcde'}]]});
 assert.equal(field.value.length,500);
 assert.equal(field.value.slice(-3),' ab');
 assert.match(status.textContent,/500 karakterig/);
});

test('closing or re-tapping microphone aborts dictation; stale results are ignored',()=>{
 const {environment:env,field,status,attrs,latest}=makeSpeechHarness('Már itt van');
 env.startStatusNoteDictation();
 const first=latest.rec;
 env.stopStatusNoteDictation();
 assert.equal(first.aborted,true);
 first.onresult({results:[[{transcript:'Ezt nem szabad hozzáadni'}]]});
 assert.equal(field.value,'Már itt van');
 assert.equal(attrs['aria-pressed'],'false');
 env.startStatusNoteDictation();
 env.startStatusNoteDictation();
 assert.equal(latest.rec.aborted,true);
 assert.match(status.textContent,/leállítva/);
 assert.match(source,/function closeStatusNote\(\)\{[\s\S]*?stopStatusNoteDictation\(\)/);
 assert.match(source,/async function saveStatusNote\(e\)\{[\s\S]*?stopStatusNoteDictation\(\)/);
});

test('unsupported browser offers Samsung keyboard microphone fallback',()=>{
 const {environment:env,status,latest}=makeSpeechHarness('',false);
 env.startStatusNoteDictation();
 assert.equal(latest.rec,null);
 assert.match(status.textContent,/Samsung billentyűzet/);
});
