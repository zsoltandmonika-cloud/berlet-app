/* HealthHub v1018 · Gyógyszerek Premium vertical glass.
 * View-only adaptation of the existing canonical medication picker.
 * Never edits, clones, or replaces private medicines, action handlers,
 * profile filtering, medication source records, or cloud storage.
 * ?hhmeds1018=0 disables this optional presentation layer.
 */
(function(w,d){
 'use strict';
 var p;
 try{p=new URLSearchParams(w.location.search)}catch(_){p=null}
 if(p&&(p.get('hhmeds1018')==='0'||p.get('hhscrollselect')==='0'||p.get('hhpremium')==='0'))return;
 var previous=w.renderHealthSection;
 if(typeof previous!=='function')return;
 function make(tag,cls,content){
  var el=d.createElement(tag);
  el.className=cls||'';
  if(content!=null)el.textContent=content;
  return el;
 }
 function normalize(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu');
 }
 function decorate(){
  if(w.healthSectionKind!=='medications')return;
  var root=d.getElementById('healthSubContent');
  if(!root)return;
  var section=Array.from(root.querySelectorAll('.hhRsmSection')).find(function(node){
   return !!node.querySelector('.hhRsmToolbar')&&!!node.querySelector('.hhRsmTrack');
  });
  if(!section)return;
  section.classList.add('hhMeds1018');
  var toolbar=section.querySelector('.hhRsmToolbar');
  var label=toolbar&&toolbar.querySelector('.hhRsmHeading>b');
  if(label)label.textContent='Gyógyszerszűrők';
  var track=section.querySelector('.hhRsmTrack');
  // The existing scroll-tick module recognizes this dataset flag.
  track.dataset.hhRecordsVertical='on';
  track.dataset.hhMedicationsVertical='on';
  track.setAttribute('aria-label','Gyógyszerek · függőleges lista');
  var rows=Array.from(track.querySelectorAll('.hhRsmCard'));
  var chips=toolbar&&toolbar.querySelector('.hhRsmChips');
  if(chips&&chips.dataset.hhMeds1018SearchSync!=='on'){
   chips.dataset.hhMeds1018SearchSync='on';
   // v592 stops click propagation at the chip; capture + microtask lets its
   // original category filter run first, then intersects the text search.
   chips.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('.hhRsmChip'))
     Promise.resolve().then(decorate);
   },true);
  }
  rows.forEach(function(row){
   if(row.dataset.hhMedCardV1018==='on')return;
   row.dataset.hhMedCardV1018='on';
   row.classList.add('hhMeds1018Card');
   var status=row.querySelector('.hrTag');
   var value=status&&status.textContent&&status.textContent.trim()||'';
   var badge=make('div','hhMeds1018Badge');
   badge.appendChild(make('span','hhMeds1018Icon','💊'));
   badge.appendChild(make('small','hhMeds1018Status',value||'Gyógyszer'));
   badge.setAttribute('aria-label',value||'Gyógyszer');
   var statusCode=normalize(value);
   var isPast=/korabbi|inaktiv|nem szedi|elhagyott|megszunt|leallitott/.test(statusCode);
   badge.dataset.hhMedStatus=isPast?'past'
    :/aktualis|aktiv/.test(statusCode)?'current':'other';
   row.insertBefore(badge,row.firstChild);
   // Preserve original status node for the canonical quick-filter logic.
   var buttons=row.querySelector('.hhRsmActions');
   if(buttons){
    var purpose=Array.from(buttons.querySelectorAll('button')).find(function(b){
     return /Mire való\?/.test(b.textContent||'');
    });
    if(purpose)purpose.classList.add('hhMeds1018Purpose');
   }
  });
  // Search is already handled by the original canonical renderer for legacy
  // medicines; the private list is appended by v593 and needs a local,
  // presentation-only text match on the existing rows. Retain any existing
  // category selection (do not unhide rows disabled by the old filter).
  var search=d.getElementById('healthSearch');
  var q=normalize(search&&search.value);
  var total=0;
  rows.forEach(function(row){
   if(q){
    var title=row.querySelector('b'),tag=row.querySelector('.hrTag');
    var medText=Array.from(row.querySelectorAll('small')).find(function(node){
     return !node.classList.contains('hhMeds1018Status');
    });
    var combined=[title&&title.textContent,medText&&medText.textContent,tag&&tag.textContent].join(' ');
    if(!normalize(combined).includes(q))row.hidden=true;
   }
   if(!row.hidden)total++;
  });
  var count=toolbar&&toolbar.querySelector('.hhRsmCount');
  if(count)count.textContent=total+' találat';
  var empty=section.querySelector('.hhRsmEmpty');
  if(empty){
   if(rows.length&&total===0){
    empty.textContent='Nincs találat a kereséshez vagy a kiválasztott szűrőhöz.';
    empty.hidden=false;
   }else if(rows.length&&total>0)empty.hidden=true;
  }
 }
 w.renderHealthSection=async function(){
  var result=await previous.apply(this,arguments);
  if(w.healthSectionKind==='medications'){
   try{decorate()}catch(e){console.warn('Gyógyszerek v1018 megjelenítés visszaáll a korábbi nézetre',e)}
  }
  return result;
 };
 w.HH_MEDICATIONS_VERTICAL_V1018=Object.freeze({version:'1018',refresh:decorate});
})(window,document);
