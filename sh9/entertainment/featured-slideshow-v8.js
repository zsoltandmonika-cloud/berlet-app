/* SHO Smart Entertainment Golden V8 · real-item premium slideshow.
 * 4 seconds. The next featured card enters from RIGHT and the previous
 * one leaves LEFT. No duplicate large white headings, buttons or settings.
 * Four separate (real) current items per category where catalog data exists.
 * MediaRadar movie/series art is read from its public, HU-filtered live dataset.
 */
(function(w,d){
'use strict';
const ROOT=d.querySelector('.pixel-extension');
if(!ROOT)return;
const $=id=>d.getElementById(id);
const DELAY=4000,TRANSITION_MS=570,MAX_PER_KIND=4;
const MEDIA_LIVE='https://mediaradar.pages.dev/data/bootstrap.json';
const MEDIA_FALLBACK='./data/featured-media-snapshot-v8.json';
const CINEMA_CURATED='./data/featured-cinema-v8.json';
const SHOWS_CURATED='./data/featured-shows-v8.json';
const FAV_KEY='sho-entertainment-favorites-v1';
const SPECS=[
 {kind:'cinema',name:'Mozi',icon:'🎬',selector:'#movies'},
 {kind:'theatre',name:'Színház',icon:'🎭',selector:'#theatres'},
 {kind:'concert',name:'Koncertek',icon:'🎵',selector:'#concerts'},
 {kind:'home',name:'Home Media',icon:'📺'},
 {kind:'culture',name:'Kultúra',icon:'🏛️',catalog:'./kultura/'},
 {kind:'events',name:'Rendezvények',icon:'🎡',catalog:'./rendezvenyek/'}
];
const DEFAULT_IMAGES={
 cinema:'./assets/etele-vip-cinematic-montage-v1196.webp',
 theatre:'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1000&auto=format&fit=crop&q=82',
 concert:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1000&auto=format&fit=crop&q=82',
 home:'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1000&auto=format&fit=crop&q=82',
 culture:'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1000&auto=format&fit=crop&q=82',
 events:'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1000&auto=format&fit=crop&q=82'
};
const reduced=()=>!!w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const text=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,150);
const isoNow=()=>new Date().toISOString().slice(0,10);
const notExpired=s=>!s||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>=isoNow());
const notFuture=s=>!s||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&s<=isoNow());
function href(raw){
 if(!raw||typeof raw!=='string')return '';
 if(/^#[a-z0-9_-]+$/i.test(raw))return raw;
 try{
  const u=new URL(raw,w.location.href);
  return u.protocol==='https:'||(u.protocol==='http:'&&u.origin===w.location.origin)?u.href:'';
 }catch(_){return ''}
}
function art(raw){
 const candidate=String(raw||'').trim().match(/url\(\s*(['"]?)(.*?)\1\s*\)/)?.[2]||String(raw||'').trim();
 if(!candidate)return '';
 try{
  const u=new URL(candidate,w.location.href);
  return ['https:','http:'].includes(u.protocol)?u.href:'';
 }catch(_){return ''}
}
const el=(tag,cls,str)=>{
 const n=d.createElement(tag);if(cls)n.className=cls;
 if(str!==undefined)n.textContent=str;return n;
};
function shuffle(items){
 const a=items.slice();
 for(let i=a.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}
function favourites(){
 try{
  const value=JSON.parse(w.localStorage.getItem(FAV_KEY)||'[]');
  return new Set(Array.isArray(value)?value.filter(v=>typeof v==='string'):[]);
 }catch(_){return new Set()}
}
function markupCard(item,spec,photo,link,title,subtitle){
 const url=href(link);if(!url||!title)return null;
 return {
  id:spec.kind+':'+(item.dataset?.id||url+'-'+title),
  kind:spec.kind,category:spec.name,icon:spec.icon,
  title:text(title),note:text(subtitle||''),
  image:art(photo)||art(DEFAULT_IMAGES[spec.kind]),href:url,
  poster:'',source:'SHO'
 };
}
function fromSHO(spec){
 const fav=favourites();
 const nodes=Array.from(d.querySelectorAll(spec.selector+' .card'));
 const entries=nodes.filter(node=>
   notExpired(node.dataset?.eventDate)&&notExpired(node.dataset?.end)&&
   node.querySelector('.card-body b'));
 const result=entries.map(node=>{
  const anchor=node.querySelector('.cta')||node.querySelector('.etele-card-open, .arena-card-open, .cinema-card-open');
  const entry=markupCard(node,spec,node.style.getPropertyValue('--img'),anchor?.getAttribute('href'),
   node.querySelector('.card-body b')?.textContent,node.querySelector('.card-body small')?.textContent);
  if(entry)entry.priority=(fav.has(node.dataset.id)?6:0)+(node.dataset.eventDate?2:0);
  return entry;
 }).filter(Boolean);
 result.sort((a,b)=>(b.priority||0)-(a.priority||0));
 return result.slice(0,MAX_PER_KIND);
}
function fromCatalogPage(page,spec){
 const cards=Array.from(page.querySelectorAll('#catalog article.card'))
  .filter(c=>notExpired(c.dataset?.end)&&notExpired(c.dataset?.eventDate));
 const results=[];
 for(const card of cards){
  const title=card.querySelector('.card-bd h3')?.textContent;
  const subtitle=card.querySelector('.card-bd p')?.textContent;
  const cover=card.querySelector('.photo')?.style.backgroundImage;
  const url=card.querySelector('.ctas .open')?.getAttribute('href');
  const entry=markupCard(card,spec,cover,url,title,subtitle);
  if(entry)results.push(entry);
 }
 // Specific current shows/exhibitions appear before open-ended venues.
 results.sort((a,b)=>{
  const ai=cards.find(x=>x.dataset.id===a.id.split(':')[1])?.dataset?.end||'9999-99-99';
  const bi=cards.find(x=>x.dataset.id===b.id.split(':')[1])?.dataset?.end||'9999-99-99';
  return ai.localeCompare(bi);
 });
 return results.slice(0,MAX_PER_KIND);
}
async function readJson(url){
 const response=await w.fetch(url,{method:'GET',cache:'no-store',credentials:'omit'});
 if(!response.ok)throw Error('HTTP '+response.status+' '+url);
 return response.json();
}
async function catalog(spec){
 try{
  const result=await w.fetch(spec.catalog,{method:'GET',credentials:'same-origin',cache:'default'});
  if(!result.ok)throw Error('Katalógus HTTP '+result.status);
  const html=await result.text();
  return fromCatalogPage(new w.DOMParser().parseFromString(html,'text/html'),spec);
 }catch(_){return []}
}
async function cinemas(spec){
 try{
  const published=await readJson(CINEMA_CURATED);
  if(published.expires&&published.expires<isoNow())return fromSHO(spec);
  const current=(published.items||[]).filter(x=>
    x.title&&x.href&&x.image&&notFuture(x.releaseDate)&&notExpired(x.endDate));
  const cards=current.map((x,i)=>({
   id:'cinema:premiere:'+i+':'+x.title,kind:'cinema',category:spec.name,icon:spec.icon,
   title:text(x.title),note:text(x.subtitle||''),image:art(x.image),
   poster:art(x.poster||x.image),href:href(x.href),source:x.source||'Nyilvános moziműsor',
   priority:100-i
  })).filter(x=>x.image&&x.href).slice(0,MAX_PER_KIND);
  return cards.length?cards:fromSHO(spec);
 }catch(_){return fromSHO(spec)}
}
async function shows(spec){
 try{
  const data=await readJson(SHOWS_CURATED);
  const current=(data.shows?.[spec.kind]||[]).filter(x=>
   x.title&&x.href&&x.image&&notExpired(x.endDate));
  const result=current.map((x,i)=>({
   id:spec.kind+':event:'+i+':'+x.title,kind:spec.kind,category:spec.name,icon:spec.icon,
   title:text(x.title),note:text(x.note||''),image:art(x.image),poster:'',
   href:href(x.href),source:'Hivatalos programszervező',priority:100-i
  })).filter(x=>x.image&&x.href).slice(0,MAX_PER_KIND);
  return result.length?result:fromSHO(spec);
 }catch(_){return fromSHO(spec)}
}
function filteredMediaRows(data){
 if(!Array.isArray(data?.titles))return [];
 // The original MediaRadar project applies explicit KR/JP hard filters.
 // Do not bypass those filters with raw/unmoderated TMDB discovery.
 if(data.fallback!==true&&(!data.filtersApplied?.hard||
  !data.filtersApplied.blockedCountries?.includes('KR')))return [];
 const rows=data.titles.filter(x=>{
  const kind=x.contentKind||x.type;
  return ['movie','series'].includes(kind)&&x.title&&x.backdrop&&x.poster&&
   (x.tmdbUrl||x.href||x.url)&&x.releaseDate&&notFuture(x.releaseDate)&&
   !/[\uac00-\ud7af]/.test((x.originalTitle||'')+' '+x.title);
 });
 rows.sort((a,b)=>
  String(b.releaseDate).localeCompare(String(a.releaseDate))||
  Number(b.score||0)-Number(a.score||0));
 return rows;
}
function homeSlides(data,spec){
 const rows=filteredMediaRows(data),chosen=[];
 // Precisely two recent films and two recent series, without presenting
 // documentary or unrelated show catalogs as cinema releases.
 for(const kind of ['movie','series']){
  const selected=rows.filter(x=>(x.contentKind||x.type)===kind).slice(0,2);
  chosen.push(...selected);
 }
 return chosen.map(x=>({
  id:'home:'+x.id,kind:'home',category:spec.name,icon:spec.icon,
  title:text(x.title),note:text((x.platform||'Streaming')+' · '+((x.contentKind||x.type)==='series'?'Új sorozat':'Új film')),
  image:art(x.backdrop),poster:art(x.poster),
  href:href(x.url||x.href||x.tmdbUrl),
  source:data.fallback?'MediaRadar válogatás (mentett)':'MediaRadar élő',
  released:x.releaseDate
 })).filter(x=>x.image&&x.href);
}
async function media(spec){
 try{
  const live=await readJson(MEDIA_LIVE);
  const choices=homeSlides(live,spec);
  if(choices.length>=3)return choices.slice(0,MAX_PER_KIND);
 }catch(_){/* CORS or offline: use published fallback from same-origin snapshot. */}
 try{
  const snapshot=await readJson(MEDIA_FALLBACK);
  return homeSlides(snapshot,spec).slice(0,MAX_PER_KIND);
 }catch(_){return []}
}
function arrange(pools){
 // Each cycle contains up to four NEW INDIVIDUAL recommendations per category.
 // Vary both item order and category order, not a block of four identical kinds.
 const kinds=shuffle(SPECS.map(s=>s.kind));
 const queue=kinds.map(kind=>({kind,items:shuffle(pools.get(kind)||[]).slice(0,MAX_PER_KIND)}));
 const slides=[];
 for(let pass=0;pass<MAX_PER_KIND;pass++)
  for(const group of queue)if(group.items[pass])slides.push(group.items[pass]);
 return slides;
}
const carousel=el('div','sho-feature-carousel'),viewport=el('div','sho-feature-viewport');
carousel.id='shoFeatureCarousel';
carousel.setAttribute('role','region');
carousel.setAttribute('aria-label','Újdonságok: mozi, színház, koncertek, filmek, sorozatok, kultúra, rendezvények');
carousel.setAttribute('aria-roledescription','diavetítés');
carousel.append(viewport);ROOT.append(carousel);
let slides=[],position=0,autoplay=null,leavingTimer=null,pausedByView=false,hovered=false,focusInside=false;
let touching=false,swipeBlockUntil=0,ready=false,transitionLock=0,epoch=0;
let touchX=null,touchY=null,touchAt=0,pointerX=null,pointerY=null,pointerAt=0;
function card(slide){
 const link=el('a','sho-feature-slide'),photo=el('span','sho-feature-photo');
 const shade=el('span','sho-feature-shade'),ribbon=el('span','sho-feature-ribbon');
 const meta=el('span','sho-feature-meta',slide.icon+' '+slide.category);
 const copy=el('span','sho-feature-minicopy');
 copy.append(el('span','sho-feature-itemname',slide.title));
 if(slide.note)copy.append(el('span','sho-feature-itemnote',slide.note));
 ribbon.append(meta,copy);
 link.dataset.category=slide.kind;
 link.href=slide.href;
 link.setAttribute('aria-label',slide.category+': '+slide.title+' · megnyitás');
 const external=slide.href.startsWith('https://')&&new URL(slide.href).origin!==w.location.origin;
 if(external){link.target='_blank';link.rel='noopener noreferrer'}
 photo.dataset.image=slide.image||DEFAULT_IMAGES[slide.kind];
 link.append(photo,shade,ribbon);
 if(slide.poster){
  const poster=el('img','sho-feature-poster');
  poster.alt='';poster.decoding='async';poster.loading='lazy';poster.dataset.src=slide.poster;
  link.append(poster);link.classList.add('with-poster');
 }
 link.draggable=false;
 link.addEventListener('dragstart',e=>e.preventDefault());
 link.addEventListener('click',e=>{if(Date.now()<swipeBlockUntil)e.preventDefault()});
 link.setAttribute('aria-hidden','true');link.tabIndex=-1;
 return link;
}
function prime(i){
 if(!slides.length)return;
 const n=((i%slides.length)+slides.length)%slides.length;
 const node=viewport.children[n];if(!node)return;
 const photo=node.querySelector('.sho-feature-photo');
 if(photo?.dataset.image&&!photo.dataset.loaded){
  photo.style.backgroundImage='url("'+photo.dataset.image.replace(/"/g,'%22')+'")';
  photo.dataset.loaded='true';
 }
 const poster=node.querySelector('.sho-feature-poster');
 if(poster?.dataset.src&&!poster.getAttribute('src')){
  poster.src=poster.dataset.src;
 }
}
function autoplayAllowed(){
 return ready&&slides.length>1&&!reduced()&&!pausedByView&&!hovered&&!focusInside&&!touching&&
  d.visibilityState!=='hidden';
}
function schedule(){
 w.clearTimeout(autoplay);autoplay=null;
 if(autoplayAllowed())autoplay=w.setTimeout(()=>show(position+1,false),DELAY);
}
function show(n,manual){
 if(!slides.length)return;
 if(Date.now()<transitionLock)return;
 const next=((n%slides.length)+slides.length)%slides.length;
 const incoming=viewport.children[next];
 if(!incoming)return;
 prime(next);prime(next+1);prime(next-1);
 const previous=viewport.children[position];
 if(ready&&next!==position&&!reduced()){
  transitionLock=Date.now()+TRANSITION_MS;
  w.clearTimeout(leavingTimer);
  previous.classList.remove('is-active');
  previous.classList.add('is-leaving');
  incoming.classList.remove('is-leaving');
  // Layout must be read between preparing the incoming panel and starting
  // its translateX(100%) to translateX(0) transition.
  void incoming.offsetWidth;
  incoming.classList.add('is-active');
  leavingTimer=w.setTimeout(()=>previous.classList.remove('is-leaving'),TRANSITION_MS+15);
 }else{
  for(const node of viewport.children)node.classList.remove('is-active','is-leaving');
  incoming.classList.add('is-active');
 }
 position=next;ready=true;
 for(const [i,node] of Array.from(viewport.children).entries()){
  node.tabIndex=i===next?0:-1;
  node.setAttribute('aria-hidden',String(i!==next));
 }
 if(manual)try{w.navigator.vibrate?.(6)}catch(_){}
 schedule();
}
function render(newSlides){
 w.clearTimeout(autoplay);w.clearTimeout(leavingTimer);autoplay=null;
 const previousId=slides[position]?.id;
 slides=newSlides;position=Math.max(0,slides.findIndex(x=>x.id===previousId));ready=false;transitionLock=0;
 viewport.replaceChildren(...slides.map(card));
 prime(position);prime(position+1);
 if(slides.length)show(position,false);
 ROOT.dataset.carouselReady=String(slides.length>0);
}
async function refresh(){
 const current=++epoch,previous=slides.slice();
 const tasks=await Promise.all(SPECS.map(async spec=>{
  if(spec.kind==='cinema')return [spec.kind,await cinemas(spec)];
  if(spec.kind==='home')return [spec.kind,await media(spec)];
  if(spec.kind==='theatre'||spec.kind==='concert')return [spec.kind,await shows(spec)];
  if(spec.catalog)return [spec.kind,await catalog(spec)];
  return [spec.kind,fromSHO(spec)];
 }));
 if(current!==epoch)return;
 const pools=new Map(tasks);
 const all=arrange(pools);
 // If network fails, keep the already usable cards instead of showing blank.
 if(all.length)render(all);else if(previous.length)render(previous);
}
carousel.addEventListener('touchstart',e=>{
 if(e.touches.length!==1)return;
 touching=true;touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;touchAt=Date.now();schedule();
},{passive:true});
carousel.addEventListener('touchend',e=>{
 touching=false;if(touchX===null||e.changedTouches.length!==1){schedule();return}
 const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=null;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2&&Date.now()-touchAt<1300){
  swipeBlockUntil=Date.now()+700;show(position+(dx<0?1:-1),true);
 }else schedule();
},{passive:true});
carousel.addEventListener('touchcancel',()=>{touchX=null;touching=false;schedule()},{passive:true});
carousel.addEventListener('pointerdown',e=>{
 if(!['mouse','pen'].includes(e.pointerType)||e.button!==0)return;
 pointerX=e.clientX;pointerY=e.clientY;pointerAt=Date.now();touching=true;schedule();
});
carousel.addEventListener('pointerup',e=>{
 if(pointerX===null)return;
 const dx=e.clientX-pointerX,dy=e.clientY-pointerY;pointerX=null;touching=false;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2&&Date.now()-pointerAt<1300){
  swipeBlockUntil=Date.now()+700;show(position+(dx<0?1:-1),true);
 }else schedule();
});
carousel.addEventListener('pointercancel',()=>{pointerX=null;touching=false;schedule()});
carousel.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
  e.preventDefault();show(position+(e.key==='ArrowRight'?1:-1),true);
 }
});
carousel.addEventListener('mouseenter',()=>{hovered=true;schedule()});
carousel.addEventListener('mouseleave',()=>{hovered=false;schedule()});
carousel.addEventListener('focusin',()=>{focusInside=true;schedule()});
carousel.addEventListener('focusout',()=>{w.setTimeout(()=>{focusInside=carousel.contains(d.activeElement);schedule()},0)});
d.addEventListener('visibilitychange',schedule);
w.addEventListener('pageshow',()=>{schedule();void refresh()});
w.addEventListener('pagehide',()=>{w.clearTimeout(autoplay);w.clearTimeout(leavingTimer)});
if('IntersectionObserver' in w){
 new w.IntersectionObserver(rows=>{
  pausedByView=!rows[0]?.isIntersecting;schedule();
 },{threshold:0.20}).observe(carousel);
}
void refresh();
w.SH9_ENTERTAINMENT_SLIDESHOW_V8=Object.freeze({
 get slideCount(){return slides.length},
 get categoryCount(){return new Set(slides.map(x=>x.kind)).size},
 get activeTitle(){return slides[position]?.title||''},
 get slides(){return slides.map(x=>({kind:x.kind,title:x.title,source:x.source}))},
 next(){show(position+1,true)},previous(){show(position-1,true)},refresh
});
})(window,document);