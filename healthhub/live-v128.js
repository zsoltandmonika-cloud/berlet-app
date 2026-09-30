(function(){
'use strict';

var DB='healthhub-healthradar-v2';
var CATS={
 cardiology:'Kardiológia',laboratory:'Labor',emergency:'Sürgősségi ellátás / mentés',
 urology:'Urológia',psychiatry:'Pszichiátria',ent:'Fül-orr-gégészet',
 orthopedics:'Ortopédia / kézsebészet',rheumatology:'Reumatológia',
 endocrinology:'Endokrinológia',ophthalmology:'Szemészet',
 occupational:'Foglalkozás-egészségügy',vaccination:'Oltás',general:'Általános / egyéb'
};
var ALLOWED=['pdf','jpg','jpeg','png','heic','heif'];
var MIME={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif'};
var MAX_FILE=50*1024*1024,MAX_ZIP=200*1024*1024;
var st=window.hhDocState||{profile:null,category:'all',from:'',to:'',sort:'newest',showAll:false};
window.hhDocState=st;

function toastMsg(s){try{if(window.toast)window.toast(s)}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function ext(n){var a=String(n||'').split('.');return (a.pop()||'').toLowerCase()}
function fmtDate(s){if(!s)return '';var d=new Date(String(s).indexOf('T')>=0?s:s+'T00:00:00');return isNaN(d.getTime())?String(s):new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric'}).format(d)}
function row(icon,title,sub,tag,click){return '<div class="hrRow'+(click?' clickable':'')+'"'+(click?' onclick="'+click+'"':'')+'><div class="hrIco">'+icon+'</div><div><b>'+esc(title)+'</b><small>'+esc(sub||'')+'</small></div>'+(tag?'<span class="hrTag">'+esc(tag)+'</span>':'')+'</div>'}

function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function all(store){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).getAll())}finally{db.close()}}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function put(store,val){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).put(val))}finally{db.close()}}
async function meta(){try{return await one('meta','full-migration')}catch(e){return null}}

async function sha256(buf){var h=await crypto.subtle.digest('SHA-256',buf);return Array.from(new Uint8Array(h),function(x){return x.toString(16).padStart(2,'0')}).join('')}
function inferCat(name){
 var t=norm(name);
 if(/(kardio|sziv|ritmus|crt|ekg)/.test(t))return 'cardiology';
 if(/(labor|vervetel|vizelet)/.test(t))return 'laboratory';
 if(/(omsz|mento|surgossegi|esetlap)/.test(t))return 'emergency';
 if(/(urolog|hugy)/.test(t))return 'urology';
 if(/(pszich|panik|depress)/.test(t))return 'psychiatry';
 if(/(ful|orr|gege|sinus)/.test(t))return 'ent';
 if(/(szemesz|latavizsgal|retina)/.test(t))return 'ophthalmology';
 if(/(ortoped|kezseb|pattano)/.test(t))return 'orthopedics';
 if(/(reumat|vall|izuleti)/.test(t))return 'rheumatology';
 if(/(endokrin|pajzsmirigy|tsh)/.test(t))return 'endocrinology';
 if(/(foglalkoz|alkalmass)/.test(t))return 'occupational';
 if(/(oltas|covid|vakcina)/.test(t))return 'vaccination';
 return 'general';
}
function inferDate(name){var m=String(name||'').match(/(20\d{2})[-_. ]?(0[1-9]|1[0-2])[-_. ]?([0-2]\d|3[01])/);return m?m[1]+'-'+m[2]+'-'+m[3]:''}

async function ensureHashes(){
 var docs=await all('documents'),blobs=await all('documentBlobs'),bm=new Map(blobs.map(function(x){return [x.id,x.blob]}));
 for(var i=0;i<docs.length;i++){var d=docs[i];if(d.sha256)continue;var b=bm.get(d.id);if(!b)continue;d.sha256=await sha256(await b.arrayBuffer());await put('documents',d)}
}
async function hashSet(){await ensureHashes();return new Set((await all('documents')).map(function(x){return x.sha256}).filter(Boolean))}

