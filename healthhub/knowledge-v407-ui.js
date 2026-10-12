(function(){
'use strict';
/* v407 Knowledge Base control: mobile-friendly manual audit/backfill, with
 * explicit per-device opt-in for future automatic archive processing.
 */
var PANEL='hhKb407',statusText='',busy=false,urls=[];
function engine(){return window.HH_KB_INGEST_V407}
function service(){return window.HH_DAILY_HEALTH_SYNC_V319}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function name(p){return p==='monika'?'Mónika':'Zsolt'}
function el(id){return document.getElementById(id)}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function auth(){var s=service(),a=s&&s.getStatus&&s.getStatus();return !!(s&&a&&a.authenticated)}
function css(){
 if(el('hhKb407Css'))return;
 var style=document.createElement('style');style.id='hhKb407Css';
 style.textContent='#hhKb407{box-sizing:border-box;padding:12px;margin:12px 0;border:1px solid #b8d3e8;border-radius:16px;background:linear-gradient(165deg,#f5fbff,#edf6fd);color:#244861;font:13px/1.5 system-ui}'+
 '#hhKb407 h3{font-size:16px;margin:0 0 4px;color:#195b88}#hhKb407 p{font-size:12px;margin:5px 0}'+
 '#hhKb407 .kbActions{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}'+
 '#hhKb407 button{border-radius:9px;border:1px solid #bdd8e7;background:white;padding:9px 11px;font-weight:700;color:#245979;font-size:12px;cursor:pointer;min-height:37px}'+
 '#hhKb407 button:disabled{opacity:.45;cursor:default}'+
 '#hhKb407 input[type=search]{flex:1;min-width:90px;max-width:100%;box-sizing:border-box;border:1px solid #b6d3e2;border-radius:9px;padding:10px;font-size:12px}'+
 '#hhKb407 label{display:flex;align-items:center;gap:7px;font-size:12px}'+
 '#hhKb407 .kbStatus{background:#fff;border:1px solid #e2eaf0;padding:8px;border-radius:9px;white-space:pre-line;font-size:12px;overflow-wrap:anywhere}'+
 '#hhKb407 .kbResult{background:white;border-radius:9px;padding:8px;border:1px solid #dce8ed;margin:6px 0;font-size:12px;overflow-wrap:anywhere}'+
 '#hhKb407 img{display:block;max-width:100%;height:auto;border:1px solid #b4cad5;border-radius:7px;margin:6px auto}'+
 '#hhKb407 small{display:block;color:#57758c;line-height:1.5;font-size:11px}';document.head.appendChild(style);
}
function mount(){
 var anchor=el('hhLenaCtx289')||el('hhLenaArchive294');
 if(!anchor||!anchor.parentElement)return;
 css();var panel=el(PANEL);
 if(panel&&panel.isConnected)return panel;
 panel=document.createElement('section');panel.id=PANEL;
 panel.innerHTML='<h3>📚 HealthHub · Tudástár és orvosi képek</h3>'+
  '<small>Teljes PDF-szöveg · magyar OCR · EKG/OMSZ képi oldalak · ellenőrzött forrásazonosítók</small>'+
  '<div id="hhKb407Status" class="kbStatus" aria-live="polite">Audit még nem indult.</div>'+
  '<div class="kbActions"><button type="button" data-kb="audit">🔍 Dokumentumaudit</button>'+
  '<button type="button" data-kb="start">▶ Teljes feldolgozás</button>'+
  '<button type="button" data-kb="stop">⏸ Megállítás</button></div>'+
  '<label><input id="hhKb407Auto" type="checkbox"> Új PDF-ek automatikus feldolgozása a Drive-archíválás után</label>'+
  '<small>A képeket privát tárhelyre másoljuk. Az OCR ezen az eszközön dolgozik. Az eredeti PDF a Drive-ban változatlan marad.</small>'+
  '<div class="kbActions"><input id="hhKb407Query" type="search" placeholder="Keresés a teljes szövegben…">'+
  '<button type="button" data-kb="search">🔎 Keresés</button>'+
  '<button type="button" data-kb="visuals">🫀 Képi mellékletek</button></div>'+
  '<div id="hhKb407Results"></div>';
 anchor.parentElement.insertBefore(panel,anchor.nextSibling);
 panel.addEventListener('click',handleClick);
 panel.querySelector('#hhKb407Query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});
 panel.querySelector('#hhKb407Auto').onchange=function(){
  if(!auth()){this.checked=false;show('🔒 Először jelentkezz be a Health Vaultba.');return}
  engine().enable(profile(),this.checked);
  show(this.checked?'✅ Automatikus feldolgozás ezen az eszközön engedélyezve.':'Automatikus feldolgozás kikapcsolva.');
 };
 draw();return panel;
}
function show(msg){statusText=msg;draw()}
function draw(){
 var panel=el(PANEL);if(!panel||!engine())return;
 var p=profile(),s=engine().getState(),on=engine().enabled(p);
 var chk=el('hhKb407Auto');if(chk&&chk.checked!==on)chk.checked=on;
 var st=el('hhKb407Status');
 var base=statusText||'Kezdéshez válaszd a Dokumentumaudit lehetőséget.';
 if(s.running)base='⏳ '+(s.done||0)+'/'+(s.total||0)+' dokumentum · '+(s.current||'feldolgozás…')+
  (s.error?'\n⚠️ '+s.error:'');
 else if(s.last&&s.last.profile===p){
  var x=s.last;
  base='📁 Drive: '+x.drive+' PDF · 🗂️ Tudástár: '+x.knowledgeBase+
   ' · ✅ Feldolgozott: '+x.complete+' · ⏳ Feldolgozatlan/ellenőrizendő: '+(x.new+x.partial)+
   ' · 🔁 Igazolt másolat: '+x.duplicates+
   '\n📄 Kereshető oldalak: '+x.pagesIndexed+' · 🫀 Képi oldalak: '+x.visualPages+
   (s.error?'\n⚠️ '+s.error:'');
 }
 if(st)st.textContent=base;
 var buttons=panel.querySelectorAll('button[data-kb]');
 buttons.forEach(b=>{b.disabled=!!s.running&&b.dataset.kb!=='stop'||!s.running&&b.dataset.kb==='stop'});
}
function handleClick(e){
 var b=e.target.closest('button[data-kb]');if(!b||(busy&&b.dataset.kb!=='stop'))return;
 var op=b.dataset.kb;
 if(op==='audit')runAudit();
 if(op==='start')runFull();
 if(op==='stop')engine()?.stop();
 if(op==='search')search();
 if(op==='visuals')listGallery();
 if(op==='open-image')openVisual(b.dataset.doc,b.dataset.page);
 if(op==='list-images')listForDoc(b.dataset.doc);
}
function resultRoot(){return el('hhKb407Results')}
function clearImages(){urls.forEach(x=>{try{URL.revokeObjectURL(x)}catch(e){}});urls=[]}
async function runAudit(){
 busy=true;show('🔎 Drive–tudástár egyeztetés…');
 try{var x=await engine().audit(profile());
  show('📁 '+x.drive+' Drive PDF · ✅ '+x.complete+' feldolgozott · '+x.new+' új · '+x.partial+' ellenőrizendő')}
 catch(e){show('⚠️ Audit: '+String(e.message||e).slice(0,140))}
 finally{busy=false;draw()}
}
async function runFull(){
 if(!auth()){show('🔒 Bejelentkezés szükséges a Központi Health Vaultba.');return}
 busy=true;engine().enable(profile(),true);
 show('⏳ Első feldolgozás indul; a folyamat az eszközön fut és folytatható.');
 try{await engine().run(profile())}
 catch(e){show('⚠️ Feldolgozás: '+String(e.message||e).slice(0,140))}
 finally{busy=false;draw()}
}

async function search(){
 var svc=service(),root=resultRoot(),p=profile(),query=String(el('hhKb407Query')?.value||'').trim();
 if(!root)return;
 clearImages();root.textContent='';
 if(!query||query.length<3){root.textContent='Legalább 3 karaktert írj a kereséshez.';return}
 if(!auth()){root.textContent='🔒 Bejelentkezés szükséges.';return}
 try{
  // Indexed PAGE content, not filename-only search. RLS protects all pages.
  var rows=await svc.request('/rest/v1/hh_kb_pages?select=document_id,page_no,page_text,hh_kb_documents!inner(original_name,profile_key,source_class,status)&'+
   'hh_kb_documents.profile_key=eq.'+p+'&page_text=fts.'+encodeURIComponent(query)+
   '&limit=30',{method:'GET'});
  if(!rows?.length){root.textContent='Nem találtam egyezést a már feldolgozott dokumentumoldalakban.';return}
  rows.forEach(row=>{
   var card=document.createElement('div');card.className='kbResult';
   var h=document.createElement('strong');h.textContent=row.hh_kb_documents?.original_name||'Dokumentum';
   var desc=document.createElement('small');desc.textContent='📄 '+row.page_no+'. oldal · Forrás: '+
    (row.hh_kb_documents?.source_class||'ellenőrizendő')+' · Állapot: '+(row.hh_kb_documents?.status||'');
   var snippet=document.createElement('p');snippet.textContent=String(row.page_text||'').slice(0,550)+
    (String(row.page_text||'').length>550?'…':'');
   var button=document.createElement('button');button.dataset.kb='list-images';button.dataset.doc=row.document_id;
   button.textContent='🖼️ Oldalképek';
   card.append(h,desc,snippet,button);root.appendChild(card);
  });
 }catch(e){root.textContent='Keresési hiba: '+String(e.message||e).slice(0,130)}
}
async function listGallery(){
 var p=profile(),root=resultRoot();if(!root)return;
 root.textContent='🫀 Képi mellékletek ellenőrzése…';clearImages();
 try{
  var docs=await service().request('/rest/v1/hh_kb_documents?select=id,original_name,visual_pages,status,source_class'+
   '&profile_key=eq.'+p+'&visual_pages=gt.0&order=updated_at.desc&limit=60',{method:'GET'});
  root.textContent='';
  if(!docs.length){root.textContent='Még nincs feldolgozott képi melléklet. Indítsd a teljes feldolgozást.';return}
  for(const doc of docs){
   var div=document.createElement('div');div.className='kbResult';
   var h=document.createElement('strong');h.textContent='🫀 '+doc.original_name;
   var label=document.createElement('small');
   label.textContent=doc.visual_pages+' képi oldal · '+doc.source_class+' · EKG-azonosítás ellenőrzendő';
   var btn=document.createElement('button');btn.dataset.kb='list-images';btn.dataset.doc=doc.id;
   btn.textContent='🔎 Képek megnyitása';
   div.append(h,label,btn);root.appendChild(div);
  }
 }catch(e){root.textContent='Képtárhiba: '+String(e.message||e).slice(0,130)}
}
async function listForDoc(docId){
 var p=profile(),root=resultRoot();
 if(!root)return;clearImages();root.textContent='🖼️ Privát oldalképek betöltése…';
 try{
  var rows=await engine().listVisuals(p,docId);
  root.textContent='';
  if(!rows.length){root.textContent='Ehhez a dokumentumhoz még nincs feldolgozott képi oldal.';return}
  var info=document.createElement('small');info.textContent=
   'A képek eredeti dokumentumoldal-kivonatok. Az EKG minősítés orvosi felülvizsgálatra vár.';
  root.appendChild(info);
  for(const r of rows.slice(0,40)){
   var box=document.createElement('div');box.className='kbResult';
   var text=document.createElement('span');text.textContent='📄 '+r.page_no+'. oldal · '+r.kind;
   var b=document.createElement('button');b.dataset.kb='open-image';b.dataset.doc=docId;
   b.dataset.page=String(r.page_no);b.textContent='🔍 Oldal mutatása';
   box.append(text,b);root.appendChild(box);
  }
 }catch(e){root.textContent='A képek nem érhetők el: '+String(e.message||e).slice(0,130)}
}
async function openVisual(docId,page){
 var p=profile(),root=resultRoot();if(!root)return;
 try{
  var rows=await engine().listVisuals(p,docId);
  var row=rows.find(r=>String(r.page_no)===String(page));
  if(!row)throw Error('Nincs ilyen oldalkép.');
  var blob=await engine().imageBlob(p,row.storage_path);
  var url=URL.createObjectURL(blob);urls.push(url);
  var box=document.createElement('div');box.className='kbResult';
  var h=document.createElement('strong');h.textContent='📄 '+page+'. oldal · Eredeti oldal képe';
  var im=document.createElement('img');im.src=url;im.alt='Orvosi dokumentum '+page+'. oldalának képe';
  box.append(h,im);root.prepend(box);
 }catch(e){root.textContent='Képmegnyitási hiba: '+String(e.message||e).slice(0,130)}
}
window.addEventListener('healthhub:kb-progress',draw);
window.addEventListener('healthhub:profile-changed',()=>{clearImages();statusText='';mount();draw()});
window.addEventListener('healthhub:lena-archive-state',()=>{mount();draw()});
window.addEventListener('healthhub:lena-context-updated',()=>{mount();draw()});
window.addEventListener('healthhub:central-auth-changed',()=>{mount();draw()});
window.addEventListener('focus',()=>{mount();draw()});
[150,950,2900,7000].forEach(ms=>setTimeout(mount,ms));
window.HH_KB_UI_V407={mount:mount,audit:runAudit,openGallery:listGallery};
})();
