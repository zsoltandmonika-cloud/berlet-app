(function(root){
'use strict';
/* Render ONLY validated phone-origin data from the family's existing Dropbox Vault. */
const vault=root.HH_DW_VAULT_V507;
const $=id=>document.getElementById(id);
const DAY=86400000,HOUR=3600000;
let generation=0;
// Always read the private vault on a profile/period refresh. Never cache revoked data.
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
function apps(s){
 const legend=$('legend'),list=$('apps'),categories=$('categories'),ring=document.querySelector('.ring');
 for(const element of [legend,list,categories])element.replaceChildren();
 const names={
 'com.openai.chatgpt':['ChatGPT','💬','AI-eszközök'],
 'com.google.android.youtube':['YouTube','▶️','Videó'],
 'com.android.chrome':['Chrome','🌐','Böngészés'],
 'com.sec.android.app.sbrowser':['Samsung Internet','🌐','Böngészés'],
 'com.whatsapp':['WhatsApp','💬','Kommunikáció'],
 'com.instagram.android':['Instagram','📷','Közösségi'],
 'com.facebook.katana':['Facebook','👥','Közösségi']
 };
 if(!s.appDetailShared||!s.topApps.length){
   ring.style.background='conic-gradient(#304663 0% 100%)';
   text('ringTotal','—');
   for(const el of [legend,list,categories])row(el,'note','Alkalmazásonkénti adat még nem érkezett külön családi megosztási engedéllyel.');
   return;
 }
 const all=s.topApps.reduce((sum,item)=>sum+item[1],0);
 text('ringTotal',duration(all));
 const colors=['#60a5fa','#45d5cc','#b8a5fa','#f8a9cf','#a8bbd6'];
 let cumulative=0;const slices=[];
 s.topApps.slice(0,4).forEach(([id,ms],i)=>{
   const next=cumulative+100*ms/all;
   slices.push(colors[i]+' '+cumulative.toFixed(2)+'% '+next.toFixed(2)+'%');
   cumulative=next;
 });
 if(cumulative<100)slices.push('#304663 '+cumulative.toFixed(2)+'% 100%');
 ring.style.background='conic-gradient('+slices.join(',')+')';
 const grouped=new Map();
 s.topApps.slice(0,8).forEach(([id,ms],i)=>{
   const info=names[id]||[id,'📱','Besorolatlan'];
   const el=row(list,'app');
   row(el,'appicon',info[1]);
   const desc=row(el,'');
   row(desc,'appname',info[0]);
   row(desc,'appdetail',info[2]);
   const value=row(el,'appval',duration(ms));
   value.title=info[0]+' · megfigyelt alkalmazás-előtéridő';
   const track=row(desc,'bar');const fill=document.createElement('span');track.appendChild(fill);
   fill.style.width=Math.min(100,100*ms/all).toFixed(1)+'%';fill.style.backgroundColor=colors[i%colors.length];
 });
 for(const [id,ms] of s.topApps){
   const info=names[id]||[id,'📱','Besorolatlan'];
   grouped.set(info[2],(grouped.get(info[2])||0)+ms);
 }
 for(const [name,ms] of [...grouped].sort((a,b)=>b[1]-a[1]))
   row(categories,'app',name+' · '+duration(ms));
 for(const [id,ms] of s.topApps.slice(0,4)){
   const info=names[id]||[id,'📱','Besorolatlan'];
   row(legend,'item',info[0]+' · '+duration(ms));
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
 text('ringTotal','—');
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
 apps(s);
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
function clearPreviousProfile() {
 // Immediately clear every previously visible metric before any remote request.
 for (const id of ['usage','chatgpt','evening','coverage','ringTotal']) text(id,'—');
 text('usageSub','Hiteles Dropbox-mérés betöltése…');
 text('eveningSub','20:00–24:00 · még nem ellenőrzött');
 text('digitalUsageAccessState','Felhőadat ellenőrzése');
 text('analysisText','Hiteles mérések betöltése folyamatban…');
 for (const id of ['timeline','weekly','legend','apps','categories']) {
   const el=$(id);if(el)el.replaceChildren();
 }
 const ring=document.querySelector('.ring');
 if(ring)ring.style.background='conic-gradient(#304663 0% 100%)';
 const badge=document.querySelector('.header .demo');
 if(badge)badge.textContent='● ADATELLENŐRZÉS';
 const source=document.querySelectorAll('.source b');
 for(const index of [2,4,5])if(source[index])source[index].textContent='—';
}
async function refresh(profile,period){
 if(!['zsolt','monika'].includes(profile)||!['day','week','month'].includes(period))return;
 const id=++generation;
 clearPreviousProfile();
 text('periodLabel',({day:'Ma',week:'7 nap',month:'30 nap'}[period])+' · adatellenőrzés…');
 try{
   const doc=await vault.read(profile);
   if(id!==generation)return;
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
