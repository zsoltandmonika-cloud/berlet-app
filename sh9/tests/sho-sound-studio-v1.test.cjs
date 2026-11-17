/* SHO Sound Studio V1 · source-backed tests, no network/GPS/audio output. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const settingsCode=read('sh9/shared/sho-sound-settings-v1.js');
function environment(){
 const saved=new Map();
 const localStorage={
  getItem:key=>saved.get(key)??null,
  setItem:(key,val)=>{saved.set(key,String(val))},
  removeItem:key=>saved.delete(key)
 };
 let starts=0,peaks=[];
 class FakeAudio{
  currentTime=0;state='running';destination={};
  createOscillator(){return {
   type:null,frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},
   connect:()=>{},disconnect:()=>{},start:()=>{starts++},stop:()=>{}
  }}
  createGain(){return {gain:{
   setValueAtTime:()=>{},
   exponentialRampToValueAtTime:(v)=>{if(v>.0001)peaks.push(v)}
  },connect:()=>{},disconnect:()=>{}}}
 }
 const document={hidden:false,body:{dataset:{}},documentElement:{dataset:{}}};
 const window={localStorage,location:{search:''},AudioContext:FakeAudio};
 vm.runInNewContext(settingsCode,{window,document,URLSearchParams});
 return {api:window.SHO_SOUND_STUDIO_V1,document,window,saved,get starts(){return starts},get peaks(){return peaks}};
}
test('original live volume is preserved at 100%; sound preference changes are per profile',()=>{
 const e=environment(),api=e.api;
 assert.deepEqual([...api.modules],['match','shopping','notifications']);
 assert.equal(api.volume('match'),1);
 assert.equal(api.change('match',35),true);
 assert.equal(api.change('master',70),true);
 assert.ok(Math.abs(api.volume('match')-.245)<1e-10);
 assert.equal(api.volume('notifications'),.7);
 assert.equal(api.profile(),'z');
 e.window.localStorage.setItem('hh-profile','m');
 assert.equal(api.profile(),'m');
 assert.equal(api.volume('match'),1);
 assert.equal(api.change('shopping',30),true);
 assert.equal(api.volume('shopping'),.3);
 e.window.localStorage.setItem('hh-profile','z');
 assert.ok(Math.abs(api.volume('match')-.245)<1e-10);
 assert.equal(api.volume('shopping'),.7);
 assert.ok(e.saved.has('sho-sound-studio-v1:z'));
 assert.ok(e.saved.has('sho-sound-studio-v1:m'));
 assert.equal(api.reset(),true);
 assert.equal(api.volume('match'),1);
});
test('mute silences every connected effect, invalid input bounded, existing alert prefs untouched',()=>{
 const e=environment(),api=e.api;
 e.saved.set('sho-notification-v1:chime-enabled:z','false');
 assert.equal(api.change('master',900),true);
 assert.equal(api.get().master,100);
 assert.equal(api.change('notifications',-40),true);
 assert.equal(api.volume('notifications'),0);
 assert.equal(api.change('notifications',55),true);
 assert.equal(api.change('muted',true),true);
 for(const name of api.modules){assert.equal(api.volume(name),0);assert.equal(api.preview(name),false)}
 assert.equal(e.starts,0);
 assert.equal(e.saved.get('sho-notification-v1:chime-enabled:z'),'false');
 assert.equal(api.change('muted',false),true);
 assert.equal(api.volume('notifications'),.55);
});
test('preview generates actual individual channel tones at current gain, without autoplay',()=>{
 const e=environment(),api=e.api;
 assert.equal(e.starts,0);
 assert.equal(api.preview('match'),true);assert.equal(e.starts,1);
 assert.ok(e.peaks.some(v=>Math.abs(v-.016)<1e-10));
 assert.equal(api.change('match',50),true);
 assert.equal(api.preview('match'),true);assert.equal(e.starts,2);
 assert.ok(e.peaks.some(v=>Math.abs(v-.008)<1e-10));
 assert.equal(api.preview('shopping'),true);assert.equal(e.starts,3);
 assert.equal(api.preview('notifications'),true);assert.equal(e.starts,5);
 e.document.hidden=true;
 assert.equal(api.preview('notifications'),false);assert.equal(e.starts,5);
});
test('real module sounds are connected and shared preferences are loaded first',()=>{
 const parts=[
 ['healthhub/guardian/smart-260-connect/timeline-snap-click-v1.js','volume("match")'],
 ['sh9/shopping/shopping-snap-v13.js','volume("shopping")'],
 ['sh9/notification-center/notification-sound-v2.js','volume("notifications")']
 ];
 for(const [file,needle]of parts){
  const s=read(file);assert.ok(s.includes(needle),file);
  assert.match(s,/loudness/);
 }
 const pages=[
 ['healthhub/guardian/smart-260-connect/index.html','timeline-snap-click-v1.js'],
 ['sh9/shopping/index.html','shopping-snap-v13.js'],
 ['sh9/notification-center/index.html','notification-sound-v2.js']
 ];
 for(const [file,name]of pages){
  const text=read(file);
  const i=text.indexOf('sho-sound-settings-v1.js?v=1'),j=text.indexOf(name);
  assert.ok(i>=0&&j>i,'Sound preferences MUST load before '+name);
 }
 const admin=read('healthhub/hh-unified-admin-v745.js'),main=read('healthhub/index.html');
 assert.ok(main.indexOf('sho-sound-settings-v1.js?v=1')<main.indexOf('hh-unified-admin-v745.js?v=747-sh9-version-center&admin=748&steady=821&sound=1'));
 assert.ok(admin.includes('soundStudio(root)'));
 assert.ok(admin.includes("if(el.id==='hhSoundStudioV1')return 'sound'"));
 assert.ok(admin.includes("slider('match'")&&admin.includes("slider('shopping'")&&admin.includes("slider('notifications'"));
 assert.ok(admin.includes('api.preview(key)')&&admin.includes("api.change('muted'"));
 assert.ok(main.includes('hh-sound-studio-v1.css?v=1'));
});
test('Admin Sound Studio mounts three real previews and one Master without duplicate mounting',()=>{
 const e=environment();
 class Node{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.className='';this.dataset={};
   this.listeners={};this.style={};this.value='';this.textContent='';this.attrs={};}
  append(...children){this.children.push(...children);for(const c of children)c.parentElement=this;}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(k,fn){this.listeners[k]=fn}
  querySelector(selector){
   const id=selector.startsWith('#')?selector.slice(1):null;
   function walk(n){for(const c of n.children){if(id&&c.id===id)return c;const found=walk(c);if(found)return found}return null}
   return walk(this);
  }
 }
 const doc={createElement:t=>new Node(t)};
 const script=read('healthhub/hh-unified-admin-v745.js');
 const start=script.indexOf('function soundStudio(root){'),end=script.indexOf('function hideObsoleteInfo(){',start);
 assert.ok(start>0&&end>start);
 const mount=new Function('w','d',script.slice(start,end)+'\nreturn soundStudio;')( {SHO_SOUND_STUDIO_V1:e.api},doc);
 const root=new Node('div');mount(root);mount(root);
 assert.equal(root.children.length,1);
 const panel=root.children[0];
 assert.equal(panel.id,'hhSoundStudioV1');
 const all=[];
 (function visit(n){all.push(n);for(const x of n.children)visit(x)})(panel);
 assert.equal(all.filter(x=>x.tagName==='INPUT'&&x.type==='range').length,4);
 assert.equal(all.filter(x=>x.tagName==='BUTTON'&&x.textContent==='▶ Teszt').length,3);
 const preview=all.find(x=>x.tagName==='BUTTON'&&x.textContent==='▶ Teszt');
 assert.ok(preview?.listeners.click);
 preview.listeners.click();
 assert.equal(e.starts,1);
 const mute=all.find(x=>x.className==='sho-sound-muted');
 mute.listeners.click();
 assert.equal(e.api.get().muted,true);
});
