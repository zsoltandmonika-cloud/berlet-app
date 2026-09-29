(function(){
"use strict";

const RECEPT_URL='../recepttar/';
const STUDIO_URL='../recepttar-studio/';
const ARCHIVE_URL='https://healthradar-zsolt-monika.zsolt-monika.chatgpt.site/';
const CHATGPT_URL='https://chatgpt.com/';
const VAULT='hh-health-vault-v1';

const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(VAULT)||'null')}catch(_){return null}};
const pkey=()=>window.cur==='m'?'monika':'zsolt';
const pname=()=>pkey()==='monika'?'Mónika':'Zsolt';
const prof=()=>read()?.profiles?.[pkey()]||null;
const sortDateDesc=a=>[...a].sort((x,y)=>String(y.date||y.implantedAt||'').localeCompare(String(x.date||x.implantedAt||'')));
const first=(arr,fn)=>sortDateDesc((arr||[]).filter(fn))[0]||null;

const css=`
/* HealthHub v1.13 functional wiring */
#health .kpiCard,#health .listCard,#health .bottomCards .mini{cursor:pointer}
#health .listCard .row{cursor:pointer}
#health .listCard .row:active,#health .kpi:active{background:var(--soft)}
.hhDataBadge{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:10px;background:var(--soft);color:var(--a);font-size:7.5px;font-weight:800;margin-left:5px}
.hhIntegrationCard{background:#fff;border-radius:16px;padding:11px;margin-bottom:8px;box-shadow:0 6px 16px rgba(31,65,91,.055)}
.hhIntegrationCard h3{font-size:12px;margin:0 0 8px;color:var(--ink)}
.hhIntegrationBtn{width:100%;border:0;border-top:1px solid #edf1f4;background:#fff;color:var(--ink);padding:10px 3px;display:grid;grid-template-columns:34px 1fr 18px;gap:8px;align-items:center;text-align:left}
.hhIntegrationBtn:first-of-type{border-top:0}.hhIntegrationBtn .ii{width:32px;height:32px;border-radius:10px;background:var(--soft);display:grid;place-items:center;font-size:17px}.hhIntegrationBtn b{font-size:10px;display:block}.hhIntegrationBtn small{font-size:8px;color:#74899a;display:block;margin-top:2px}.hhIntegrationBtn .go{font-size:20px;color:var(--a)}
.hhAskOverlay{position:fixed;inset:0;background:rgba(10,30,48,.46);display:none;align-items:flex-end;z-index:210}.hhAskOverlay.on{display:flex}.hhAskSheet{width:min(100vw,420px);max-height:82vh;overflow:auto;margin:auto;background:#fff;border-radius:24px 24px 0 0;padding:12px 15px calc(24px + env(safe-area-inset-bottom));position:relative;box-shadow:0 -18px 50px rgba(10,30,48,.18)}.hhAskHandle{width:42px;height:5px;background:#dce5eb;border-radius:5px;margin:0 auto 12px}.hhAskClose{position:absolute;right:14px;top:12px;width:30px;height:30px;border:0;border-radius:15px;background:#f0f4f7;color:#39566d;font-size:20px}.hhAskSheet h2{font-size:20px;margin:6px 38px 5px 0;color:var(--ink)}.hhAskSheet p{font-size:9px;line-height:1.45;color:#657d90}.hhAskSheet textarea{width:100%;min-height:115px;resize:vertical;border:1px solid #dbe5ed;border-radius:14px;padding:11px;font:inherit;font-size:11px;color:var(--ink);outline:0;background:#fbfdff;box-sizing:border-box}.hhAskActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.hhAskBtn{border:0;border-radius:13px;padding:11px 8px;font-size:9px;font-weight:800;background:#eef5fa;color:var(--ink)}.hhAskBtn.primary{background:var(--a);color:#fff}.hhAskContext{margin-top:9px;padding:9px 10px;border-radius:13px;background:var(--soft);font-size:8px;line-height:1.4;color:#60788d}
.hhDemoNote{font-size:7.5px;color:#8395a4;font-weight:700}
`;
const st=document.createElement('style');st.id='hh-v113-style';st.textContent=css;document.head.appendChild(st);

