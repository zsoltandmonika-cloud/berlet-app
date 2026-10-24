'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const ux=read('hh-admin-mobile-focus-v748.js'),old=read('hh-unified-admin-v745.js'),
  reg=read('device-registry-v401.js'),orch=read('live-v305.js'),
  home=read('index.html');

test('SH9 Admin has six color-coded, accessible single-tap categories and direct device actions',()=>{
 for(const k of ['registry','devices','cloud','data','architecture','recovery','other'])
  assert.match(ux,new RegExp("id:'"+k+"'"));
 for(const k of ['📱 Eszközregiszter megnyitása','📦 APK és OTA állapot','📱 HH One Connect megnyitása','SH9 · Admin Control Center'])
  assert.ok(ux.includes(k));
 assert.match(ux,/aria-pressed/);
 assert.match(ux,/min-height:54px/);
 assert.match(ux,/font-size:13px/);
 assert.match(ux,/hhAdminScrollActiveV748/);
 assert.doesNotMatch(ux,/location\.reload\(|localStorage\.clear|innerHTML\s*=|indexedDB\.deleteDatabase/);
});

test('native settings shortcut is Android-only and user-initiated, not an autoplay loop',()=>{
 assert.match(ux,/native\.hidden=!\/Android\/i/);
 assert.match(ux,/w\.location\.assign\('healthhubconnect:\/\/settings'\)/);
 assert.match(ux,/native\.addEventListener\('click'/);
 assert.doesNotMatch(ux,/w\.location\.assign\('healthhubconnect:\/\/settings'\);\s*mount\(/);
});

test('header is inserted once, categories filter in place, and user tap never rebuilds Admin',()=>{
 class E {
  constructor(tag,id=''){
   this.id=id;this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;
   this.style={};this.dataset={};this.attributes={};this.isConnected=true;this.listeners={};
   this.textContent='';this.className='';
  }
  appendChild(el){if(el.parentNode)el.parentNode.children=el.parentNode.children.filter(x=>x!==el);this.children.push(el);el.parentNode=this;return el}
  append(...els){els.forEach(x=>this.appendChild(x))}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,f){this.listeners[k]=f}
  querySelectorAll(sel){if(sel==='button[data-group]')return all(this).filter(x=>x.tagName==='BUTTON'&&x.dataset.group);return []}
  scrollIntoView(){}
 }
 function all(n){return [n,...n.children.flatMap(all)]}
 const root=new E('div','healthSubContent'),head=new E('head');
 let reloads=0,draws=0;
 const D={readyState:'complete',head,documentElement:{dataset:{}},
  createElement:t=>new E(t),getElementById:id=>[...all(root),...all(head)].find(x=>x.id===id)||null,
  addEventListener:()=>{}};
 const W={healthSectionKind:'more',setInterval:()=>{},setTimeout:f=>f(),
  addEventListener:()=>{},hhDeviceRegistry401:{reload:()=>{reloads++}},
  SH9_VERSION_CENTER_V1:{refresh:()=>{draws++}}};
 vm.runInNewContext(ux,{window:W,document:D,Date});
 assert.equal(W.HH_ADMIN_MOBILE_V748.category(),'registry');
 const menu=D.getElementById('hhAdminQuickV748');assert.ok(menu);
 const categories=menu.querySelectorAll('button[data-group]');
 assert.equal(categories.length,7);
 assert.equal(D.documentElement.dataset.hhAdminFocus,'registry');
 categories[2].listeners.click();
 assert.equal(D.documentElement.dataset.hhAdminFocus,'cloud');
 categories[1].listeners.click();
 assert.equal(D.documentElement.dataset.hhAdminFocus,'devices');
 categories[0].listeners.click();
 assert.equal(D.documentElement.dataset.hhAdminFocus,'registry');
 assert.equal(reloads,1);assert.equal(draws,1);
 W.HH_ADMIN_MOBILE_V748.tick();
 assert.equal(all(root).filter(x=>x.id==='hhAdminQuickV748').length,1);
 assert.equal(W.HH_ADMIN_MOBILE_V748.category(),'registry');
});

test('periodic portal/registry/Orchestrator updates cannot recycle cards during scrolling',()=>{
 assert.doesNotMatch(old,/w\.setInterval\(\(\)=>\{observe\(\);layout\(\)\},1600\)/);
 assert.match(old,/w\.setInterval\(\(\)=>\{if\(d\.getElementById\(ROOT\)!==lastRoot\)observe\(\)\},10000\)/);
 assert.match(old,/hhAdminQuickV748/);
 assert.match(old,/querySelector\('\.haSys'\)/);
 assert.match(reg,/hhAdminScrollActiveV748/);
 assert.match(orch,/hhAdminScrollActiveV748/);
 assert.match(ux,/data-hh-admin-focus="devices"/);
 assert.match(ux,/admin-focus="registry"/);
 assert.match(ux,/not\(#hhDeviceRegistry401\)/);
 assert.match(ux,/openRegistry/);
});

test('mobile loader cache bust and existing non-Admin functionality preserved',()=>{
 assert.match(home,/hh-admin-mobile-focus-v748\.js\?v=748[^"']*one=752/);
 assert.match(home,/device-registry-v401\.js\?v=401-reversible-housekeeping&admin=748/);
 assert.match(home,/hh-unified-admin-v745\.js\?v=747-sh9-version-center&admin=748/);
 assert.match(home,/sh9-version-center-v1\.js\?v=1/);
 assert.match(old,/portal\.append\(overlay\)/);
 assert.doesNotMatch(old,/DropboxVaultClient|removeItem\(|indexedDB\.deleteDatabase/);
});
