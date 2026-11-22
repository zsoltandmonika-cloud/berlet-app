'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'sh9/shared/sho-tv-shortcut-v1.js'),'utf8');
const page=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');

function trial(oldExists){
 const elements={},bodyChildren=[];
 const hero={appendChild(el){el.parentNode=this;elements[el.id]=el;}};
 const body={appendChild(el){el.parentNode=this;elements[el.id]=el;if(!bodyChildren.includes(el))bodyChildren.push(el);}};
 const document={
  readyState:'complete',
  head:{appendChild(el){elements[el.id]=el}},
  body,
  getElementById(id){return elements[id]||null},
  querySelector(){return null},
  createElement(tag){return {tagName:tag.toUpperCase(),id:'',setAttribute(){}}},
  addEventListener(){}
 };
 const previous={mount(){}};
 const window={location:{pathname:'/berlet-app/sh9/'},addEventListener(){}};
 if(oldExists){
  window.SHO_TV_SHORTCUT_V1=previous;
  hero.appendChild({id:'shoTvShortcutV1',className:'sho-tv-shortcut-v1'});
 }
 vm.runInNewContext(src,{window,document},{timeout:500});
 assert.equal(bodyChildren.filter(el=>el.id==='shoTvShortcutV1').length,1,
  'exactly one existing or new TV shortcut must live in the page viewport, not in hero');
 assert.equal(elements.shoTvShortcutV1.parentNode,body);
 assert.match(elements.shoTvShortcutGlobalV6.textContent,
  /position:fixed!important;left:0!important;top:0!important/);
 assert.match(elements.shoTvShortcutGlobalV6.textContent,
  /width:31\.5px!important;height:31\.5px!important/);
 assert.equal(elements.shoTvHeroAnchorV5,undefined,'no old hero positioning override');
 if(oldExists)assert.equal(window.SHO_TV_SHORTCUT_V1,previous,'keep original shortcut controller API');
}
test('SHO TV shortcut stays top-left on fresh and cached home page mounts',()=>{trial(false);trial(true)});
test('SHO homepage loads the small shared shortcut first, before shared navigation',()=>{
 const shortcut='sho-tv-shortcut-v1.js?v=6-compact31-top-left-20261122';
 assert.ok(page.indexOf(shortcut)>0);
 assert.ok(page.indexOf(shortcut)<page.indexOf('sh9-golden-bottom-nav-v924.js?v=932-tv-hero-anchor'));
});
