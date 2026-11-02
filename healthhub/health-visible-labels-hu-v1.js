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
const en=new Map([...pairs.slice(0,12),['Daily Spark','Astrology'],['Daily Headline','Headline News'],['Wellbeing','Digital Health'],['Medical Records','Medical Records']]);
const hu=new Map([...pairs.slice(12),['Health','Egészség'],['Medical Records','Leletek'],['Sleep','Alvás'],['Activity','Aktivitás'],['Astrology','Asztrológia'],['Headline News','Vezércikk'],['Wellbeing','Digitális Jólét']]);

// Dedicated Canadian-English localization for the embedded Health Page.
// Scope to fixed UI only, never medical documents, drugs, free text or measurements.
const healthLabels=[
 ['Egészség','Health'],['HealthRadar','Health'],
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

const selectors='button b,button span,button small,a b,a span,a small,.dailyStrip b,.homeModule b,.detailTop b,.detailTitle h1,.dailyHealthStrip b,.homeTile b,.tile b,.screenTitle';
let busy=false;
function apply(){
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
 }catch(e){console.warn('HealthHub labels:',e)}
 finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
window.addEventListener('pageshow',apply);
window.addEventListener('storage',e=>{if(e.key==='sh9-language-v1')apply()});
window.addEventListener('sh9-language-change',apply);
})();
