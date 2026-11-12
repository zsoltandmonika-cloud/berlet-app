/* SHO Smart Entertainment · verified-directory favorites v1.
   Entries link only to public official programme/listing pages.
   Never represents link availability as live or booked. */
(()=>{'use strict';
const kind=document.body.dataset.kind||'general',key='sho-entertainment-directory-faves-v1:'+kind;
let favorites=[];
try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(parsed))favorites=parsed.filter(x=>typeof x==='string')}catch(_){}
let only=false;
const cards=[...document.querySelectorAll('.card[data-id]')],toggle=document.querySelector('#faveOnly'),empty=document.querySelector('#empty');
function paint(){
 let visible=0;
 for(const card of cards){
  const active=favorites.includes(card.dataset.id);
  card.dataset.fave=String(active);
  const star=card.querySelector('.save');
  if(star){star.setAttribute('aria-pressed',String(active));star.textContent=active?'♥':'♡';star.setAttribute('aria-label',active?'Kedvenc törlése':'Kedvencekhez adás')}
  const deadline=card.dataset.end; // hide dated listings automatically after their final day (local browser time)
  const expired=Boolean(deadline&&Date.now()>new Date(deadline+'T23:59:59').getTime());
  card.hidden=expired||(only&&!active);if(!card.hidden)visible++;
 }
 if(toggle){toggle.setAttribute('aria-pressed',String(only));toggle.textContent=only?'★ Kedvencek mutatva':'♡ Csak kedvencek'}
 if(empty)empty.classList.toggle('visible',visible===0);
}
for(const card of cards){
 const star=card.querySelector('.save');
 star?.addEventListener('click',()=>{
  const id=card.dataset.id,index=favorites.indexOf(id);
  if(index===-1)favorites.push(id);else favorites.splice(index,1);
  try{localStorage.setItem(key,JSON.stringify(favorites))}catch(_){}
  paint();try{navigator.vibrate?.(8)}catch(_){}
 });
}
toggle?.addEventListener('click',()=>{only=!only;paint()});
paint();
})();
