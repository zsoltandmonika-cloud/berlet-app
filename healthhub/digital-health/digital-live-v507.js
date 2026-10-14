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
function showBars(s,period){
 const time=$('timeline'),ticks=$('rhythmTicks');
 time.replaceChildren();ticks.replaceChildren();
 time.dataset.period=period;
 if(period==='day'){
  text('rhythmTitle','🕑 Napi használati ritmus');
  text('rhythmRange','0–24h');
  text('rhythmLegend','■ Lila: esti 20–24 óra · oszlop: megfigyelt előtéridő óránként');
  for(let hour=0;hour<24;hour++){
   const ms=s.dayHours[hour],box=row(time,'hour');
   const fill=row(box,'fill');
   fill.style.setProperty('--height',ms==null?'0%':Math.min(100,100*ms/HOUR).toFixed(1)+'%');
   box.title=String(hour).padStart(2,'0')+':00 · '+(ms==null?'nincs megfigyelés':duration(ms));
   box.setAttribute('aria-label',box.title);
   if(ms==null)box.classList.add('no-data');
   if(hour>=20)box.classList.add('evening');
  }
  for(const h of ['00','06','12','18','24'])row(ticks,'',h);
  time.setAttribute('aria-label','Mai alkalmazás-előtéridő óránként');
  return;
 }
 const points=s.dayTotals;
 const name=period==='week'?'7 napos':'30 napos';
 text('rhythmTitle','🕑 '+name+' használati ritmus');
 text('rhythmRange','Napi összesítés');
 text('rhythmLegend','■ Oszlop: megfigyelt előtéridő naponként · üres: nincs adat, nem nulla');
 const max=Math.max(1,...points.map(p=>p.foregroundMs||0));
 for(const point of points){
  const ms=point.foregroundMs,box=row(time,'hour'),fill=row(box,'fill');
  fill.style.setProperty('--height',ms==null?'0%':Math.min(100,100*ms/max).toFixed(1)+'%');
  box.title=point.date+' · '+(ms==null?'nincs megfigyelés':duration(ms));
  box.setAttribute('aria-label',box.title);
  if(ms==null)box.classList.add('no-data');
 }
 const labels=period==='week'?points:points.filter((_,i)=>i%7===0||i===points.length-1);
 for(const point of labels)row(ticks,'',point.date.slice(5).replace('-','.'));
 time.setAttribute('aria-label',name+' előtéridő naponként, a hiányzó adatok nem nullák');
}
function showWeek(doc){
 // Current Budapest calendar week, not the rolling 7-day summary.
 const points=vault.calendarWeek(doc);
 const days=$('weekly');days.replaceChildren();
 const max=Math.max(1,...points.map(r=>r.foregroundMs||0));
 const dates=new Intl.DateTimeFormat('hu-HU',{weekday:'short',timeZone:'UTC'});
 for(const point of points){
   const d=row(days,'day');
   const bar=row(d,'daybar');
   const ms=point.foregroundMs;
   if(ms==null) {
     bar.classList.add(point.future?'future':'unknown');
     bar.style.setProperty('--height','4px');
   } else {
     bar.style.setProperty('--height',Math.max(4,Math.round(ms/max*103))+'px');
   }
   bar.title=point.date+' · '+(point.future?'még nem következett el':ms==null?'nincs megfigyelés':duration(ms));
   d.setAttribute('aria-label',bar.title);
   row(d,'daylabel',dates.format(new Date(point.date+'T12:00:00Z')));
 }
 const range=$('weekRange');
 if(range)range.textContent=points[0].date.slice(5).replace('-','.')+'–'+points[6].date.slice(5).replace('-','.')+' · H–V';
}
const APP_LABELS=Object.freeze({
 'com.openai.chatgpt':['ChatGPT','💬','AI-eszközök'],
 'com.google.android.youtube':['YouTube','▶️','Videó'],
 'com.android.chrome':['Google Chrome','🌐','Böngészés'],
 'com.sec.android.app.sbrowser':['Samsung Internet','🌐','Böngészés'],
 'com.microsoft.emmx':['Microsoft Edge','🌐','Böngészés'],
 'com.whatsapp':['WhatsApp','💬','Kommunikáció'],
 'com.facebook.orca':['Messenger','💬','Kommunikáció'],
 'com.instagram.android':['Instagram','📷','Közösségi'],
 'com.facebook.katana':['Facebook','👥','Közösségi'],
 'com.google.android.gm':['Gmail','✉️','Kommunikáció'],
 'com.google.android.apps.maps':['Google Térkép','🗺️','Navigáció'],
 'com.google.android.googlequicksearchbox':['Google','🔎','Keresés'],
 'com.google.android.apps.photos':['Google Fotók','🖼️','Fotózás'],
 'com.google.android.apps.messaging':['Google Üzenetek','💬','Kommunikáció'],
 'com.google.android.apps.wellbeing':['Google Digital Wellbeing','📊','Digitális jóllét'],
 'com.spotify.music':['Spotify','🎵','Zene'],
 'com.netflix.mediaclient':['Netflix','🎬','Videó'],
 'com.microsoft.teams':['Microsoft Teams','💬','Kommunikáció'],
 'com.samsung.android.forest':['Samsung Digital Wellbeing','📊','Digitális jóllét'],
 'com.sec.android.app.launcher':['One UI kezdőképernyő','🏠','Rendszerfelület'],
 'com.samsung.android.incallui':['Samsung hívásképernyő','📞','Telefonálás'],
 'com.samsung.android.rubin.app':['Samsung testreszabási szolgáltatás','⚙️','Rendszerszolgáltatás'],
 'com.android.settings':['Android Beállítások','⚙️','Rendszerfelület'],
 'com.samsung.android.dialer':['Samsung Telefon','📞','Telefonálás'],
 'com.samsung.android.contacts':['Samsung Névjegyek','👥','Kommunikáció'],
 'hu.zsoltmonika.healthhubbridge':['HH One Connect','💙','Egészség / HealthHub']
});
// Pure presentation mapping: raw Android package identifiers remain in signed
// source data and consented private Dropbox records. Never guess unknown names.
function resolveApp(id){return APP_LABELS[id]||[id,'📱','Besorolatlan'];}

