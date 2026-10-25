/* Family Guard v813 · read-only, coordinate-free connection diagnostics.
 * This intentionally distinguishes browser GPS from HH One native service:
 * the website cannot inspect Android service state and must say "unknown".
 */
(function(w,d){
'use strict';
const KEY='hh-service-guardian-gps-v806';
const maxAge=45000;
function make(tag,txt){const n=d.createElement(tag);if(txt!==undefined)n.textContent=txt;return n}
function age(iso){const n=Date.parse(iso||'');return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/1000)):null}
function value(code){
 if(!code)return 'Nincs friss mérési állapot';
 if(code.state==='denied'||code.errorCode===1)return 'Helyengedély megtagadva';
 if(code.state==='unsupported')return 'Nem támogatott / nem biztonságos környezet';
 if(code.state==='paused')return 'Szünetel vagy új GPS-fixre vár';
 if(code.state==='stopped')return 'Böngészős GPS leállítva';
 if(code.state==='error')return 'Böngészős GPS-hiba';
 if(code.state==='starting')return 'GPS indítása folyamatban';
 if(code.state==='fix')return 'Utolsó GPS-fix fogadva';
 return 'Állapot: '+String(code.state||'ismeretlen').slice(0,45);
}
function init(){
 const anchor=d.getElementById('guardianStatus');if(!anchor||d.getElementById('guardianConnectionHealth813'))return;
 const panel=make('section');panel.id='guardianConnectionHealth813';
 panel.setAttribute('aria-label','GPS kapcsolat diagnosztika');
 panel.style.cssText='margin:10px 0;padding:12px;border:1px solid rgba(105,175,230,.5);border-radius:14px;background:rgba(8,29,53,.92);color:#eef7ff;font:12px/1.55 system-ui';
 const title=make('strong','📡 GPS · Connection Health');title.style.display='block';title.style.marginBottom='6px';
 const browser=make('div'),family=make('div'),native=make('div'),hint=make('small');
 hint.style.cssText='display:block;color:#b7d6e8;margin-top:6px';
 panel.append(title,browser,family,native,hint);
 anchor.insertAdjacentElement('afterend',panel);
 function refresh(){
  let diagnostic=null;
  try{diagnostic=JSON.parse(w.localStorage.getItem(KEY)||'null')}catch(_){}
  const secs=age(diagnostic&&diagnostic.at);
  const fresh=secs!==null&&secs<=maxAge/1000;
  const browserActive=!!w.HH_GUARDIAN_V761?.active;
  browser.textContent='Böngészős GPS: '+(browserActive?'követés elindítva':fresh?value(diagnostic):'nincs aktuális követési adat')+
   (secs!==null?' · utolsó esemény '+secs+' mp':'');
  const live=w.HH_GUARDIAN_LIVE_V785;
  family.textContent='Family Live: '+(!live?'állapot nem elérhető':!live.authenticated?'nincs hitelesített kapcsolat':live.sharing?'megosztás engedélyezve (feltöltés nem igazolt)':'nincs aktív megosztás');
  native.textContent='HH One natív GPS: weboldalról nem ellenőrizhető';
  hint.textContent=d.hidden?'Az oldal háttérben van; böngészős GPS nem követ.':'A natív GPS aktív jelzése önmagában nem jelent élő Family Live helymegosztást.';
 }
 refresh();
 const timer=w.setInterval(()=>{if(!d.hidden)refresh()},5000);
 d.addEventListener('visibilitychange',refresh);
 w.addEventListener('pagehide',()=>w.clearInterval(timer),{once:true});
 w.HH_GUARDIAN_CONNECTION_HEALTH_V813={refresh};
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
