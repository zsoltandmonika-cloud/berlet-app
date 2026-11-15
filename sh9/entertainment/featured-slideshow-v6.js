/* SHO Smart Entertainment · Golden V6 category-driven featured slideshow
 * Six categories: Mozi, Színház, Koncertek, Home Media, Kultúra, Rendezvények.
 * Uses existing linked cards and same-origin published catalogs; does not
 * manufacture availability, prices, film releases or booking times.
 * Respects reduced motion, screen visibility and user's manual interactions.
 */
(function(w,d){
'use strict';
const root=d.querySelector('.pixel-extension'),source=d.getElementById('pixelFeatureLink');
if(!root||!source)return;
const PHOTO={
 cinema:'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1050&auto=format&fit=crop&q=82',
 theatre:'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1050&auto=format&fit=crop&q=82',
 concert:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1050&auto=format&fit=crop&q=82',
 home:'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1050&auto=format&fit=crop&q=82',
 culture:'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1050&auto=format&fit=crop&q=82',
 events:'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1050&auto=format&fit=crop&q=82'
};
const DEFAULTS=[
 {kind:'cinema',category:'Mozi',icon:'🎬',dom:'#movies',title:'Premierfilmek és VIP moziélmény',note:'Friss moziajánló · vetítések · jegyek',href:'#mozi'},
 {kind:'theatre',category:'Színház',icon:'🎭',dom:'#theatres',title:'Színházi premierek',note:'Előadások és műsor · hivatalos programoldalak',href:'#szinhaz'},
 {kind:'concert',category:'Koncertek',icon:'🎵',dom:'#concerts',title:'Koncertek és élőzene',note:'Adventi estek · koncertek · hivatalos programok',href:'#koncert'},
 {kind:'home',category:'Home Media',icon:'📺',title:'MediaRadar: néznivalók otthonra',note:'Filmek · sorozatok · dokumentumfilmek · streaming',href:'https://mediaradar.pages.dev/'},
 {kind:'culture',category:'Kultúra',icon:'🏛️',catalog:'./kultura/',title:'Kulturális élmények',note:'Kiállítások · múzeumok · galériák',href:'./kultura/'},
 {kind:'events',category:'Rendezvények',icon:'🎡',catalog:'./rendezvenyek/',title:'Budapesti rendezvények',note:'Fesztiválok · vásárok · programok',href:'./rendezvenyek/'}
];
const FAVKEY='sho-entertainment-favorites-v1',PINKEY='sho-entertainment-featured-v1189';
const PAUSE_MS=6300;const reduced=()=>w.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const $=(id)=>d.getElementById(id),clean=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,150);
const validDate=s=>{if(!s)return true;const n=Date.parse(String(s).slice(0,10)+'T23:59:59');return Number.isFinite(n)&&n>=Date.now()};
const imageUrl=s=>{
 const raw=String(s||'').match(/url\(\s*(['"]?)(.*?)\1\s*\)/)?.[2]||String(s||'').trim();
 try{const u=new URL(raw,w.location.href);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(_){return ''}
};
const safeHref=s=>{
 if(typeof s!=='string')return '';
 if(s.startsWith('#'))return /^#[\w-]+$/.test(s)?s:'';
 try{
  const u=new URL(s,w.location.href);
  return u.protocol==='https:'||u.protocol==='http:'&&u.origin===w.location.origin?u.href:'';
 }catch(_){return ''}
};
const elem=(tag,cls,value)=>{
 const node=d.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};
function savedFavourites(){
 try{const f=JSON.parse(w.localStorage.getItem(FAVKEY)||'[]');return Array.isArray(f)?new Set(f):new Set()}catch(_){return new Set()}
}
function fromCurrentCards(def){
 const cards=Array.from(d.querySelectorAll(def.dom+' .card')).filter(card=>
  validDate(card.dataset.eventDate)&&validDate(card.dataset.end)&&!!card.querySelector('.card-body b'));
 if(!cards.length)return null;
 const favs=savedFavourites();
 cards.sort((a,b)=>{
  const sa=(favs.has(a.dataset.id)?5:0)+(a.classList.contains('etele-featured')?3:0)+(a.classList.contains('featured')?2:0);
  const sb=(favs.has(b.dataset.id)?5:0)+(b.classList.contains('etele-featured')?3:0)+(b.classList.contains('featured')?2:0);
  return sb-sa;
 });
 const chosen=cards[0],cta=chosen.querySelector('.cta')||chosen.querySelector('.cinema-card-open, .arena-card-open');
 return {title:clean(chosen.querySelector('.card-body b')?.textContent)||def.title,
  note:clean(chosen.querySelector('.card-body small')?.textContent)||def.note,
  image:imageUrl(chosen.style.getPropertyValue('--img'))||PHOTO[def.kind],
  href:safeHref(cta?.getAttribute('href'))||def.href};
}
function fromCatalog(document,def){
 const cards=Array.from(document.querySelectorAll('#catalog article.card')).filter(card=>
  validDate(card.dataset.end)&&validDate(card.dataset.eventDate));
 if(!cards.length)return null;
 // Prefer a dated, upcoming event when it is within 45 days; otherwise use
 // the editorial first recommendation. Do not advertise already ended events.
 const horizon=Date.now()+45*24*60*60*1000;
 const soon=cards.filter(c=>c.dataset.end&&Date.parse(c.dataset.end+'T23:59:59')<horizon)
  .sort((a,b)=>Date.parse(a.dataset.end)-Date.parse(b.dataset.end))[0];
 const chosen=soon||cards[0];
 return {title:clean(chosen.querySelector('.card-bd h3')?.textContent)||def.title,
  note:clean(chosen.querySelector('.card-bd p')?.textContent)||def.note,
  image:imageUrl(chosen.querySelector('.photo')?.style.backgroundImage)||PHOTO[def.kind],
  href:safeHref(chosen.querySelector('.ctas .open')?.getAttribute('href'))||def.href};
}
async function loadCatalog(def){
 try{
  const res=await w.fetch(def.catalog,{method:'GET',cache:'default',credentials:'same-origin'});
  if(!res.ok)throw Error('catalog '+res.status);
  const html=await res.text();
  const parsed=new DOMParser().parseFromString(html,'text/html');
  return fromCatalog(parsed,def);
 }catch(_){return null}
}
function customPinned(){
 try{
  const p=JSON.parse(w.localStorage.getItem(PINKEY)||'null');
  if(!p||!clean(p.title)||!safeHref(p.url))return null;
  return {kind:'pinned',category:'Saját kiemelés',icon:'📌',title:clean(p.title),
   note:clean(p.note)||'Személyre szabott program',href:safeHref(p.url),image:PHOTO.cinema};
 }catch(_){return null}
}
let slides=[],index=0,timer=null,pausedByView=false,hovered=false,focusInside=false,swipeBlockUntil=0,initialized=false;
let lastManual=0;
const carousel=elem('div','sho-feature-carousel'),viewport=elem('div','sho-feature-viewport');
carousel.id='shoFeatureCarousel';
carousel.setAttribute('aria-label','Kiemelt ajánlatok a hat szórakozási kategóriából');
carousel.setAttribute('role','region');carousel.setAttribute('aria-roledescription','diavetítés');
const prev=elem('button','sho-feature-prev','‹'),next=elem('button','sho-feature-next','›');
prev.type=next.type='button';prev.setAttribute('aria-label','Előző kiemelt ajánlat');
next.setAttribute('aria-label','Következő kiemelt ajánlat');
const dots=elem('div','sho-feature-dots'),counter=elem('span','sho-feature-counter');
dots.setAttribute('role','group');dots.setAttribute('aria-label','Kiemelt ajánlatok kiválasztása');
carousel.append(viewport,prev,next,dots,counter);
root.append(carousel);
function navigateTarget(node,slide){
 node.href=slide.href;
 const external=slide.href.startsWith('https://')&&new URL(slide.href).origin!==w.location.origin;
 if(external){node.target='_blank';node.rel='noopener noreferrer'}
}
function buildCard(slide,n){
 const link=elem('a','sho-feature-slide'),photo=elem('span','sho-feature-photo'),shade=elem('span','sho-feature-shade');
 link.dataset.category=slide.kind;
 link.setAttribute('aria-label',slide.category+': '+slide.title+' · Részletek');
 navigateTarget(link,slide);
 const pic=slide.image||PHOTO[slide.kind]||PHOTO.cinema;
 if(pic)photo.style.backgroundImage='url("'+pic.replace(/"/g,'%22')+'")';
 const top=elem('span','sho-feature-top');
 top.append(elem('span','sho-feature-category',slide.icon+' '+slide.category),
  elem('span','sho-feature-pick','✦ KIEMELT AJÁNLAT'));
 const text=elem('span','sho-feature-copy');
 text.append(elem('strong','sho-feature-title',slide.title),
  elem('small','sho-feature-note',slide.note),
  elem('span','sho-feature-cta','Részletek és programok ↗'));
 link.append(photo,shade,top,text);
 link.addEventListener('click',e=>{if(Date.now()<swipeBlockUntil)e.preventDefault()});
 link.setAttribute('aria-hidden','true');link.tabIndex=-1;
 return link;
}
function draw(){
 viewport.replaceChildren();dots.replaceChildren();
 slides.forEach((slide,i)=>{
  viewport.append(buildCard(slide,i));
  const button=elem('button','sho-feature-dot');
  button.type='button';button.setAttribute('aria-label',(i+1)+'. ajánlat: '+slide.category);
  button.title=slide.category;button.addEventListener('click',()=>show(i,true));
  dots.append(button);
 });
 show(Math.min(index,slides.length-1),false);
 root.dataset.carouselReady='true';
 initialized=true;
 schedule();
}
function canPlay(){
 return initialized&&slides.length>1&&!reduced()&&!pausedByView&&!hovered&&!focusInside&&
  d.visibilityState!=='hidden'&&!$('shoFeatureDialog')?.open;
}
function schedule(){
 w.clearTimeout(timer);timer=null;
 if(canPlay())timer=w.setTimeout(()=>show(index+1,false),PAUSE_MS);
}
function show(n,manual){
 if(!slides.length)return;
 index=((n%slides.length)+slides.length)%slides.length;
 const links=Array.from(viewport.children),buttons=Array.from(dots.children);
 links.forEach((node,i)=>{
  const active=i===index;
  node.classList.toggle('active',active);
  node.setAttribute('aria-hidden',String(!active));node.tabIndex=active?0:-1;
 });
 buttons.forEach((b,i)=>{
  const active=i===index;
  b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);
 });
 counter.textContent=(index+1)+' / '+slides.length;
 if(manual){lastManual=Date.now();try{w.navigator.vibrate?.(8)}catch(_){}}
 schedule();
}
prev.addEventListener('click',()=>show(index-1,true));
next.addEventListener('click',()=>show(index+1,true));
let touchX=null,touchY=null,touchAt=0;
carousel.addEventListener('touchstart',e=>{
 if(e.touches.length!==1)return;
 touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;touchAt=Date.now();
},{passive:true});
carousel.addEventListener('touchend',e=>{
 if(touchX===null||e.changedTouches.length!==1)return;
 const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;
 touchX=null;
 if(Math.abs(dx)>44&&Math.abs(dy)<80&&Date.now()-touchAt<1100){
  swipeBlockUntil=Date.now()+650;show(index+(dx<0?1:-1),true);
 }
},{passive:true});
carousel.addEventListener('mouseenter',()=>{hovered=true;schedule()});
carousel.addEventListener('mouseleave',()=>{hovered=false;schedule()});
carousel.addEventListener('focusin',()=>{focusInside=true;schedule()});
carousel.addEventListener('focusout',()=>{w.setTimeout(()=>{focusInside=carousel.contains(d.activeElement);schedule()},0)});
d.addEventListener('visibilitychange',schedule);
w.addEventListener('pagehide',()=>{w.clearTimeout(timer);timer=null});
w.addEventListener('pageshow',schedule);
w.addEventListener('storage',e=>{if([PINKEY,FAVKEY].includes(e.key))void refresh()});
if('IntersectionObserver' in w){
 const observer=new IntersectionObserver(entries=>{pausedByView=!entries[0]?.isIntersecting;schedule()},{threshold:0.25});
 observer.observe(carousel);
}
function pinnedSlideWithDefaults(defs){
 const pin=customPinned();
 return pin?[...defs,pin]:defs;
}
async function refresh(){
 const oldKind=slides[index]?.kind;
 const defs=DEFAULTS.map(def=>{
  const inPage=def.dom?fromCurrentCards(def):null;
  return {...def,...inPage,image:inPage?.image||PHOTO[def.kind]};
 });
 slides=pinnedSlideWithDefaults(defs);
 const oldIndex=slides.findIndex(x=>x.kind===oldKind);
 if(oldIndex>=0)index=oldIndex;
 draw();
 // Same-origin catalog pages are a curated source, NOT live reservation availability.
 const catalogs=DEFAULTS.filter(x=>x.catalog);
 const extras=await Promise.all(catalogs.map(loadCatalog));
 if(!initialized)return;
 for(let i=0;i<catalogs.length;i++){
  const item=extras[i],idx=slides.findIndex(x=>x.kind===catalogs[i].kind);
  if(item&&idx>=0)slides[idx]={...slides[idx],...item};
 }
 draw();
}
w.addEventListener('sho:featured-updated',()=>void refresh());
void refresh();
w.SH9_ENTERTAINMENT_SLIDESHOW_V6=Object.freeze({
 get slideCount(){return slides.length},
 get activeCategory(){return slides[index]?.category||''},
 next(){show(index+1,true)},
 prev(){show(index-1,true)},
 refresh
});
})(window,document);