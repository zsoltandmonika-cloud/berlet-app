'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('guardian/guardian-search-screen-portal-v1195.js');
const css=read('guardian/guardian-search-screen-portal-v1195.css');
const html=read('guardian/index.html');
function harness(){
 const handlers={},attrs={},vars={},classes=new Set(),trayAttrs={};
 const rect={left:27,width:365,top:270,bottom:732};
 const card={classList:{contains:k=>classes.has(k)},getBoundingClientRect:()=>rect,
  insertBefore(el,sibling){if(el===tray){tray.parentNode=card;tray.parentElement=card}}};
 const tray={parentElement:card,parentNode:card,offsetHeight:52,
  style:{setProperty:(k,v)=>vars[k]=v},setAttribute:(k,v)=>trayAttrs[k]=v,
  removeAttribute:k=>delete trayAttrs[k]};
 const input={addEventListener:(k,f)=>handlers['input:'+k]=f};
 const nav={hidden:false,getBoundingClientRect:()=>({top:735})};
 const body={appendChild(el){el.parentNode=body;el.parentElement=body},
  classList:{contains:()=>false}};
 const rootEl={dataset:{},setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]};
 const d={readyState:'complete',activeElement:null,body,documentElement:rootEl,
  querySelector:q=>q==='.map-card'?card:null,
  getElementById:id=>({guardianMapSearchV819:tray,guardianMapSearchInputV819:input,
   sh9GlobalNavV24:nav})[id]||null,
  createComment:()=>({nodeType:8,parentNode:card,nextSibling:null})};
 const vv={height:801,offsetTop:0,
  addEventListener:(k,f)=>handlers['viewport:'+k]=f};
 const w={innerWidth:405,innerHeight:801,navigator:{maxTouchPoints:5},
  matchMedia:()=>({matches:true}),
  getComputedStyle:()=>({display:'grid',visibility:'visible'}),
  addEventListener:(k,f)=>handlers[k]=f,
  requestAnimationFrame:f=>f(),setTimeout:()=>{},
  visualViewport:vv};
 vm.runInNewContext(js,{window:w,document:d,Number,Math});
 return {handlers,attrs,vars,trayAttrs,classes,card,tray,d,vv,rect};
}
test('portrait Samsung view anchors THE existing search above visible nav',()=>{
 const h=harness();
 assert.equal(h.tray.parentNode,h.d.body);
 assert.equal(h.trayAttrs['data-hh-screen-dock-v1195'],'on');
 assert.equal(h.vars['--hh-search-screen-left-v1195'],'27px');
 assert.equal(h.vars['--hh-search-screen-width-v1195'],'365px');
 assert.equal(h.vars['--hh-search-screen-bottom-v1195'],'66px');
 h.rect.top=-500;h.rect.bottom=-50;h.handlers.scroll();
 assert.equal(h.tray.parentNode,h.d.body,'remains on screen after page scroll');
});
test('fullscreen returns same control to map, then remounts on exit',()=>{
 const h=harness();
 h.classes.add('hh-map-full-v819');h.handlers.resize();
 assert.equal(h.tray.parentNode,h.card);
 h.classes.delete('hh-map-full-v819');h.handlers.resize();
 assert.equal(h.tray.parentNode,h.d.body);
});
test('keyboard changes screen-tray position without destroying focused control',()=>{
 const h=harness();
 h.d.activeElement=h.d.getElementById('guardianMapSearchInputV819');
 h.classes.add('hh-map-typing-v832');h.vv.height=410;
 h.handlers['viewport:resize']();
 assert.equal(h.attrs['data-hh-search-typing-v1195'],'on');
 assert.equal(h.vars['--hh-search-typing-top-v1195'],'348px');
 assert.equal(h.tray.parentNode,h.d.body);
});
test('new assets load after older fallback and preserve search data logic',()=>{
 assert.ok(html.indexOf('guardian-search-screen-portal-v1195.css')>
   html.indexOf('guardian-search-fixed-bottom-v1193.css'));
 assert.ok(html.indexOf('guardian-search-screen-portal-v1195.js')>
   html.indexOf('guardian-search-fixed-bottom-v1193.js'));
 assert.match(css,/body\s*>\s*#guardianMapSearchV819/);
 assert.match(js,/d\.body\.appendChild\(tray\)/);
 assert.doesNotMatch(js,/geolocation|watchPosition|localStorage|fetch\(|setInterval\(/);
});
