/* HealthHub Nutrition v649 · Discreet Alternative Bristol scroll wheel.
 * Seven original food-metaphor illustrations, without brands or explicit anatomy.
 * Native #bristol select remains the single source of truth; legacy BODY BALANCE
 * save and Dropbox diary semantics stay unchanged.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
function boot(){
 const dialog=$('bodyDialog'),wrap=$('bristolWrap'),select=$('bristol'),stool=$('stoolBtn');
 if(!dialog||!wrap||!select||!stool||wrap.querySelector('.hh-bristol-wheel'))return;
 const types=[
  {n:1,food:'Csokigolyók',detail:'Különálló, kemény, apró bogyók',tone:'Keményebb'},
  {n:2,food:'Szőlőfürt',detail:'Rögös, kolbászszerű forma',tone:'Keményebb'},
  {n:3,food:'Müzliszelet',detail:'Formált, a felszínén repedésekkel',tone:'Formált'},
  {n:4,food:'Puha péksütemény',detail:'Sima, puha, hosszúkás forma',tone:'Formált'},
  {n:5,food:'Krémes falatkák',detail:'Puha, különálló, jól körülhatárolt darabok',tone:'Puha'},
  {n:6,food:'Sűrű zabkása',detail:'Pépes, szabálytalan szélű darabok',tone:'Lazább'},
  {n:7,food:'Kakaóital',detail:'Vizes, folyékony, szilárd részek nélkül',tone:'Folyékony'}
 ];
 const shapes={
  1:'<circle cx="56" cy="82" r="15"/><circle cx="98" cy="66" r="19"/><circle cx="143" cy="82" r="17"/><circle cx="184" cy="67" r="15"/><circle cx="90" cy="106" r="11"/><circle cx="162" cy="108" r="11"/>',
  2:'<path d="M126 29 Q138 25 148 13" fill="none" stroke="#508250" stroke-width="6" stroke-linecap="round"/><circle cx="113" cy="44" r="16"/><circle cx="145" cy="45" r="17"/><circle cx="96" cy="70" r="17"/><circle cx="129" cy="75" r="17"/><circle cx="164" cy="73" r="17"/><circle cx="112" cy="103" r="17"/><circle cx="147" cy="103" r="17"/><circle cx="130" cy="119" r="10"/>',
  3:'<g transform="translate(38 24) rotate(-8 78 47)"><rect x="0" y="18" width="173" height="75" rx="18"/><path d="M20 46 L44 39 L56 52 L77 41 L94 55 L118 44 L143 52" fill="none" stroke="#6c3c22" stroke-width="6" stroke-linecap="round"/><g fill="#efc48b" opacity=".92"><ellipse cx="25" cy="33" rx="9" ry="4"/><ellipse cx="56" cy="67" rx="8" ry="4"/><ellipse cx="95" cy="28" rx="7" ry="4"/><ellipse cx="127" cy="75" rx="7" ry="4"/><ellipse cx="150" cy="35" rx="8" ry="4"/></g></g>',
  4:'<g transform="rotate(-13 119 76)"><rect x="37" y="42" width="171" height="30" rx="15"/><rect x="51" y="81" width="155" height="28" rx="14"/><path d="M70 47 Q118 43 174 47 M74 87 Q122 83 180 88" fill="none" stroke="#f5cb97" stroke-width="4" opacity=".8"/></g>',
  5:'<path d="M47 90 Q27 74 47 60 Q55 43 82 49 Q108 51 104 70 Q119 92 91 98 Z"/><path d="M126 88 Q113 70 134 58 Q147 48 164 55 Q189 46 199 65 Q207 91 177 96 Q149 107 126 88Z"/><path d="M73 114 Q62 104 76 99 Q91 95 105 101 Q124 116 102 121 Q84 124 73 114Z"/>',
  6:'<ellipse cx="121" cy="94" rx="89" ry="28" fill="#587489"/><path d="M34 87 Q49 122 118 125 Q191 124 208 87Z" fill="#859cad"/><ellipse cx="121" cy="83" rx="88" ry="30"/><g fill="#dfb477"><circle cx="69" cy="85" r="7"/><ellipse cx="92" cy="70" rx="12" ry="7"/><circle cx="124" cy="90" r="10"/><ellipse cx="148" cy="69" rx="10" ry="7"/><circle cx="176" cy="84" r="9"/><ellipse cx="145" cy="101" rx="9" ry="5"/></g>',
  7:'<path d="M73 22 L174 22 L162 117 Q122 127 84 117 Z" fill="#b7dce981" stroke="#c7e6f2" stroke-width="6"/><path d="M79 45 Q121 39 167 45 L158 113 Q124 122 87 112 Z"/><ellipse cx="123" cy="46" rx="44" ry="9" fill="#986a48"/><path d="M94 17 L110 8 M136 13 L143 4" fill="none" stroke="#e4e1d8" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
 };
 const fills={1:['#a96b3f','#5b321e'],2:['#c48fe1','#74439d'],3:['#c28651','#9b5636'],4:['#e9b375','#be8150'],5:['#e9b56d','#b7793a'],6:['#b68b5a','#7b5636'],7:['#916244','#5e3a29']};
 function illustration(type){
  const [light,dark]=fills[type];
  return '<svg viewBox="0 0 240 135" aria-hidden="true" focusable="false"><defs><linearGradient id="hh-bristol-food-'+type+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+light+'"/><stop offset="100%" stop-color="'+dark+'"/></linearGradient></defs><g fill="url(#hh-bristol-food-'+type+')" stroke="#ecbe8555" stroke-width="1.3">'+shapes[type]+'</g></svg>';
 }
 const wheel=document.createElement('div');wheel.className='hh-bristol-wheel';
 wheel.setAttribute('aria-label','Bristol-típus kiválasztása ételhasonlatos kártyákkal');
 wheel.innerHTML='<div class="hh-bristol-top"><strong>🍇 Bristol · diszkrét választó</strong><button type="button" class="hh-bristol-edit" aria-label="Bristol-kártyaképek szerkesztése">✎ Képek</button><small>1–7 típus</small></div><p class="hh-bristol-hint">Görgess jobbra vagy balra, majd érintsd meg a kártyát.</p><div class="hh-bristol-rail" role="group" tabindex="0" aria-label="Hét Bristol-típus, vízszintesen görgethető"></div><div class="hh-bristol-nav"><button type="button" class="hh-bristol-prev" aria-label="Előző típus">‹</button><span class="hh-bristol-now" role="status" aria-live="polite" data-picked="false">Még nincs kiválasztva</span><button type="button" class="hh-bristol-next" aria-label="Következő típus">›</button></div><div class="hh-bristol-bottom"><button type="button" class="hh-bristol-clear">Nincs megadva</button><span class="hh-bristol-note">Az ételképek csak állaghasonlatok, nem egészségügyi diagnózisok.</span></div>';
 wrap.append(wheel);wrap.classList.add('hh-bristol-enhanced');
 const rail=wheel.querySelector('.hh-bristol-rail'),now=wheel.querySelector('.hh-bristol-now');
 const previous=wheel.querySelector('.hh-bristol-prev'),next=wheel.querySelector('.hh-bristol-next');
 const cards=[];
 let selected='',centered=4,gesture=false,settleTimer=0,suspend=false;
 const reduceMotion=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const t of types){
  const b=document.createElement('button');b.type='button';b.className='hh-bristol-card';
  b.setAttribute('aria-label','Bristol '+t.n+'. '+t.food+'. '+t.detail);
  b.setAttribute('aria-pressed','false');
  b.innerHTML='<span class="hh-bristol-number">'+t.n+'</span><span class="hh-bristol-check">Választás</span><span class="hh-bristol-art">'+illustration(t.n)+'</span><b>'+t.food+'</b><small>'+t.detail+'</small>';
  b.addEventListener('click',()=>choose(t.n,true));
  rail.append(b);cards.push(b);
 }
 function refreshImages(){
  for(let i=0;i<cards.length;i++){
   const art=cards[i].querySelector('.hh-bristol-art');
   if(!art)continue;
   art.querySelector('.hh-category-photo')?.remove();
   root.HH_BEVITEL_CATEGORY_V644?.attachPhoto?.('bristol',String(i+1),art);
  }
 }
 root.addEventListener('healthhub:bevitel-categories-updated',refreshImages);
 root.setTimeout(refreshImages,800);
 wheel.querySelector('.hh-bristol-edit').addEventListener('click',()=>{
  const studio=root.HH_BEVITEL_CATEGORY_V644;
  if(studio?.openEditor)studio.openEditor('bristol');
  else alert('A közös képstúdió még nem töltődött be. Kérlek, frissítsd az oldalt.');
 });
 const visible=()=>!wrap.hidden&&dialog.open;
 function center(n,smooth){
  const card=cards[n-1];if(!card)return;
  centered=n;
  const x=card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2;
  suspend=true;
  rail.scrollTo({left:Math.max(0,x),behavior:smooth&&!reduceMotion?'smooth':'instant'});
  window.setTimeout(()=>{suspend=false},smooth&&!reduceMotion?420:50);
  paint();
 }
 function paint(){
  cards.forEach((b,i)=>{b.setAttribute('aria-pressed',String(String(i+1)===selected));b.dataset.centered=String(i+1===centered);b.querySelector('.hh-bristol-check').textContent=String(i+1)===selected?'✓ Kiválasztva':'Választás'});
  const entry=types.find(t=>String(t.n)===selected);
  now.textContent=entry?'Bristol '+entry.n+' · '+entry.tone:'Még nincs kiválasztva';
  now.dataset.picked=String(!!entry);
  previous.disabled=centered===1;next.disabled=centered===7;
 }
 function choose(n,smooth){
  if(n<1||n>7)return;
  selected=String(n);
  select.value=selected;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  center(n,smooth);paint();
 }
 function reset(){
  selected=select.value||'';
  centered=Number(selected)||4;
  gesture=false;
  paint();
  requestAnimationFrame(()=>center(centered,false));
 }
 function step(delta){choose(Math.max(1,Math.min(7,centered+delta)),true)}
 previous.addEventListener('click',()=>step(-1));
 next.addEventListener('click',()=>step(1));
 wheel.querySelector('.hh-bristol-clear').addEventListener('click',()=>{
  select.value='';selected='';select.dispatchEvent(new Event('change',{bubbles:true}));paint();
 });
 rail.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1)}
  if(e.key==='Home'||e.key==='End'){e.preventDefault();choose(e.key==='Home'?1:7,true)}
 });
 function onGesture(){gesture=true}
 rail.addEventListener('pointerdown',onGesture,{passive:true});
 rail.addEventListener('wheel',onGesture,{passive:true});
 rail.addEventListener('touchstart',onGesture,{passive:true});
 rail.addEventListener('scroll',()=>{
  clearTimeout(settleTimer);
  settleTimer=setTimeout(()=>{
   if(!visible()||suspend||!gesture)return;
   const mid=rail.scrollLeft+rail.clientWidth/2;
   let best=1,dist=Infinity;
   cards.forEach((c,i)=>{
    const dx=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);
    if(dx<dist){best=i+1;dist=dx}
   });
   gesture=false;choose(best,false);
  },110);
 },{passive:true});
 select.addEventListener('change',()=>{
  if(selected!==select.value){selected=select.value||'';paint()}
 });
 stool.addEventListener('click',()=>requestAnimationFrame(reset));
 dialog.addEventListener('close',()=>{gesture=false;clearTimeout(settleTimer)});
 paint();
 root.HH_BRISTOL_WHEEL_V649={ready:true,selected:()=>select.value,reset};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
