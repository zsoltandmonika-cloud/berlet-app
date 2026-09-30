(function(){
'use strict';
/* HealthHub v1.41 — OMRON + Samsung Health local import adapters */
var DB='healthhub-healthradar-v2',ADB='healthhub-admin-v1';
var preview=null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('A művelet megszakadt'))}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openAdmin(){return new Promise(function(ok,no){var r=indexedDB.open(ADB,1);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains('snapshots'))d.createObjectStore('snapshots',{keyPath:'id'});if(!d.objectStoreNames.contains('audit'))d.createObjectStore('audit',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function allStores(){var db=await openDb(),o={};try{for(var i=0;i<db.objectStoreNames.length;i++){var n=db.objectStoreNames[i];o[n]=await reqP(db.transaction(n).objectStore(n).getAll())}return o}finally{db.close()}}
async function snapshot(reason){var x={id:'s-'+Date.now(),createdAt:new Date().toISOString(),reason:reason,data:await allStores()},d=await openAdmin(),t=d.transaction('snapshots','readwrite');t.objectStore('snapshots').put(x);await txDone(t);d.close();return x}
async function audit(action,detail){try{var d=await openAdmin(),t=d.transaction('audit','readwrite');t.objectStore('audit').put({id:'a-'+Date.now()+'-'+Math.random().toString(36).slice(2),createdAt:new Date().toISOString(),action:action,detail:detail||{}});await txDone(t);d.close()}catch(e){}}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function csvRows(text,delim){
 var out=[],row=[],cell='',q=false,text0=String(text||'').replace(/^\uFEFF/,'');
 for(var i=0;i<text0.length;i++){var ch=text0[i],n=text0[i+1];
  if(ch==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}
  else if(ch===delim&&!q){row.push(cell.trim());cell=''}
  else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell.trim());if(row.some(Boolean))out.push(row);row=[];cell=''}
  else cell+=ch;
 }
 row.push(cell.trim());if(row.some(Boolean))out.push(row);return out;
}
function autod(text,headCheck){
 return [',',';','\t'].map(function(d){var r=csvRows(text,d),h=headCheck(r);return{d:d,r:r,h:h,score:h?h.score:-1}}).sort(function(a,b){return b.score-a.score})[0];
}
function numberCell(row,i){if(i<0)return null;var m=String(row[i]??'').replace(/\s/g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);if(!m)return null;var n=Number(m[0]);return Number.isFinite(n)?n:null}
function dateIso(a,b){
 var s=(String(a||'').trim()+' '+String(b||'').trim()).trim();if(!s)return null;
 if(/^\d{13}$/.test(s))return validDate(new Date(Number(s)));
 if(/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(s))return validDate(new Date(s));
 var m=s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:[ T,]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?)?/);
 if(m)return localIso(m[1],m[2],m[3],m[4],m[5],m[6]);
 m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?)?/);
 if(m)return localIso(m[3],m[2],m[1],m[4],m[5],m[6]);
 return validDate(new Date(s));
}
function localIso(y,m,d,h,mi,se){var x=new Date(Number(y),Number(m)-1,Number(d),Number(h||0),Number(mi||0),Number(se||0));if(x.getFullYear()!==Number(y)||x.getMonth()!==Number(m)-1||x.getDate()!==Number(d))return null;return validDate(x)}
function validDate(d){return Number.isFinite(d.getTime())&&d.getTime()<=Date.now()+300000?d.toISOString():null}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function sig(x){return [x.profile,x.measuredAt,x.systolic,x.diastolic,x.pulse,x.weightKg,x.bloodGlucose,x.oxygenSaturation].join('|')}
async function existingSigs(){var db=await openDb();try{return new Set((await reqP(db.transaction('measurements').objectStore('measurements').getAll())).map(sig))}finally{db.close()}}
function finishRows(rows,source){
 var seen=new Set(),out=[];rows.forEach(function(x){if(!x||!x.measuredAt)return;var s=sig(x);if(seen.has(s))return;seen.add(s);x.id=x.id||('imp-'+hash(source+'|'+s));x.source=source;x.notes=x.notes||source;out.push(x)});return out;
}

