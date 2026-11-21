'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'sh9/shared/sho-tv-shortcut-v1.js'),'utf8');
const page=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
function trial(oldExists){
 const elements={},inHero=[];
 const hero={appendChild(el){el.parentNode=this;elements[el.id]=el;inHero.push(el)}};
 const document={
  readyState:'complete',
  head:{appendChild(el){elements[el.id]=el}},
  body:{appendChild(el){el.parentNode=this;elements[el.id]=el}},
  getElementById(id){return elements[id]||null},
  querySelector(q){return q==='main.shell > section.head.hero'?hero:null},
  createElement(tag){return {tagName:tag.toUpperCase(),id:'',setAttribute(){}}},
  addEventListener(){}
 };
 const previous={mount(){}};
 const window={location:{pathname:'/berlet-app/sh9/'},addEventListener(){}};
 if(oldExists){
  window.SHO_TV_SHORTCUT_V1=previous;
  elements.shoTvShortcutV1={id:'shoTvShortcutV1',parentNode:document.body};
 }
 vm.runInNewContext(src,{window,document},{timeout:500});
 assert.equal(inHero.filter(el=>el.id==='shoTvShortcutV1').length,1,'exactly one TV button in hero');
 assert.match(elements.shoTvHeroAnchorV5.textContent,/position:absolute!important;left:9px!important;top:9px!important/);
 assert.match(elements.shoTvHeroAnchorV5.textContent,/width:45px!important;height:45px!important/);
 if(oldExists)assert.equal(window.SHO_TV_SHORTCUT_V1,previous,'do not replace previous controller');
}
test('SHO TV shortcut anchors inside hero on fresh and cached mounts',()=>{trial(false);trial(true)});
test('SHO homepage loads V5 first, before shared nav, with cache bust',()=>{
 assert.ok(page.indexOf('sho-tv-shortcut-v1.js?v=5-hero-anchor-20261121')>0);
 assert.ok(page.indexOf('sho-tv-shortcut-v1.js?v=5-hero-anchor-20261121')<page.indexOf('sh9-golden-bottom-nav-v924.js?v=932-tv-hero-anchor'));
});
