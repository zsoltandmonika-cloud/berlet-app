/* HealthHub Nutrition · Smart Lunch v1178
 * Single confirmed-order card on Bevitel, optional rating and one-tap diary.
 * Private confirmed emails are NOT obtained from ChatGPT or published to GitHub.
 * ingestConfirmedEmail is the narrow receiver for a future authorized Outlook bridge.
 */
(function(root,doc){
'use strict';
const API=()=>root.HH_NUTRITION_QUICK_API;
const ID=id=>doc?.getElementById(id);
const KEYS=['kcal','protein','carbs','fat'];
function premiumBuddy(status){
 const rag=['green','amber','red'].includes(status)?status:'amber';
 const buddy=text('span','','hh-sl-rag-buddy');
 buddy.dataset.rag=rag;
 buddy.setAttribute('role','img');
 buddy.setAttribute('aria-label',rag==='green'?'Vidám prémium RAG Buddy':rag==='amber'?'Semleges prémium RAG Buddy':'Szomorú prémium RAG Buddy');
 return buddy;
}
let choices=new Map(),busy=new Set(),lastProfile='',finishTimer=null,audioCtx=null;
/* v1181: tiny original tap sound, plus Android haptics where supported.
 * Mobile browsers may ignore vibrate() or AudioContext; neither is required. */
function starFeedback(){
 try{root.navigator?.vibrate?.(14)}catch(_){}
 try{
  const Audio=root.AudioContext||root.webkitAudioContext;
  if(!Audio)return;
  if(!audioCtx)audioCtx=new Audio();
  if(audioCtx.state==='suspended')audioCtx.resume?.().catch?.(()=>{});
  const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(850,now);
  osc.frequency.exponentialRampToValueAtTime(1150,now+.05);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(.018,now+.009);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.065);
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.start(now);osc.stop(now+.07);
 }catch(_){/* Audio policy or unsupported browser: stars still work. */}
}
function today(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',
  month:'2-digit',day:'2-digit'}).format(new Date());
}
function text(tag,value,klass){
 const e=doc.createElement(tag);if(klass)e.className=klass;
 e.textContent=String(value??'');return e;
}
function fmt(value){
 return value==null?'—':Number(value).toLocaleString('hu-HU',{maximumFractionDigits:1});
}
function normalizeName(s){
 return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('hu-HU').replace(/[^a-z0-9]+/g,' ').trim();
}
/* Parses only dated meal lines + printed serving nutrition; ignores personal,
 * delivery, payment, address, email, customer and order metadata entirely. */
function parseConfirmedOrderEmail(body){
 const lines=String(body||'').slice(0,100000).split(/\r?\n/).map(s=>s.trim());
 const orders=[];let date=null;
 const dayRE=/^(\d{4})[.\/-](\d{2})[.\/-](\d{2})\s+(?:hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap)(?:\s|$)/i;
 const rowRE=/^([A-Z][A-Z0-9]{0,7})\s+(\d{1,2})\s+adag\s+(.{2,140}?)\s*:\s*[\d\s.,]+\s*Ft\b/i;
 const number='(\\d+(?:[.,]\\d+)?)';
 const macroRE=new RegExp('^\\(?\\s*'+number+'\\s*kcal\\s*[,;]\\s*'+number+
  '\\s*g\\s*(?:szénh\\.?|szénhidrát)\\s*[,;]\\s*'+number+
  '\\s*g\\s*fehérje\\s*[,;]\\s*'+number+'\\s*g\\s*zsír\\s*\\)?','i');
 for(let i=0;i<lines.length;i++){
  const day=lines[i].match(dayRE);
  if(day){date=day[1]+'-'+day[2]+'-'+day[3];continue;}
  const mealLine=lines[i].replace(/^\*\*([A-Z][A-Z0-9]{0,7})\*\*\s+/,'$1 ');
  const match=mealLine.match(rowRE);
  if(!match||!date)continue;
  const macro=lines.slice(i+1,i+4).map(s=>s.match(macroRE)).find(Boolean);
  if(!macro)continue; // Without printed macros, no speculative diary item.
  const nutrients={kcal:Number(macro[1].replace(',','.')),
   carbs:Number(macro[2].replace(',','.')),protein:Number(macro[3].replace(',','.')),
   fat:Number(macro[4].replace(',','.'))};
  if(Object.values(nutrients).some(n=>!Number.isFinite(n)||n<0||n>5000))continue;
  orders.push({code:match[1].toUpperCase(),quantity:Number(match[2]),
   name:match[3].trim(),menuDate:date,nutrients});
 }
 return orders.slice(0,50);
}
/* Exact date+code+nutrient confirmation, not image/name guesses. Refuses
 * ambiguous or unmatched menu rows instead of silently attaching wrong photo. */
