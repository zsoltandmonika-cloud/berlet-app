/* SH9 Volán Smart Bus · Phase 2F: Utazásaim / Journey Manager v608.
 * Saved plans are personal intentions, never confirmed MÁV train departures.
 * Local-only, profile separated, no GPS, remote API, background polling or upload.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SH9_VOLAN_JOURNEY_MANAGER_V3=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const MAX_JOURNEYS=30;
const MAX_NOTE=500;
const profile=id=>id==='m'?'monika':'zsolt';
const storageKey=id=>'sh9-volan-saved-journeys-v1-'+profile(id);
const station=v=>typeof v==='string'?v.trim().replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').slice(0,120):'';
const short=(v,n)=>typeof v==='string'?v.trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,n):'';
const modeLabel=mode=>mode==='arrive'?'Tervezett érkezés':mode==='depart'?'Tervezett indulás':'Indulás most (mentéskori idő)';
function validLocal(value){
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const [y,m,d,h,min]=value.match(/\d+/g).map(Number);
 if(m<1||m>12||d<1||d>31||h>23||min>59)return false;
 const check=new Date(Date.UTC(y,m-1,d,h,min));
 return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
}
function budapestNow(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const values={};parts.forEach(p=>values[p.type]=p.value);
 return values.year+'-'+values.month+'-'+values.day+'T'+values.hour+':'+values.minute;
}
function normalize(raw){
 if(!raw||typeof raw!=='object')return null;
 const from=station(raw.from),to=station(raw.to);
 if(from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu'))return null;
 const mode=['now','depart','arrive'].includes(raw.mode)?raw.mode:null;
 if(!mode||!validLocal(raw.when))return null;
 const id=String(raw.id||'');
 if(!/^[a-zA-Z0-9_-]{5,64}$/.test(id))return null;
 const timestamp=Number(raw.savedAt);
 if(!Number.isFinite(timestamp)||timestamp<0||timestamp>Date.now()+86400000)return null;
 return {id,from,to,mode,when:raw.when,savedAt:timestamp,
  ticket:short(raw.ticket,80),car:short(raw.car,24),seat:short(raw.seat,24),
  note:short(raw.note,MAX_NOTE)};
}
function read(storage,id){
 try{const data=JSON.parse(storage.getItem(storageKey(id))||'[]');if(!Array.isArray(data))return [];
  const seen=new Set(),list=[];
  for(const raw of data.slice(0,100)){
   const item=normalize(raw);
   if(item&&!seen.has(item.id)){seen.add(item.id);list.push(item)}
   if(list.length>=MAX_JOURNEYS)break;
  }
  return list.sort((a,b)=>b.when.localeCompare(a.when)||b.savedAt-a.savedAt);
 }catch(_){return []}
}
function put(storage,id,items){
 try{storage.setItem(storageKey(id),JSON.stringify(items));return true}catch(_){return false}
}
function create(storage,id,raw,time=Date.now(),entropy=Math.random()){
 const from=station(raw?.from),to=station(raw?.to);
 const mode=['now','depart','arrive'].includes(raw?.mode)?raw.mode:null;
 const when=mode==='now'?budapestNow(new Date(time)):raw?.when;
 if(!mode||!validLocal(when)||from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu'))return {ok:false,reason:'invalid'};
 const items=read(storage,id);
 if(items.length>=MAX_JOURNEYS)return {ok:false,reason:'limit'};
 const safeEntropy=Number.isFinite(entropy)?Math.abs(entropy):0;
 const idPart=Math.floor(safeEntropy*0xFFFFFFFF).toString(36);
 const tripId='j'+time.toString(36)+'-'+idPart;
 const result=normalize({id:tripId,from,to,mode,when,savedAt:time,
  ticket:raw.ticket,car:raw.car,seat:raw.seat,note:raw.note});
 if(!result)return {ok:false,reason:'invalid'};
 if(items.some(x=>x.id===result.id))return {ok:false,reason:'duplicate'};
 if(!put(storage,id,[result,...items]))return {ok:false,reason:'storage'};
 return {ok:true,journey:result};
}
function patch(storage,id,journeyId,fields){
 const items=read(storage,id),index=items.findIndex(j=>j.id===journeyId);
 if(index<0)return false;
 const next={...items[index],ticket:short(fields?.ticket,80),
  car:short(fields?.car,24),seat:short(fields?.seat,24),note:short(fields?.note,MAX_NOTE)};
 items[index]=next;
 return put(storage,id,items);
}
function remove(storage,id,journeyId){
 const items=read(storage,id),next=items.filter(x=>x.id!==journeyId);
 return next.length!==items.length&&put(storage,id,next);
}
function splitJourneyPlans(items,now=budapestNow()){
 const upcoming=[],past=[];
 for(const item of items)(item.when>=now?upcoming:past).push(item);
 return {upcoming,past};
}
function tripTitle(item){return 'SH9 – '+modeLabel(item.mode)+': '+item.from+' → '+item.to}
function shareText(item){
 return 'SH9 Smart Bus · Személyes utazási terv\n'+item.from+' → '+item.to+
  '\n'+modeLabel(item.mode)+': '+item.when.slice(0,10)+' '+item.when.slice(11)+
  '\nNem ellenőrzött Volán-menetrend. A jegyadatok és személyes jegyzetek nincsenek megosztva.';
}
function icsEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function addMinutes(value,minutes){
 const [y,m,d,h,min]=value.match(/\d+/g).map(Number);
 const result=new Date(Date.UTC(y,m-1,d,h,min+minutes));
 return result.getUTCFullYear()+'-'+String(result.getUTCMonth()+1).padStart(2,'0')+'-'+String(result.getUTCDate()).padStart(2,'0')+
  'T'+String(result.getUTCHours()).padStart(2,'0')+':'+String(result.getUTCMinutes()).padStart(2,'0');
}
const icsDate=s=>s.replace(/[-:]/g,'')+'00';
function foldLine(line){
 let result='',width=0;const encoder=new TextEncoder();
 for(const symbol of line){const size=encoder.encode(symbol).length;if(width+size>73){result+='\r\n ';width=1}result+=symbol;width+=size}
 return result;
}
function ics(item,date=new Date()){
 const end=addMinutes(item.when,15);
 const desc='Személyes tervezett útvonal. Nem igazolt buszindulás vagy menetidő. 15 perces naptári emlékeztető. A jegyadatok és jegyzetek szándékosan kimaradnak.';
 const lines=[
 'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SH9 HealthHub//Volán Smart Bus//HU',
 'CALSCALE:GREGORIAN','METHOD:PUBLISH',
 'BEGIN:VTIMEZONE','TZID:Europe/Budapest',
 'BEGIN:DAYLIGHT','DTSTART:19700329T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0200',
 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','TZNAME:CEST','END:DAYLIGHT',
 'BEGIN:STANDARD','DTSTART:19701025T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0100',
 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','TZNAME:CET','END:STANDARD','END:VTIMEZONE',
 'BEGIN:VEVENT','UID:'+item.id+'@local.sh9.healthhub',
 'DTSTAMP:'+date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
 'DTSTART;TZID=Europe/Budapest:'+icsDate(item.when),
 'DTEND;TZID=Europe/Budapest:'+icsDate(end),
 'SUMMARY:'+icsEscape(tripTitle(item)),
 'DESCRIPTION:'+icsEscape(desc),
 'LOCATION:'+icsEscape(item.from),
 'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR'
 ];
 return lines.map(foldLine).join('\r\n')+'\r\n';
}
function googleCalendarUrl(item){
 const start=icsDate(item.when),end=icsDate(addMinutes(item.when,15));
 const q=new URLSearchParams({
  action:'TEMPLATE',text:tripTitle(item),dates:start+'/'+end,
  ctz:'Europe/Budapest',details:'Személyes 15 perces emlékeztető, nem ellenőrzött Volán menetrend.',
  location:item.from
 });
 return 'https://calendar.google.com/calendar/render?'+q.toString();
}
function mount(doc,win){
 const get=id=>doc.getElementById(id),planner=win.SH9_VOLAN_PLANNER_V3;
 const toggle=get('rail-journey-save-toggle'),compose=get('rail-journey-compose'),confirm=get('rail-journey-confirm'),
  cancel=get('rail-journey-cancel'),container=get('rail-journey-plans');
 if(!planner||!toggle||!compose||!confirm||!cancel||!container||!win.localStorage)return null;
 const storage=win.localStorage,active=()=>doc.documentElement.dataset.profile==='m'?'m':'z';
 const fields=['ticket','car','seat','note'];
 function formValues(){const values={};fields.forEach(f=>values[f]=get('rail-trip-'+f).value);return values}
 function resetForm(){fields.forEach(f=>get('rail-trip-'+f).value='')}
 function toast(message){planner.toast(message)}
 function button(label,cls,fn,aria){
  const el=doc.createElement('button');el.type='button';el.className=cls;el.textContent=label;
  if(aria)el.setAttribute('aria-label',aria);
  el.addEventListener('click',fn);return el;
 }
 function span(cls,value){const node=doc.createElement('span');node.className=cls;node.textContent=value;return node}
 function openPlanner(item){
  if(planner.applyRoute({from:item.from,to:item.to,mode:item.mode,when:item.when})){
   for(const d of doc.querySelectorAll('.drawer'))d.classList.remove('open');
   get('planner')?.scrollIntoView({behavior:'smooth',block:'start'});
   toast('Utazási terv betöltve. Nem élő menetrendi találat.');
  }
 }
 function downloadCalendar(item){
  const b=new win.Blob(['\uFEFF'+ics(item)],{type:'text/calendar;charset=utf-8'});
  const href=win.URL.createObjectURL(b),a=doc.createElement('a');
  a.href=href;a.download='sh9-utazas-'+item.when.slice(0,10)+'-'+item.id+'.ics';
  doc.body.append(a);a.click();a.remove();
  win.setTimeout(()=>win.URL.revokeObjectURL(href),1200);
  toast('Naptárfájl elkészítve. A mentést/importálást a készülék végzi.');
 }
 function openGoogleCalendar(item){
  const url=googleCalendarUrl(item);
  if(/Android|iPhone|iPad/i.test(win.navigator.userAgent))win.location.assign(url);
  else{const anchor=doc.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.click()}
 }
 async function shareJourney(item){
  const text=shareText(item);
  if(typeof win.navigator.share==='function'){
   try{await win.navigator.share({title:'SH9 · Személyes útiterv',text});return}
   catch(err){if(err?.name==='AbortError')return}
  }
  try{
   if(!win.navigator.clipboard?.writeText)throw Error('No clipboard');
   await win.navigator.clipboard.writeText(text);toast('Útiterv a vágólapra másolva (jegyadatok nélkül).');
  }catch(_){toast('A megosztás itt nem támogatott. Az útiterv a saját listádban megmarad.')}
 }
 function edit(item,wrapper){
  if(wrapper.querySelector('.rail-trip-edit'))return;
  const form=doc.createElement('div');form.className='rail-trip-edit';
  const changes={};
  for(const [name,visible,max] of [['ticket','Jegyszám / foglalás',80],['car','Kocsi',24],['seat','Ülőhely',24],['note','Megjegyzés',MAX_NOTE]]){
   const label=doc.createElement('label');label.textContent=visible;
   const input=doc.createElement(name==='note'?'textarea':'input');
   if(name!=='note')input.type='text';
   input.maxLength=max;input.value=item[name]||'';changes[name]=input;label.append(input);form.append(label);
  }
  const actions=doc.createElement('div');actions.className='rail-trip-actions';
  actions.append(button('Módosítás mentése','rail-personal-tool',()=>{
   const values={};Object.keys(changes).forEach(k=>values[k]=changes[k].value);
   if(patch(storage,active(),item.id,values)){render();toast('Utazási adatok módosítva.')}
   else toast('Nem sikerült menteni a módosításokat.');
  }),button('Mégse','rail-personal-tool',()=>form.remove()));
  form.append(actions);wrapper.append(form);changes.ticket.focus();
 }
 function section(title,items){
  const group=doc.createElement('section');group.className='rail-trip-group';
  const heading=doc.createElement('h4');heading.textContent=title+' · '+items.length;group.append(heading);
  if(!items.length){group.append(span('rail-personal-empty','Nincs itt elmentett utazás.'));return group}
  items.forEach(item=>{
   const card=doc.createElement('article');card.className='rail-personal-item rail-trip-card';
   card.append(span('rail-trip-route',item.from+' → '+item.to));
   card.append(span('rail-personal-caption',modeLabel(item.mode)+' · '+item.when.slice(0,10)+' '+item.when.slice(11)));
   card.append(span('rail-trip-disclaimer','Saját utazási terv · nem ellenőrzött buszindulás'));
   if(item.car||item.seat||item.ticket||item.note){
    const line=[];
    if(item.car)line.push('Busz / kocsi: '+item.car);
    if(item.seat)line.push('Hely: '+item.seat);
    if(item.ticket)line.push('Jegyszám: '+item.ticket);
    if(item.note)line.push('Jegyzet: '+item.note);
    card.append(span('rail-trip-private',line.join(' · ')));
   }
   const actions=doc.createElement('div');actions.className='rail-trip-actions';
   actions.append(
    button('Betöltés','rail-personal-tool',()=>openPlanner(item)),
    button('Naptár (.ics)','rail-personal-tool',()=>downloadCalendar(item)),
    button('Google Naptár ↗','rail-personal-tool',()=>openGoogleCalendar(item)),
    button('Megosztás','rail-personal-tool',()=>shareJourney(item)),
    button('Szerkesztés','rail-personal-tool',()=>edit(item,card)),
    button('Törlés','rail-personal-tool rail-personal-delete',()=>{
     if(remove(storage,active(),item.id)){render();toast('Utazási terv törölve.')}
    })
   );
   card.append(actions);group.append(card);
  });
  return group;
 }
 function render(){
  container.replaceChildren();
  const groups=splitJourneyPlans(read(storage,active()));
  container.append(section('Közelgő tervek',groups.upcoming),section('Korábbi tervek',groups.past));
 }
 toggle.addEventListener('click',()=>{
  compose.hidden=!compose.hidden;
  if(!compose.hidden)get('rail-trip-ticket').focus();
 });
 cancel.addEventListener('click',()=>{compose.hidden=true;resetForm()});
 confirm.addEventListener('click',()=>{
  const mode=doc.querySelector('[data-mode].on')?.dataset.mode||'now';
  const from=get('from').value,to=get('to').value;
  const when=get('when').value;
  // Match the route planner's selection. Do not invent actual train number or duration.
  const result=create(storage,active(),{from,to,mode,when,...formValues()});
  if(!result.ok){toast(result.reason==='limit'?'Legfeljebb 30 utazási terv menthető.':result.reason==='storage'?'A helyi tárhely nem engedte a mentést.':'Két eltérő megálló és érvényes dátum szükséges.');return}
  compose.hidden=true;resetForm();render();toast('Saját utazási terv elmentve.');
 });
 render();
 return {render,read:()=>read(storage,active())};
}
return Object.freeze({MAX_JOURNEYS,storageKey,normalize,validLocal,budapestNow,read,create,patch,remove,splitJourneyPlans,shareText,ics,icsEscape,googleCalendarUrl,modeLabel,mount});
});
if(typeof document!=='undefined'&&typeof window!=='undefined'&&window.SH9_VOLAN_JOURNEY_MANAGER_V3){
 window.SH9_VOLAN_JOURNEYS_UI=window.SH9_VOLAN_JOURNEY_MANAGER_V3.mount(document,window);
}
