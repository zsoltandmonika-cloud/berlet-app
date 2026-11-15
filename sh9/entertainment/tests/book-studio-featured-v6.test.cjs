'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const script=read('sh9/entertainment/featured-slideshow-v6.js');
const css=read('sh9/entertainment/featured-slideshow-v6.css');
const html=read('sh9/entertainment/index.html');
const old=read('sh9/entertainment/feature-pin-v1189.js');
const step1=read('sh9/entertainment/feature-books-etelesize-v5.css');

test('Six-category slider is loaded after original feature editor, while preserving cinema tiles',()=>{
 assert.ok(html.indexOf('featured-slideshow-v6.js')>html.indexOf('feature-pin-v1189.js'));
 assert.ok(html.indexOf('featured-slideshow-v6.css')>html.indexOf('feature-books-etelesize-v5.css'));
 for(const name of ['Mozi','Színház','Koncertek','Home Media','Kultúra','Rendezvények'])
  assert.ok(html.includes(name));
 assert.match(html,/id="pixelFeatureLink"/);
 assert.match(html,/id="pixelFeatureEdit"/);
 assert.match(html,/books-promo--immersive/);
 assert.match(html,/class="card etele-featured"/);
 assert.match(old,/sho:featured-updated/);
});
test('Slider is Etele Premium-sized, changes photo/text, supports swipe, dots and respects reduced motion',()=>{
 assert.match(step1,/--sho-etele-tile-height:calc\(\(100vw - 24px\) \/ 1\.62\)/);
 assert.match(css,/height:calc\(\(100vw - 24px\)\/1\.62\)!important/);
 assert.match(css,/width:calc\(100vw - 24px\)!important/);
 assert.match(css,/\.sho-feature-slide\.active/);
 assert.match(css,/\.sho-feature-slide \.sho-feature-photo/);
 assert.match(css,/\.sho-feature-dots/);
 assert.match(script,/touchstart/);
 assert.match(script,/touchend/);
 assert.match(script,/Math\.abs\(dx\)>44/);
 assert.match(script,/PAUSE_MS=6300/);
 assert.match(script,/IntersectionObserver/);
 assert.match(script,/prefers-reduced-motion/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Source recommendations come from existing dated cards and same-origin catalogues, not fictional showtimes',()=>{
 assert.match(script,/#movies/);
 assert.match(script,/#theatres/);
 assert.match(script,/#concerts/);
 assert.match(script,/\.\/kultura\//);
 assert.match(script,/\.\/rendezvenyek\//);
 assert.match(script,/mediaradar\.pages\.dev/);
 assert.match(script,/validDate\(card\.dataset\.eventDate\)/);
 assert.match(script,/safeHref/);
 assert.doesNotMatch(script,/makeReservation|bookTable|freeSeats|liveAvailability|fictitious/);
});
test('Slideshow JavaScript parses in V8',()=>{assert.doesNotThrow(()=>new Function(script))});
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};
  this.attributes={};this.listeners={};this.tabIndex=0;this.textContent='';
  const classes=new Set();
  this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),
   contains:x=>classes.has(x),toggle:(x,on)=>{if(on)classes.add(x);else classes.delete(x);return !!on}};
 }
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 setAttribute(k,v){this.attributes[k]=String(v)}
 removeAttribute(k){delete this.attributes[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 contains(){return false}
}
function card({title,summary,href,date,id,featured=false}){
 const element=new El('article');
 element.dataset={id,eventDate:date};element.classList={contains:x=>featured&&x==='featured'};
 element.style={getPropertyValue:()=> "url('https://example.org/test-photo.jpg')"};
 element.querySelector=sel=>{
  if(sel==='.card-body b')return {textContent:title};
  if(sel==='.card-body small')return {textContent:summary};
  if(sel==='.cta')return {getAttribute:k=>k==='href'?href:''};
  return null;
 };
 return element;
}
test('Browser-like VM renders six rotating clickable category recommendations and skips expired events',async()=>{
 const panel=new El('section'),link=new El('a');
 const localStorage={getItem:k=>k==='sho-entertainment-favorites-v1'?'["cinema-etele-premium"]':null};
 const doc={
  visibilityState:'visible',activeElement:null,
  querySelector:s=>s==='.pixel-extension'?panel:null,
  querySelectorAll:s=>{
   if(s==='#movies .card')return [card({id:'cinema-etele-premium',title:'Etele Premium',summary:'VIP élmény',href:'https://www.cinemacity.hu/'})];
   if(s==='#theatres .card')return [
    card({id:'expired',title:'Lejárt előadás',summary:'Múlt',date:'2020-01-01',href:'#szinhaz',featured:true}),
    card({id:'future',title:'Következő színházi műsor',summary:'Érvényes',date:'2099-11-21',href:'https://example.org/theatre'})];
   if(s==='#concerts .card')return [card({id:'concert',title:'Adventi koncert',summary:'Élőzene',href:'https://example.org/concert'})];
   return [];
  },
  getElementById:id=>id==='pixelFeatureLink'?link:id==='shoFeatureDialog'?{open:false}:null,
  createElement:tag=>new El(tag),
  addEventListener(){}
 };
 const app={
  location:{href:'https://example.net/sh9/entertainment/',origin:'https://example.net'},
  localStorage,navigator:{vibrate(){}},matchMedia:()=>({matches:true}),
  fetch:async()=>{throw Error('catalog temporarily offline')},
  setTimeout,clearTimeout,addEventListener(){}
 };
 vm.runInNewContext(script,{window:app,document:doc,URL,Date,DOMParser:function(){}},{timeout:4000});
 await new Promise(resolve=>setTimeout(resolve,5));
 const api=app.SH9_ENTERTAINMENT_SLIDESHOW_V6;
 assert.ok(api,'API is present');
 assert.equal(api.slideCount,6);
 assert.equal(api.activeCategory,'Mozi');
 const carousel=panel.children[0],viewport=carousel.children[0];
 assert.equal(viewport.children.length,6);
 assert.equal(viewport.children[0].href,'https://www.cinemacity.hu/');
 assert.equal(viewport.children[1].href,'https://example.org/theatre');
 assert.equal(viewport.children[1].children[3].children[0].textContent,'Következő színházi műsor');
 assert.equal(viewport.children[4].href,'./kultura/');
 assert.equal(viewport.children[5].href,'./rendezvenyek/');
 assert.equal(panel.dataset.carouselReady,'true');
 api.next();assert.equal(api.activeCategory,'Színház');
 api.prev();assert.equal(api.activeCategory,'Mozi');
});