function openRecipe(){ location.href=RECEPT_URL; }
function openStudio(){ window.open(STUDIO_URL,'_blank','noopener'); }
function openArchive(){ window.open(ARCHIVE_URL,'_blank','noopener'); }
window.hhOpenRecipe=openRecipe; window.hhOpenStudio=openStudio; window.hhOpenArchive=openArchive;

function bindHomeModules(){
  document.querySelectorAll('#home .homeModule').forEach(btn=>{
    const t=(btn.textContent||'').trim();
    if(t.includes('Receptár')) btn.onclick=openRecipe;
    if(t.includes('HealthRadar')) btn.onclick=()=>show('health');
    if(t.includes('Ask Léna')) btn.onclick=()=>openHealthAsk();
  });
}

function latestMeasurement(p, keys){
  const low=keys.map(x=>x.toLowerCase());
  return first(p?.measurements||[],m=>{
    const hay=[m.type,m.label].filter(Boolean).join(' ').toLowerCase();
    return low.some(k=>hay.includes(k));
  });
}
function fmtDate(s){
  if(!s)return '—';
  try{return new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(new Date(s+'T12:00:00'))}catch(_){return s}
}
function setKpi(index,label,value,unit,status,hasData){
  const card=document.querySelector(`#health .kpis .kpi:nth-child(${index})`); if(!card)return;
  const lab=card.querySelector('.lab'),val=card.querySelector('.val'),u=card.querySelector('.unit'),ok=card.querySelector('.ok');
  if(lab)lab.textContent=label;if(val)val.textContent=value??'—';if(u)u.textContent=unit||'';if(ok)ok.textContent=status||'';
  card.querySelectorAll('.spark,.bars').forEach(x=>x.style.opacity=hasData?'.55':'.13');
  card.onclick=()=>openHealthSection('measurements');
}

function docIcon(){return '<span class="ric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg></span>'}
function pillIcon(){return '<span class="ric"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 20.5a5 5 0 0 1-7-7l8-8a5 5 0 0 1 7 7z"/><path d="m6 9 7 7"/></svg></span>'}
function listRow(icon,title,sub,kind,id){return `<div class="row" onclick="openHrDetail('${kind}','${E(id)}')">${icon}<span class="rt"><b>${E(title)}</b><small>${E(sub||'')}</small></span>›</div>`}

