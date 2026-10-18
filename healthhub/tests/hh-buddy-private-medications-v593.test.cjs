'use strict';
/* Synthetic DOM and private IndexedDB stub: NO family health data is copied into CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'..');
const meds=fs.readFileSync(path.join(dir,'hh-private-medications-v593.js'),'utf8');
const buddy=fs.readFileSync(path.join(dir,'hh-buddy-scroll-companion-v593.js'),'utf8');
const medCss=fs.readFileSync(path.join(dir,'hh-private-medications-v593.css'),'utf8');
const buddyCss=fs.readFileSync(path.join(dir,'hh-buddy-scroll-companion-v593.css'),'utf8');
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert.ok(index.includes('hh-private-medications-v593.js?v=593-vault-editor'));
assert.ok(index.includes('health-scroll-select-v592.js?v=594-default-buddy-live'));
assert.ok(index.includes('hh-buddy-scroll-companion-v593.js?v=595-scroll-tick-clean-buddy'));
assert.ok(index.indexOf('hh-private-medications-v593.js')<index.indexOf('health-scroll-select-v592.js'));
assert.ok(index.indexOf('health-scroll-select-v592.js')<index.indexOf('hh-buddy-scroll-companion-v593.js'));
assert.ok(meds.includes("KEY='private-reference'"),'uses established private reference, never public personal data');
assert.ok(meds.includes("tx.objectStore('meta').put"),'profile data saved only to existing private reference');
assert.ok(meds.includes('hhMasterStructuredSync304(true)'),'cloud sync uses canonical Dropbox master');
assert.ok(meds.includes("if(current()!==profile)"),'rejects saving if selected profile changes mid-edit');
assert.ok(meds.includes("name.value='Rozuva-Teva 10 mg filmtabletta'"),'profile-neutral quick fill');
assert.ok(!/profiles\.monika\.medications|MEDICATIONS\.monika|med-monika-rozuva/.test(meds),'no public patient medication assignment');
assert.ok(buddy.includes('./nutrition/nutri-chipmunk-3d-v594.webp'),'reuse approved existing Buddy');
assert.ok(buddy.includes("source.dataset.hhKey==='omsz'"),'no special Buddy reaction for OMSZ');
assert.ok(buddy.includes("note(523.25")&&buddy.includes("note(783.99"),'click with audible ascending tada');
assert.ok(buddy.includes('document.addEventListener(\'click\',selected,true)'),'tada remains on user click');
assert.ok(buddy.includes('prefers-reduced-motion'),'reduced-motion support');
assert.ok(buddyCss.includes('pointer-events:none'),'Buddy does not obscure filters');
assert.ok(!buddyCss.includes('hhBuddy593Sound'),'Buddy is clean, no mute button');
assert.ok(medCss.includes('hhMed593Overlay'),'accessibly styled private editor');

class El{
 constructor(tag){this.tagName=tag;this.className='';this.children=[];this.parentNode=null;this.handlers={};
  this.dataset={};this.attrs={};this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.style={};
  this.classList={add:(x)=>{this.className+=' '+x}};
 }
 appendChild(x){this.children.push(x);x.parentNode=this;return x}
 insertBefore(x,b){let i=this.children.indexOf(b);if(i<0)i=this.children.length;this.children.splice(i,0,x);x.parentNode=this;return x}
 replaceChildren(){this.children=[]}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]||null}
 addEventListener(k,fn){this.handlers[k]=fn}
 click(){return this.handlers.click&&this.handlers.click({target:this,preventDefault(){},stopPropagation(){}})}
 focus(){}
 matches(q){
  if(q==='.hrRow[onclick*="medication"]')return this.className.includes('hrRow')&&String(this.attrs.onclick).includes('medication');
  if(q==='.hrRow b')return this.tagName==='b';
  if(q.startsWith('.'))return this.className.split(' ').includes(q.slice(1));
  return this.tagName===q;
 }
 querySelectorAll(q){let a=[];function walk(n){n.children.forEach(c=>{if(c.matches(q))a.push(c);walk(c)})}walk(this);return a}
 querySelector(q){return this.querySelectorAll(q)[0]||null}
}
let payload={schema:'healthhub-private-reference-v1',profiles:{zsolt:{medications:[{id:'keep',name:'Synthetic old med'}]},monika:{medications:[]}}};
let profile='monika',pushes=0;
const container=new El('div'),body=new El('body'),head=new El('head');
body.appendChild(container);
const document={
 body,head,createElement(t){return new El(t)},
 getElementById(id){return id==='healthSubContent'?container:findId(body,id)},
};
function findId(node,id){if(node.id===id)return node;for(const c of node.children){const x=findId(c,id);if(x)return x}return null}
const indexedDB={open(){
 const r={};
 queueMicrotask(()=>{r.result={
 objectStoreNames:{contains(x){return x==='meta'}},
 transaction(name,mode){
  const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return {
   get(){const req={};queueMicrotask(()=>{req.result=payload&&{key:'private-reference',payload};req.onsuccess()});return req},
   put(o){queueMicrotask(()=>{payload=o.payload;if(tx.oncomplete)tx.oncomplete()});}
  }}
  };return tx;
 },close(){}};
 r.onsuccess()});return r;
}};
const window={
 location:{search:''},localStorage:{getItem(){return profile==='monika'?'m':'z'}},
 crypto:{randomUUID(){return 'synthetic-uuid-100'}},
 confirm(){return true},toast(){},
 HH_DROPBOX_VAULT:{connected(){return true}},
 async hhMasterStructuredSync304(){pushes++;return true},
 healthSectionKind:'medications',
 async renderHealthSection(){
  container.replaceChildren();
  const card=container.appendChild(new El('section'));card.className='hrSectionCard';
  const row=card.appendChild(new El('div'));row.className='hrRow clickable';row.attrs.onclick="openHrDetail('medication','synthetic')";
  const text=row.appendChild(new El('div'));text.appendChild(new El('b')).textContent='Synthetic old med';
  return true;
 }
};
vm.runInNewContext(meds,{window,document,indexedDB,console,setTimeout,Date,Promise},{filename:'hh-private-medications-v593.js'});
async function test(){
 const api=window.HH_PRIVATE_MEDICATIONS_V593;
 assert.ok(api&&api.version==='593');
 await window.renderHealthSection();
 assert.ok(container.querySelector('.hhMed593Add'));
 await api.edit();
 let modal=findId(body,'hhMed593Overlay'),fields=modal.querySelectorAll('input');
 assert.equal(fields.length,4);
 const preset=modal.querySelector('.hhMed593Preset');preset.click();
 assert.ok(fields[0].value.includes('Rozuva-Teva'));
 assert.equal(fields[2].value,'napi 1 tabletta');
 await modal.querySelector('.hhMed593Primary').click();
 const mine=payload.profiles.monika.medications;
 assert.equal(mine.length,1,'Save status: '+(modal.querySelector('.hhMed593Status')||{}).textContent);assert.equal(mine[0].status,'aktuális');
 assert.equal(mine[0].strength,'10 mg');assert.equal(mine[0].schedule,'napi 1 tabletta');
 assert.equal(payload.profiles.zsolt.medications.length,1,'other profile untouched');
 assert.equal(pushes,1,'synchronized to existing Dropbox master');
 await window.renderHealthSection();
 assert.equal(container.querySelectorAll('.hhMed593Record').length,1,'private medication displayed once');
 profile='zsolt';await window.renderHealthSection();
 assert.equal(container.querySelectorAll('.hhMed593Record').length,0,'cross-profile privacy');
 console.log('HHSP1 Buddy + Medication v593: synthetic save, Dropbox, no duplicate, profile privacy PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1});
