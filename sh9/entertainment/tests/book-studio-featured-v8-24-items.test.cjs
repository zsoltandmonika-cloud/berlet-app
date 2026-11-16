'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const carousel=read('sh9/entertainment/featured-slideshow-v8.js');
const css=read('sh9/entertainment/featured-slideshow-v8.css');
const html=read('sh9/entertainment/index.html');
const cinema=JSON.parse(read('sh9/entertainment/data/featured-cinema-v8.json'));
const shows=JSON.parse(read('sh9/entertainment/data/featured-shows-v8.json'));
const media=JSON.parse(read('sh9/entertainment/data/featured-media-snapshot-v8.json'));
test('V8 is activated after V7 and old duplicate large white heading is no longer created',()=>{
 assert.match(html,/featured-slideshow-v8\.js\?v=8-4s-real-items-rtl/);
 assert.match(html,/featured-slideshow-v8\.css\?v=8-4s-new-items-rtl/);
 assert.doesNotMatch(html,/<script defer src="\.\/featured-slideshow-v6\.js/);
 assert.match(carousel,/const DELAY=4000,TRANSITION_MS=570,MAX_PER_KIND=4/);
 assert.match(carousel,/el\('span','sho-feature-itemname'/);
 assert.doesNotMatch(carousel,/el\('strong','sho-feature-title'/);
 assert.doesNotMatch(carousel,/elem\('span','sho-feature-cta'/);
 const open=(html.match(/<script(?:\s|>)/g)||[]).length;
 const close=(html.match(/<\/script>/g)||[]).length;
 assert.equal(open,close);
});
test('Genuine 4s right-to-left sliding: incoming from +100%, outgoing to -100%, no controls',()=>{
 assert.match(css,/transform:translate3d\(100%,0,0\)/);
 assert.match(css,/\.sho-feature-slide\.is-active\{[\s\S]*?transform:translate3d\(0,0,0\)/);
 assert.match(css,/\.sho-feature-slide\.is-leaving\{[\s\S]*?transform:translate3d\(-100%,0,0\)/);
 assert.match(carousel,/w\.setTimeout\(\(\)=>show\(position\+1,false\),DELAY\)/);
 assert.match(carousel,/touchend/);assert.match(carousel,/pointerup/);
 assert.match(carousel,/link\.href=slide\.href/);
 assert.match(carousel,/link\.draggable=false/);
 assert.doesNotMatch(carousel,/elem\('button','sho-feature-next'/);
 assert.match(css,/\.sho-feature-itemname\{[\s\S]*?font-size:clamp\(16px,1\.6vw,22px\)/);
});
test('Official sources, expiring premieres, media live-and-fallback and Korean filter',()=>{
 assert.equal(cinema.items.length,4);
 assert.equal(shows.shows.theatre.length,4);
 assert.equal(shows.shows.concert.length,4);
 assert.ok(media.titles.length>=8);
 assert.match(carousel,/MEDI[A-Z_]*_LIVE='https:\/\/mediaradar\.pages\.dev\/data\/bootstrap\.json'/);
 assert.match(carousel,/notExpired\(x\.endDate\)/);
 assert.match(carousel,/data\.filtersApplied\.blockedCountries\?\.includes\('KR'\)/);
 assert.match(carousel,/for\(const kind of \['movie','series'\]\)/);
 assert.match(carousel,/\.slice\(0,2\)/);
 assert.match(carousel,/shuffle\(pools\.get\(kind\)\|\|\[\]\)/);
 assert.doesNotThrow(()=>new Function(carousel));
});
class E{
 constructor(tag){this.tagName=tag;this.children=[];this.style={backgroundImage:'',getPropertyValue(){return ''}};
  this.dataset={};this.attributes={};this.listeners={};this.textContent='';this.tabIndex=0;
  const set=new Set();
  this.classList={add:x=>set.add(x),remove:(...xs)=>xs.forEach(x=>set.delete(x)),
   contains:x=>set.has(x),toggle:(x,on)=>{if(on)set.add(x);else set.delete(x);return !!on}};
  this.offsetWidth=370;
 }
 append(...a){this.children.push(...a)}
 replaceChildren(...a){this.children=[...a]}
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]||null}
 removeAttribute(k){delete this.attributes[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 querySelector(s){
  const cls=s.slice(1);
  const stack=[...this.children];
  while(stack.length){const item=stack.shift();if(item.className===cls||item.className?.split(' ').includes(cls))return item;stack.push(...item.children)}
  return null;
 }
 contains(){return false}
}
function fakeCatalogItems(prefix){
 return Array.from({length:4},(_,i)=>{
  const c=new E('article');c.dataset={id:prefix+'-'+i,end:'2099-12-31'};
  c.querySelector=s=>{
   if(s==='.card-bd h3')return {textContent:prefix+' friss ajánló '+(i+1)};
   if(s==='.card-bd p')return {textContent:'Aktuális műsor a hivatalos oldalon'};
   if(s==='.photo')return {style:{backgroundImage:"url('https://example.org/poster-"+prefix+i+".jpg')"}};
   if(s==='.ctas .open')return {getAttribute:()=>('https://example.org/'+prefix+'/'+i)};
   return null;
  };
  return c;
 });
}
test('V8 creates 24 real individualized clickable cards, four per category and two films + two series from MediaRadar',async()=>{
 const panel=new E('section'),models={...cinema,expires:'2099-12-31',
  items:cinema.items.map(x=>({...x,endDate:'2099-12-31'}))};
 const eventData={...shows,shows:Object.fromEntries(Object.entries(shows.shows)
  .map(([k,v])=>[k,v.map(x=>({...x,endDate:'2099-12-31'}))]))};
 const doc={visibilityState:'visible',activeElement:null,
  querySelector:s=>s==='.pixel-extension'?panel:null,
  querySelectorAll:()=>[],getElementById:()=>null,
  createElement:t=>new E(t),addEventListener(){}};
 const w={location:{href:'https://example.net/sh9/entertainment/',origin:'https://example.net'},
  localStorage:{getItem:()=>null},navigator:{vibrate(){}},setTimeout,clearTimeout,
  matchMedia:()=>({matches:true}),addEventListener(){},
  DOMParser:class{parseFromString(s){const prefix=s.includes('kultura')?'Kultúra':'Rendezvény';
   return {querySelectorAll:()=>fakeCatalogItems(prefix)};
  }},
  fetch:async(u)=>{
   const url=String(u),data=url.includes('featured-cinema-v8')?models:
    url.includes('featured-shows-v8')?eventData:
    url.includes('featured-media-snapshot-v8')?media:null;
   if(url.includes('mediaradar.pages.dev'))throw Error('Test: CORS offline');
   if(url==='./kultura/'||url==='./rendezvenyek/')
    return {ok:true,async text(){return url==='./kultura/'?'<html>kultura</html>':'<html>rendezvenyek</html>'}};
   if(data)return {ok:true,async json(){return data}};
   throw Error('Unexpected URL '+url);
  }};
 vm.runInNewContext(carousel,{window:w,document:doc,URL,Date,Math,setTimeout,clearTimeout},{timeout:7000});
 await new Promise(resolve=>setTimeout(resolve,30));
 const api=w.SH9_ENTERTAINMENT_SLIDESHOW_V8;
 assert.ok(api,'Slider API created');
 assert.equal(api.categoryCount,6);
 assert.equal(api.slideCount,24);
 const slides=api.slides;
 for(const kind of ['cinema','theatre','concert','home','culture','events']){
  assert.equal(slides.filter(x=>x.kind===kind).length,4,kind+' has 4 real items');
 }
 const mediaSliders=slides.filter(x=>x.kind==='home');
 assert.ok(mediaSliders.some(x=>/Galicia|Neagley|Apja|Akka|Palacio/i.test(x.title)),'Real series displayed');
 assert.ok(mediaSliders.some(x=>/Soha|Állatok|Nashville|Allen/i.test(x.title)),'Real movie displayed');
 assert.ok(slides.every(x=>!/^(Mozi|Színház|Koncertek|Home Media|Kultúra|Rendezvények)$/.test(x.title)));
 const viewport=panel.children[0].children[0];
 assert.equal(viewport.children.length,24);
 assert.ok(viewport.children.every(x=>x.tagName==='a'&&x.href&&x.children.length>=4));
 assert.ok(viewport.children.some(x=>!!x.querySelector('.sho-feature-poster')));
 assert.ok(viewport.children.every(x=>x.children.every(c=>c.className!=='sho-feature-title')));
 const title=api.activeTitle;api.next();assert.notEqual(api.activeTitle,title);
});