function syncHealthDashboard(){
  const p=prof();
  const kHead=document.querySelector('#health .kpiCard .cardHead small');
  if(kHead){kHead.textContent=p?'Legfrissebb adatok ›':'Mintaadat · karton import ›';kHead.onclick=()=>openHealthSection('measurements')}

  if(p){
    const bp=latestMeasurement(p,['blood_pressure','vérnyomás']);
    const glucose=latestMeasurement(p,['glucose','vércukor']);
    const steps=latestMeasurement(p,['steps','lépés','activity']);
    const weight=latestMeasurement(p,['weight','testsúly']);
    setKpi(1,'❤ Vérnyomás',bp?bp.value:'—',bp?(bp.unit||'mmHg'):'mmHg',bp?`Utolsó: ${fmtDate(bp.date)}`:'Nincs importált adat',!!bp);
    setKpi(2,'💧 Vércukor',glucose?glucose.value:'—',glucose?(glucose.unit||'mmol/L'):'mmol/L',glucose?`Utolsó: ${fmtDate(glucose.date)}`:'Nincs importált adat',!!glucose);
    if(steps) setKpi(3,'🏃 Aktivitás',steps.value,steps.unit||'lépés/nap',`Utolsó: ${fmtDate(steps.date)}`,true);
    else setKpi(3,'⚖ Testsúly',weight?weight.value:'—',weight?(weight.unit||'kg'):'kg',weight?`Utolsó: ${fmtDate(weight.date)}`:'Samsung Health még nincs bekötve',!!weight);
  }else{
    document.querySelectorAll('#health .kpis .kpi').forEach(c=>{c.onclick=()=>openHealthSection('more')});
  }

  const cards=document.querySelectorAll('#health .listCard');
  if(cards[0]){
    const h=cards[0].querySelector('.listHead span');if(h){h.textContent=p?'Összes ›':'Minta ›';h.onclick=e=>{e.stopPropagation();openHealthSection(p?'records':'more')}}
    if(p){
      const rows=sortDateDesc(p.records||[]).slice(0,3);
      cards[0].querySelectorAll('.row').forEach(x=>x.remove());
      cards[0].insertAdjacentHTML('beforeend',rows.length?rows.map(x=>listRow(docIcon(),x.title,x.displayDate||x.date||x.category,'record',x.id)).join(''):'<div class="hrEmpty">Nincs importált lelet.</div>');
      cards[0].onclick=null;
    }
  }
  if(cards[1]){
    const h=cards[1].querySelector('.listHead span');if(h){h.textContent=p?'Összes ›':'Minta ›';h.onclick=e=>{e.stopPropagation();openHealthSection(p?'medications':'more')}}
    if(p){
      const rows=(p.medications||[]).slice(0,3);
      cards[1].querySelectorAll('.row').forEach(x=>x.remove());
      cards[1].insertAdjacentHTML('beforeend',rows.length?rows.map(x=>listRow(pillIcon(),x.name,x.dose||x.status,'medication',x.id)).join(''):'<div class="hrEmpty">Nincs importált gyógyszer.</div>');
      cards[1].onclick=null;
    }
  }

  const insight=document.getElementById('insightH');
  if(insight) insight.textContent=p?`${(p.records||[]).length} lelet/napló, ${(p.medications||[]).length} gyógyszer és ${(p.measurements||[]).length} mérés érhető el a privát kartonban.`:'A képernyő jelenleg mintaadatot mutat. A privát karton a Továbbiak menüben importálható.';

  const appts=sortDateDesc((p?.appointments||[]).filter(a=>!a.date||a.date>=new Date().toISOString().slice(0,10))).reverse();
  const a=appts[0]||null;
  const n=document.getElementById('nextH'),ns=document.getElementById('nextSub');
  if(n)n.textContent=a?(a.date||'Időpont'): 'Nincs betervezett';
  if(ns)ns.textContent=a?(a.title||'orvosi időpont'):'időpont';
  const mini=n?.closest('.mini');if(mini)mini.onclick=()=>openAppointments();

  const hn=document.getElementById('homeNext'),hs=document.getElementById('homeNextSub');
  if(hn)hn.textContent=a?(a.date||'Időpont'):'Nincs betervezett';
  if(hs)hs.textContent=a?(a.title||'orvosi időpont'):'következő időpont';
}

function openAppointments(){
  if(typeof show==='function')show('healthSection');
  const p=prof();
  const title=document.getElementById('healthSubTitle'),profileEl=document.getElementById('healthSubProfile'),banner=document.getElementById('healthMigrationBanner'),content=document.getElementById('healthSubContent');
  if(profileEl)profileEl.textContent=pname();if(title)title.textContent='Időpontok';
  if(banner){banner.className='migrationBanner '+(p?'ok':'warn');banner.innerHTML=p?'<b>📅 Privát HealthRadar időpontok</b><br>A kartonból betöltött tervezett események.':'<b>Nincs betöltött privát karton.</b><br>Importáld az adatcsomagot a Továbbiak menüben.'}
  if(content){
    const arr=sortDateDesc(p?.appointments||[]).reverse();
    content.innerHTML=`<div class="hrSectionCard"><h3>📅 Időpontok</h3>${arr.length?arr.map(x=>`<div class="hrRow clickable" onclick="openHrDetail('appointment','${E(x.id)}')"><div class="hrIco">📅</div><div><b>${E(x.title||'Időpont')}</b><small>${E(x.date||'')} · ${E(x.status||'')}</small></div><span class="hrTag">időpont</span></div>`).join(''):'<div class="hrEmpty">Nincs importált időpont.</div>'}</div>`;
  }
}
window.hhOpenAppointments=openAppointments;

