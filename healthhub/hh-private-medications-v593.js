/* HHSP1 v593 · Private medication editor and profile-scoped rendered additions.
 * No personal medication record is built into this public source.
 * Saves only on explicit user action, in the existing private-reference IndexedDB
 * and through the existing Dropbox /HealthHub/master/medications.json sync.
 */
(function(root){
'use strict';
var DB='healthhub-healthradar-v2',KEY='private-reference',PREVIEW='593';
var ROZUVA_INFO={
 purpose:'Koleszterincsökkentő gyógyszer. A rozuvasztatin elsősorban az LDL („rossz”) koleszterin szintjét csökkenti.',
 benefit:'Csökkentheti az érelmeszesedéshez kapcsolódó szív- és érrendszeri események kockázatát. A konkrét felírás okát csak a kezelőorvos tudja megerősíteni.',
 caution:'Szokatlan izomfájdalom, izomgyengeség vagy sötét vizelet esetén mielőbb kérjetek orvosi tanácsot. Az adagolást ne változtassátok meg önállóan.'
};
function current(){try{return root.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
function profileTitle(p){return p==='monika'?'Mónika':'Zsolt'}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function dbOpen(){return new Promise(function(ok,no){
 var q=indexedDB.open(DB,1);q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)};
})}
async function read(){
 var db=await dbOpen();try{
  if(!db.objectStoreNames.contains('meta'))throw new Error('A privát karton tárhelye még nem érhető el.');
  var x=await req(db.transaction('meta','readonly').objectStore('meta').get(KEY));
  return x&&x.payload?x.payload:null;
 }finally{db.close()}
}
async function savePayload(payload){
 var db=await dbOpen();
 try{
  if(!db.objectStoreNames.contains('meta'))throw new Error('A privát karton tárhelye még nem érhető el.');
  await new Promise(function(ok,no){
   var tx=db.transaction('meta','readwrite');
   tx.objectStore('meta').put({key:KEY,importedAt:new Date().toISOString(),payload:payload});
   tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.onabort=function(){no(tx.error||new Error('Mentés megszakadt'))};
  });
 }finally{db.close()}
}
function make(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function toast(txt){if(typeof root.toast==='function')root.toast(txt)}
function field(label,value,required){
 var wrap=make('label','hhMed593Field'),cap=make('span','',label),input=make('input','',null);
 input.type='text';input.value=value||'';input.required=!!required;input.autocomplete='off';
 wrap.appendChild(cap);wrap.appendChild(input);return {el:wrap,input:input}
}
function modal(){
 var existing=document.getElementById('hhMed593Overlay');if(existing)return existing;
 var overlay=make('div','hhMed593Overlay');overlay.id='hhMed593Overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-labelledby','hhMed593Title');
 var panel=make('section','hhMed593Panel');
 var head=make('div','hhMed593Head');
 head.appendChild(make('h2','', 'Privát gyógyszerkarton'));
 var close=make('button','hhMed593Close','×');close.type='button';close.setAttribute('aria-label','Bezárás');
 close.addEventListener('click',function(){overlay.hidden=true});head.appendChild(close);panel.appendChild(head);
 var body=make('div','hhMed593Body');body.id='hhMed593Body';panel.appendChild(body);overlay.appendChild(panel);
 overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.hidden=true});
 overlay.hidden=true;document.body.appendChild(overlay);
 return overlay;
}
function status(body,message,error){
 var out=body.querySelector('.hhMed593Status');if(!out){out=make('p','hhMed593Status');out.setAttribute('role','status');body.appendChild(out)}
 out.textContent=message;out.dataset.error=error?'1':'0';
}
function useInput(body,label,value,required){var o=field(label,value,required);body.appendChild(o.el);return o.input}
async function edit(id){
 var profile=current(),med=null;
 if(id){var x=await read(),a=(((x||{}).profiles||{})[profile]||{}).medications||[];
  med=a.find(function(y){return y&&String(y.id)===String(id)});if(!med)return;
 }
 var overlay=modal(),body=document.getElementById('hhMed593Body');body.replaceChildren();
 var title=make('div','hhMed593Kicker',profileTitle(profile)+' · privát gyógyszerbejegyzés');
 body.appendChild(title);
 var notice=make('p','hhMed593Note','Csak a kiválasztott profil helyi, privát kartonjába mentünk. A kezdési dátum és a napszak nem feltételezett.');
 body.appendChild(notice);
var name=useInput(body,'Gyógyszer neve',med&&med.name||'',true);
 var strength=useInput(body,'Hatáserősség',med&&med.strength||'',true);
 var schedule=useInput(body,'Adagolás',med&&(med.schedule||med.dose)||'',true);
 var ingredient=useInput(body,'Hatóanyag (ha ismert)',med&&med.activeIngredient||'',false);
 var purpose=useInput(body,'Mire való?',med&&med.purpose||'',false);
 var benefit=useInput(body,'Hogyan segít?',med&&med.benefit||'',false);
 var caution=useInput(body,'Fontos tudnivalók',med&&med.caution||'',false);
var row=make('div','hhMed593Actions'),cancel=make('button','hhMed593Secondary','Mégse');
 cancel.type='button';cancel.addEventListener('click',function(){overlay.hidden=true});
 var save=make('button','hhMed593Primary','Mentés · '+profileTitle(profile));
 save.type='button';
 row.appendChild(cancel);row.appendChild(save);body.appendChild(row);
 status(body,'A gyógyszer csak a Mentés gombbal kerül a privát kartonba.',false);
 var busy=false;
 save.addEventListener('click',async function(){
  if(busy)return;
  if(current()!==profile){status(body,'Közben megváltozott a profil. Nyisd meg ismét a szerkesztőt.',true);return}
  var n=name.value.trim(),s=strength.value.trim(),d=schedule.value.trim();
  if(!n||!s||!d){status(body,'Add meg a nevet, a hatáserősséget és az adagolást.',true);return}
  if(n.length>180||s.length>80||d.length>180){status(body,'Valamelyik mező túl hosszú.',true);return}
  busy=true;save.disabled=true;
  try{
   var ref=await read()||{schema:'healthhub-private-reference-v1',profiles:{}};
   if(!ref.profiles||typeof ref.profiles!=='object')throw new Error('A privát referencia formátuma nem megfelelő.');
   ref.profiles[profile]=ref.profiles[profile]||{};
   var list=ref.profiles[profile].medications;
   if(!Array.isArray(list))list=[];
   var old=med?list.find(function(x){return x&&String(x.id)===String(med.id)}):
     list.find(function(x){return x&&norm(x.name)===norm(n)&&norm(x.strength)===norm(s)});
   if(old&&!med&&!root.confirm('Ez a gyógyszer már szerepel a privát kartonban. Frissíted az adatlapját?')){
    status(body,'Nem módosítottam a meglévő gyógyszert.',false);return;
   }
   var at=new Date().toISOString(),entry=Object.assign({},old||{},{
    id:(old&&old.id)||('private-med-'+(root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():String(Date.now()))),
    name:n,strength:s,schedule:d,dose:d,activeIngredient:ingredient.value.trim(),
     purpose:purpose.value.trim(),benefit:benefit.value.trim(),caution:caution.value.trim(),
    status:(old&&old.status)||'aktuális',updatedAt:at,
    recordSource:'felhasználói rögzítés'
   });
   if(old){list=list.map(function(x){return x===old?entry:x})}else list=list.concat([entry]);
   ref.profiles[profile].medications=list;
   await savePayload(ref);
   try{
    root.dispatchEvent(new CustomEvent('healthhub:private-medications-saved',{detail:{profile:profile}}));
   }catch(_){}
   if(typeof root.hhRefreshLenaHealthContext289==='function'){
    try{await root.hhRefreshLenaHealthContext289(profile,'private-medications-saved')}
    catch(e){console.warn('Medication intelligence context refresh pending',e)}
   }
   status(body,'Helyi privát mentés kész. A felhőszinkron ellenőrzése folyamatban…',false);
   var cloudOk=false,cloudError='';
   try{
    var cloud=root.HH_DROPBOX_VAULT;
    if(cloud&&typeof cloud.connected==='function'&&cloud.connected()&&typeof root.hhMasterStructuredSync304==='function'){
      cloudOk=await root.hhMasterStructuredSync304(true)===true;
    }
   }catch(err){cloudError=String(err&&err.message||err)}
   status(body,cloudOk?'Mentve és Dropbox Vaultba szinkronizálva.':
     (cloudError?'Helyben mentve. A Dropbox szinkron hibája: '+cloudError:
       'Helyben mentve. A Dropbox mentését ellenőrizd, mielőtt másik készülékre váltasz.'),false);
   if(typeof root.renderHealthSection==='function')await root.renderHealthSection();
   toast('Privát gyógyszerbejegyzés elmentve.');
  }catch(err){status(body,'A privát gyógyszerbejegyzés nem menthető: '+String(err&&err.message||err),true)}
  finally{busy=false;save.disabled=false}
 });
 overlay.hidden=false;name.focus();
}
/* v655: manual, private seven-item list reconciliation. No personal medicines
 * are shipped in public JavaScript; the user selects a local JSON file.
 * All prior entries are archived inside the same private profile before replacement. */