/* Exact OMRON aliases recovered from the legacy HealthRadar parser. */
var OA={
 date:['measuredate','measurementdate','measurementdatetime','measuredat','datetime','date','datum','meresidopont','meresdatuma'],
 time:['measuretime','measurementtime','time','ido','meresideje'],
 systolic:['systolic','systolicmmhg','sys','szisztoles','felsoertek'],
 diastolic:['diastolic','diastolicmmhg','dia','diasztoles','alsoertek'],
 pulse:['pulse','pulserate','heartrate','pulzus'],
 weight:['weight','weightkg','bodyweight','testsuly','tomeg'],
 deleted:['deleteflag','deleted','torolt']
};
function omHeader(rows){
 var best=null;
 rows.slice(0,25).forEach(function(r,idx){var n=r.map(norm),find=function(a){return n.findIndex(function(x){return a.some(function(v){return x===v||x.indexOf(v)===0})})},c={date:find(OA.date),time:find(OA.time),systolic:find(OA.systolic),diastolic:find(OA.diastolic),pulse:find(OA.pulse),weight:find(OA.weight),deleted:find(OA.deleted)},hasDate=c.date>=0,hasBP=c.systolic>=0&&c.diastolic>=0,hasW=c.weight>=0;if(!hasDate||(!hasBP&&!hasW))return;var score=Object.keys(c).filter(function(k){return c[k]>=0}).length;if(!best||score>best.score)best={index:idx,score:score,columns:c}});
 return best;
}
function parseOmron(text,profile){
 var z=autod(text,omHeader);if(!z||!z.h)throw new Error('A fájlban nem találhatók OMRON vérnyomás- vagy testsúlyoszlopok.');
 var c=z.h.columns,out=[],skip=0;
 z.r.slice(z.h.index+1).forEach(function(r){
  if(!r.some(function(x){return String(x).trim()}))return;
  if(c.deleted>=0&&/^(?:1|true|yes|igen)$/i.test(String(r[c.deleted]||'').trim())){skip++;return}
  var at=dateIso(r[c.date],c.time<0?'':r[c.time]),sys=numberCell(r,c.systolic),dia=numberCell(r,c.diastolic),pulse=numberCell(r,c.pulse),w=numberCell(r,c.weight);
  var bp=Number.isInteger(sys)&&sys>=50&&sys<=300&&Number.isInteger(dia)&&dia>=30&&dia<=200;
  var pp=pulse==null||(Number.isInteger(pulse)&&pulse>=25&&pulse<=250),ww=w!=null&&w>=20&&w<=400;
  if(!at||(!bp&&!ww)||!pp){skip++;return}
  out.push({profile:profile,measuredAt:at,systolic:bp?sys:null,diastolic:bp?dia:null,pulse:pulse!=null&&pulse>=25&&pulse<=250?pulse:null,weightKg:ww?Math.round(w*10)/10:null,bloodGlucose:null,oxygenSaturation:null,notes:'OMRON Connect import'});
 });
 out=finishRows(out,'OMRON Connect import');if(!out.length)throw new Error('A fájlból egyetlen érvényes mérés sem olvasható ki.');
 return{measurements:out,skippedRows:skip,fileType:out.some(function(x){return x.systolic!=null})&&out.some(function(x){return x.weightKg!=null})?'mixed':out.some(function(x){return x.weightKg!=null})?'weight':'bloodPressure'};
}