// Categories are derived only from real, consented app-hour measurements.
// Exact verified IDs win; everything else remains explicitly unclassified.
// The sum of category totals must match the measured per-app total.
function summarizeCategories(topApps){
 const totals=new Map(),icons=new Map();
 for(const entry of topApps){
  const id=entry[0],ms=entry[1];
  if(!Number.isFinite(ms)||ms<0)continue;
  const info=resolveApp(id),category=info[2];
  totals.set(category,(totals.get(category)||0)+ms);
  if(!icons.has(category))icons.set(category,info[1]);
 }
 return [...totals.entries()].sort((a,b)=>b[1]-a[1])
  .map(([name,ms])=>({name,ms,icon:icons.get(name)||'📱'}));
}
function apps(s){
 const legend=$('legend'),list=$('apps'),categories=$('categories'),ring=document.querySelector('.ring');
 for(const element of [legend,list,categories])element.replaceChildren();

 if(!s.appDetailShared||!s.topApps.length){
   ring.style.background='conic-gradient(#304663 0% 100%)';
   text('ringTotal','—');
   const last=Number.isSafeInteger(s.lastCollectedAtMs)
    ?new Date(s.lastCollectedAtMs).toLocaleString('hu-HU',{dateStyle:'short',timeStyle:'short'})
    :'nem ismert';
   if(!s.appDetailShared){
    row(list,'note','A családi alkalmazáslista külön megosztása még nincs engedélyezve ezen a telefonon.');
    row(categories,'note','Alkalmazáskategóriákat csak külön engedélyezett alkalmazásadatból készítünk.');
   }else{
    row(list,'note','A részletes megosztás engedélyezett, de erre az időszakra még nincs engedélyezés utáni, lezárt alkalmazásóra.');
    row(legend,'note','Az utolsó hiteles Dropbox-adatcsomag időpontja: '+last+'. A Digital Wellbeing külön ütemezéssel szinkronizál, nem a Health Connect időpontjaiban.');
    row(categories,'note','Részletes alkalmazássor még nincs az utolsó adatcsomagban. Hiányzó adatot nem mutatunk nullaként.');
   }
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
 s.topApps.slice(0,8).forEach(([id,ms],i)=>{
   const info=resolveApp(id);
   const el=row(list,'app');
   row(el,'appicon',info[1]);
   const desc=row(el,'');
   const label=row(desc,'appname',info[0]);
   label.title='Eredeti Android-csomagnév: '+id;
   row(desc,'appdetail',info[2]);
   const value=row(el,'appval',duration(ms));
   value.title=info[0]+' · megfigyelt alkalmazás-előtéridő';
   const track=row(desc,'bar');const fill=document.createElement('span');track.appendChild(fill);
   fill.style.width=Math.min(100,100*ms/all).toFixed(1)+'%';fill.style.backgroundColor=colors[i%colors.length];
 });
 const grouped=summarizeCategories(s.topApps);
 for(const category of grouped){
   const item=row(categories,'catrow');
   const heading=row(item,'catheading');
   row(heading,'caticon',category.icon);
   row(heading,'catname',category.name);
   row(heading,'catvalue',duration(category.ms));
   const percent=all?Math.max(0,Math.min(100,100*category.ms/all)):0;
   const track=row(item,'catbar');
   const fill=document.createElement('span');
   track.appendChild(fill);
   fill.style.width=percent.toFixed(1)+'%';
   const share=row(item,'catshare',percent.toFixed(1).replace('.',',')+'% a mért alkalmazásidőből');
   item.title=category.name+' · '+duration(category.ms)+' · '+share.textContent;
 }
 for(const [id,ms] of s.topApps.slice(0,4)){
   const info=resolveApp(id);
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
 text('digitalAppDetails',!s.appDetailShared
  ?'Nincs külön családi alkalmazásmegosztási engedély'
  :s.topApps.length+' megjeleníthető alkalmazás a kiválasztott időszakban');
 text('usageSub','Előtérhasználat becslése; nem a Samsung gyári képernyőideje');
 text('eveningSub','20:00–24:00 · megfigyelt idősávok');
 text('digitalUsageAccessState','Hiteles HH One Android adat · hozzáférés állapota csak telefonon');
 const badge=document.querySelector('.header .demo');
 if(badge)badge.textContent='● KÖZPONTI ADAT';
 const source=document.querySelectorAll('.source b');
 if(source[4])source[4].textContent='Dropbox Vault · '+who+' · '+new Date(doc.collectedAtMs).toLocaleString('hu-HU');
 if(source[2])source[2].textContent='Mért előtéridő: '+duration(s.chatgpt);
 if(source[5])source[5].textContent='Önálló Sleep összevetés még nem igazolt';
 showBars(s,period);showWeek(doc);
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
 text('digitalAppDetails','Ellenőrzés folyamatban…');
 text('analysisText','Hiteles mérések betöltése folyamatban…');
 for (const id of ['timeline','weekly','legend','apps','categories']) {
   const el=$(id);if(el)el.replaceChildren();
 }
 text('rhythmTitle','🕑 Használati ritmus');
 text('rhythmRange','Adatellenőrzés');
 text('rhythmLegend','Hiteles időszak betöltése…');
 const rhythmTicks=$('rhythmTicks');if(rhythmTicks)rhythmTicks.replaceChildren();
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
root.HH_DW_LIVE_V507=Object.freeze({refresh,duration,resolveApp,summarizeCategories});
})(window);