function matchToOfficialMenu(order,items){
 const matches=(Array.isArray(items)?items:[]).filter(x=>
  x.menuDate===order.menuDate&&x.code===order.code&&
  normalizeName(x.name)===normalizeName(order.name)&&
  KEYS.every(k=>x.nutrients?.[k]!=null&&order.nutrients?.[k]!=null&&
   Math.abs(Number(x.nutrients[k])-Number(order.nutrients[k]))<.011));
 return matches.length===1?{...matches[0],quantity:order.quantity}:null;
}
function ingestConfirmedEmail({expectedProfile,body,feed}={}){
 const api=API();
 if(!api?.importConfirmedInterfoodOrder||api.getProfile?.()!==expectedProfile)
  throw Error('A Smart Lunch profilja nem egyezik vagy még nem érhető el.');
 if(!root.HH_INTERFOOD_LIVE_V1176?.validateFeed)
  throw Error('A hivatalos Interfood adatforrás nem elérhető.');
 const official=root.HH_INTERFOOD_LIVE_V1176.validateFeed(feed).items;
 const parsed=parseConfirmedOrderEmail(body),results=[];
 for(const candidate of parsed){
  const item=matchToOfficialMenu(candidate,official);
  if(!item){results.push({code:candidate.code,menuDate:candidate.menuDate,matched:false});continue;}
  const result=api.importConfirmedInterfoodOrder({expectedProfile,order:item});
  results.push({code:item.code,menuDate:item.menuDate,matched:true,duplicate:result.duplicate});
 }
 render();
 return {recognized:parsed.length,imported:results.filter(x=>x.matched&&!x.duplicate).length,results};
}
function starButton(n,selected,click){
 const btn=text('button','★',n<=selected?'hh-sl-star chosen':'hh-sl-star');
 btn.type='button';btn.title=n+' csillag';btn.setAttribute('aria-label',n+' csillag');
 btn.setAttribute('aria-pressed',String(selected===n));
 btn.addEventListener('click',click);return btn;
}
function cardImage(order){
 const wrap=text('div','','hh-sl-image');
 if(order.imageUrl){
  const img=doc.createElement('img');
  img.src=order.imageUrl;img.loading='lazy';img.alt='Az Interfood hivatalos ételfotója';
  img.referrerPolicy='no-referrer';
  img.onerror=()=>{img.remove();wrap.append(text('span','Interfood','hh-sl-fallback'));};
  wrap.append(img);
 }else wrap.append(text('span','Interfood','hh-sl-fallback'));
 return wrap;
}
function refreshRating(order,container){
 container.replaceChildren();
 const selected=choices.get(order.id)||0;
 for(let n=1;n<=5;n++)container.append(starButton(n,selected,()=>{
  starFeedback();
  choices.set(order.id,selected===n?0:n);
  refreshRating(order,container);
 }));
}
function closeResult(){
 if(finishTimer)root.clearTimeout(finishTimer);
 finishTimer=null;
 const overlay=ID('hhSmartLunchFinishV1178');
 if(overlay){overlay.hidden=true;overlay.replaceChildren();}
}
function showFailure(message){
 const overlay=ID('hhSmartLunchFinishV1178');if(!overlay)return;
 if(finishTimer)root.clearTimeout(finishTimer);
 overlay.replaceChildren();overlay.hidden=false;
 const inner=text('div','','hh-sl-finish-inner');
 inner.dataset.rag='red';
 inner.append(premiumBuddy('red'));
 inner.append(text('strong','Nem sikerült a mentés','hh-sl-tada small'));
 inner.append(text('p',String(message||'Kérlek, próbáld újra.')));
 const ok=text('button','Bezárás','hh-sl-keep');
 ok.type='button';ok.addEventListener('click',closeResult);
 inner.append(ok);overlay.append(inner);
 finishTimer=root.setTimeout(closeResult,6000);
}
function showResult(order,result){
 const overlay=ID('hhSmartLunchFinishV1178');if(!overlay)return;
 if(finishTimer)root.clearTimeout(finishTimer);
 overlay.replaceChildren();overlay.hidden=false;
 const inner=text('div','','hh-sl-finish-inner');
 inner.dataset.rag=result.status==='consumed'?'green':'amber';
 inner.append(premiumBuddy(inner.dataset.rag));
 if(result.status==='consumed'){
  inner.append(text('strong','TADAAA! 🎉','hh-sl-tada'));
  inner.append(text('p','Ebéd a Napi naplóban'+(result.rating?' · '+result.rating+'/5 ⭐':'')));
  if(!result.duplicate){
   const actions=text('div','','hh-sl-undo-actions');
   const undo=text('button','↶ Visszavonás','hh-sl-undo');
   undo.type='button';undo.setAttribute('aria-label','Téves ebédnaplózás visszavonása');
   undo.addEventListener('click',()=>{
    if(busy.has(order.id)||undo.disabled)return;
    busy.add(order.id);undo.disabled=true;
    try{
     const api=API(),profile=api?.getProfile?.();
     if(profile!==result.profile)throw Error('Profilváltás történt. Nyisd meg újra a napi ebédet.');
     if(!api?.undoInterfoodSmartOrder)throw Error('A visszavonás még nem elérhető.');
     const reverted=api.undoInterfoodSmartOrder({expectedProfile:profile,orderId:order.id});
     if(reverted.profile!==profile||reverted.status!=='planned')
      throw Error('A visszavonás nem igazolható.');
     choices.delete(order.id);render();
     overlay.replaceChildren();
     const done=text('div','','hh-sl-finish-inner');
     done.dataset.rag='amber';
     done.append(premiumBuddy('amber'));
     done.append(text('strong','✓ Visszavonva','hh-sl-tada small'));
     done.append(text('p','A napló és az ebédkártya visszaállt. Újra választhatsz.'));
     overlay.append(done);
     if(finishTimer)root.clearTimeout(finishTimer);
     finishTimer=root.setTimeout(closeResult,2300);
    }catch(e){
     inner.dataset.rag='red';
     const buddy=inner.querySelector('.hh-sl-rag-buddy');
     if(buddy){buddy.dataset.rag='red';buddy.setAttribute('aria-label','Szomorú prémium RAG Buddy');}
     const note=text('p','⚠ '+String(e?.message||e),'hh-sl-undo-error');
     inner.append(note);undo.disabled=false;
    }finally{busy.delete(order.id);}
   });
   const keep=text('button','Rendben','hh-sl-keep');
   keep.type='button';keep.addEventListener('click',closeResult);
   actions.append(undo,keep);inner.append(actions);
  }
 }else{
  inner.append(text('strong','Rendben, nem naplóztuk.','hh-sl-tada small'));
  inner.append(text('p','Az ételkártya megmarad a gyűjteményben.'));
 }
 overlay.append(inner);
 finishTimer=root.setTimeout(closeResult,result.status==='consumed'?10000:2300);
}
function finish(order,ate,button){
 const api=API(),profile=api?.getProfile?.();
 if(!api?.finishInterfoodSmartOrder||profile!==lastProfile||busy.has(order.id))return;
 busy.add(order.id);button.disabled=true;
 try{
  const result=api.finishInterfoodSmartOrder({expectedProfile:profile,orderId:order.id,
   ate,rating:ate?(choices.get(order.id)||null):null});
  if(result.profile!==profile||result.status!==(ate?'consumed':'skipped'))
   throw Error('A napi ebéd lezárása nem igazolható.');
  choices.delete(order.id);render();showResult(order,result);
 }catch(e){
  const status=ID('hhSmartLunchStatusV1178');
  if(status){status.textContent='⚠ '+String(e?.message||e);status.hidden=false;}
  showFailure(String(e?.message||e));
  button.disabled=false;
 }finally{busy.delete(order.id);}
}
function render(){
 const host=ID('hhSmartLunchV1178'),api=API();
 if(!host||!api?.getInterfoodSmartOrders)return;
 const profile=api.getProfile();
 if(profile!==lastProfile){lastProfile=profile;choices.clear();}
 const all=api.getInterfoodSmartOrders().filter(x=>x.menuDate===today());
 const pending=all.filter(x=>x.status==='planned');
 const complete=all.filter(x=>x.status!=='planned');
 host.replaceChildren();host.hidden=!all.length;
 if(host.hidden)return;
 const heading=text('div','','hh-sl-head');
 heading.append(text('span','✦ LÉNA · SMART LUNCH'));
 heading.append(text('small',profile==='monika'?'MÓNIKA · MAI EBÉD':'MAI EBÉD'));
 host.append(heading);
 if(!pending.length){
  const empty=text('div','','hh-sl-empty');
  if(complete.length){
   empty.append(text('strong','✓ Mai Interfood-ebéd lezárva'));
   empty.append(text('p',complete.map(x=>x.name+' · '+(x.status==='consumed'?'Naplózva':'Nem fogyasztotta el')).join(' · ')));
  }else{
   empty.append(text('strong','Mai Interfood-rendelés még nem érkezett'));
   empty.append(text('p','A jóváhagyó kártya a privát Outlook-rendelés feldolgozása után jelenik meg.'));
  }
  host.append(empty);
 }
 for(const order of pending){
  const card=text('article','','hh-sl-card');
  const hero=text('div','','hh-sl-hero'),info=text('div','','hh-sl-info');
  info.append(text('small',order.code+' · '+order.quantity+' adag','hh-sl-kicker'));
  info.append(text('h3',order.name));
  // v1183 premium facelift: presentation only. All values remain derived
  // from the same verified per-serving order snapshot; no changed journal flow.
  const metrics=text('div','','hh-sl-metrics');
  const kcal=text('div','','hh-sl-kcal');
  const flame=text('span','♨','hh-sl-kcal-icon');
  flame.setAttribute('aria-hidden','true');
  kcal.append(flame,text('strong',fmt(order.nutrients?.kcal*order.quantity)+' kcal'));
  metrics.append(kcal);
  const macros=text('div','','hh-sl-macro-row');
  for(const [key,label,title] of [
   ['protein','F','Fehérje'],['carbs','CH','Szénhidrát'],['fat','Zs','Zsír']
  ]){
   const chip=text('small',label+' '+fmt(order.nutrients?.[key]*order.quantity)+' g','hh-sl-macro-chip');
   chip.title=title;macros.append(chip);
  }
  metrics.append(macros);
  if(order.weightGrams){
   const grams=text('small','⚖ '+fmt(order.weightGrams*order.quantity)+' g','hh-sl-weight-chip');
   grams.title='Adagsúly';metrics.append(grams);
  }
  info.append(metrics);hero.append(info,cardImage(order));card.append(hero);
  card.append(text('h4',(profile==='monika'?'Mónika, ':'')+'megetted a mai ebéded?'));
  card.append(text('p','Mennyire ízlett? · Opcionális','hh-sl-optional'));
  const stars=text('div','','hh-sl-stars');refreshRating(order,stars);card.append(stars);
  const actions=text('div','','hh-sl-actions');
  const yes=text('button','✓ Igen!','hh-sl-yes');yes.type='button';yes.addEventListener('click',()=>finish(order,true,yes));
  const no=text('button','Nem','hh-sl-no');no.type='button';no.addEventListener('click',()=>finish(order,false,no));
  actions.append(yes,no);card.append(actions);host.append(card);
 }
 const status=text('div','','hh-sl-status');status.id='hhSmartLunchStatusV1178';
 status.hidden=true;status.setAttribute('role','status');host.append(status);
}
function install(){
 const tile=ID('hhInterfoodTileV1173');
 if(!tile||ID('hhSmartLunchV1178')||!doc?.body)return;
 const host=text('section','','hh-smart-lunch-v1178');
 host.id='hhSmartLunchV1178';host.setAttribute('aria-label','Smart Lunch · mai ebéd');
 tile.insertAdjacentElement('afterend',host);
 const overlay=text('div','','hh-sl-finish');overlay.id='hhSmartLunchFinishV1178';
 overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
 doc.body.append(overlay);
 render();
 root.addEventListener?.('healthhub:profile-changed',render);
 root.addEventListener?.('healthhub:nutrition:data-updated',render);
 root.addEventListener?.('storage',render);
 root.addEventListener?.('focus',render);
 doc.addEventListener?.('visibilitychange',()=>{if(!doc.hidden)render();});
 // Cloud reconciliation and profile changes also flow through the core journal.
 root.setInterval?.(()=>{if(!doc.hidden)render();},30000);
}
if(doc){if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});else install();}
root.HH_INTERFOOD_SMART_LUNCH_V1178=Object.freeze({
 parseConfirmedOrderEmail,matchToOfficialMenu,ingestConfirmedEmail,render
});
if(typeof module!=='undefined'&&module.exports)
 module.exports={parseConfirmedOrderEmail,matchToOfficialMenu,normalizeName};
})(typeof window!=='undefined'?window:{},typeof document!=='undefined'?document:null);