/* Small ZIP reader, no external library. */
function u16(b,o){return b[o]|(b[o+1]<<8)}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
async function inflateRaw(bytes){if(typeof DecompressionStream!=='function')throw new Error('A böngésző nem támogatja a Samsung ZIP kibontását.');var ds=new DecompressionStream('deflate-raw');return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer())}
async function unzip(file){
 var b=new Uint8Array(await file.arrayBuffer()),eocd=-1;
 for(var i=Math.max(0,b.length-65557);i<=b.length-22;i++)if(u32(b,i)===0x06054b50)eocd=i;
 if(eocd<0)throw new Error('A ZIP fájl nem olvasható.');
 var count=u16(b,eocd+10),off=u32(b,eocd+16),out=[];
 for(i=0;i<count;i++){
  if(u32(b,off)!==0x02014b50)throw new Error('A ZIP könyvtára sérült.');
  var method=u16(b,off+10),csize=u32(b,off+20),usize=u32(b,off+24),nlen=u16(b,off+28),xlen=u16(b,off+30),clen=u16(b,off+32),lho=u32(b,off+42),name=new TextDecoder().decode(b.slice(off+46,off+46+nlen));off+=46+nlen+xlen+clen;
  if(name.endsWith('/')||usize>60*1024*1024)continue;
  var ln=u16(b,lho+26),lx=u16(b,lho+28),start=lho+30+ln+lx,comp=b.slice(start,start+csize),raw=method===0?comp:method===8?await inflateRaw(comp):null;if(raw)out.push({name:name,bytes:raw});
 }
 return out;
}
function genericHeader(rows){
 var best=null;
 rows.slice(0,15).forEach(function(r,idx){var h=r.map(norm),score=h.filter(function(x){return /(starttime|createtime|measuredat|systolic|diastolic|heartrate|pulse|weight|glucose|oxygen|spo2)/.test(x)}).length;if(score>=2&&(!best||score>best.score))best={index:idx,score:score,head:h,raw:r}});
 return best;
}
function idxLike(h,arr){return h.findIndex(function(x){return arr.some(function(a){return x===a||x.indexOf(a)>=0})})}
function parseSamsungCsv(name,text,profile){
 var z=autod(text,genericHeader);if(!z||!z.h)return[];
 var h=z.h.head,ix={
  at:idxLike(h,['starttime','createtime','measuredat','measurementtime','datetime','date']),
  sys:idxLike(h,['systolic']),dia:idxLike(h,['diastolic']),pulse:idxLike(h,['heartrate','pulse']),
  weight:idxLike(h,['weightkg','weight']),glucose:idxLike(h,['bloodglucose','glucose']),spo2:idxLike(h,['oxygensaturation','spo2'])
 };
 var low=name.toLowerCase(),out=[];
 z.r.slice(z.h.index+1).forEach(function(r){
  var at=ix.at>=0?dateIso(r[ix.at],''):null;if(!at)return;
  var sys=numberCell(r,ix.sys),dia=numberCell(r,ix.dia),pulse=numberCell(r,ix.pulse),w=numberCell(r,ix.weight),g=numberCell(r,ix.glucose),sp=numberCell(r,ix.spo2);
  var x={profile:profile,measuredAt:at,systolic:null,diastolic:null,pulse:null,weightKg:null,bloodGlucose:null,oxygenSaturation:null,notes:'Samsung Health import'};
  if((low.includes('blood_pressure')||low.includes('bloodpressure')||(sys!=null&&dia!=null))&&sys>=50&&sys<=300&&dia>=30&&dia<=200){x.systolic=Math.round(sys);x.diastolic=Math.round(dia);if(pulse>=25&&pulse<=250)x.pulse=Math.round(pulse)}
  if((low.includes('weight')||w!=null)&&w>=20&&w<=400)x.weightKg=Math.round(w*10)/10;
  if((low.includes('glucose')||g!=null)&&g>0&&g<100){x.bloodGlucose=Math.round(g*10)/10}
  if((low.includes('oxygen')||low.includes('spo2')||sp!=null)&&sp>=50&&sp<=100)x.oxygenSaturation=Math.round(sp*10)/10;
  if([x.systolic,x.diastolic,x.pulse,x.weightKg,x.bloodGlucose,x.oxygenSaturation].some(function(v){return v!=null}))out.push(x);
 });
 return finishRows(out,'Samsung Health import');
}
async function sha256(bytes){var h=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(h),function(x){return x.toString(16).padStart(2,'0')}).join('')}
function pdfDate(bytes){
 try{var t=new TextDecoder('latin1').decode(bytes.slice(0,Math.min(bytes.length,250000))),m=t.match(/\/(?:CreationDate|ModDate)\s*\(D:(20\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);if(m)return{date:m[1]+'-'+m[2]+'-'+m[3],time:m[4]+'.'+m[5]}}catch(e){}return null;
}
async function parseSamsungZip(file,profile){
 var entries=await unzip(file),rows=[],pdfs=[];
 for(var i=0;i<entries.length;i++){var e=entries[i],low=e.name.toLowerCase();if(low.endsWith('.csv')&&(low.includes('samsung.health')||low.includes('blood')||low.includes('weight')||low.includes('oxygen')||low.includes('glucose'))){try{rows=rows.concat(parseSamsungCsv(e.name,new TextDecoder().decode(e.bytes),profile))}catch(err){}}if(low.endsWith('.pdf')&&low.includes('com.samsung.health.ecg')){var md=pdfDate(e.bytes),base=e.name.split('/').pop(),display=md?(md.date.replace(/-/g,'.')+' – '+md.time+' – Samsung Watch EKG.pdf'):('Samsung Watch EKG – '+base);pdfs.push({name:display,sourceName:base,documentDate:md?md.date:null,bytes:e.bytes})}}
 rows=finishRows(rows,'Samsung Health import');return{measurements:rows,pdfs:pdfs,entryCount:entries.length};
}
async function previewImport(kind,file,profile){
 var data;if(kind==='omron')data=parseOmron(await file.text(),profile);else data=await parseSamsungZip(file,profile);
 var old=await existingSigs(),nu=(data.measurements||[]).filter(function(x){return !old.has(sig(x))}),du=(data.measurements||[]).filter(function(x){return old.has(sig(x))});
 preview={kind:kind,file:file.name,profile:profile,measurements:data.measurements||[],nu:nu,du:du,pdfs:data.pdfs||[],skippedRows:data.skippedRows||0,fileType:data.fileType||'',entryCount:data.entryCount||0};
 showPreview();await audit('import_preview',{kind:kind,file:file.name,profile:profile,newMeasurements:nu.length,duplicates:du.length,ecgPdfs:preview.pdfs.length});
}
async function existingDocHashes(){var db=await openDb();try{return new Set((await reqP(db.transaction('documents').objectStore('documents').getAll())).map(function(x){return x.sha256}).filter(Boolean))}finally{db.close()}}
async function commit(){
 if(!preview)return;
 try{await snapshot('before-'+preview.kind+'-'+preview.file)}catch(e){toast('Import leállítva: snapshot hiba');return}
 var imported=0,dup=preview.du.length,ekg=0,ekgDup=0,db=await openDb();
 try{
  var stores=['measurements'];if(preview.pdfs.length)stores.push('documents','documentBlobs');
  var tx=db.transaction(stores,'readwrite'),ms=tx.objectStore('measurements');preview.nu.forEach(function(x){ms.put(x);imported++});
  if(preview.pdfs.length){
   var hashes=await existingDocHashes(),ds=tx.objectStore('documents'),bs=tx.objectStore('documentBlobs');
   for(var i=0;i<preview.pdfs.length;i++){var p=preview.pdfs[i],h=await sha256(p.bytes);if(hashes.has(h)){ekgDup++;continue}hashes.add(h);var id=crypto.randomUUID?crypto.randomUUID():'ecg-'+Date.now()+'-'+i;ds.put({id:id,profile:preview.profile,category:'cardiology',sourceType:'original',documentDate:p.documentDate,originalName:p.name,contentType:'application/pdf',sizeBytes:p.bytes.length,uploadedAt:new Date().toISOString(),sha256:h,source:'Samsung Health ECG'});bs.put({id:id,blob:new Blob([p.bytes],{type:'application/pdf'})});ekg++}
  }
  await txDone(tx);
 }finally{db.close()}
 await audit('import_commit',{kind:preview.kind,file:preview.file,profile:preview.profile,importedMeasurements:imported,duplicateMeasurements:dup,importedEcg:ekg,duplicateEcg:ekgDup});
 toast(imported+' új mérés'+(preview.pdfs.length?' · '+ekg+' EKG PDF':'')+' importálva');
 preview=null;closePreview();if(window.renderHealthSection)await window.renderHealthSection();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
}
function ensureUi(){
 if(document.getElementById('hhImportAdapterOverlay'))return;
 var s=document.createElement('style');s.id='hh-v141-style';s.textContent=
 '.hhImportTools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.hhImportBtn{border:1px solid #cdddf3;background:#f3f7ff;color:#315f98;border-radius:12px;padding:8px 10px;font-size:8px;font-weight:850;cursor:pointer}.hhImportOv{position:fixed;inset:0;background:#08203388;display:none;align-items:flex-end;z-index:270}.hhImportOv.on{display:flex}.hhImportSheet{width:min(100vw,700px);max-height:92vh;overflow:auto;margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom))}.hhImportStat{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0}.hhImportStat div{background:#fff;border-radius:13px;padding:10px;border:1px solid #edf1f4}.hhImportStat small{display:block;color:#7b8d9d;font-size:7px}.hhImportStat b{display:block;color:#173f62;font-size:13px;margin-top:2px}';
 document.head.appendChild(s);
 var o=document.createElement('div');o.id='hhImportAdapterOverlay';o.className='hhImportOv';o.onclick=function(e){if(e.target===o)closePreview()};o.innerHTML='<div class="hhImportSheet"><div style="display:flex;justify-content:space-between;gap:10px"><div><small>HEALTHHUB · IMPORT ADAPTER</small><h2 id="hhIaTitle" style="margin:3px 0">Import előnézet</h2></div><button class="hhCrudClose" onclick="hhCloseImportPreview()">×</button></div><div id="hhIaBody"></div></div>';document.body.appendChild(o);
 var a=document.createElement('input');a.id='hhOmronInput';a.type='file';a.accept='.csv,text/csv';a.hidden=true;a.onchange=function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f)previewImport('omron',f,pkey()).catch(function(x){console.error(x);toast(x.message||'Az OMRON fájl nem olvasható.')})};document.body.appendChild(a);
 var b=document.createElement('input');b.id='hhSamsungInput';b.type='file';b.accept='.zip,application/zip';b.hidden=true;b.onchange=function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f)previewImport('samsung',f,pkey()).catch(function(x){console.error(x);toast(x.message||'A Samsung Health ZIP nem olvasható.')})};document.body.appendChild(b);
}
function showPreview(){
 ensureUi();var p=preview;if(!p)return;
 document.getElementById('hhIaTitle').textContent=p.kind==='omron'?'OMRON Connect előnézet':'Samsung Health előnézet';
 document.getElementById('hhIaBody').innerHTML='<p class="privacyNote">'+esc(p.file)+' · '+esc(p.profile==='monika'?'Mónika':'Zsolt')+'</p>'+
 '<div class="hhImportStat"><div><small>ÚJ MÉRÉS</small><b>'+p.nu.length+'</b></div><div><small>DUPLIKÁTUM</small><b>'+p.du.length+'</b></div><div><small>KIHAGYOTT/HIBÁS</small><b>'+p.skippedRows+'</b></div><div><small>EKG PDF</small><b>'+p.pdfs.length+'</b></div></div>'+
 (p.kind==='omron'?'<p class="privacyNote">Felismert típus: '+esc(p.fileType||'—')+'. A törölt, hibás dátumú és érvénytelen tartományú sorok kimaradnak.</p>':'<p class="privacyNote">A Samsung ZIP kliensoldalon kerül feldolgozásra. Vérnyomás, pulzus, testsúly, vércukor, SpO₂ és a ZIP-ben található Samsung Watch EKG PDF-ek kerülnek felismerésre.</p>')+
 '<div class="hhCrudActions"><button class="hhCrudBtn" onclick="hhCommitHealthImport()">Importálás most</button><button class="hhCrudBtn alt" onclick="hhCloseImportPreview()">Mégse</button></div>';
 document.getElementById('hhImportAdapterOverlay').classList.add('on');
}
function closePreview(){document.getElementById('hhImportAdapterOverlay')?.classList.remove('on')}
window.hhOpenOmronImport=function(){ensureUi();document.getElementById('hhOmronInput').click()};
window.hhOpenSamsungImport=function(){ensureUi();document.getElementById('hhSamsungInput').click()};
window.hhCommitHealthImport=commit;window.hhCloseImportPreview=closePreview;
function decorateMeasurements(){
 if(window.healthSectionKind!=='measurements')return;var root=document.getElementById('healthSubContent');if(!root)return;var card=root.querySelector('.hrSectionCard');if(!card||card.querySelector('.hhImportTools'))return;var d=document.createElement('div');d.className='hhImportTools';d.innerHTML='<button class="hhImportBtn" onclick="hhOpenOmronImport()">⇩ OMRON CSV</button><button class="hhImportBtn" onclick="hhOpenSamsungImport()">⌚ Samsung Health ZIP</button>';var crud=card.querySelector('.hhMeasCrudBar');if(crud)crud.after(d);else card.insertBefore(d,card.firstChild);
}
function decorateAdmin(){
 if(window.healthSectionKind!=='more')return;var card=document.getElementById('hhAdminMenuCard');if(!card||card.querySelector('.hhImportAdapterLinks'))return;var x=document.createElement('div');x.className='hhImportAdapterLinks';x.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin-top:9px';x.innerHTML='<button class="hhImportBtn" onclick="hhOpenOmronImport()">OMRON</button><button class="hhImportBtn" onclick="hhOpenSamsungImport()">Samsung Health</button>';card.appendChild(x);
}
var prev=window.renderHealthSection;if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorateMeasurements();decorateAdmin();return r};
ensureUi();setTimeout(function(){decorateMeasurements();decorateAdmin()},150);
document.documentElement.dataset.healthhubHealthAdapters='1.41';window.HH_LIVE_BUILD='v1.41-health-import-adapters';
})();