function u16(b,o){return b[o]|(b[o+1]<<8)}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
async function inflateRaw(bytes){
 if(typeof DecompressionStream!=='function')throw new Error('A böngésző ezen a készüléken nem tud ZIP-et kibontani.');
 var ds=new DecompressionStream('deflate-raw');
 return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
}
async function unzip(file){
 var b=new Uint8Array(await file.arrayBuffer()),eocd=-1;
 for(var i=Math.max(0,b.length-65557);i<=b.length-22;i++)if(u32(b,i)===0x06054b50)eocd=i;
 if(eocd<0)throw new Error('A ZIP fájl nem olvasható.');
 var count=u16(b,eocd+10),off=u32(b,eocd+16),out=[],total=0;
 for(i=0;i<count;i++){
  if(u32(b,off)!==0x02014b50)throw new Error('A ZIP könyvtára sérült.');
  var method=u16(b,off+10),csize=u32(b,off+20),usize=u32(b,off+24),nlen=u16(b,off+28),xlen=u16(b,off+30),clen=u16(b,off+32),lho=u32(b,off+42);
  var name=new TextDecoder().decode(b.slice(off+46,off+46+nlen));off+=46+nlen+xlen+clen;
  if(name.slice(-1)==='/'||name.indexOf('__MACOSX')>=0)continue;
  var e=ext(name);if(ALLOWED.indexOf(e)<0||usize>MAX_FILE)continue;
  total+=usize;if(total>MAX_ZIP)throw new Error('A ZIP kibontott mérete meghaladja a 200 MB-os biztonsági határt.');
  var ln=u16(b,lho+26),lx=u16(b,lho+28),start=lho+30+ln+lx,comp=b.slice(start,start+csize),raw;
  if(method===0)raw=comp;else if(method===8)raw=await inflateRaw(comp);else continue;
  out.push(new File([raw],name.split('/').pop(),{type:MIME[e]||'application/octet-stream',lastModified:file.lastModified}));
 }
 return out;
}
async function normalizeFiles(list){
 var out=[],skipped=0;
 for(var i=0;i<list.length;i++){var f=list[i],e=ext(f.name);if(e==='zip'){out=out.concat(await unzip(f));continue}if(ALLOWED.indexOf(e)<0||f.size>MAX_FILE){skipped++;continue}out.push(f)}
 return {files:out,skipped:skipped};
}

function ensureTool(){
 if(document.getElementById('hhDocToolOverlay'))return;
 var o=document.createElement('div');o.id='hhDocToolOverlay';o.className='hrDetailOverlay';
 o.onclick=function(e){if(e.target===o)o.classList.remove('on')};
 o.innerHTML='<div class="hrDetailSheet"><div class="hrSheetHandle"></div><button class="hrClose" onclick="document.getElementById(\'hhDocToolOverlay\').classList.remove(\'on\')">×</button><div id="hhDocToolContent"></div></div>';
 document.body.appendChild(o);
}
function showTool(html){ensureTool();document.getElementById('hhDocToolContent').innerHTML=html;document.getElementById('hhDocToolOverlay').classList.add('on')}

window.hhOpenDocFilters=function(){
 var opts=Object.keys(CATS).map(function(k){return '<option value="'+k+'"'+(st.category===k?' selected':'')+'>'+esc(CATS[k])+'</option>'}).join('');
 var p=st.profile||pkey();
 showTool('<h2>Dokumentumszűrők</h2><div class="hrDetailMeta">Profil, kategória és dátum szerint</div>'+
 '<label><h4>Profil</h4><select id="hhDfProfile" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"><option value="all"'+(p==='all'?' selected':'')+'>Mindkettő</option><option value="zsolt"'+(p==='zsolt'?' selected':'')+'>Zsolt</option><option value="monika"'+(p==='monika'?' selected':'')+'>Mónika</option></select></label>'+
 '<label><h4>Kategória</h4><select id="hhDfCategory" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"><option value="all">Mind</option>'+opts+'</select></label>'+
 '<div class="hrStatGrid"><label><h4>Dátumtól</h4><input id="hhDfFrom" type="date" value="'+esc(st.from)+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label><label><h4>Dátumig</h4><input id="hhDfTo" type="date" value="'+esc(st.to)+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label></div>'+
 '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhApplyDocFilters()">Alkalmazás</button><button class="vaultBtn" onclick="hhClearDocFilters()">Szűrők törlése</button></div>');
};
window.hhApplyDocFilters=function(){
 st.profile=document.getElementById('hhDfProfile').value;st.category=document.getElementById('hhDfCategory').value;
 st.from=document.getElementById('hhDfFrom').value;st.to=document.getElementById('hhDfTo').value;st.showAll=false;
 document.getElementById('hhDocToolOverlay').classList.remove('on');window.renderHealthSection();
};
window.hhClearDocFilters=function(){st.profile=pkey();st.category='all';st.from='';st.to='';st.showAll=false;document.getElementById('hhDocToolOverlay').classList.remove('on');window.renderHealthSection()};
window.hhToggleDocSort=function(){st.sort=st.sort==='newest'?'oldest':'newest';st.showAll=false;window.renderHealthSection()};
window.hhShowAllDocs=function(){st.showAll=true;window.renderHealthSection()};

