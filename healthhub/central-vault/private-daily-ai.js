(function(){
'use strict';
/* HealthHub v321: authenticated private daily AI report viewer. No report stored in GitHub or localStorage. */
var API=window.HH_DAILY_HEALTH_SYNC_V319;
var host=null,rows=[],loadedDay='',lastLoad=0,busy=false,message='',error='';
function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]})}
function signed(){return API&&API.getStatus&&API.getStatus().authenticated}
function consent(k){
 try{var d=JSON.parse(localStorage.getItem('hh-daily-health-factors-317')||'null');return d&&d[k]&&d[k].aiDailyOptIn===true}catch(e){return false}
}
function panel(k){
 var name=k==='monika'?'Mónika':'Zsolt',localKey=k==='monika'?'m':'z';
 var result=rows.find(function(x){return x.profile_key===k});
 var heading='<div class="hhpai-profile"><h3>'+(k==='monika'?'🩷 ':'💙 ')+name+'</h3>';
 if(result&&result.report){
  var r=result.report;
  return heading+'<p><b>'+esc(r.headline)+'</b></p><p>'+esc(r.overview)+'</p>'+
   '<p>'+esc(r.attention)+'</p>'+
   '<ul>'+(Array.isArray(r.tips)?r.tips:[]).map(function(v){return '<li>'+esc(v)+'</li>'}).join('')+'</ul>'+
   '<p class="hhpai-muted">Bizonytalanságok: '+esc(r.uncertainty)+'</p>'+
   '<p class="hhpai-muted">🔒 Csak bejelentkezés után · '+esc(day())+'</p></div>';
 }
 if(!consent(localKey))return heading+'<p class="hhpai-muted">A napi privát AI-elemzés még nincs engedélyezve ennél a profilnál. A Daily Health Beállítások oldalon külön engedélyezhető.</p></div>';
 return heading+'<p class="hhpai-muted">Ma még nincs személyes jelentés. Az AI csak központilag szinkronizált, engedélyezett tényezőket dolgozhat fel.</p>'+
  '<button type="button" data-hhpai-generate="'+k+'" '+(busy?'disabled':'')+'>🧠 Mai privát jelentés készítése</button></div>';
}
function paint(){
 if(!host||!host.isConnected)return;
 if(!signed()){
  host.innerHTML='<div class="hhpai-panel"><p>🔐 A személyre szabott jelentéseket csak a Központi Health Vaultba történő bejelentkezés után lehet megnyitni.</p></div>';
  return;
 }
 host.innerHTML='<div class="hhpai-panel"><p class="hhpai-muted">Profilonként külön, privát AI-összefoglaló. A bejelölt figyelési témák nem jelentenek igazolt diagnózist.</p>'+
  panel('monika')+panel('zsolt')+
  '<div class="hhpai-controls"><button type="button" data-hhpai-refresh="1" '+(busy?'disabled':'')+'>🔄 Privát jelentések frissítése</button></div>'+
  (busy?'<p class="hhpai-muted">Központi kapcsolat / AI-elemzés folyamatban…</p>':'')+
  (message?'<p class="hhpai-muted">'+esc(message)+'</p>':'')+
  (error?'<p class="hhpai-error" role="alert">'+esc(error)+'</p>':'')+'</div>';
}
async function load(force){
 if(!signed()){rows=[];paint();return}
 var d=day();
 if(busy)return;
 if(!force&&loadedDay===d&&Date.now()-lastLoad<60000){paint();return}
 busy=true;error='';paint();
 try{
  var data=await API.request('/rest/v1/hh_daily_health_ai_reports?select=profile_key,report_date,generated_at,report&report_date=eq.'+
    encodeURIComponent(d)+'&status=eq.ready');
  if(!Array.isArray(data))throw new Error('Nem olvasható a privát jelentések listája.');
  rows=data;loadedDay=d;lastLoad=Date.now();
 }catch(e){error=e.message||'Nem sikerült a privát adatok lekérése.'}
 finally{busy=false;paint()}
}
async function generate(k){
 if(!signed()||busy)return;
 if(!consent(k==='monika'?'m':'z')){error='Először add meg a külön napi AI-hozzájárulást.';paint();return}
 busy=true;message='';error='';paint();
 try{
  var answer=await API.request('/functions/v1/healthhub-personal-ai',{method:'POST',data:{mode:'generate',profile_key:k}});
  if(answer&&answer.ok)message=answer.reason==='ready'?'A mai jelentés már elkészült.':'A mai személyes AI-jelentés elkészült.';
  else if(answer?.reason==='no_consent')error='A felhőben még nincs engedélyezve a napi AI-elemzés. Ellenőrizd a zöld szinkronállapotot.';
  else if(answer?.reason==='pending')error='Egy jelentés már készül. Várj egy percet, majd frissíts.';
  else error='A generálás nem fejeződött be ('+String(answer?.reason||'hiba')+').';
 }catch(e){error=e.message||'Nem sikerült elindítani a szerveroldali AI-elemzést.'}
 finally{busy=false;lastLoad=0;await load(true)}
}
function mount(target){
 host=target;if(!host)return;
 if(!document.getElementById('hhpai-style')){
  var css=document.createElement('style');css.id='hhpai-style';
  css.textContent='.hhpai-panel{font-size:12px;color:#16445b;line-height:1.55}.hhpai-panel p{margin:7px 0}.hhpai-panel h3{font-size:13px;margin:3px 0 7px}.hhpai-profile{border-top:1px solid #e5eef0;padding:11px 0}.hhpai-muted{font-size:10px;color:#64818e}.hhpai-error{color:#b43144;font-weight:800}.hhpai-panel button{background:#e5f3fb;border:1px solid #bddde8;color:#194b65;border-radius:9px;padding:8px 10px;font-size:11px;font-weight:800}.hhpai-panel ul{padding-left:18px}.hhpai-controls{margin-top:5px}';
  document.head.appendChild(css);
 }
 if(!host.dataset.hhpaiBound){
  host.dataset.hhpaiBound='1';
  host.addEventListener('click',function(e){
   var b=e.target.closest('button[data-hhpai-refresh],button[data-hhpai-generate]');if(!b)return;
   if(b.dataset.hhpaiRefresh)load(true);
   if(b.dataset.hhpaiGenerate)generate(b.dataset.hhpaiGenerate);
  });
 }
 paint();
 load(false);
}
window.HH_PRIVATE_DAILY_AI_V321={mount:mount,refresh:function(){return load(true)}};
window.addEventListener('healthhub:central-auth-changed',function(){loadedDay='';lastLoad=0;load(true)});
})();