function validateBatch(j){
 if(!j||j.schema!=='healthhub.private.medications-batch/1'||
  !['monika','zsolt'].includes(j.targetProfile)||
  !Array.isArray(j.medications)||j.medications.length!==7)
  throw new Error('A lista nem megfelelő hétgyógyszeres HealthHub csomag.');
 var names=new Set();
 j.medications.forEach(function(x){
  if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>180||
    names.has(norm(x.name))||typeof x.purpose!=='string'||!x.purpose.trim()||
    x.purpose.length>1000||typeof x.strength!=='string'||x.strength.length>80||
    typeof x.schedule!=='string'||x.schedule.length>180)
   throw new Error('Hibás vagy duplikált gyógyszertétel.');
  names.add(norm(x.name));
 });
 return j;
}
async function importBatchFile(file){
 if(!file||file.size>64*1024)throw new Error('A gyógyszerlista fájlja túl nagy.');
 var json=validateBatch(JSON.parse(await file.text())),profile=current();
 if(profile!==json.targetProfile)throw new Error('Nem a megfelelő profil van kiválasztva.');
 var summary=json.medications.map(function(x,i){return (i+1)+'. '+x.name}).join('\n');
 if(!root.confirm('A kiválasztott profil aktív gyógyszerlistája 7 tételre cserélődik.\n'+
   'A régieket PRIVÁT archívumban megőrizzük; Zsolt adatai érintetlenek.\n\n'+summary+
   '\n\nBiztosan cseréljük a nyilvántartást?'))return false;
 // Read the remote backup before replacement where available, to avoid
 // losing an entry that exists only in the Dropbox master.
 var remoteList=null,cloud=root.HH_DROPBOX_VAULT;
 if(cloud&&typeof cloud.connected==='function'&&cloud.connected()&&typeof cloud.downloadJson==='function'){
  try{
   var remote=await cloud.downloadJson('/HealthHub/master/medications.json');
   var remoteRef=remote&&remote.privateReference;
   remoteList=remoteRef&&remoteRef.profiles&&remoteRef.profiles[profile]&&remoteRef.profiles[profile].medications;
   }catch(e){
   if(!(e&&(e.status===409||e.status===404)))throw new Error('A Dropbox gyógyszeradatok biztonsági olvasása sikertelen: '+String(e.message||e));
  }
 }
 var ref=await read()||{schema:'healthhub-private-reference-v1',profiles:{}};
 if(!ref.profiles||typeof ref.profiles!=='object')throw new Error('A privát gyógyszerkarton szerkezete hibás.');
 var pp=ref.profiles[profile]||{},archive=Array.isArray(pp.medicationListArchives)?pp.medicationListArchives:[];
 var stamp=new Date().toISOString(),previous=Array.isArray(pp.medications)?pp.medications:[];
 archive.push({createdAt:stamp,reason:'user-confirmed-list-rebuild',medications:JSON.parse(JSON.stringify(previous))});
 if(Array.isArray(remoteList)&&JSON.stringify(remoteList)!==JSON.stringify(previous))
  archive.push({createdAt:stamp,reason:'remote-list-before-rebuild',medications:JSON.parse(JSON.stringify(remoteList))});
 pp.medicationListArchives=archive;
 pp.medications=json.medications.map(function(x){
  return {id:'private-med-'+(root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():String(Date.now())+'-'+Math.random()),
   name:x.name.trim(),strength:x.strength.trim(),schedule:x.schedule.trim(),dose:x.schedule.trim(),
   activeIngredient:String(x.activeIngredient||'').trim(),purpose:x.purpose.trim(),benefit:String(x.benefit||'').trim(),
   caution:String(x.caution||'').trim(),status:'aktuális',updatedAt:stamp,
   recordSource:'felhasználó által jóváhagyott lista',verifiedPrescription:false};
 });
 ref.profiles[profile]=pp;
 await savePayload(ref);
 try{root.dispatchEvent(new CustomEvent('healthhub:private-medications-saved',{detail:{profile:profile}}))}catch(_){}
 if(typeof root.hhRefreshLenaHealthContext289==='function')
  try{await root.hhRefreshLenaHealthContext289(profile,'medications-list-rebuilt')}catch(_){}
 var cloudOk=false,cloudReason='';
 if(cloud&&typeof cloud.connected==='function'&&cloud.connected()&&typeof root.hhMasterStructuredSync304==='function'){
  try{cloudOk=await root.hhMasterStructuredSync304(true)===true}catch(e){cloudReason=String(e.message||e)}
 }
 var after=await read(),saved=((((after||{}).profiles||{})[profile]||{}).medications)||[];
 if(saved.length!==7||saved.some(function(x,i){return norm(x.name)!==norm(json.medications[i].name)}))
  throw new Error('A szinkronizálás után a gyógyszerlista eltér. Visszaállítás/ellenőrzés szükséges.');
 if(typeof root.renderHealthSection==='function')await root.renderHealthSection();
 var message=cloudOk?'7 gyógyszer mentve, a Dropbox szinkronizálva.':
  '7 gyógyszer helyben mentve, de a Dropbox nem igazolt! '+cloudReason;
 toast(message);return {saved:7,cloudOk:cloudOk,archived:archive.length};
}
function openBatchImport(){
 var input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.style.display='none';document.body.appendChild(input);
 input.addEventListener('change',async function(){
  var file=input.files&&input.files[0];if(input.remove)input.remove();
  if(!file)return;
  try{await importBatchFile(file)}catch(e){console.error('Gyógyszerlista import',e);toast('Gyógyszerlista import hiba: '+String(e.message||e))}
 });
 input.click();
}