function ensureUpload(){
 if(document.getElementById('hhDocumentUploadInput'))return;
 var i=document.createElement('input');i.id='hhDocumentUploadInput';i.type='file';i.multiple=true;i.accept='.pdf,.jpg,.jpeg,.png,.heic,.heif,.zip';i.style.display='none';
 i.onchange=async function(e){var fs=Array.from(e.target.files||[]);e.target.value='';if(fs.length)window.hhPrepareDocumentUpload(fs)};
 document.body.appendChild(i);
}
window.hhOpenDocumentUpload=function(){ensureUpload();document.getElementById('hhDocumentUploadInput').click()};

window.hhPrepareDocumentUpload=async function(input){
 try{
  toastMsg('Fájlok előkészítése…');var r=await normalizeFiles(input);if(!r.files.length){toastMsg('Nincs támogatott feltölthető fájl.');return}
  window.hhPendingDocFiles=r.files;var first=r.files[0],ad=inferDate(first.name),ac=inferCat(first.name);
  var opts=Object.keys(CATS).map(function(k){return '<option value="'+k+'"'+(ac===k?' selected':'')+'>'+esc(CATS[k])+'</option>'}).join('');
  showTool('<h2>Új lelet feltöltése</h2><div class="hrDetailMeta">'+r.files.length+' fájl előkészítve'+(r.skipped?' · '+r.skipped+' kihagyva':'')+'</div>'+
   '<label><h4>Profil</h4><select id="hhDuProfile" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"><option value="zsolt"'+(pkey()==='zsolt'?' selected':'')+'>Zsolt</option><option value="monika"'+(pkey()==='monika'?' selected':'')+'>Mónika</option></select></label>'+
   '<label><h4>Kategória</h4><select id="hhDuCategory" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px">'+opts+'</select></label>'+
   '<label><h4>Dokumentum dátuma</h4><input id="hhDuDate" type="date" value="'+ad+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px"></label>'+
   '<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:10px;color:#526d82"><input id="hhDuAuto" type="checkbox"'+(r.files.length>1?' checked':'')+'> Több fájlnál automatikus dátum- és kategóriafelismerés</label>'+
   '<p class="privacyNote">PDF, JPG, PNG, HEIC és ZIP támogatott. Valódi másolatot SHA-256 alapján kihagyunk.</p>'+
   '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhCommitDocumentUpload()">'+r.files.length+' fájl mentése</button><button class="vaultBtn" onclick="document.getElementById(\'hhDocToolOverlay\').classList.remove(\'on\')">Mégse</button></div>');
 }catch(e){console.error(e);toastMsg(e.message||'A fájlok nem készíthetők elő.')}
};

