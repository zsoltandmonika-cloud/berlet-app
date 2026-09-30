(function(){
"use strict";
/* HealthHub v1.23 HealthRadar functional migration
   Makes every visible HealthRadar control actionable while keeping private
   health data in the browser-local vault only. */

const VAULT="hh-health-vault-v1";
const ARCHIVE_URL="https://healthradar-zsolt-monika.zsolt-monika.chatgpt.site/";

function readVault(){
  try{return JSON.parse(localStorage.getItem(VAULT)||"null")}catch(_){return null}
}
function pkey(){return localStorage.getItem("hh-profile")==="m"?"monika":"zsolt"}
function pname(){return pkey()==="monika"?"Mónika":"Zsolt"}
function profile(){return readVault()?.profiles?.[pkey()]||null}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

const css=`
#health .q,#health .kpi,#health .listCard,#health .ask,#health .bottomCards .mini,#health .legacyAccess{cursor:pointer}
#health .q:active,#health .kpi:active,#health .listCard:active,#health .bottomCards .mini:active{transform:scale(.995)}
.hhSearchHint{font-size:8px;color:#72879a;margin:0 0 8px}
.hhInsightGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:8px}
.hhInsightStat{background:var(--soft);border-radius:13px;padding:10px}
.hhInsightStat b{font-size:18px;display:block;color:var(--ink)}
.hhInsightStat small{font-size:8px;color:#71879a}
.hhOverviewRow{cursor:pointer}
`;
const style=document.createElement("style");
style.id="hh-v123-style";
style.textContent=css;
document.head.appendChild(style);

function ensureHealthSection(){
  return document.getElementById("healthSection") && document.getElementById("healthSubContent");
}

function openSearch(){
  if(!ensureHealthSection() || typeof show!=="function") return;
  window.healthSectionKind="search";
  show("healthSection");
  const title=document.getElementById("healthSubTitle");
  const profileEl=document.getElementById("healthSubProfile");
  const banner=document.getElementById("healthMigrationBanner");
  const content=document.getElementById("healthSubContent");
  const input=document.getElementById("healthSearch");
  if(profileEl) profileEl.textContent=pname();
  if(title) title.textContent="Keresés";
  if(banner){
    const has=!!profile();
    banner.className="migrationBanner "+(has?"ok":"warn");
    banner.innerHTML=has
      ? "<b>⌕ Keresés a privát HealthRadarban</b><br>Leletek, gyógyszerek, mérések, eszközök és időpontok."
      : "<b>Nincs betöltött privát karton.</b><br>A kereséshez importáld az adatcsomagot a Továbbiak menüben.";
  }
  if(input){
    input.value="";
    input.placeholder="Keresés minden HealthRadar-adatban…";
    input.oninput=renderSearch;
  }
  renderSearch();
  setTimeout(()=>input?.focus(),80);
}
window.hhHealthSearch=openSearch;

function renderSearch(){
  const p=profile(), content=document.getElementById("healthSubContent"), input=document.getElementById("healthSearch");
  if(!content) return;
  if(!p){
    content.innerHTML='<div class="hrSectionCard"><div class="hrEmpty">Nincs kereshető privát HealthRadar-adat ezen a készüléken.</div></div>';
    return;
  }
  const q=(input?.value||"").trim().toLowerCase();
  const kinds=[
    ["records","record","📄","Lelet"],
    ["medications","medication","💊","Gyógyszer"],
    ["measurements","measurement","📈","Mérés"],
    ["devices","device","⌚","Eszköz"],
    ["appointments","appointment","📅","Időpont"]
  ];
  const rows=[];
  for(const [arrKey,kind,icon,label] of kinds){
    for(const x of (p[arrKey]||[])){
      const hay=JSON.stringify(x).toLowerCase();
      if(q && !hay.includes(q)) continue;
      const title=x.title||x.name||x.label||label;
      const sub=x.summary||x.dose||[x.date,x.value,x.unit].filter(Boolean).join(" · ")||[x.type,x.implantedAt].filter(Boolean).join(" · ")||x.status||"";
      rows.push(`<div class="hrRow clickable" onclick="openHrDetail('${kind}','${esc(x.id)}')"><div class="hrIco">${icon}</div><div><b>${esc(title)}</b><small>${esc(sub)}</small></div><span class="hrTag">${label}</span></div>`);
    }
  }
  content.innerHTML=`<div class="hrSectionCard"><h3>⌕ Találatok</h3><p class="hhSearchHint">${q?esc(q)+" · ":""}${rows.length} találat</p>${rows.length?rows.join(""):'<div class="hrEmpty">Nincs találat.</div>'}</div>`;
}

function openInsight(){
  if(!ensureHealthSection() || typeof show!=="function") return;
  window.healthSectionKind="insight";
  show("healthSection");
  const p=profile();
  const title=document.getElementById("healthSubTitle");
  const profileEl=document.getElementById("healthSubProfile");
  const banner=document.getElementById("healthMigrationBanner");
  const content=document.getElementById("healthSubContent");
  const input=document.getElementById("healthSearch");
  if(profileEl) profileEl.textContent=pname();
  if(title) title.textContent="Mai insight";
  if(input){
    input.value="";
    input.placeholder="Keresés a HealthRadarban…";
    input.oninput=()=>{};
  }
  if(banner){
    banner.className="migrationBanner "+(p?"ok":"warn");
    banner.innerHTML=p
      ? "<b>💡 HealthRadar összkép</b><br>A helyben tárolt karton gyors, leíró áttekintése. Nem diagnózis."
      : "<b>Nincs betöltött privát karton.</b><br>Az insight a saját HealthRadar-adatok betöltése után jelenik meg.";
  }
  if(!content) return;
  if(!p){
    content.innerHTML='<div class="hrSectionCard"><div class="hrEmpty">Importáld a privát HealthRadar-adatcsomagot a Továbbiak menüben.</div></div>';
    return;
  }
  const rec=(p.records||[]).length, meds=(p.medications||[]).length, meas=(p.measurements||[]).length, dev=(p.devices||[]).length, appt=(p.appointments||[]).length;
  const latest=[...(p.records||[]).map(x=>x.date),...(p.measurements||[]).map(x=>x.date),...(p.appointments||[]).map(x=>x.date)].filter(Boolean).sort().reverse()[0]||"—";
  content.innerHTML=`
    <div class="hrSectionCard">
      <h3>💡 Mai insight</h3>
      <p>A privát kartonban jelenleg <b>${rec}</b> lelet/napló, <b>${meds}</b> gyógyszer, <b>${meas}</b> mérés és <b>${dev}</b> eszköz szerepel.</p>
      <div class="hhInsightGrid">
        <div class="hhInsightStat"><small>Leletek</small><b>${rec}</b></div>
        <div class="hhInsightStat"><small>Mérések</small><b>${meas}</b></div>
        <div class="hhInsightStat"><small>Gyógyszerek</small><b>${meds}</b></div>
        <div class="hhInsightStat"><small>Időpontok</small><b>${appt}</b></div>
      </div>
      <p class="privacyNote">Legutóbbi dátum a kartonban: ${esc(latest)}. Ez az összegzés csak a betöltött adatok leíró áttekintése.</p>
    </div>`;
}
window.hhHealthInsight=openInsight;

function openArchive(){window.open(ARCHIVE_URL,"_blank","noopener")}
window.hhHealthArchive=openArchive;

function bindQuickButtons(){
  const quick=document.querySelectorAll("#health .quick .q");
  const actions=[
    ()=>openHealthSection("overview"),
    ()=>openHealthSection("records"),
    ()=>openHealthSection("medications"),
    ()=>openHealthSection("measurements"),
    ()=>openHealthSection("devices"),
    ()=>openHealthSection("more")
  ];
  quick.forEach((b,i)=>{if(actions[i]) b.onclick=actions[i]});
}

function bindDashboard(){
  const heroBtns=document.querySelectorAll("#heroH .heroBtns button");
  if(heroBtns[0]) heroBtns[0].onclick=openSearch;
  if(heroBtns[1]) heroBtns[1].onclick=()=>window.hhOpenAppointments?.();

  bindQuickButtons();

  document.querySelectorAll("#health .kpis .kpi").forEach(k=>k.onclick=()=>openHealthSection("measurements"));
  const kHead=document.querySelector("#health .kpiCard .cardHead small");
  if(kHead) kHead.onclick=e=>{e.stopPropagation();openHealthSection("measurements")};

  const cards=document.querySelectorAll("#health .listCard");
  if(cards[0]) cards[0].onclick=e=>{if(!e.target.closest(".row")) openHealthSection("records")};
  if(cards[1]) cards[1].onclick=e=>{if(!e.target.closest(".row")) openHealthSection("medications")};

  const ask=document.querySelector("#health .ask");
  if(ask) ask.onclick=()=>window.openHealthAsk?.();

  const insight=document.getElementById("insightH")?.closest(".mini");
  if(insight) insight.onclick=openInsight;

  const next=document.getElementById("nextH")?.closest(".mini");
  if(next) next.onclick=()=>window.hhOpenAppointments?.();

  const archive=document.querySelector("#health .legacyAccess");
  if(archive) archive.onclick=openArchive;

  const navButtons=document.querySelectorAll("#navHealthBar button");
  if(navButtons[3]) navButtons[3].onclick=openInsight;
  if(navButtons[4]) navButtons[4].onclick=()=>openHealthSection("more");
}

function makeOverviewRowsClickable(){
  if(window.healthSectionKind!=="overview") return;
  const cards=[...document.querySelectorAll("#healthSubContent .hrSectionCard")];
  const card=cards.find(x=>(x.querySelector("h3")?.textContent||"").includes("Migrált karton"));
  if(!card) return;
  const rows=card.querySelectorAll(".hrRow");
  const kinds=["records","medications","measurements","devices"];
  rows.forEach((row,i)=>{
    if(!kinds[i]) return;
    row.classList.add("clickable","hhOverviewRow");
    row.onclick=()=>openHealthSection(kinds[i]);
  });
}

if(typeof window.renderHealthSection==="function"){
  const prev=window.renderHealthSection;
  window.renderHealthSection=function(){
    const r=prev.apply(this,arguments);
    setTimeout(makeOverviewRowsClickable,0);
    return r;
  };
}

if(typeof window.setProfile==="function"){
  const prev=window.setProfile;
  window.setProfile=function(){
    const r=prev.apply(this,arguments);
    setTimeout(()=>{
      window.hhSyncHealthDashboard?.();
      window.hhSyncHealthHome?.();
      window.hhBindHealthHero?.();
      bindDashboard();
      if(document.getElementById("healthSection")?.classList.contains("on") && typeof window.renderHealthSection==="function"){
        window.renderHealthSection();
      }
    },0);
    return r;
  };
}

bindDashboard();
setTimeout(bindDashboard,150);
setTimeout(bindDashboard,700);

window.HH_LIVE_BUILD="v1.23";
})();