function appendCard(parent,m){
 var row=make('div','hrRow clickable hhMed593Record');row.dataset.hhPrivateMed='1';row.dataset.hhMedId=String(m.id);
 row.setAttribute('role','button');row.tabIndex=0;
 row.appendChild(make('div','hrIco','💊'));
 var main=make('div','hhMed593RecordText');
 main.appendChild(make('b','',m.name||'Ismeretlen gyógyszer'));
 main.appendChild(make('small','', [m.strength||'',m.schedule||m.dose||'','felhasználói rögzítés'].filter(Boolean).join(' · ')));
 row.appendChild(main);
 var tag=make('span','hrTag',m.status||'nem ellenőrzött');row.appendChild(tag);
  var why=make('button','hhMedPurposeBtn','Mire való?');why.type='button';
  why.addEventListener('click',function(e){e.stopPropagation();if(typeof root.hhMedicationPurpose==='function')root.hhMedicationPurpose(m.name)});
  row.appendChild(why);
 row.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('button'))return;edit(m.id)});
 row.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();edit(m.id)}});
 parent.appendChild(row);return row;
}
async function augment(){
 if(root.healthSectionKind!=='medications')return;
 var container=document.getElementById('healthSubContent');if(!container)return;
 var card=Array.from(container.querySelectorAll('.hrSectionCard')).find(function(e){
  return !!e.querySelector('.hrRow[onclick*="medication"]')||
   !!e.querySelector('.hrRow[data-hh-private-med]')||
   /gyógyszer/i.test((e.querySelector('h2,h3,h4')||{}).textContent||'');
 });
 if(!card){card=make('section','hrSectionCard');card.appendChild(make('h3','','💊 Gyógyszerek'));container.appendChild(card)}
 // Suppress every obsolete migration/demo medication row before constructing
 // the one true list from the current profile's private reference.
 if(current()==='monika')Array.from(card.querySelectorAll('.hrRow[onclick*="medication"]')).forEach(function(x){
  if(x.dataset&&x.dataset.hhPrivateMed==='1')return;
  if(typeof x.remove==='function')x.remove();
 });
 if(card.querySelector('.hhMed593Add'))return;
 var button=make('button','hhMed593Add hhMed657Add','💊 Gyógyszerek · ＋ Hozzáadás');
 button.type='button';button.setAttribute('aria-label','Új gyógyszer hozzáadása');
 button.addEventListener('click',function(){edit()});
 card.insertBefore(button,card.querySelector('.hrRow,.hhRsmToolbar,.hhRsmTrack'));
 try{
  var payload=await read(),profile=current(),a=((((payload||{}).profiles||{})[profile]||{}).medications)||[];
  if(!Array.isArray(a))return;
  if(a.some(function(x){return x&&x.name})){
   Array.from(card.querySelectorAll('.hrEmpty')).forEach(function(x){if(x.remove)x.remove()});
  }
  var rendered=Array.from(card.querySelectorAll('.hrRow b')).map(function(x){return norm(x.textContent)});
  a.forEach(function(m){
   if(!m||!m.name||!m.id||rendered.includes(norm(m.name)))return;
   appendCard(card,m);rendered.push(norm(m.name));
  });
 }catch(e){console.warn('Privát gyógyszerkártyák most nem olvashatók.',e)}
}
var visual=document.createElement('link');visual.rel='stylesheet';visual.href='./hh-private-medications-v593.css?v=657-single-add-compact';document.head.appendChild(visual);
var previous=root.renderHealthSection;
if(typeof previous==='function')root.renderHealthSection=async function(){
 var res=await previous.apply(this,arguments);await augment();return res;
};
root.HH_PRIVATE_MEDICATIONS_V593=Object.freeze({edit:edit,open:edit,version:PREVIEW,augment:augment,importBatchFile:importBatchFile,openBatchImport:openBatchImport});
})(window);