window.hhCommitDocumentUpload=async function(){
 var files=window.hhPendingDocFiles||[];if(!files.length)return;
 var profile=document.getElementById('hhDuProfile').value,fcat=document.getElementById('hhDuCategory').value,fdate=document.getElementById('hhDuDate').value,auto=document.getElementById('hhDuAuto').checked;
 try{
  document.getElementById('hhDocToolOverlay').classList.remove('on');toastMsg('Duplikátumellenőrzés és mentés…');
  var hashes=await hashSet(),added=0,dup=0,failed=0;
  for(var i=0;i<files.length;i++){
   try{
    var f=files[i],buf=await f.arrayBuffer(),hash=await sha256(buf);if(hashes.has(hash)){dup++;continue}
    var id=crypto.randomUUID(),cat=auto?inferCat(f.name):fcat,date=auto?(inferDate(f.name)||fdate):fdate;
    var doc={id:id,profile:profile,category:cat,sourceType:'original',documentDate:date||null,originalName:f.name,contentType:f.type||MIME[ext(f.name)]||'application/octet-stream',sizeBytes:f.size,uploadedAt:new Date().toISOString(),sha256:hash};
    var db=await openDb();
    await new Promise(function(ok,no){var tx=db.transaction(['documents','documentBlobs'],'readwrite');tx.objectStore('documents').put(doc);tx.objectStore('documentBlobs').put({id:id,blob:new Blob([buf],{type:doc.contentType})});tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.onabort=function(){no(tx.error)}});
    db.close();hashes.add(hash);added++;
   }catch(ex){console.error(ex);failed++}
  }
  window.hhPendingDocFiles=[];toastMsg(added+' új lelet elmentve'+(dup?', '+dup+' másolat kihagyva':'')+(failed?', '+failed+' hiba':'')+'.');
  st.profile=profile;st.showAll=false;await window.renderHealthSection();if(window.hhSyncFullMigrationDashboard)window.hhSyncFullMigrationDashboard();
 }catch(e){console.error(e);toastMsg('Feltöltési hiba: '+(e.message||e))}
};