function bindHealthHero(){
  const btns=document.querySelectorAll('#heroH .heroBtns button');
  if(btns[0])btns[0].onclick=()=>{openHealthSection('records');setTimeout(()=>document.getElementById('healthSearch')?.focus(),80)};
  if(btns[1])btns[1].onclick=openAppointments;
  const ask=document.querySelector('#health .ask');if(ask)ask.onclick=openHealthAsk;
  const arch=document.querySelector('#health .legacyAccess');if(arch)arch.onclick=openArchive;
}

function contextText(){
  const p=prof();
  if(!p)return `${pname()} HealthRadar privát kartonja ezen a készüléken nincs betöltve.`;
  const rec=sortDateDesc(p.records||[]).slice(0,5).map(x=>`${x.date||''}: ${x.title}`).join('; ');
  const meds=(p.medications||[]).slice(0,8).map(x=>x.name).join(', ');
  const meas=sortDateDesc(p.measurements||[]).slice(0,8).map(x=>`${x.date||''} ${x.label}: ${x.value} ${x.unit||''}`).join('; ');
  return `Profil: ${pname()}\nLegutóbbi HealthRadar-bejegyzések: ${rec||'nincs'}\nGyógyszerek a migrált kartonban: ${meds||'nincs'}\nMérések: ${meas||'nincs'}`;
}
function ensureAsk(){
  if(document.getElementById('hhAskOverlay'))return;
  const o=document.createElement('div');o.id='hhAskOverlay';o.className='hhAskOverlay';o.onclick=e=>{if(e.target===o)o.classList.remove('on')};
  o.innerHTML=`<div class="hhAskSheet"><div class="hhAskHandle"></div><button class="hhAskClose" onclick="document.getElementById('hhAskOverlay').classList.remove('on')">×</button><h2>Ask Léna · Health</h2><p>Írd le a kérdésedet. A HealthHub semmit nem küld el automatikusan. A gomb a kérdést és a helyi HealthRadar-kontextust a vágólapra teszi, majd megnyitja a ChatGPT-t.</p><textarea id="hhAskQuestion" placeholder="Pl. Mit jelent ez a legutóbbi leletemben?"></textarea><div class="hhAskContext" id="hhAskContext"></div><div class="hhAskActions"><button class="hhAskBtn" id="hhAskCopy">Másolás</button><button class="hhAskBtn primary" id="hhAskOpen">Másolás + ChatGPT</button></div></div>`;
  document.body.appendChild(o);
  document.getElementById('hhAskCopy').onclick=()=>copyAsk(false);
  document.getElementById('hhAskOpen').onclick=()=>copyAsk(true);
}
function askPrompt(){
  const q=(document.getElementById('hhAskQuestion')?.value||'').trim();
  return `HealthHub / Ask Léna kérdés\n\n${contextText()}\n\nKérdés: ${q||'Kérlek, segíts értelmezni a fenti HealthRadar adatokat.'}\n\nFontos: az adatok között lehetnek történeti értékek; különítsd el őket a jelenlegi állapottól.`;
}
async function copyAsk(open){
  const t=askPrompt();
  try{await navigator.clipboard.writeText(t);if(window.toast)toast('Ask Léna kérdés a vágólapon')}catch(_){const ta=document.getElementById('hhAskQuestion');ta.value=t;ta.select();if(window.toast)toast('A szöveg kijelölve másoláshoz')}
  if(open)window.open(CHATGPT_URL,'_blank','noopener');
}
function openHealthAsk(){
  ensureAsk();document.getElementById('hhAskContext').textContent=contextText();document.getElementById('hhAskOverlay').classList.add('on');setTimeout(()=>document.getElementById('hhAskQuestion')?.focus(),80);
}
window.openHealthAsk=openHealthAsk;

