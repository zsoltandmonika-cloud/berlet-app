'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'guardian/guardian-search-fixed-bottom-v1193.js'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian/guardian-search-fixed-bottom-v1193.css'),'utf8');
const html=fs.readFileSync(path.join(root,'guardian/index.html'),'utf8');

function harness(){
 const on={},attrs={},vars={},classes=new Set(),timers=[];
 const card={style:{setProperty:(k,v)=>vars[k]=v},getBoundingClientRect:()=>bounds,
  classList:{contains:k=>classes.has(k)},
  setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]};
 const bounds={left:27,width:365,top:270,bottom:730};
 const nav={hidden:false,getBoundingClientRect:()=>({top:735})};
 const input={addEventListener:(k,fn)=>on['input:'+k]=fn};
 const doc={readyState:'complete',documentElement:{getAttribute:()=>null},
  body:{classList:{contains:()=>false}},activeElement:null,
  querySelector:q=>q==='.map-card'?card:null,
  getElementById:id=>({sh9GlobalNavV24:nav,guardianMapSearchV819:{},
    guardianMapSearchInputV819:input})[id]||null};
 const win={innerHeight:801,innerWidth:405,requestAnimationFrame:fn=>fn(),
  matchMedia:()=>({matches:true}),
  getComputedStyle:()=>({display:'grid',visibility:'visible'}),
  addEventListener:(k,fn)=>on[k]=fn,
  setTimeout:(fn,ms)=>{timers.push([fn,ms]);return timers.length;},
  visualViewport:{addEventListener:(k,fn)=>on['vv:'+k]=fn}};
 vm.runInNewContext(script,{window:win,document:doc,Number,Math});
 return {vars,attrs,on,classes,bounds,doc};
}

test('search is anchored above actual bottom nav, even when page scrolls past map',()=>{
 const h=harness();
 assert.equal(h.attrs['data-hh-search-fixed-v1193'],'on');
 assert.equal(h.vars['--hh-search-screen-bottom-v1193'],'66px');
 assert.equal(h.vars['--hh-search-screen-width-v1193'],'365px');
 h.bounds.top=-600;h.bounds.bottom=-140;
 h.on.scroll();
 assert.equal(h.attrs['data-hh-search-fixed-v1193'],'on');
});

test('fullscreen mode releases fixed search; keyboard retains its independent guard',()=>{
 const h=harness();
 h.classes.add('hh-map-full-v819');h.on.resize();
 assert.equal(h.attrs['data-hh-search-fixed-v1193'],undefined);
 h.classes.delete('hh-map-full-v819');h.on.resize();
 assert.equal(h.attrs['data-hh-search-fixed-v1193'],'on');
 h.classes.add('hh-map-typing-v832');h.on.scroll();
 assert.equal(h.attrs['data-hh-search-fixed-v1193'],'on');
 assert.match(css,/:not\\(\\.hh-map-typing-v832\\)/);
});

test('new script is cache busted without changing search, GPS or native map controls',()=>{
 assert.match(html,/guardian-search-fixed-bottom-v1193\\.js\\?v=1194-sticky-screen-nav/);
 assert.match(css,/position:fixed!important/);
 assert.match(script,/rect\\.width<=0/);
 assert.doesNotMatch(script,/rect\\.bottom<=96|rect\\.top>=nav\\.top/);
 assert.doesNotMatch(script,/geolocation|localStorage|sessionStorage|fetch\\(|supabase|setInterval/);
});
