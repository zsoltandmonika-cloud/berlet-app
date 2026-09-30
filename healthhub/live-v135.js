(function(){
'use strict';

/* HealthRadar parity: category distribution + latest documents on Health overview. */
var DB='healthhub-healthradar-v2';
var CATS={
  cardiology:'Kardiológia',
  laboratory:'Labor',
  emergency:'Sürgősségi ellátás / mentés',
  urology:'Urológia',
  psychiatry:'Pszichiátria',
  ent:'Fül-orr-gégészet',
  orthopedics:'Ortopédia / kézsebészet',
  rheumatology:'Reumatológia',
  endocrinology:'Endokrinológia',
  ophthalmology:'Szemészet',
  occupational:'Foglalkozás-egészségügy',
  vaccination:'Oltás',
  general:'Általános / egyéb'
};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function byProfile(store,p){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).index('profile').getAll(p))}finally{db.close()}}
function docDate(d){return d.documentDate||String(d.uploadedAt||'').slice(0,10)||''}
function fmt(s){
 if(!s)return 'Dátum nélkül';
 var d=new Date(s+'T00:00:00');
 return isNaN(d.getTime())?s:new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric'}).format(d);
}
function pdfIcon(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>';
}
function openIcon(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>';
}

window.hhOpenDocumentCategory=function(cat){
 var st=window.hhDocState||(window.hhDocState={profile:null,category:'all',from:'',to:'',sort:'newest',showAll:false});
 st.profile=pkey();st.category=cat;st.from='';st.to='';st.sort='newest';st.showAll=false;
 if(typeof window.openHealthSection==='function')window.openHealthSection('records');
 setTimeout(function(){if(window.renderHealthSection)window.renderHealthSection()},40);
};
window.hhOpenAllDocuments=function(){
 var st=window.hhDocState||(window.hhDocState={profile:null,category:'all',from:'',to:'',sort:'newest',showAll:false});
 st.profile=pkey();st.category='all';st.from='';st.to='';st.sort='newest';st.showAll=true;
 if(typeof window.openHealthSection==='function')window.openHealthSection('records');
 setTimeout(function(){if(window.renderHealthSection)window.renderHealthSection()},40);
};

function ensureStyle(){
 if(document.getElementById('hh-v135-style'))return;
 var s=document.createElement('style');s.id='hh-v135-style';
 s.textContent=
 '.hhOverviewDocsGrid{display:grid;grid-template-columns:1fr;gap:10px}'+
 '@media (min-width:760px){.hhOverviewDocsGrid{grid-template-columns:.9fr 1.1fr}}'+
 '.hhCatRow{width:100%;border:0;background:transparent;padding:7px 0;text-align:left;cursor:pointer;color:#29465f}'+
 '.hhCatTop{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:8.6px}.hhCatTop b{font-size:8.6px}.hhCatTop span{color:#60758a;font-weight:750}'+
 '.hhCatBar{height:5px;background:#edf2f7;border-radius:999px;overflow:hidden;margin-top:5px}.hhCatBar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ef9890,#64c6b7)}'+
 '.hhLatestRow{display:grid;grid-template-columns:32px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #edf1f5}.hhLatestRow:first-of-type{border-top:0}'+
 '.hhLatestIcon{width:32px;height:32px;border-radius:11px;background:#fff0ec;color:#c25d55;display:grid;place-items:center}.hhLatestIcon svg{width:16px;height:16px}'+
 '.hhLatestText{min-width:0}.hhLatestText b{display:block;font-size:8.8px;color:#19364f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhLatestText small{display:block;font-size:7.5px;color:#75899b;margin-top:2px}'+
 '.hhOpenDocBtn{border:0;border-radius:12px;background:#f6f8fb;color:#435d74;font-size:7.5px;font-weight:800;padding:7px 8px;display:flex;align-items:center;gap:4px;cursor:pointer}.hhOpenDocBtn svg{width:12px;height:12px}';
 document.head.appendChild(s);
}

async function render(){
 if(window.healthSectionKind!=='overview')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var old=document.getElementById('hhOverviewDocs');if(old)old.remove();
 var docs=await byProfile('documents',pkey());
 if(!docs.length)return;

 docs.sort(function(a,b){return String(docDate(b)).localeCompare(String(docDate(a)))||String(a.originalName||'').localeCompare(String(b.originalName||''),'hu')});
 var counts={};
 docs.forEach(function(d){var k=d.category||'general';counts[k]=(counts[k]||0)+1});
 var cats=Object.keys(counts).map(function(k){return {key:k,label:CATS[k]||k,count:counts[k]}}).sort(function(a,b){return b.count-a.count||a.label.localeCompare(b.label,'hu')});
 var max=cats.length?cats[0].count:1,latest=docs.slice(0,6);

 var wrap=document.createElement('div');wrap.id='hhOverviewDocs';wrap.className='hhOverviewDocsGrid';
 wrap.innerHTML=
 '<div class="hrSectionCard"><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#317f77;text-transform:uppercase">Megoszlás</div><h3 style="margin:4px 0 2px">Leletek kategóriánként</h3><small style="color:#70869a">Koppints egy kategóriára a leletek megnyitásához.</small>'+
 cats.map(function(x){
   var pct=Math.max(7,Math.round((x.count/max)*100));
   return '<button type="button" class="hhCatRow" onclick="hhOpenDocumentCategory(\''+esc(x.key)+'\')"><span class="hhCatTop"><b>'+esc(x.label)+'</b><span>'+x.count+' ›</span></span><span class="hhCatBar"><i style="width:'+pct+'%"></i></span></button>';
 }).join('')+'</div>'+
 '<div class="hrSectionCard"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px"><div><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#7562ad;text-transform:uppercase">Idővonal</div><h3 style="margin:4px 0 2px">Legfrissebb dokumentumok</h3><small style="color:#70869a">A leletdátum és kategória látható.</small></div><button class="vaultBtn" style="padding:7px 9px" onclick="hhOpenAllDocuments()">Összes lelet ›</button></div>'+
 latest.map(function(d){
   return '<div class="hhLatestRow"><div class="hhLatestIcon">'+pdfIcon()+'</div><div class="hhLatestText"><b>'+esc(d.originalName||'Dokumentum')+'</b><small>'+esc(fmt(docDate(d)))+' · '+esc(CATS[d.category]||d.category||'Általános / egyéb')+'</small></div><button type="button" class="hhOpenDocBtn" onclick="openHrDocument(\''+esc(d.id)+'\')">'+openIcon()+' Megnyitás</button></div>';
 }).join('')+'</div>';

 var anchor=document.getElementById('hhPersonalSafetyCard');
 if(anchor&&anchor.parentNode===root)anchor.insertAdjacentElement('afterend',wrap);
 else root.insertBefore(wrap,root.firstChild);
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);ensureStyle();await render();return r};
}
ensureStyle();setTimeout(render,150);
document.documentElement.dataset.healthhubOverviewDocs='1.35';
window.HH_LIVE_BUILD='v1.35-overview-docs';
})();