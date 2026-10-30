/* HealthHub v1015 · Leletek One-Card / Vertical
 * View-only document title formatting: never rename files or mutate health records.
 * Run after the original documents, Léna, scroll filters and Buddy adapters.
 * Fallback: ?hhrecords1015=0. All source handlers and privacy checks stay native.
 */
(function(root,doc){
 'use strict';
 var args;
 try{args=new URLSearchParams(root.location.search)}catch(_){args=null}
 if(args&&(args.get('hhrecords1015')==='0'||args.get('hhpremium')==='0'||args.get('hhscrollselect')==='0'))return;
 var previous=root.renderHealthSection;
 if(typeof previous!=='function')return;
 doc.documentElement.dataset.hhRecordsV1015='on';
 var months=['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
 function datePart(y,m,d){
  var yy=Number(y),mm=Number(m),dd=Number(d);
  if(yy<1900||yy>2100||mm<1||mm>12||dd<1||dd>31)return null;
  var check=new Date(yy,mm-1,dd);
  if(check.getFullYear()!==yy||check.getMonth()+1!==mm||check.getDate()!==dd)return null;
  return {year:String(yy),day:months[mm-1]+' '+dd+'.',iso:String(yy)+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0')};
 }
 function formatted(raw,meta){
  var filename=String(raw||'').trim(),name=filename.replace(/\.(pdf|docx?|rtf|txt|jpe?g|png)$/i,'');
  var found=name.match(/^(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})(?:[_\s.-]+|$)/);
  var date=found&&datePart(found[1],found[2],found[3]);
  if(date)name=name.slice(found[0].length);
  if(!date){
   var m=String(meta||'').match(/^\s*(\d{4})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})\.?/);
   if(m)date=datePart(m[1],m[2],m[3]);
   if(!date){
    var short=String(meta||'').match(/^\s*(\d{4})\.\s*(jan\.|febr\.|márc\.|ápr\.|máj\.|jún\.|júl\.|aug\.|szept\.|okt\.|nov\.|dec\.)\s*(\d{1,2})\.?/i);
    if(short)date=datePart(short[1],months.indexOf(short[2].toLocaleLowerCase('hu'))+1,short[3]);
   }
  }
  name=name.replace(/_+/g,' ').replace(/\s+/g,' ').trim();
  return {name:name||filename,date:date};
 }
 function make(tag,cls,txt){
  var el=doc.createElement(tag);
  el.className=cls;
  if(txt!=null)el.textContent=txt;
  return el;
 }
 function decorate(){
  if(root.healthSectionKind!=='records')return;
  var container=doc.getElementById('healthSubContent');
  if(!container)return;
  var section=Array.from(container.querySelectorAll('.hhRsmSection')).find(function(n){
   return !!n.querySelector('.hhRsmTrack .hhRsmCard');
  });
  if(!section)return;
  section.classList.add('hhDocs1015');
  var track=section.querySelector('.hhRsmTrack');
  if(!track)return;
  track.dataset.hhRecordsVertical='on';
  var buddy=section.querySelector('.hhBuddy593');
  if(buddy)buddy.remove();
  var heading=section.querySelector('.hhRsmHeading>b');
  if(heading)heading.textContent='Leletszűrők';
  var note=section.querySelector('.hhRsmNote');
  var omsz=section.querySelector('.hhRsmChip[data-hh-key="omsz"]');
  if(note&&omsz)omsz.title=note.textContent;
  var rows=Array.from(track.querySelectorAll('.hhRsmCard'));
  rows.forEach(function(row){
   if(row.dataset.hhRecordsCardV1015==='on')return;
   var title=row.querySelector('b'),meta=row.querySelector('small');
   if(!title)return;
   var raw=title.textContent||'',originalMeta=meta&&meta.textContent||'',readable=formatted(raw,originalMeta);
   row.dataset.hhOriginalTitle=raw;
   row.dataset.hhRecordsCardV1015='on';
   row.classList.add('hhDocs1015Card');
   title.title=raw;
   title.textContent=readable.name;
   if(meta&&readable.date){
    // Date is now a prominent badge, not a duplicate metadata label.
    var segments=originalMeta.split(/\s+·\s+/);
    if(segments.length>1&&/^\s*\d{4}[.\-]/.test(segments[0]))
     meta.textContent=segments.slice(1).join(' · ');
   }
   if(readable.date){
    var tag=make('time','hhDocs1015Date');
    tag.dateTime=readable.date.iso;
    tag.appendChild(make('strong','',readable.date.year));
    tag.appendChild(make('span','',readable.date.day));
    row.insertBefore(tag,row.firstChild);
   }else{
    var plain=make('span','hhDocs1015Date hhDocs1015NoDate','📄');
    plain.setAttribute('aria-label','Dátum nincs megadva');
    row.insertBefore(plain,row.firstChild);
   }
   var buttons=row.querySelector('.hhRsmActions');
   if(buttons){
    var lena=Array.from(buttons.querySelectorAll('button')).find(function(b){return /Léna magyarázata/.test(b.textContent||'')});
    if(lena)lena.classList.add('hhDocs1015Lena');
   }
  });
 }
 root.renderHealthSection=async function(){
  // Expand at source before the canonical records renderer builds its DOM.
  // The full set is still restricted by the selected profile, search and filters.
  if(root.healthSectionKind==='records'&&root.hhDocState)root.hhDocState.showAll=true;
  var result=await previous.apply(this,arguments);
  if(root.healthSectionKind==='records')decorate();
  return result;
 };
 // Re-enable on a profile rerender without extra reads or server requests.
 root.addEventListener('healthhub:profile-changed',function(){
  if(root.hhDocState&&root.healthSectionKind==='records')root.hhDocState.showAll=true;
 });
 root.HH_RECORDS_VERTICAL_V1015=Object.freeze({version:'1015',formatTitle:formatted});
})(window,document);
