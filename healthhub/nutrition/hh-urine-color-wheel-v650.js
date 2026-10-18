/* HH Nutrition v650: 8 softly shaded apple-juice-glass colour illustrations.
 * No diagnosis: observational only. Canonical #urineColor value saves via the
 * existing profile-specific BODY BALANCE diary and Dropbox sync.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const shades=[
 ['#F9F7D5','Nagyon halvány','Majdnem színtelen, halvány szalmasárga'],
 ['#F6E8A1','Halványsárga','Világos szalmasárga'],
 ['#F3D271','Sárga','Áttetsző, meleg sárga'],
 ['#EAB345','Aranysárga','Közepesen élénk sárga'],
 ['#D88D28','Mézsárga','Mélyebb aranysárga'],
 ['#BE6B19','Borostyán','Sötétebb, mély sárgásbarna'],
 ['#984A17','Sötét borostyán','Barnás-borostyán árnyalat'],
 ['#703217','Sötétbarna','Nagyon sötét barna árnyalat']
];
function boot(){
 const wrap=$('urineColorWrap'),sel=$('urineColor'),dialog=$('bodyDialog'),urine=$('urineBtn');
 if(!wrap||!sel||!dialog||!urine||wrap.querySelector('.hh-urine-wheel'))return;
 const wheel=document.createElement('div');wheel.className='hh-urine-wheel';
 wheel.innerHTML='<div class="hh-urine-heading"><strong>🍎 Vizeletszín · almaleves poharak</strong><small>8 árnyalat</small></div><p class="hh-urine-help">Lapozz a poharak között, majd válassz egy árnyalatot.</p><div class="hh-urine-rail" role="group" tabindex="0" aria-label="Nyolc árnyalat vízszintes görgetéssel"></div><div class="hh-urine-control"><button type="button" class="hh-urine-prev" aria-label="Előző árnyalat">‹</button><span class="hh-urine-status" role="status" aria-live="polite" data-chosen="false">Még nincs kiválasztva</span><button type="button" class="hh-urine-next" aria-label="Következő árnyalat">›</button></div><div class="hh-urine-foot"><button type="button" class="hh-urine-clear">Nem jelölöm</button><small>A szín tájékoztató megfigyelés, nem hidratáltsági diagnózis.</small></div>';
 wrap.append(wheel);wrap.classList.add('hh-urine-enhanced');
 const rail=wheel.querySelector('.hh-urine-rail'),now=wheel.querySelector('.hh-urine-status'),prev=wheel.querySelector('.hh-urine-prev'),next=wheel.querySelector('.hh-urine-next');
 const reduced=!!root.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
 const cards=[];let current='',centered=3,touching=false,suppress=false,timer;
 function art(i,base){
  // A transparent, gently shaded apple juice glass, with highlights, liquid meniscus, shadow.
  const guid='hh-urine-'+i;
  return '<svg viewBox="0 0 180 150" aria-hidden="true" focusable="false"><defs><linearGradient id="'+guid+'-juice" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="'+base+'" stop-opacity=".92"/><stop offset=".38" stop-color="'+base+'"/><stop offset=".84" stop-color="'+base+'" stop-opacity=".87"/><stop offset="1" stop-color="#442814" stop-opacity=".55"/></linearGradient><linearGradient id="'+guid+'-glass" x1="0" x2="1"><stop stop-color="#ffffff" stop-opacity=".53"/><stop offset=".26" stop-color="#ffffff" stop-opacity=".08"/><stop offset=".78" stop-color="#ffffff" stop-opacity=".02"/><stop offset="1" stop-color="#e2f4ff" stop-opacity=".48"/></linearGradient><linearGradient id="'+guid+'-shine" x1="0" x2="1"><stop stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs><ellipse cx="91" cy="137" rx="52" ry="8" fill="#010b17" opacity=".33"/><path d="M44 23 L139 23 L129 123 Q92 136 54 123 Z" fill="url(#'+guid+'-glass)" stroke="#dff6ff" stroke-opacity=".6" stroke-width="2.4"/><path d="M50 42 Q90 48 134 42 L126 119 Q91 132 58 119 Z" fill="url(#'+guid+'-juice)" /><ellipse cx="92" cy="43" rx="42" ry="6" fill="'+base+'" opacity=".93" stroke="#fff7d1" stroke-opacity=".44"/><path d="M59 30 Q56 59 62 109" stroke="url(#'+guid+'-shine)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M130 30 Q132 70 124 112" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="91" cy="123" rx="35" ry="5" fill="#fff" opacity=".2"/><ellipse cx="92" cy="24" rx="47" ry="8" fill="none" stroke="#f4fcff" stroke-opacity=".87" stroke-width="2.5"/></svg>';
 }
 function paint(){
  cards.forEach((c,i)=>{const active=String(i+1)===current;c.setAttribute('aria-pressed',String(active));c.dataset.centered=String(centered===i+1)});
  now.textContent=current?'Árnyalat '+current+'/8 · '+shades[Number(current)-1][1]:'Még nincs kiválasztva';
  now.dataset.chosen=String(!!current);
  prev.disabled=centered===1;next.disabled=centered===8;
 }
 function move(n,smooth){
  centered=Math.max(1,Math.min(8,n));
  const card=cards[centered-1];if(!card)return;
  suppress=true;
  rail.scrollTo({left:Math.max(0,card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2),behavior:smooth&&!reduced?'smooth':'instant'});
  root.setTimeout(()=>{suppress=false},smooth&&!reduced?420:50);paint();
 }
 function choose(n,smooth){
  if(n<1||n>8)return;
  current=String(n);sel.value=current;sel.dispatchEvent(new Event('change',{bubbles:true}));move(n,smooth);paint();
 }
 for(let i=0;i<shades.length;i++){
  const [color,title,details]=shades[i];
  const button=document.createElement('button');button.type='button';button.className='hh-urine-card';
  button.setAttribute('aria-label','Árnyalat '+(i+1)+': '+title+'. '+details);
  button.setAttribute('aria-pressed','false');
  button.innerHTML='<span class="hh-urine-number">'+(i+1)+'</span><span class="hh-urine-art">'+art(i+1,color)+'</span><b>'+title+'</b><small>'+details+'</small>';
  button.addEventListener('click',()=>choose(i+1,true));
  rail.append(button);cards.push(button);
 }
 prev.addEventListener('click',()=>choose(Math.max(1,centered-1),true));
 next.addEventListener('click',()=>choose(Math.min(8,centered+1),true));
 wheel.querySelector('.hh-urine-clear').addEventListener('click',()=>{current='';sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}));paint()});
 rail.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose(Math.max(1,Math.min(8,centered+(e.key==='ArrowRight'?1:-1))),true)}});
 for(const name of ['touchstart','pointerdown','wheel'])rail.addEventListener(name,()=>{touching=true},{passive:true});
 rail.addEventListener('scroll',()=>{
  clearTimeout(timer);timer=setTimeout(()=>{
   if(!dialog.open||wrap.hidden||suppress||!touching)return;
   const mid=rail.scrollLeft+rail.clientWidth/2;let n=1,d=Infinity;
   cards.forEach((card,i)=>{const t=Math.abs(card.offsetLeft+card.offsetWidth/2-mid);if(t<d){d=t;n=i+1}});
   touching=false;choose(n,false);
  },120);
 },{passive:true});
 sel.addEventListener('change',()=>{if(sel.value!==current){current=sel.value||'';paint()}});
 urine.addEventListener('click',()=>requestAnimationFrame(()=>{current=sel.value||'';centered=Number(current)||3;move(centered,false)}));
 dialog.addEventListener('close',()=>{touching=false;clearTimeout(timer)});
 paint();
 root.HH_URINE_WHEEL_V650={ready:true,selected:()=>sel.value};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);