'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const page=fs.readFileSync(path.join(root,'sh9/wallet/index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'sh9/wallet/smart-valet-bkk-fullscreen-v17.js'),'utf8');
const css=fs.readFileSync(path.join(root,'sh9/wallet/smart-valet-bkk-fullscreen-v17.css'),'utf8');
test('90-degree rotation is accessible in the existing full-screen photo viewer',()=>{
 assert.match(page,/id="svBkkRotateV18"/);
 assert.match(page,/aria-label="Bérletkép elforgatása 90 fokkal"/);
 assert.match(page,/smart-valet-bkk-fullscreen-v17\.js\?v=23-keep-cloud-pass-list/);
 assert.match(page,/smart-valet-bkk-fullscreen-v17\.css\?v=18-rotate-fit/);
 assert.match(src,/rotation=\(rotation\+90\)%360/);
 assert.match(src,/rotate\('\+rotation\+'deg\)/);
 assert.match(src,/screen\?\.orientation/);
 assert.match(css,/\.sv-bkk-fitted-v18\{max-width:none;max-height:none/);
});
test('auto-fit uses swapped dimensions at 90/270 degrees; never crops source pixels',()=>{
 assert.match(src,/const sideways=rotation%180!==0/);
 assert.match(src,/displayW=sideways\?img\.naturalHeight:img\.naturalWidth/);
 assert.match(src,/displayH=sideways\?img\.naturalWidth:img\.naturalHeight/);
 assert.match(src,/Math\.min\(width\/displayW,height\/displayH\)/);
 assert.match(src,/window\.|w\.addEventListener\('resize'/);
 assert.match(css,/object-fit:contain/);
 assert.doesNotMatch(src,/drawImage|toBlob|canvas\.toDataURL/);
});
test('fullscreen rotation, zoom, flip and exiting work together in a simulated mobile browser',async()=>{
 const listeners={},nodes=new Map(),sideBtns=[];
 let mounted=false,orientationLocks=0,orientationUnlocks=0;
 const make=(id)=>{
  if(nodes.has(id))return nodes.get(id);
  const events={};const attrs={};
  const obj={id,events,attrs,clientWidth:380,clientHeight:700,
   naturalWidth:900,naturalHeight:1500,complete:true,open:false,disabled:false,
   style:{removeProperty(k){delete this[k]}},
   classList:{add(){},remove(){},toggle(){}},
   textContent:'',title:'',
   addEventListener(k,fn){events[k]=fn},
   setAttribute(k,v){attrs[k]=String(v)},
   getAttribute(k){return attrs[k]??null},
   removeAttribute(k){delete attrs[k]},
   showModal(){this.open=true},close(){this.open=false},
   requestFullscreen(){return Promise.resolve()},
   setPointerCapture(){},
  };
  if(id==='svBkkFullImageV17'){
   Object.defineProperty(obj,'src',{get(){return attrs.src||''},set(v){attrs.src=String(v)}});
  }
  nodes.set(id,obj);return obj;
 };
 for(const side of ['front','back']){
  const button=make('side-'+side);button.dataset={bkkSide:side};sideBtns.push(button);
 }
 const d={
  readyState:'loading',visibilityState:'visible',
  body:{append(){mounted=true}},
  getElementById(id){return id==='svBkkFullDialogV17'&&!mounted?null:make(id)},
  querySelectorAll(sel){return sel.includes('[data-bkk-side]')?sideBtns:[]},
  addEventListener(k,fn){listeners['document:'+k]=fn},
  fullscreenElement:null,
  exitFullscreen(){return Promise.resolve()}
 };
 make('svBkkFullDialogV17').querySelectorAll=()=>sideBtns;
 make('svBkkFullTemplateV17').content={cloneNode:()=>({})};
 const screen={orientation:{
  lock(_mode){orientationLocks++;return Promise.resolve()},
  unlock(){orientationUnlocks++}
 }};
 const w={localStorage:{getItem:()=>null},screen,
  addEventListener(k,fn){listeners[k]=fn}
 };
 const navigator={wakeLock:{request:async()=>({release:async()=>{}})}};
 vm.runInNewContext(src,{window:w,document:d,navigator,Promise,Math});
 const api=w.SHO_BKK_FULLSCREEN_V17;
 assert.equal(api.show({frontUrl:'blob:front',backUrl:'blob:back',fullscreen:false}),true);
 const image=make('svBkkFullImageV17'),stage=make('svBkkImageStageV17');
 image.events.load();
 assert.match(image.style.transform,/rotate\(90deg\) scale\(1\)/);
 assert.equal(make('svBkkRotateV18').attrs['aria-pressed'],'true');
 assert.ok(Number.parseInt(image.style.width)>0);
 stage.clientWidth=760;stage.clientHeight=370;
 make('svBkkRotateV18').events.click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(orientationLocks,0);
 assert.match(image.style.transform,/rotate\(180deg\) scale\(1\)/);
 assert.ok(Number.parseInt(image.style.height)<=stage.clientWidth);
 assert.ok(Number.parseInt(image.style.width)<=stage.clientHeight);
 make('svBkkZoomInV17').events.click();
 assert.match(image.style.transform,/rotate\(180deg\) scale\(1\.3\)/);
 sideBtns[1].events.click();
 image.events.load();
 assert.match(image.style.transform,/rotate\(180deg\) scale\(1\)/);
 make('svBkkRotateV18').events.click();
 assert.match(image.style.transform,/rotate\(270deg\) scale\(1\)/);
 await Promise.resolve();await Promise.resolve();
 assert.equal(orientationLocks,1);
 make('svBkkCloseV17').events.click();
 assert.equal(make('svBkkFullDialogV17').open,false);
 assert.equal(image.getAttribute('src'),null);
 assert.ok(orientationUnlocks>=1);
 // Re-opening a pass also starts at 90°, not at the previous manually selected angle.
 assert.equal(api.show({frontUrl:'blob:front',backUrl:'blob:back',fullscreen:false}),true);
 image.events.load();
 assert.match(image.style.transform,/rotate\(90deg\) scale\(1\)/);
 make('svBkkCloseV17').events.click();
});
test('existing pass regression code and nonofficial-photo wording are retained',()=>{
 assert.match(src,/data-bkk-side/);
 assert.match(src,/initialDistance/);
 assert.match(src,/wakeLock\.request\('screen'\)/);
 assert.match(src,/fullscreen&&dlg\.requestFullscreen/);
 assert.match(page,/Bérletfotó, nem hivatalos digitális bérlet/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
