/* SH9 transport · 40 family favorite places in BKK Grand, MÁV and Volán.
 * Reuses one family directory, never edits the source table without a user click.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 function init(){
  const api=w.HH_TRAVEL_FAVORITES_V972;
  const planner=d.getElementById('planner'),from=d.getElementById('from'),to=d.getElementById('to');
  if(!api||!planner||!from||!to||d.getElementById('hhTravelFamilyFavoritesV972'))return;
  const existingTop=d.querySelector('[data-concept="Kedvencek"]');
  const route=planner.querySelector('.routebox');
  if(!existingTop&&route){
   const opener=d.createElement('button');opener.type='button';
   opener.id='hhTravelFavOpenV972';opener.className='hh-family-fav-trigger-v972';
   opener.textContent='⭐ Kedvenc helyek · 40 közös cím';
   opener.setAttribute('aria-controls','hhTravelFamilyFavoritesV972');
   opener.setAttribute('aria-expanded','false');
   route.insertAdjacentElement('afterend',opener);
   opener.addEventListener('click',open);
  }
  const panel=d.createElement('section');panel.id='hhTravelFamilyFavoritesV972';
  panel.className='hh-family-favorites-v972 glass';panel.hidden=true;
  panel.setAttribute('aria-label','Családi kedvenc helyek · 40 férőhely');
  const bar=d.createElement('div');bar.className='hh-family-favorites-head-v972';
  const title=d.createElement('strong');title.textContent='⭐ Családi kedvenc helyek';
  const close=d.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Kedvenc helyek bezárása');
  close.addEventListener('click',()=>{panel.hidden=true});
  const refresh=d.createElement('button');refresh.type='button';
  refresh.textContent='☁';refresh.title='Közös helyek frissítése';
  refresh.setAttribute('aria-label','Közös családi kedvenc helyek frissítése a felhőből');
  bar.append(title,refresh,close);
  const search=d.createElement('input');search.id='hhTravelFavFilterV972';
  search.type='search';search.placeholder='Keresés 40 hely között…';
  search.setAttribute('aria-label','Kedvenc helyek szűrése');
  search.autocomplete='off';
  const count=d.createElement('small');count.className='hh-family-favorites-count-v972';
  const list=d.createElement('div');list.className='hh-family-favorites-list-v972';
  panel.append(bar,search,count,list);
  const opener=d.getElementById('hhTravelFavOpenV972');
  if(opener)opener.insertAdjacentElement('afterend',panel);
  else route?.insertAdjacentElement('afterend',panel);
  function render(){
   const all=api.favoritePlaces(),term=search.value.trim().toLocaleLowerCase('hu-HU');
   const data=all.filter(p=>[p.displayName,p.name,p.subtitle].some(t=>String(t||'').toLocaleLowerCase('hu-HU').includes(term)));
   count.textContent=all.length+' / 40 rögzített hely · közös családi lista';
   list.replaceChildren();
   if(!data.length){
    const empty=d.createElement('p');empty.textContent=all.length?'Nincs ilyen mentett cím.':'Még nincsenek mentett helyek. A Family Guardban tudsz címeket rögzíteni.';
    list.append(empty);return;
   }
   for(const place of data){
    const item=d.createElement('article');item.className='hh-family-fav-item-v972';
    const desc=d.createElement('div');desc.className='hh-family-fav-desc-v972';
    const heading=d.createElement('strong');heading.textContent=place.displayName||place.name;
    const subtitle=d.createElement('small');subtitle.textContent=place.name+(place.subtitle?' · '+place.subtitle:'');
    desc.append(heading,subtitle);
    const actions=d.createElement('div');actions.className='hh-family-fav-acts-v972';
    for(const [field,txt] of [[from,'Honnan'],[to,'Hová']]){
     const btn=d.createElement('button');btn.type='button';btn.textContent=txt;
     btn.setAttribute('aria-label',(place.displayName||place.name)+' használata: '+txt);
     btn.addEventListener('click',()=>{
      field.value=place.name;
      field.dispatchEvent(new Event('input',{bubbles:true}));
      field.dispatchEvent(new Event('change',{bubbles:true}));
      panel.hidden=true;
      d.getElementById('hhTravelFavOpenV972')?.setAttribute('aria-expanded','false');
      field.blur();
     });actions.append(btn);
    }
    item.append(desc,actions);list.append(item);
   }
  }
  function open(){
   panel.hidden=false;render();
   panel.scrollIntoView({behavior:'smooth',block:'nearest'});
   if(!existingTop)d.getElementById('hhTravelFavOpenV972')?.setAttribute('aria-expanded','true');
  }
  close.addEventListener('click',()=>d.getElementById('hhTravelFavOpenV972')?.setAttribute('aria-expanded','false'));
  refresh.addEventListener('click',async()=>{
   refresh.disabled=true;refresh.textContent='…';
   const ok=await api.sync(true);
   refresh.disabled=false;refresh.textContent='☁';
   render();count.textContent+=(ok?' · szinkronizálva':' · helyi lista (offline vagy nincs belépés)');
  });
  search.addEventListener('input',render);
  api.subscribe?.(()=>{if(!panel.hidden)render()});
  w.addEventListener('pageshow',()=>{if(!panel.hidden)render()});
  w.HH_TRAVEL_FAVORITES_UI_V972=Object.freeze({open,render});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