function appendMoreIntegrations(){
  if(window.healthSectionKind!=='more')return;
  const c=document.getElementById('healthSubContent');if(!c||c.querySelector('.hhIntegrationCard'))return;
  const p=prof();
  const sources=(p?.referenceDocuments||[]).slice(0,6);
  const sourceHtml=sources.length?`<div class="hhIntegrationCard"><h3>🗂 Adatforrások</h3>${sources.map(x=>`<div class="hrRow"><div class="hrIco">📎</div><div><b>${E(x.title)}</b><small>Privát HealthRadar / ChatGPT Library referencia</small></div><span class="hrTag">forrás</span></div>`).join('')}</div>`:'';
  c.insertAdjacentHTML('beforeend',`<div class="hhIntegrationCard"><h3>🔗 Kapcsolt HealthHub alkalmazások</h3><button class="hhIntegrationBtn" onclick="hhOpenRecipe()"><span class="ii">📕</span><span><b>Léna Recepttár</b><small>Működő receptalkalmazás megnyitása</small></span><span class="go">›</span></button><button class="hhIntegrationBtn" onclick="hhOpenStudio()"><span class="ii">✨</span><span><b>Recept Studio</b><small>Receptkészítés és szerkesztés</small></span><span class="go">↗</span></button><button class="hhIntegrationBtn" onclick="openHealthAsk()"><span class="ii">💬</span><span><b>Ask Léna · Health</b><small>HealthRadar-kontextus előkészítése ChatGPT-hez</small></span><span class="go">›</span></button><button class="hhIntegrationBtn" onclick="hhOpenArchive()"><span class="ii">🩺</span><span><b>Régi HealthRadar archívum</b><small>Read-only visszanézés</small></span><span class="go">↗</span></button></div>${sourceHtml}`);
}

if(typeof window.renderHealthSection==='function'){
  const prevRender=window.renderHealthSection;
  window.renderHealthSection=function(){prevRender();appendMoreIntegrations()};
}
if(typeof window.importHealthVault==='function'){
  window.importHealthVault=function(ev){
    const f=ev.target.files?.[0];if(!f)return;
    const r=new FileReader();r.onload=()=>{try{const v=JSON.parse(r.result);if(!v?.profiles?.zsolt||!v?.profiles?.monika)throw 0;localStorage.setItem(VAULT,JSON.stringify(v));if(window.toast)toast('HealthRadar karton importálva');if(typeof renderHealthSection==='function')renderHealthSection();syncHealthDashboard();syncHomeToday()}catch(_){if(window.toast)toast('Hibás HealthRadar adatcsomag')}};r.readAsText(f,'utf-8')
  };
  const inp=document.getElementById('healthVaultFile');if(inp)inp.onchange=window.importHealthVault;
}

function syncHomeToday(){
  const p=prof();const el=document.getElementById('todayInsight');
  if(el)el.textContent=p?`A privát HealthRadar karton elérhető: ${(p.records||[]).length} bejegyzés és ${(p.measurements||[]).length} mérés.`:'A HealthRadar karton még nincs importálva ezen a készüléken.';
}

if(typeof window.setProfile==='function'){
  const prevSet=window.setProfile;
  window.setProfile=function(x){prevSet(x);setTimeout(()=>{syncHealthDashboard();syncHomeToday();bindHealthHero()},0)};
}

bindHomeModules();bindHealthHero();syncHealthDashboard();syncHomeToday();ensureAsk();
setTimeout(()=>{bindHomeModules();bindHealthHero();syncHealthDashboard();syncHomeToday()},250);
window.HH_LIVE_BUILD='v1.13';
})();