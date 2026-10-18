/* HealthHub Nutrition v649 · Discreet, horizontal Bristol stool-type picker.
 * Progressive enhancement: existing #bristol select remains the canonical data field.
 * The original diary format and Dropbox sync are unchanged.
 */
(function(){
 'use strict';
 const types=[
  {id:'1',name:'Kemény bogyók',detail:'Különálló, kemény darabok'},
  {id:'2',name:'Darabos, tömör',detail:'Kolbász alakú, de csomós'},
  {id:'3',name:'Repedezett',detail:'Formált, felszínén repedésekkel'},
  {id:'4',name:'Sima, puha',detail:'Sima, puha, egybefüggő'},
  {id:'5',name:'Puha darabok',detail:'Különálló, puha részek'},
  {id:'6',name:'Pépes, laza',detail:'Laza, foszló szélű darabok'},
  {id:'7',name:'Folyékony',detail:'Vizes, szilárd részek nélkül'}
 ];
 const art=[
  '<ellipse cx="18" cy="24" rx="9" ry="8"/><ellipse cx="42" cy="15" rx="8" ry="7"/><ellipse cx="67" cy="27" rx="10" ry="8"/><ellipse cx="38" cy="38" rx="7" ry="6"/><ellipse cx="82" cy="42" rx="6" ry="5"/>',
  '<path d="M12 34C7 27 13 20 21 21c1-10 14-14 20-8 9-7 21-2 22 5 12-3 19 4 18 12 9 7 3 17-6 16H25c-11 1-18-5-13-12Z"/>',
  '<rect x="9" y="21" width="78" height="27" rx="13"/><path d="m28 22 4 8-3 5m19-13-3 9 4 4m16-11 2 6-4 4" fill="none" stroke="#768b8f" stroke-width="2"/>',
  '<path d="M8 37C13 17 35 18 49 27c14 8 24 0 37-9 10-7 15 7 6 14-19 19-32 22-50 14C26 39 18 48 8 42c-2-2-2-4 0-5Z"/>',
  '<path d="M11 35c-4-12 12-21 23-13 10 7 4 20-7 22-8 1-13-2-16-9Z"/><path d="M46 23c6-12 24-9 27 2 3 10-9 21-20 16-7-3-11-11-7-18Z"/><path d="M73 43c-2-8 8-15 16-10 7 5 5 14-1 17-7 3-12 0-15-7Z"/>',
  '<path d="M8 35c-6-9 4-12 7-18 4-8 13-1 18-3 12-5 13 7 19 6 11-6 14 5 18 5 10-2 9 9 17 11 5 2 1 9-7 9-8 0-12-5-19-1-8 5-12-3-20 2-8 3-12-4-20-2-8 2-14-2-13-9Z"/>',
  '<path d="M7 37c14-10 21 10 34 0 14-11 20 8 33-1 10-8 17-3 24 1M8 46c16-8 22 8 38 0 11-6 22 7 38 0" fill="none" stroke-width="5"/><path d="M28 10c-8 9-10 17-2 17s10-8 2-17Zm37-1c-8 11-11 19-3 19 9 0 11-8 3-19Z"/>'
 ];
 function init(){
  const wrap=document.getElementById('bristolWrap');
  const select=document.getElementById('bristol');
  const dialog=document.getElementById('bodyDialog');
  if(!wrap||!select||!dialog||wrap.querySelector('.hh-bristol-picker'))return;
  const picker=document.createElement('div');picker.className='hh-bristol-picker';
  const head=document.createElement('div');head.className='hh-bristol-heading';
  const hint=document.createElement('span');hint.className='hh-bristol-hint';hint.textContent='Húzd oldalra, és érintsd meg a megfelelő típust.';
  const nav=document.createElement('div');nav.className='hh-bristol-nav';
  const track=document.createElement('div');track.className='hh-bristol-track';track.setAttribute('role','group');track.setAttribute('aria-label','Bristol-skála, hét választható típus');
  for(const [dir,title,glyph] of [[-1,'Előző típusok','‹'],[1,'Következő típusok','›']]){
    const arrow=document.createElement('button');arrow.type='button';arrow.className='hh-bristol-arrow';arrow.textContent=glyph;arrow.setAttribute('aria-label',title);
    arrow.addEventListener('click',()=>track.scrollBy({left:dir*148,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
    nav.appendChild(arrow);
  }
  head.append(hint,nav);
  const buttons=[];
  for(let i=0;i<types.length;i++){
    const item=types[i],button=document.createElement('button');button.type='button';button.className='hh-bristol-card';button.dataset.type=item.id;
    button.setAttribute('aria-label',item.id+'. típus: '+item.detail);
    button.setAttribute('aria-pressed','false');
    const number=document.createElement('span');number.className='hh-bristol-number';number.textContent=item.id+'. típus';
    const picture=document.createElement('span');picture.className='hh-bristol-art';picture.setAttribute('aria-hidden','true');
    picture.innerHTML='<svg viewBox="0 0 105 60" focusable="false" aria-hidden="true">'+art[i]+'</svg>';
    const name=document.createElement('span');name.className='hh-bristol-name';name.textContent=item.name;
    button.append(number,picture,name);
    button.addEventListener('click',()=>{select.value=select.value===item.id?'':item.id;select.dispatchEvent(new Event('change',{bubbles:true}));sync()});
    track.appendChild(button);buttons.push(button);
  }
  const foot=document.createElement('div');foot.className='hh-bristol-status';
  const selected=document.createElement('span');selected.setAttribute('aria-live','polite');
  const clear=document.createElement('button');clear.type='button';clear.className='hh-bristol-clear';clear.textContent='Nem jelölöm';
  clear.addEventListener('click',()=>{select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));sync()});
  foot.append(selected,clear);
  const explain=document.createElement('p');explain.className='hh-bristol-explain';
  explain.textContent='A skála a széklet állagát írja le; önmagában nem diagnózis. A választás opcionális.';
  picker.append(head,track,foot,explain);
  function sync(){
    const chosen=types.find(x=>x.id===select.value);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===select.value&&!!chosen)));
    selected.textContent=chosen?chosen.id+'. típus · '+chosen.detail:'Nincs megjelölve · opcionális';
  }
  select.addEventListener('change',sync);
  wrap.appendChild(picker);
  wrap.classList.add('hh-bristol-enhanced');
  select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  sync();
  new MutationObserver(()=>{
    if(dialog.open&&!wrap.hidden){
      sync();requestAnimationFrame(()=>{
        const active=buttons.find(b=>b.dataset.type===select.value);
        if(active)track.scrollLeft=active.offsetLeft-track.offsetLeft-24;
        else track.scrollLeft=0;
      });
    }
  }).observe(dialog,{attributes:true,attributeFilter:['open']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