window.hhOpenDocumentDetail=async function(id){
 var d=await one('documents',id);if(!d)return;
 var opts=Object.keys(CATS).map(function(k){return '<option value="'+k+'"'+(d.category===k?' selected':'')+'>'+esc(CATS[k])+'</option>'}).join('');
 var o=document.getElementById('hrDetailOverlay'),c=document.getElementById('hrDetailContent');if(!o||!c)return;
 c.innerHTML='<h2>'+esc(d.originalName)+'</h2><div class="hrDetailMeta">'+esc(pname(d.profile))+' · '+esc(CATS[d.category]||d.category||'')+' · '+esc(fmtDate(d.documentDate))+'</div>'+
 '<div class="vaultTools"><button class="vaultBtn primary" onclick="openHrDocument(\''+d.id+'\')">Megnyitás</button><button class="vaultBtn" onclick="hhPrintDocument(\''+d.id+'\')">Nyomtatás</button></div>'+
 '<h4>Dokumentum adatai</h4><label><small>Dokumentumnév</small><input id="hhDeName" value="'+esc(d.originalName)+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px;margin-top:4px"></label>'+
 '<div class="hrStatGrid" style="margin-top:9px"><label><small>Profil</small><select id="hhDeProfile" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px;margin-top:4px"><option value="zsolt"'+(d.profile==='zsolt'?' selected':'')+'>Zsolt</option><option value="monika"'+(d.profile==='monika'?' selected':'')+'>Mónika</option></select></label><label><small>Dátum</small><input id="hhDeDate" type="date" value="'+esc(d.documentDate||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px;margin-top:4px"></label></div>'+
 '<label><small>Kategória</small><select id="hhDeCategory" style="width:100%;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 8px;margin-top:4px">'+opts+'</select></label>'+
 '<button class="vaultBtn primary" style="width:100%;margin-top:10px" onclick="hhSaveDocumentMeta(\''+d.id+'\')">Adatok mentése</button><p class="privacyNote">A fájl tartalma változatlan marad, csak a kereshető metaadatok módosulnak.</p>';
 o.classList.add('on');
};
window.hhSaveDocumentMeta=async function(id){
 var d=await one('documents',id);if(!d)return;
 d.originalName=(document.getElementById('hhDeName').value||d.originalName).trim();d.profile=document.getElementById('hhDeProfile').value;d.category=document.getElementById('hhDeCategory').value;d.documentDate=document.getElementById('hhDeDate').value||null;
 await put('documents',d);document.getElementById('hrDetailOverlay').classList.remove('on');toastMsg('Dokumentum adatai mentve');await window.renderHealthSection();if(window.hhSyncFullMigrationDashboard)window.hhSyncFullMigrationDashboard();
};
window.hhPrintDocument=async function(id){
 var x=await one('documentBlobs',id);if(!x||!x.blob){toastMsg('A dokumentumfájl nem található.');return}
 var url=URL.createObjectURL(x.blob),w=window.open(url,'_blank');if(!w){URL.revokeObjectURL(url);toastMsg('A böngésző letiltotta az új ablakot.');return}
 setTimeout(function(){try{w.focus();w.print()}catch(e){toastMsg('A dokumentum megnyílt; válaszd a Nyomtatás lehetőséget.')}},900);setTimeout(function(){URL.revokeObjectURL(url)},120000);
};

var prevRender=window.renderHealthSection;
if(typeof prevRender==='function'){
 window.renderHealthSection=async function(){
  var r=await prevRender.apply(this,arguments),m=await meta();if(!m||window.healthSectionKind!=='records')return r;
  var c=document.getElementById('healthSubContent');if(!c)return r;if(!st.profile)st.profile=pkey();
  var docs=await all('documents'),q=((document.getElementById('healthSearch')||{}).value||'').trim().toLocaleLowerCase('hu');
  docs=docs.filter(function(d){
   if(st.profile!=='all'&&d.profile!==st.profile)return false;if(st.category!=='all'&&d.category!==st.category)return false;
   if(st.from&&(!d.documentDate||d.documentDate<st.from))return false;if(st.to&&(!d.documentDate||d.documentDate>st.to))return false;
   if(q&&[d.originalName,d.documentDate,CATS[d.category]||d.category,d.profile==='monika'?'mónika':'zsolt',d.sourceType].join(' ').toLocaleLowerCase('hu').indexOf(q)<0)return false;return true;
  });
  docs.sort(function(a,b){var ad=a.documentDate||String(a.uploadedAt||'').slice(0,10),bd=b.documentDate||String(b.uploadedAt||'').slice(0,10);return (st.sort==='newest'?bd.localeCompare(ad):ad.localeCompare(bd))||String(a.originalName).localeCompare(String(b.originalName),'hu')});
  var shown=st.showAll?docs:docs.slice(0,10),active=[st.profile!=='all'?pname(st.profile):'',st.category!=='all'?(CATS[st.category]||st.category):'',st.from?('tól '+st.from):'',st.to?('ig '+st.to):''].filter(Boolean).join(' · ');
  var html='<div class="hrSectionCard"><div class="vaultTools"><button class="vaultBtn primary" onclick="hhOpenDocumentUpload()">＋ Új lelet feltöltése</button><button class="vaultBtn" onclick="hhOpenDocFilters()">Szűrők'+(active?' · aktív':'')+'</button></div>'+
   '<div class="hrRow"><div class="hrIco">↕</div><div><b>'+(docs.length>10&&!st.showAll?('A '+(st.sort==='newest'?'legfrissebb':'legrégebbi')+' 10 látható a(z) '+docs.length+' találatból.'):(docs.length+' dokumentum látható.'))+'</b><small>'+esc(active||'Keresés név, dátum és kategória alapján')+'</small></div><button class="vaultBtn" style="padding:7px 9px" onclick="hhToggleDocSort()">'+(st.sort==='newest'?'Legújabb elöl':'Legrégebbi elöl')+'</button></div>';
  if(shown.length){for(var i=0;i<shown.length;i++){var d=shown[i];html+=row('📄',d.originalName,[fmtDate(d.documentDate),CATS[d.category]||d.category,pname(d.profile)].filter(Boolean).join(' · '),ext(d.originalName).toUpperCase(),"hhOpenDocumentDetail('"+d.id+"')")}}else html+='<div class="hrEmpty">Nincs ilyen találat.</div>';
  if(docs.length>10&&!st.showAll)html+='<button class="vaultBtn" style="width:100%;margin-top:8px" onclick="hhShowAllDocs()">Összes találat megjelenítése</button>';
  c.innerHTML=html+'</div>';if(window.hhEnsureHealthProfileSwitches)window.hhEnsureHealthProfileSwitches();return r;
 };
}

var prevSet=window.setProfile;
if(typeof prevSet==='function'){
 window.setProfile=function(p){var r=prevSet.apply(this,arguments);st.profile=p==='m'?'monika':'zsolt';st.showAll=false;return r};
}

ensureUpload();ensureTool();
document.documentElement.dataset.healthhubDocParity='1.28';
window.HH_LIVE_BUILD='v1.28-documents';
})();