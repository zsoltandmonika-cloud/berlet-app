'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/family-hub/index.html');
const js=read('sh9/family-hub/family-tasks-v880.js');
const css=read('sh9/family-hub/family-tasks-v881.css');
const exists=p=>fs.statSync(path.join(root,p)).size;
test('approved final pink/blue family hero is real, optimized and in place',()=>{
 assert.match(html,/fh-hero glass has-photo/);
 assert.match(css,/family-tasks-hero-approved-v881\.webp/);
 const size=exists('sh9/family-hub/assets/family-tasks-hero-approved-v881.webp');
 assert.ok(size>30000 && size<150000,'hero must be quality-focused but bandwidth conscious');
});
test('approved Lena and success Buddy are bundled for visual v881',()=>{
 assert.match(html,/assets\/family-quickadd-lena-v881\.webp/);
 assert.match(html,/assets\/family-success-buddy-v881\.webp/);
 assert.ok(exists('sh9/family-hub/assets/family-quickadd-lena-v881.webp')>2000);
 assert.ok(exists('sh9/family-hub/assets/family-success-buddy-v881.webp')>6000);
});
test('Quick Add is genuine fullscreen with tall and scrollable choices',()=>{
 assert.match(css,/min-height:100dvh!important/);
 assert.match(css,/max-height:201px/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/\.fh-person \.avatar\{width:62px;height:62px/);
});
test('keyboard no longer forced on opening Quick Add',()=>{
 assert.doesNotMatch(js,/setTimeout\(\(\)=>\$\('fhTitle'\)\.focus/);
 assert.match(js,/Do not autofocus/);
});
test('Hungarian voice and confirmed-save Tada are wired',()=>{
 assert.match(html,/id="fhVoice"/);assert.match(html,/id="fhSuccess"/);
 assert.match(js,/rec\.lang='hu-HU'/);
 assert.match(js,/\$\('fhVoice'\)\.addEventListener\('click',startDictation\)/);
 assert.match(js,/hideSheet\(\);announce/);assert.match(js,/showSuccess\(/);
 assert.match(js,/const ctx=new C\(\)/);
});
test('existing v880 assignment and 30-day history remain intact',()=>{
 assert.match(js,/from\(TABLE\)\.insert\(payload\)/);
 assert.match(js,/updated_by_profile:self\(\)/);
 assert.match(js,/from\(LOG\)/);
 assert.match(html,/family-notifier-v880\.js/);
});
