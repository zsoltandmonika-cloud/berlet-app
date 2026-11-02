/* HealthHub visible navigation labels: Hungarian and Canadian English. UI only. */
(function(){
'use strict';
const pairs=[
 ['Egészség','Health'],['HealthRadar','Health'],
 ['Leletek','Medical Records'],['Alvás','Sleep'],['Aktivitás','Activity'],
 ['Digitális Jólét','Digital Health'],['Táplálkozás','Nutrition'],
 ['Kérdezd Lénát','Ask Léna'],['Biztonság','Family Guard'],
 ['Asztrológia','Astrology'],['Vezércikk','Headline News'],
 ['Napi egészség','Daily Health'],
 ['Nutrition','Táplálkozás'],['Daily Spark','Asztrológia'],
 ['Daily Health','Napi egészség'],['Daily Headline','Vezércikk'],
 ['Family Guard','Biztonság'],['Digital Health','Digitális Jólét'],
 ['Ask Léna','Kérdezd Lénát']
];
const en=new Map([...pairs.slice(0,12),['Daily Spark','Astrology'],['Daily Headline','Headline News'],['Wellbeing','Digital Health'],['Medical Records','Medical Records'],['Idővonal','Timeline'],['Tünetnapló','Symptom Diary'],['Tünet napló','Symptom Diary']]);
const hu=new Map([...pairs.slice(12),['Health','Egészség'],['Medical Records','Leletek'],['Sleep','Alvás'],['Activity','Aktivitás'],['Astrology','Asztrológia'],['Headline News','Vezércikk'],['Wellbeing','Digitális Jólét'],['Timeline','Idővonal'],['Symptom Diary','Tünetnapló']]);

// Dedicated Canadian-English localization for the embedded Health Page.
// Scope to fixed UI only, never medical documents, drugs, free text or measurements.
const healthLabels=[
 ['Egészség','Health'],['HealthRadar','Health'],
 ['Idővonal','Timeline'],
 ['Egészség áttekintés','Health Overview'],['áttekintés','Overview'],
 ['Leletek','Medical Records'],['Gyógyszerek','Medications'],
 ['Mérések','Measurements'],['Eszközök','Devices'],['Továbbiak','More'],
 ['Fő egészségügyi mutatók','Key Health Metrics'],
 ['Utolsó 7 nap','Last 7 Days'],['Vérnyomás','Blood Pressure'],
 ['Vércukor','Blood Glucose'],['Aktivitás','Activity'],
 ['Stabil','Stable'],['Rendben','Normal'],['lépés/nap','steps/day'],
 ['Friss leletek','Recent Medical Records'],['Összes','View All'],
 ['Szerkesztés','Edit'],['napi cél','daily goal'],
 ['Orvosi adatok és elemzések','Medical Data & Insights'],
 ['Névnap:','Name Day:'],['Kérdezd Lénát','Ask Léna'],
 ['Kezdőlap','Home'],['Vissza','Back'],['Megnyitás','Open'],
 ['Hozzáadás','Add'],['Mentés','Save'],['Mégse','Cancel'],
 ['Bezárás','Close'],['Keresés','Search'],['Frissítés','Refresh'],
 ['Ellenőrzés','Check'],['Beállítások','Settings'],
 ['Nincs adat','No Data'],['Nincs találat','No Results'],
 ['Tünetnapló','Symptom Diary'],['Tünet napló','Symptom Diary'],
 ['Új tünet','New Symptom'],['Tünet rögzítése','Log Symptom'],
 ['Tünet','Symptom'],['Súlyosság','Severity'],['Időtartam','Duration'],
 ['Kezdete','Onset'],['Megjegyzés','Notes'],['Új bejegyzés','New Entry']
];
const healthToEN=new Map(healthLabels);
const healthToHU=new Map(healthLabels.map(([hu,en])=>[en,hu]));
function healthPageLabels(english){
 const root=document.getElementById('health');
 if(!root)return;
 const dict=english?healthToEN:healthToHU;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const parent=node.parentElement;
  if(!parent||parent.closest('script,style,textarea,[contenteditable],.rt,#doc1,#doc2,#doc3,#med1,#med2,#med3'))continue;
  const original=node.nodeValue||'';
  const trimmed=original.trim();
  if(!trimmed)continue;
  let changed=dict.get(trimmed);
  if(!changed){
   const arrow=trimmed.match(/^(.+?)\s*›$/);
   if(arrow&&dict.has(arrow[1]))changed=dict.get(arrow[1])+' ›';
  }
  if(!changed){
   const emoji=trimmed.match(/^([^\p{L}\p{N}]*)(.+)$/u);
   if(emoji&&dict.has(emoji[2]))changed=emoji[1]+dict.get(emoji[2]);
  }
  if(!changed){
   const goal=english?trimmed.match(/^(\d+%) napi cél$/):trimmed.match(/^(\d+%) daily goal$/);
   if(goal)changed=goal[1]+' '+(english?'daily goal':'napi cél');
  }
  if(!changed)continue;
  const first=original.indexOf(trimmed);
  const replaced=original.slice(0,first)+changed+original.slice(first+trimmed.length);
  if(replaced!==original)node.nodeValue=replaced;
 }
 for(const element of root.querySelectorAll('button[aria-label],a[aria-label],input[placeholder]')){
  for(const attribute of ['aria-label','placeholder']){
   if(!element.hasAttribute(attribute))continue;
   const value=element.getAttribute(attribute);
   const changed=dict.get(value);
   if(changed&&changed!==value)element.setAttribute(attribute,changed);
  }
 }
}


// Records/Medications subpage and Léna explanation UI. Never translate PDF,
// patient-authored fields, saved summaries, filenames, or explanation bullet points.
const recordsUiEN=new Map([
 ['Leletek','Medical Records'],['Gyógyszerek','Medications'],
 ['Léna magyarázata',"Léna's Explanation"],
 ['Léna magyarázata · szerkesztés',"Edit Léna's Explanation"],
 ['Ehhez a dokumentumhoz még nincs átvitt magyarázat','No explanation is available for this document yet'],
 ['Az eredeti PDF megnyitható. Léna nem következtet a fájlnévből, ezért csak az eredeti HealthRadarból átvitt vagy külön ellenőrzött magyarázat jelenik meg.','The original PDF is available. Léna does not infer findings from filenames. Only imported or verified explanations are displayed.'],
 ['Magyarázat készítése / szerkesztése','Create / Edit Explanation'],
 ['Régi magyarázatok importálása','Import Previous Explanations'],
 ['Röviden','Summary'],['Dokumentum összefoglaló','Document Summary'],
 ['A lelet fő pontjai','Key Findings'],
 ['Mit jelent közérthetően?','What Does This Mean?'],
 ['Mire érdemes figyelni?','What to Watch For'],
 ['Kérdések a következő kontrollra','Questions for Your Next Appointment'],
 ['Forrás: a kiválasztott eredeti PDF','Source: selected original PDF'],
 ['egyedileg mentett','saved manually'],['régi HealthRadarban kézzel mentett','saved manually in previous HealthRadar'],['beépített, ellenőrzött','built-in, verified'],
 ['Ellenőrizve:','Reviewed:'],['Fontos:','Important:'],
 ['Ez a dokumentum közérthető összefoglalása, nem új diagnózis és nem kezelési utasítás.','This is a plain-language document summary, not a diagnosis or treatment instruction.'],
 ['Szerkesztés','Edit'],['Régi változat visszaállítása','Restore Previous Version'],
 ['Eredeti PDF','Original PDF'],['Cím','Title'],['Rövid összefoglaló','Short Summary'],
 ['Ellenőrzés dátuma','Review Date'],
 ['Csak az eredeti PDF alapján ellenőrzött tartalmat ments el. Minden új sor külön felsorolási pont lesz.','Only save content verified against the original PDF. Each new line becomes a separate bullet.'],
 ['Magyarázat mentése','Save Explanation'],['Mégse','Cancel'],
 ['Keresés','Search'],['Szűrők','Filters'],['Dátum','Date'],
 ['Összes','All'],['Bezárás','Close'],['Vissza','Back']
]);
function translateRecordsUi(english){
 if(!english)return;
 const roots=['healthSection','hrDetailOverlay'].map(id=>document.getElementById(id)).filter(Boolean);
 for(const root of roots){
  // Only static UI elements. Do not walk medical record bodies or input values.
  for(const el of root.querySelectorAll('button,h2,h3,h4,label > h4,small,.screenTitle,.privacyNote,b')){
   if(el.children.length && !el.matches('.privacyNote'))continue;
   if(el.closest('#doc1,#doc2,#doc3,#med1,#med2,#med3,.hrDetailMeta,li,textarea,[contenteditable]'))continue;
   const value=(el.textContent||'').trim();
   const next=recordsUiEN.get(value);
   if(next&&next!==value)el.textContent=next;
  }
  for(const el of root.querySelectorAll('p,.privacyNote')){
   if(el.closest('.hrDetailMeta,li,[contenteditable]'))continue;
   const text=(el.textContent||'').trim(),next=recordsUiEN.get(text);
   if(next&&el.children.length===0)el.textContent=next;
  }
  for(const el of root.querySelectorAll('button,input')){
   for(const key of ['aria-label','placeholder','title']){
    const value=el.getAttribute(key),next=recordsUiEN.get(value);
    if(next)el.setAttribute(key,next);
   }
  }
 }
}

const selectors='button b,button span,button small,a b,a span,a small,button,nav button,nav a,.page .screenTitle,.dailyStrip b,.homeModule b,.detailTop b,.detailTitle h1,.dailyHealthStrip b,.homeTile b,.tile b,.screenTitle';
let busy=false;
function apply(){
 if(document.getElementById('hhSleepPage')?.classList.contains('on'))return;
 if(busy)return;
 busy=true;
 try{
  const english=localStorage.getItem('sh9-language-v1')==='en';
  const dict=english?en:hu;
  for(const el of document.querySelectorAll(selectors)){
   if(el.children.length)continue;
   const value=(el.textContent||'').trim();
   const next=dict.get(value);
   if(next&&next!==value)el.textContent=next;
  }
  healthPageLabels(english);
  translateRecordsUi(english);
 }catch(e){console.warn('HealthHub labels:',e)}
 finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
// A Sleep rebuild can create hundreds of mutations. Coalesce locale updates
// and never scan the full dashboard for every text-character update.
let scheduled=false;
function scheduleApply(){
 if(scheduled)return;
 scheduled=true;
 const run=()=>{scheduled=false;apply()};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
 else setTimeout(run,0);
}
new MutationObserver(scheduleApply).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow',apply);
window.addEventListener('storage',e=>{if(e.key==='sh9-language-v1')apply()});
window.addEventListener('sh9-language-change',apply);
})();
