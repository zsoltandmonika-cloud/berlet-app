/* HealthHub Nutrition v1172 · local-first predictive Favorites search + opt-in voice input.
 * Reads only the already displayed, profile-scoped wheel cards.
 * Never writes diary data, reorders recipes, calls cloud APIs or changes image handling.
 */
(function(w,d){
 'use strict';
 if(w.HH_NUTRITION_FAVORITES_SEARCH_V1172)return;
 const dialog=d.getElementById('hhQuickDialog'),shell=d.getElementById('hhQuickShell'),
  rail=d.getElementById('hhQuickRail'),input=d.getElementById('hhQuickFavoriteSearchV1172'),
  results=d.getElementById('hhQuickFavoriteSuggestionsV1172'),
  microphone=d.getElementById('hhQuickFavoriteMicV1172'),
  status=d.getElementById('hhQuickFavoriteSearchStatusV1172');
 if(!dialog||!shell||!rail||!input||!results||!microphone||!status)return;
 let matching=[],highlight=0,recognition=null,listening=false,spoken=false;
 const canonical=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').trim().replace(/\s+/g,' ');
 const records=()=>Array.from(rail.querySelectorAll('.hh-quick-card[data-id]')).map((card,index)=>{
  const name=card.querySelector('.hh-quick-card-info strong')?.textContent?.trim()||'';
  const subtitle=card.querySelector('.hh-quick-card-info small')?.textContent?.trim()||'';
  return {id:card.dataset.id,name,subtitle,index};
 }).filter(x=>x.id&&x.name);
 function rank(record,query){
  const name=canonical(record.name),all=canonical(record.name+' '+record.subtitle);
  if(name===query)return 0;
  if(name.startsWith(query))return 1;
  if(name.split(/\s+/).some(word=>word.startsWith(query)))return 2;
  if(name.includes(query))return 3;
  if(all.includes(query))return 4;
  return 99;
 }
 const find=(text,items=records())=>{
  const query=canonical(text);
  return query?items.map(item=>({...item,score:rank(item,query)}))
   .filter(item=>item.score<99).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,8):[];
 };
 function close(){
  results.hidden=true;results.replaceChildren();input.setAttribute('aria-expanded','false');
  input.removeAttribute('aria-activedescendant');
 }
 function mark(index){
  highlight=Math.max(0,Math.min(index,matching.length-1));
  Array.from(results.querySelectorAll('[role="option"]')).forEach((node,i)=>{
   const selected=i===highlight;
   node.setAttribute('aria-selected',String(selected));
   node.dataset.highlighted=String(selected);
  });
  if(matching.length)input.setAttribute('aria-activedescendant','hhQuickFavoriteOptionV1172-'+highlight);
 }
 function refresh(){
  if(!dialog.open||shell.dataset.mode!=='wheel'){close();return}
  const q=input.value.trim();matching=find(q);
  if(!q){status.textContent='';close();return}
  results.replaceChildren();
  if(!matching.length){
   const empty=d.createElement('div');empty.className='hh-qsearch-empty-v1172';
   empty.textContent='Nincs találat a jelenlegi kedvencek között.';
   results.append(empty);results.hidden=false;input.setAttribute('aria-expanded','true');
   input.removeAttribute('aria-activedescendant');status.textContent='Nincs találat.';return;
  }
  matching.forEach((item,index)=>{
   const button=d.createElement('button');button.type='button';button.role='option';
   button.className='hh-qsearch-result-v1172';button.id='hhQuickFavoriteOptionV1172-'+index;
   button.setAttribute('aria-label',item.name);
   const icon=d.createElement('span');icon.className='hh-qsearch-ico-v1172';icon.setAttribute('aria-hidden','true');icon.textContent='🍽';
   const copy=d.createElement('span');copy.className='hh-qsearch-copy-v1172';
   const name=d.createElement('strong');name.textContent=item.name;
   const detail=d.createElement('small');detail.textContent=item.subtitle||'Mentett kedvenc';
   copy.append(name,detail);button.append(icon,copy);
   button.addEventListener('pointerdown',event=>event.preventDefault());
   button.addEventListener('click',()=>select(item));
   results.append(button);
  });
  results.hidden=false;input.setAttribute('aria-expanded','true');
  highlight=0;mark(0);
  status.textContent=matching.length+' találat. Válassz a listából, vagy nyomj Entert.';
 }
 function select(item){
  if(!item||!dialog.open||shell.dataset.mode!=='wheel')return false;
  const navigator=w.HH_NUTRITION_FAVORITES_WHEEL_NAV_V1172;
  // Dedicated navigation API updates selection without triggering a recipe-log click.
  if(!navigator?.select?.(item.id))return false;
  input.value=item.name;close();status.textContent=item.name+' kiválasztva. A felvitelhez érintsd meg a Kész gombot.';
  input.blur();return true;
 }
 function stopVoice(){
  try{recognition?.abort?.()}catch(_){}
  listening=false;microphone.dataset.listening='false';
  microphone.setAttribute('aria-pressed','false');
 }
 function speak(){
  if(listening){stopVoice();status.textContent='Hangkeresés leállítva.';return}
  const Recognition=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Recognition){status.textContent='Ebben a böngészőben a hangkeresés nem támogatott. A gépelős keresés működik.';return}
  try{
   spoken=false;recognition=new Recognition();
   recognition.lang='hu-HU';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
   recognition.onstart=()=>{
    listening=true;microphone.dataset.listening='true';
    microphone.setAttribute('aria-pressed','true');status.textContent='🎙 Figyelek… Mondd a kedvenc nevét.';
   };
   recognition.onresult=event=>{
    const parts=[];
    for(let i=event.resultIndex;i<event.results.length;i++){
     const word=event.results[i]?.[0]?.transcript;
     if(word)parts.push(word);
    }
    const spokenText=parts.join(' ').trim().slice(0,90);
    if(!spokenText)return;
    spoken=true;input.value=spokenText;refresh();
    const latest=event.results[event.results.length-1];
    if(latest?.isFinal){
     const choices=find(spokenText);
     if(choices.length===1||choices[0]?.score===0){select(choices[0])}
     else status.textContent=choices.length+' egyezés. Koppints a kívánt kedvencre.';
    }
   };
   recognition.onerror=event=>{
    const error=String(event.error||'');
    if(error==='not-allowed'||error==='service-not-allowed')status.textContent='A mikrofon nincs engedélyezve ebben a böngészőben.';
    else if(error==='no-speech')status.textContent='Nem hallottam ételnevet. Próbáld újra.';
    else if(error!=='aborted')status.textContent='Hangfelismerés nem elérhető. A gépelős keresés használható.';
   };
   recognition.onend=()=>{
    listening=false;microphone.dataset.listening='false';microphone.setAttribute('aria-pressed','false');
    if(!spoken&&status.textContent.includes('Figyelek'))status.textContent='A mikrofon leállt. Próbáld újra.';
   };
   recognition.start();
  }catch(_){stopVoice();status.textContent='A hangfelismerés nem indítható. Használd a keresőmezőt.'}
 }
 input.addEventListener('input',refresh);
 input.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   if(results.hidden||!matching.length)return;
   event.preventDefault();mark(highlight+(event.key==='ArrowDown'?1:-1));return;
  }
  if(event.key==='Enter'){
   if(!matching.length)return;
   event.preventDefault();select(matching[highlight]||matching[0]);return;
  }
  if(event.key==='Escape'&&!results.hidden){event.preventDefault();close()}
 });
 input.addEventListener('focus',()=>{if(input.value.trim())refresh()});
 microphone.addEventListener('click',speak);
 dialog.addEventListener('close',()=>{stopVoice();input.value='';matching=[];status.textContent='';close()});
 d.addEventListener('pointerdown',event=>{if(!event.target.closest?.('#hhQuickFavoriteSearchBoxV1172'))close()});
 // Recipe photo/cloud refresh updates the rail without changing search state.
 const observer=new MutationObserver(()=>{if(!results.hidden&&input.value.trim())refresh()});
 observer.observe(rail,{childList:true});
 w.HH_NUTRITION_FAVORITES_SEARCH_V1172=Object.freeze({find,refresh,version:'1172'});
})(window,document);
