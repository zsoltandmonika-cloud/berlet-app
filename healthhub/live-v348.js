(function(){
'use strict';
/* HealthHub Ask Léna v348: symptom-diary modal uses shared dictionary categories.
 * Options are copied only from same-device existing diary UI or synced symptoms.json
 * dictionary cache; unknown options are never fabricated. */
var KEYS=[
 {id:'symptom',label:'🩺 Tünet',aliases:['symptoms','symptom','tunetek','tunet','tünetek','tünet']},
 {id:'site',label:'📍 Hely / jelleg',aliases:['location','locations','site','sites','jellegek','helyjelleg','hely','jelleg','character']},
 {id:'remedy',label:'🌿 Gyógymód / teendő',aliases:['remedies','remedy','gyogymodok','gyogymod','teendok','teendo','interventions','treatments']},
 {id:'medication',label:'💊 Eseti gyógyszer',aliases:['occasionalmedications','episodicmedications','medications','medication','esetigyogyszerek','esetigyogyszer','gyogyszerek','gyogyszer']},
 {id:'dose',label:'💧 Dózis',aliases:['dosages','dosage','doses','dose','dozisok','dozis']},
 {id:'outcome',label:'✅ Kimenetel / hatás',aliases:['outcomes','outcome','effects','effect','kimenetelek','kimenetel','hatasok','hatas']},
 {id:'latency',label:'⏱️ Hatásidő',aliases:['effecttimes','effecttime','latencies','latency','hatasidok','hatasido','duration']}
];
function get(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function norm(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function cleanItems(x){
 if(!Array.isArray(x))return [];
 var out=[],seen=new Set();
 x.forEach(function(e){
  if(e==null||typeof e==='boolean')return;
  if(e&&typeof e==='object'&&(e.deleted||e.deletedAt||e.isDeleted||e.hidden))return;
  var s=typeof e==='string'||typeof e==='number'?String(e):
   e&&typeof e==='object'?String(e.label||e.name||e.title||e.text||e.value||''):'';
  s=s.trim();if(!s||s.length>90||seen.has(norm(s)))return;
  seen.add(norm(s));out.push(s);
 });
 return out.slice(0,150);
}
function collectDictionaries(){
 var lists={};KEYS.forEach(function(k){lists[k.id]=[]});
 var found=false,sources=[];
 function merge(k,items,source){
  var clean=cleanItems(items);
  if(!clean.length)return;
  var existing=new Set(lists[k.id].map(norm));
  clean.forEach(function(s){if(!existing.has(norm(s))){lists[k.id].push(s);existing.add(norm(s))}});
  found=true;if(sources.indexOf(source)<0)sources.push(source);
 }
 function walk(root,source,depth){
  if(depth>5||!root||typeof root!=='object')return;
  if(Array.isArray(root)){
   root.slice(0,120).forEach(function(item){
    if(!item||typeof item!=='object'||Array.isArray(item))return;
    var group=norm(item.key||item.id||item.category||item.type||item.name);
    KEYS.forEach(function(k){
     if(!k.aliases.some(function(alias){return norm(alias)===group}))return;
     ['values','items','options','entries','base','custom','defaults','builtin','user','system'].forEach(function(field){
      if(Array.isArray(item[field]))merge(k,item[field],source);
     });
    });
   });
   return;
  }
  Object.keys(root).forEach(function(prop){
   var val=root[prop],key=norm(prop);
   KEYS.forEach(function(k){
    if(k.aliases.some(function(a){return norm(a)===key})){
     if(Array.isArray(val))merge(k,val,source);
     else if(val&&typeof val==='object'){
      ['values','items','options','entries','base','custom','defaults','builtin','user','system'].forEach(function(n){
       if(Array.isArray(val[n]))merge(k,val[n],source);
      });
     }
    }
   });
   if(val&&typeof val==='object'&&
      /^(dictionaries|dictionary|szotarak|szotar|vocabulary|vocab|options|dropdowns|selectoptions|lists|lookup|lookups|catalog|catalogs|settings|data|symptoms|definitions|categories|groups|fields|collections|payload|master)$/.test(key)){
     walk(val,source,depth+1);
   }
  });
 }
 // Prefer the same synced dictionary already in the browser, not a separately maintained list.
 ['HH_SYMPTOM_DICTIONARY','HH_SYMPTOMS','hhSymptomDictionary','hhSymptoms','healthhubSymptomDictionary'].forEach(function(key){
  try{walk(window[key],key,0)}catch(e){}
 });
 try{
  for(var i=0;i<localStorage.length;i++){
   var key=localStorage.key(i);
   if(!/symptom|tunet|tünet|szotar|szótár|diary|vocab/i.test(key||''))continue;
   var raw=localStorage.getItem(key);
   if(!raw||raw.length>2000000)continue;
   try{walk(JSON.parse(raw),key,0)}catch(e){}
  }
 }catch(e){}
 // The already-rendered diary select controls may be available in a hidden page.
 try{
  document.querySelectorAll('select').forEach(function(select){
   if(select.closest('#hhLenaJournal344'))return;
   var label=select.closest('label');
   var identify=norm([select.id,select.name,select.getAttribute('aria-label'),select.dataset.category,
       label&&label.textContent,select.parentNode&&select.parentNode.querySelector('label')&&select.parentNode.querySelector('label').textContent].filter(Boolean).join(' '));
   KEYS.forEach(function(k){
    if(k.aliases.some(function(a){return identify.indexOf(norm(a))>=0})){
     var opts=Array.from(select.options||[]).filter(function(o){return !o.disabled&&o.value&&o.textContent.trim()}).map(function(o){return o.textContent.trim()});
     merge(k,opts,'Eseti napló');
    }
   });
  });
 }catch(e){}
 return {lists:lists,found:found,sources:sources};
}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function labeled(labelText,child){var l=el('label','hhLena348Label');var b=el('span',null,labelText);l.append(b,child);return l}
function dateLocal(){var d=new Date();var local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
function insertForm(event){
 var data=event&&event.detail;
 if(!data||!data.successful||data.profile!==profile()||typeof data.question!=='string')return;
 var journal=get('hhLenaJournal344');
 if(!journal)return;
 var old=journal.querySelector('.hhLenaJournalForm344');if(!old)return;
 var trigger=journal.querySelector('button'),intro=journal.querySelector('p'),small=journal.querySelector('small');
 if(!trigger||!intro)return;
 var shared=collectDictionaries();
 var form=el('div','hhLenaJournalForm344 hhLenaJournalForm348');form.hidden=true;
 var grid=el('div','hhLenaGrid348'),controls={};
 KEYS.forEach(function(k){
  var wrap=el('div','hhLenaField348');
  var select=el('select','hhLenaSelect348');
  select.setAttribute('aria-label',k.label);
  var first=el('option',null,'Válassz…');first.value='';select.appendChild(first);
  (shared.lists[k.id]||[]).forEach(function(v){var option=el('option',null,v);option.value=v;select.appendChild(option)});
  var manual=el('option',null,'✏️ Saját érték megadása');manual.value='__custom__';select.appendChild(manual);
  var custom=el('input','hhLenaCustom348');custom.placeholder='Saját érték';custom.maxLength=95;custom.hidden=true;
  select.addEventListener('change',function(){custom.hidden=select.value!=='__custom__';if(!custom.hidden)custom.focus()});
  wrap.append(labeled(k.label,select),custom);
  controls[k.id]={select:select,custom:custom};
  grid.appendChild(wrap);
 });
 form.appendChild(grid);
 var when=el('input');when.type='datetime-local';when.value=dateLocal();
 var severity=el('select');var first=el('option',null,'Nem adom meg');first.value='';severity.append(first);
 for(var n=0;n<=10;n++){var o=el('option',null,n+'/10');o.value=String(n);severity.append(o)}
 var row=el('div','hhLenaGrid348 hhLenaGridSmall348');
 row.append(labeled('📅 Időpont',when),labeled('🎚️ Erősség',severity));
 form.appendChild(row);
 var row2=el('div','hhLenaGrid348 hhLenaGridSmall348');
 var pressure=el('input');pressure.type='text';pressure.placeholder='pl. 120/80';pressure.inputMode='text';pressure.maxLength=7;
 var pulse=el('input');pulse.type='number';pulse.min='20';pulse.max='220';pulse.placeholder='pl. 70';
 row2.append(labeled('❤️ Vérnyomás (ha mértétek)',pressure),labeled('💓 Pulzus (ha mértétek)',pulse));
 form.appendChild(row2);
 var desc=el('textarea');desc.rows=2;desc.maxLength=350;desc.value=data.question.trim().slice(0,350);
 var extra=el('textarea');extra.rows=2;extra.maxLength=500;extra.placeholder='Mi történt, mi javított vagy rontott rajta?';
 form.append(labeled('📝 Tünet / saját leírás',desc),labeled('💬 Megjegyzés (opcionális)',extra));
 var buttons=el('div','hhLenaJournalActions344');
 var save=el('button','hhLenaJournalSave344','💗 Mentés a tünetnaplóba');save.type='button';
 var cancel=el('button',null,'Mégsem');cancel.type='button';buttons.append(save,cancel);form.append(buttons);
 var status=el('small','hhLena348Status');
 var loadStatus=shared.found?'📚 A készüléken elérhető tünetnapló-szótár választható elemeivel.':
   'ℹ️ A központi symptoms.json szótár még nincs betöltve erre a készülékre; a mezők saját értékkel kitölthetők.';
 status.textContent=loadStatus;
 old.replaceWith(form);
 if(small)small.textContent='A mentés csak jóváhagyással történik, az aktív profil helyi naplójába. A központi szinkron külön ellenőrzendő.';
 journal.insertBefore(status,form.nextSibling);
 var hasOpen=false;
 trigger.addEventListener('click',function(ev){
  // The legacy one-click opener remains registered; prevent its old form mutation only through replacement.
  form.hidden=false;trigger.hidden=true;hasOpen=true;
 });
 cancel.addEventListener('click',function(){form.hidden=true;trigger.hidden=false});
 function selected(id){var c=controls[id];return c.select.value==='__custom__'?c.custom.value.trim():c.select.value.trim()}
 save.addEventListener('click',function(){
  if(data.profile!==profile()){status.textContent='⚠️ A profil megváltozott. Újra kell indítani az ajánlatot.';return}
  var symptom=selected('symptom')||desc.value.trim();
  if(symptom.length<3){desc.focus();return}
  var level=severity.value===''?'':Number(severity.value);
  var bp=pressure.value.trim();if(bp&&!/^[0-9]{2,3} ?\/ ?[0-9]{2,3}$/.test(bp)){status.textContent='⚠️ A vérnyomás formátuma például 120/80.';pressure.focus();return}
  var pulseValue=pulse.value.trim();if(pulseValue&&(!Number.isInteger(Number(pulseValue))||Number(pulseValue)<20||Number(pulseValue)>220)){status.textContent='⚠️ Ellenőrizd a pulzus értékét.';pulse.focus();return}
  var time=new Date(when.value||Date.now());if(Number.isNaN(+time)){status.textContent='⚠️ Ellenőrizd az időpontot.';return}
  var key='hh-symptom-journal-v1',o;
  try{o=JSON.parse(localStorage.getItem(key)||'{"events":[]}')}catch(e){status.textContent='⚠️ A meglévő napló nem olvasható. Nem írtam felül.';return}
  if(!o||typeof o!=='object'||Array.isArray(o)||!Array.isArray(o.events)){status.textContent='⚠️ A meglévő napló formátuma nem megfelelő. Nem írtam felül.';return}
  var stamp=new Date().toISOString(),id='asklena-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  var rec={id:id,profile:data.profile,eventAt:time.toISOString(),createdAt:stamp,source:'ask-lena',
   symptom:symptom,site:selected('site'),location:selected('site'),character:selected('site'),
   severity:level,remedy:selected('remedy'),action:selected('remedy'),
   medication:selected('medication'),dose:selected('dose'),
   outcome:selected('outcome'),effect:selected('outcome'),effectTime:selected('latency'),
   bloodPressure:bp,pulse:pulseValue?Number(pulseValue):null,notes:extra.value.trim(),
   description:desc.value.trim()};
  try{
   o.events.push(rec);localStorage.setItem(key,JSON.stringify(o));
   try{window.dispatchEvent(new CustomEvent('healthhub:symptom-journal-changed',{detail:{profile:data.profile,eventId:id}}))}catch(e){}
   intro.textContent='✅ Rögzítettem az eseti tünetnaplóba.';
   trigger.remove();form.remove();status.textContent='A következő kutatás már figyelembe veheti a mentett bejegyzést. A központi szinkront külön ellenőrizni kell.';
  }catch(e){status.textContent='⚠️ Nem sikerült elmenteni, a meglévő naplót nem módosítottam.'}
 });
}
window.addEventListener('healthhub:ask-lena-complete',insertForm);
document.documentElement.dataset.healthhubAskLenaDiary='348';
if(!get('hhLena348CSS')){
 var css=el('style');css.id='hhLena348CSS';
 css.textContent=[
 '#hhLenaSmart299 .hhLenaJournalForm348[hidden],#hhLenaSmart299 .hhLenaCustom348[hidden]{display:none!important}',
 '#hhLenaSmart299 .hhLenaJournalForm348{display:grid;gap:11px}',
 '#hhLenaSmart299 .hhLenaGrid348{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
 '#hhLenaSmart299 .hhLenaGrid348 .hhLenaField348{min-width:0}',
 '#hhLenaSmart299 .hhLenaForm348 label,#hhLenaSmart299 .hhLenaField348 label{display:grid;gap:5px;min-width:0}',
 '#hhLenaSmart299 .hhLenaSelect348{box-sizing:border-box;width:100%;min-width:0;max-width:100%;min-height:43px;padding:9px;border:1px solid var(--lena-ui-border);border-radius:10px;background:#fff;color:#314b5c;font:500 13px system-ui}',
 '#hhLenaSmart299 .hhLenaJournal344 .hhLenaCustom348{margin-top:6px}',
 '#hhLenaSmart299 .hhLenaJournal344 .hhLena348Status{display:block;margin-top:8px;color:#667d90;font-size:11px}',
 '@media(max-width:420px){#hhLenaSmart299 .hhLenaGrid348{grid-template-columns:1fr}}'
 ].join('');document.head.appendChild(css);
}
})();