/* SH9 language bridge v1: exact-label localisation for legacy modules.
   Display only. Never changes navigation, inputs, personal data or API calls. */
(function(w,d){
'use strict';
if(w.SH9_LANGUAGE_BRIDGE_V1)return;
const lex=[
 ['Quick Update','Gyorsfrissítés'],
 ['Usage Control Center','Használatfelügyelet'],
 ['Digital Wellbeing','Digitális Jólét'],
 ['Digital Health','Digitális Jólét'],
 ['Public Transport','Tömegközlekedés'],
 ['My Trips','Utazásaim'],
 ['Trip Flow','Útiterv'],
 ['Refresh','Frissítés'],
 ['Download','Letöltés'],
 ['Upload','Feltöltés'],
 ['Import','Importálás'],
 ['Export','Exportálás'],
 ['Settings','Beállítások'],
 ['Search','Keresés'],
 ['Save','Mentés'],
 ['Cancel','Mégse'],
 ['Close','Bezárás'],
 ['Back','Vissza'],
 ['Home','Kezdőlap'],
 ['Loading…','Betöltés…'],
 ['Loading...','Betöltés…'],
 ['Tasks','Feladatok'],
 ['Profile','Profil'],
 ['Timer','Időzítő'],
 ['Health · Nutri Info','Egészség · Tápérték'],
 ['HEALTH · NUTRI INFO','EGÉSZSÉG · TÁPÉRTÉK'],
 ['LIVE STOP FLOW','ÉLŐ MEGÁLLÓFIGYELÉS'],
 ['Quick update','Gyorsfrissítés'],
 ['Update','Frissítés'],
 ['Notifications','Értesítések'],
 ['My Places','Kedvenc helyek'],
 ['Family Tasks','Családi feladatok'],
 ['Ask Léna','Kérdezd Lénát'],
 ['Nutrition','Táplálkozás'],
 ['NUTRITION','TÁPLÁLKOZÁS'],
 ['Family Guard','Biztonság'],
 ['Daily Spark','Asztrológia'],
 ['Daily Headline','Vezércikk'],
 ['Daily Health','Egészségfigyelés'],
 ['Trip Planner','Útvonaltervező'],
 ['Health','Egészség'],
 ['Safety','Biztonság'],
 ['Travel','Utazás'],
 ['Shopping','Bevásárlás'],
 ['Sports','Sport'],
 ['Lifestyle','Életmód']
];
const toHU=new Map(lex),toEN=new Map(lex.map(([en,hu])=>[hu,en]));
function lang(){try{return w.SH9_I18N_V1?.getLanguage?.()||(w.localStorage?.getItem('sh9-language-v1')==='en'?'en':'hu')}catch(_){return 'hu'}}
const originals=new WeakMap();
function translateText(n,l){
 if(n.parentElement?.closest('script,style,textarea,input,select,option,[contenteditable],code,pre,[data-i18n],[data-sh9-no-translate]'))return;
 const old=originals.get(n)||n.nodeValue;
 const trimmed=old.trim();
 if(!trimmed)return;
 const canonical=toEN.has(trimmed)?toEN.get(trimmed):trimmed;
 if(!toHU.has(canonical))return;
 originals.set(n,canonical);
 const next=l==='en'?canonical:toHU.get(canonical);
 if(n.nodeValue!==next)n.nodeValue=old.replace(trimmed,next);
}
let scheduled=false,working=false;
function apply(){
 if(working||!d.body)return;
 working=true;
 try{
 const l=lang(); d.documentElement.lang=l==='en'?'en-CA':'hu-HU';
 const walker=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT);
 let n;while((n=walker.nextNode()))translateText(n,l);
 }finally{working=false}
}
function schedule(){if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;apply()})}
function init(){
 apply();
 if(typeof MutationObserver!=='undefined'){
  const mo=new MutationObserver(records=>{
   if(working)return;
   if(records.some(r=>r.type==='childList'&&r.addedNodes.length))schedule();
  });
  mo.observe(d.body,{subtree:true,childList:true});
 }
 w.addEventListener('sh9:languagechange',schedule);
 w.addEventListener('storage',e=>{if(e.key==='sh9-language-v1')schedule()});
 w.addEventListener('pageshow',schedule);
}
w.SH9_LANGUAGE_BRIDGE_V1=Object.freeze({version:1,refresh:apply});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
