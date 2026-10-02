(function(){
'use strict';

/* HealthHub v1.103 — overview hero fine-tune + editable highlighted health history */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function put(store,val){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).put(val))}finally{db.close()}}
function splitConditions(s){return String(s||'').split(';').map(function(x){return x.trim()}).filter(Boolean)}

function ensureStyle(){
 if(document.getElementById('hh-v203-style'))return;
 var s=document.createElement('style');s.id='hh-v203-style';s.textContent=
  '.healthSubHero.hhOverviewHero>div{left:56%!important;right:14px!important;top:55%!important}'+
  '.healthSubHero.hhOverviewHero #healthSubTitle{font-size:26px!important;line-height:.94!important;white-space:normal!important;max-width:220px!important;letter-spacing:-.65px!important;overflow:visible!important;text-wrap:balance}'+
  '.healthSubHero.hhOverviewHero .healthSubKicker{margin-bottom:5px!important}'+
  '.hhHistoryHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.hhHistoryHead h3{margin:0!important;min-width:0}.hhHistoryEditBtn{border:0;border-radius:11px;background:#fff0f4;color:#d23b6c;padding:7px 9px;font-size:7.5px;font-weight:900;white-space:nowrap;box-shadow:inset 0 0 0 1px #f7dce6}.hhHistoryEditBtn:active{transform:scale(.97)}'+
  '.hhHistoryEditor{display:grid;gap:9px}.hhHistoryEditor textarea{width:100%;box-sizing:border-box;min-height:190px;border:1px solid #e1e9ee;border-radius:14px;padding:11px;font:inherit;font-size:10px;line-height:1.5;color:#173f61;background:#fff;outline:none;resize:vertical}.hhHistoryEditor textarea:focus{border-color:#ef7da4;box-shadow:0 0 0 3px rgba(239,125,164,.12)}.hhHistoryEditorNote{font-size:8px;line-height:1.45;color:#73899a;background:#fff8fa;border-radius:12px;padding:9px}.hhHistoryActions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.hhHistoryActions button{border:0;border-radius:12px;padding:10px;font-size:9px;font-weight:900}.hhHistorySave{background:#f52d7d;color:#fff}.hhHistoryCancel{background:#eef4f7;color:#486b83}'+
  '@media(max-width:430px){.healthSubHero.hhOverviewHero>div{left:55%!important;right:9px!important}.healthSubHero.hhOverviewHero #healthSubTitle{font-size:24px!important;max-width:205px!important}.hhHistoryEditBtn{font-size:7px;padding:6px 8px}}';
 document.head.appendChild(s);
}

function tuneHero(){
 var hero=document.querySelector('#healthSection .healthSubHero');
 if(!hero)return;
 if(window.healthSectionKind==='overview'){
   hero.classList.add('hhOverviewHero');
   var title=document.getElementById('healthSubTitle');
   if(title)title.textContent='Egészségügyi összkép';
 }else{
   hero.classList.remove('hhOverviewHero');
 }
}

function decorateHistoryCard(){
 if(window.healthSectionKind!=='overview')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var headings=Array.from(root.querySelectorAll('.hrSectionCard h3'));
 var h3=headings.find(function(h){return h.textContent.indexOf('Kiemelt egészségügyi előzmény')>=0});
 if(!h3)return;
 var card=h3.closest('.hrSectionCard');if(!card||card.querySelector('.hhHistoryEditBtn'))return;
 var head=document.createElement('div');head.className='hhHistoryHead';
 h3.replaceWith(head);head.appendChild(h3);
 var b=document.createElement('button');b.type='button';b.className='hhHistoryEditBtn';b.innerHTML='✎ Szerkesztés';
 b.onclick=function(e){e.stopPropagation();window.hhEditHighlightedHistory()};
 head.appendChild(b);
}

window.hhEditHighlightedHistory=async function(){
 var p=await one('profiles',pkey());
 if(!p){toastMsg('A profil nem tölthető be.');return}
 var overlay=document.getElementById('hrDetailOverlay'),content=document.getElementById('hrDetailContent');
 if(!overlay||!content)return;
 var lines=splitConditions(p.knownConditions).join('\n');
 content.innerHTML=
  '<h2>Kiemelt egészségügyi előzmény</h2>'+
  '<div class="hrDetailMeta">'+esc(pname())+' · privát profiladat</div>'+
  '<div class="hhHistoryEditor">'+
   '<textarea id="hhHistoryText" placeholder="Minden egészségügyi előzmény külön sorba kerüljön.">'+esc(lines)+'</textarea>'+
   '<div class="hhHistoryEditorNote"><b>Szerkesztés:</b> minden sor külön kártyaként jelenik meg. Új sorral hozzáadhatsz, egy sor törlésével eltávolíthatsz egy elemet.</div>'+
   '<div class="hhHistoryActions"><button type="button" class="hhHistorySave" onclick="hhSaveHighlightedHistory()">Mentés</button><button type="button" class="hhHistoryCancel" onclick="closeHrDetail()">Mégse</button></div>'+
  '</div>';
 overlay.classList.add('on');
};

window.hhSaveHighlightedHistory=async function(){
 var p=await one('profiles',pkey());if(!p)return;
 var raw=String(document.getElementById('hhHistoryText')?.value||'');
 var items=raw.split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean);
 p.knownConditions=items.join('; ');
 p.updatedAt=new Date().toISOString();
 await put('profiles',p);
 try{window.closeHrDetail&&window.closeHrDetail()}catch(e){document.getElementById('hrDetailOverlay')?.classList.remove('on')}
 toastMsg('Kiemelt egészségügyi előzmény mentve');
 if(window.renderHealthSection)await window.renderHealthSection();
};

async function tune(){
 ensureStyle();
 tuneHero();
 decorateHistoryCard();
}

var previousRender=window.renderHealthSection;
if(typeof previousRender==='function'){
 window.renderHealthSection=async function(){
   var r=await previousRender.apply(this,arguments);
   await tune();
   return r;
 };
}
ensureStyle();
setTimeout(tune,140);
document.documentElement.dataset.healthhubOverviewTuning='1.103';
window.HH_LIVE_BUILD='v1.103-overview-tuning';
})();