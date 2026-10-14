(function(root){
'use strict';
/* Render ONLY validated phone-origin data from the family's existing Dropbox Vault. */
const vault=root.HH_DW_VAULT_V507;
const $=id=>document.getElementById(id);
const DAY=86400000,HOUR=3600000;
let generation=0;
const cache=new Map();
function duration(ms){
 if(ms==null||!Number.isFinite(ms))return '—';
 const minutes=Math.round(ms/60000);
 return minutes>=60?Math.floor(minutes/60)+' ó '+String(minutes%60).padStart(2,'0')+' p':minutes+' perc';
}
function text(id,value){const n=$(id);if(n)n.textContent=value;}
function row(parent,cls,content){const n=document.createElement('div');n.className=cls;if(content!=null)n.textContent=content;parent.appendChild(n);return n;}
function showBars(s){
 const time=$('timeline');time.replaceChildren();
 for(let hour=0;hour<24;hour++){
   const ms=s.dayHours[hour],box=row(time,'hour');
   const fill=row(box,'fill');
   fill.style.setProperty('--height',ms==null?'0%':Math.min(100,100*ms/HOUR).toFixed(1)+'%');
   box.title=String(hour).padStart(2,'0')+':00 · '+(ms==null?'nincs megfigyelés':duration(ms));
   box.setAttribute('aria-label',box.title);
   if(hour>=20)box.classList.add('evening');
 }
}
function showWeek(doc){
 const s=vault.summary(doc,7);
 const days=$('weekly');days.replaceChildren();
 const max=Math.max(HOUR,...s.dayTotals.map(r=>r.foregroundMs||0));
 const dates=new Intl.DateTimeFormat('hu-HU',{weekday:'short',timeZone:'UTC'});
 for(const point of s.dayTotals){
   const d=row(days,'day');
   const bar=row(d,'daybar');
   const ms=point.foregroundMs;
   bar.style.setProperty('--height',ms==null?'3px':Math.max(3,Math.round(ms/max*103))+'px');
   bar.title=point.date+' · '+(ms==null?'nincs megfigyelés':duration(ms));
   row(d,'daylabel',dates.format(new Date(point.date+'T12:00:00Z')));
 }
}
function apply(doc,profile,period){
 const days={day:1,week:7,month:30}[period],s=vault.summary(doc,days);
 const who=profile==='zsolt'?'Zsolt':'Mónika';
 const pName={day:'Ma',week:'7 nap',month:'30 nap'}[period];
 text('periodLabel',pName+' · '+s.covered+' megfigyelt órasáv · forrás: HH One');
 text('usage',s.covered?duration(s.observed):'—');
 text('chatgpt',s.covered?duration(s.chatgpt):'—');
 text('evening',s.covered?duration(s.evening):'—');
 text('coverage',s.covered?String(s.covered):'—');
 text('ringTotal',s.covered?duration(s.observed):'—');
 text('usageSub','Előtérhasználat becslése; nem a Samsung gyári képernyőideje');
 text('eveningSub','20:00–24:00 · megfigyelt idősávok');
 text('digitalUsageAccessState','Hiteles HH One Android adat · hozzáférés állapota csak telefonon');
 const badge=document.querySelector('.header .demo');
 if(badge)badge.textContent='● KÖZPONTI ADAT';
 const source=document.querySelectorAll('.source b');
 if(source[4])source[4].textContent='Dropbox Vault · '+who+' · '+new Date(doc.collectedAtMs).toLocaleString('hu-HU');
 if(source[2])source[2].textContent='Mért előtéridő: '+duration(s.chatgpt);
 if(source[5])source[5].textContent='Önálló Sleep összevetés még nem igazolt';
 showBars(s);showWeek(doc);
 const appSummary='Részletes alkalmazáslista nem szerepel a jóváhagyott numerikus adatforrásban';
 for(const id of ['legend','apps','categories'])text(id,appSummary);
 if(!s.covered){
   text('analysisText',who+' profiljában nincs igazolt, lezárt használati idősáv erre az időszakra. A hiányzó adatot nem kezeljük nullának.');
   return;
 }
 if(s.covered<4){
   text('analysisText',who+' profilján '+s.covered+' megfigyelt órasáv áll rendelkezésre. Ez kevés ahhoz, hogy megbízható digitális szokásokat állapítsak meg.');
   return;
 }
 const part=Math.round(s.evening/s.observed*100);
 text('analysisText',who+' profilján az elmúlt '+pName.toLowerCase()+
   ' során '+duration(s.observed)+' megfigyelt alkalmazás-előtéridőt találtam '+s.covered+
   ' idősávban. Ebből az esti 20–24 órás időablak aránya '+part+
   '%. Ez csak ténylegesen megfigyelt alkalmazáshasználat; alvással való kapcsolatot összehasonlított mérések nélkül nem állítok.');
}
async function refresh(profile,period){
 if(!['zsolt','monika'].includes(profile)||!['day','week','month'].includes(period))return;
 const id=++generation;
 try{
   const stored=cache.get(profile);
   const doc=stored&&Date.now()-stored.at<120000?stored.doc:await vault.read(profile);
   if(id!==generation)return;
   if(!stored||Date.now()-stored.at>=120000)cache.set(profile,{doc,at:Date.now()});
   if(!doc||doc.hours.length===0){
     const msg=doc?'Nincs igazolt használati mérés':'A telefon még nem töltött fel Digital Wellbeing adatot';
     text('usageSub',msg);
     text('periodLabel',({day:'Ma',week:'7 nap',month:'30 nap'}[period])+' · '+msg);
     text('analysisText',msg+'. A rendszer nem becsül és nem jelenít meg tesztadatot.');
     return;
   }
   apply(doc,profile,period);
 }catch(err){
   if(id!==generation)return;
   text('usageSub','Hiteles mérés betöltése nem sikerült');
   text('periodLabel','Adatkapcsolat nem ellenőrzött');
   text('analysisText','A Digital Wellbeing központi adatai jelenleg nem érhetők el. A HealthHub főoldalán ellenőrizd a Dropbox-kapcsolatot. '+(err&&err.message||''));
 }
}
root.HH_DW_LIVE_V507=Object.freeze({refresh,duration});
})(window);
