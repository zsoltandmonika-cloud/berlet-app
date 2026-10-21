'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html');
const script=read('hh-architecture-admin-v744.js');
const viewer=read('architecture-grand-design.html');
const project=JSON.parse(read('project-control.json'));
const pc=read('live-v142.js');
new vm.Script(pc,{filename:'live-v142.js'});
assert.match(index,/live-v142\.js\?v=748-cloud-project-hours/);
assert.match(pc,/HH PROJECT HOURS/);
assert.match(pc,/hhPcHoursSaveBase/);
assert.match(pc,/hhPcHoursStart/);
assert.match(pc,/hhPcHoursStop/);
assert.match(pc,/projectHours:hourBook\(\)/);
assert.doesNotMatch(pc,/Helyi változás<\/small>/);

const blueprint=read('docs/HEALTHHUB_ARCHITECTURE_GRAND_DESIGN.md');
const runbook=read('docs/HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK.md');
const docs=read('docs/README.md');
assert.match(index,/hh-architecture-admin-v744\.js\?v=745-inline-admin-grand-design/);
assert.match(index,/hh-unified-admin-v745\.js\?v=746-admin-contrast/);
assert.match(blueprint,/isAutomaticSync:false/);
assert.match(blueprint,/30/);
assert.match(blueprint,/Gondoskodás/);
assert.match(blueprint,/SHA-256/);
assert.match(blueprint,/Project Control/);
assert.match(runbook,/Project Control/);
assert.match(runbook,/401\/403/);
assert.match(docs,/HEALTHHUB_ARCHITECTURE_GRAND_DESIGN\.md/);
assert.ok(project.actions.length>=131);
assert.ok(project.actions.some(x=>x.id==='HH-ARCH-001'));
assert.ok(project.actions.some(x=>x.id==='HH-ARCH-002'));
assert.ok(project.actions.some(x=>x.id==='HH-CHATGPT-742'&&x.status==='Done'));
assert.ok(project.actions.some(x=>x.id==='HH-CHATGPT-24X7'&&x.status==='Backlog'));
assert.equal(project.architectureMaster.version,'1.0');
assert.equal(project.chatgptAnalyticsMilestone.chatgptConnectorFilesRead,true);
assert.match(viewer,/HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK\.md/);
const match=viewer.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match);
new vm.Script(match[1],{filename:'architecture-grand-design.html.inline.js'});
const files=['docs/HEALTHHUB_ARCHITECTURE_GRAND_DESIGN.md','docs/HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK.md'];
for(const s of [blueprint,runbook]){
 assert.doesNotMatch(s,/sk-proj-[A-Za-z0-9]/);
 assert.doesNotMatch(s,/sl\.[A-Za-z0-9_-]{80}/);
 assert.doesNotMatch(s,/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
}
class E{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};
 this.listeners={};this.classList={contains:()=>false};this.isConnected=true;this.id=''}
 append(...xs){this.children.push(...xs)}
 appendChild(e){this.children.push(e);return e}
 insertBefore(e,at){if(at){const i=this.children.indexOf(at);this.children.splice(Math.max(0,i),0,e)}else this.children.unshift(e);return e}
 addEventListener(event,cb){this.listeners[event]=cb}
 setAttribute(key,value){this.attributes[key]=value}
 get firstChild(){return this.children[0]||null}
}
const overlay=new E('div');overlay.id='haOv';overlay.classList={contains:x=>x==='on'};
const body=new E('div');body.id='healthSubContent';
const head=new E('head');const elements=[overlay,body,head];
const deep=(e,id)=>e.id===id?e:(e.children||[]).map(x=>deep(x,id)).find(Boolean)||null;
const document={
 readyState:'loading',head,createElement:t=>new E(t),
 getElementById:id=>elements.map(e=>deep(e,id)).find(Boolean)||null,
 addEventListener:()=>{}
};
let opens=0;
const window={healthSectionKind:'more',hhPcOpen:()=>{opens++},open:()=>{opens+=10}};
vm.runInNewContext(script,{window,document,Promise,MutationObserver:class{
 observe(){}disconnect(){}
}});
const app=window.HH_ARCHITECTURE_ADMIN_V744;
assert.equal(app.version,'744');
assert.equal(app.mount(),true);
assert.equal(body.children.length,1);
assert.equal(body.children[0].id,'hhArchitectureGrandDesign744');
assert.equal(app.mount(),true);
assert.equal(body.children.length,1);
app.openProject();assert.equal(opens,1);
body.children.length=0;assert.equal(app.mount(),true);assert.equal(body.children.length,1);
console.log('PASS v744: canonical master, architecture/runbook, safe viewer syntax, Admin remount, Project Control button, CI-only no patient data.');
