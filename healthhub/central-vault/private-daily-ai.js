(function(){
'use strict';
/* HealthHub v321: authenticated private daily AI report viewer. No report stored in GitHub or localStorage. */
var API=window.HH_DAILY_HEALTH_SYNC_V319;

var host=null,rows=[],loadedDay='',lastLoad=0,busy=false,error='',notice='',hasMore=false;
var archiveSelection={monika:null,zsolt:null},autoRunning=false,autoAttempted={};
var PAGE=50;
function api(){return window.HH_DAILY_HEALTH_SYNC_V319}
function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function signed(){var a=api();return !!(a&&a.getStatus&&a.getStatus().authenticated)}
function consent(k){
 try{var d=JSON.parse(localStorage.getItem('hh-daily-health-factors-317')||'null');return !!(d&&d[k==='monika'?'m':'z']&&d[k==='monika'?'m':'z'].aiDailyOptIn===true)}
 catch(e){return false}
}
function pretty(d){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))return String(d||'Ismeretlen nap');
 return new Date(d+'T12:00:00').toLocaleDateString('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
}
function reportRows(k){return rows.filter(function(x){return x&&x.profile_key===k&&x.report&&x.report_date})}
function reportContent(r){
 var z=r.report;
 return '<article class="hhpai-report" aria-label="'+esc(pretty(r.report_date))+' privát briefing">'+
  '<div class="hhpai-date">📅 '+esc(pretty(r.report_date))+'</div>'+
  '<p><b>'+esc(z.headline)+'</b></p><p>'+esc(z.overview)+'</p><p>'+esc(z.attention)+'</p>'+
  '<ul>'+(Array.isArray(z.tips)?z.tips:[]).map(function(v){return '<li>'+esc(v)+'</li>'}).join('')+'</ul>'+
  '<p class="hhpai-muted">Bizonytalanságok: '+esc(z.uncertainty)+'</p></article>';
}
function panel(k){
 var name=k==='monika'?'Mónika':'Zsolt',data=reportRows(k),today=day();
 var chosen=archiveSelection[k],picked=(chosen&&data.find(function(r){return r.report_date===chosen}))||
   data.find(function(r){return r.report_date===today})||data[0];
 var todayReady=data.some(function(r){return r.report_date===today});
 var heading='<section class="hhpai-profile"><h3>'+(k==='monika'?'🩷 ':'💙 ')+name+'</h3>';
 if(!consent(k))heading+='<p class="hhpai-muted">A további automatikus privát AI-elemzés nincs engedélyezve. A Daily Health beállításainál külön bekapcsolható. A korábbi jelentések megmaradnak.</p>';
 else if(!todayReady)heading+='<p class="hhpai-wait">⏳ A mai privát briefing automatikusan elkészül, amint a mai környezeti adatok rendelkezésre állnak. Addig az utolsó kész jelentés látható.</p>';
 else heading+='<p class="hhpai-ready">✅ A mai privát jelentés elkészült és az archívumba került.</p>';
 if(picked)heading+=reportContent(picked);
 else heading+='<p class="hhpai-muted">Még nincs elkészült privát briefing. A rendszer automatikusan készíti, amikor van friss adat és aktív hozzájárulás.</p>';
 if(data.length){
  heading+='<label class="hhpai-history-label">📚 Briefing-előzmények ('+data.length+(hasMore?'+':'')+')'+
   '<select data-hhpai-history="'+k+'" aria-label="'+esc(name)+' privát briefing dátum választó">';
  data.forEach(function(r){
   heading+='<option value="'+esc(r.report_date)+'"'+(picked&&picked.report_date===r.report_date?' selected':'')+'>'+esc(pretty(r.report_date))+'</option>';
  });
  heading+='</select></label>';
 }
 return heading+'</section>';
}
function paint(){
 if(!host||!host.isConnected)return;
 if(!signed()){
  host.innerHTML='<div class="hhpai-panel"><p>🔐 A privát briefingek és előzményeik csak a Központi Health Vaultba való bejelentkezéssel érhetők el.</p></div>';
  return;
 }
 host.innerHTML='<div class="hhpai-panel"><p class="hhpai-muted">🔒 Automatikusan készülő privát jelentések. Mónika és Zsolt előzményei külön, jogosultságvédett tárhelyen maradnak. A figyelési témák önmagukban nem diagnózisok.</p>'+
 (error?'<p class="hhpai-error" role="alert">⚠️ '+esc(error)+'</p>':'')+
 (notice?'<p class="hhpai-muted" role="status">'+esc(notice)+'</p>':'')+
 panel('monika')+panel('zsolt')+
 '<div class="hhpai-controls"><button type="button" data-hhpai-refresh="1" '+(busy?'disabled':'')+'>🔄 Jelentések frissítése</button>'+
 (hasMore?'<button type="button" data-hhpai-more="1" '+(busy?'disabled':'')+'>📚 Régebbi jelentések betöltése</button>':'')+'</div>'+
 (busy||autoRunning?'<p class="hhpai-muted">⏳ Privát jelentések ellenőrzése folyamatban…</p>':'')+
 '</div>';
}
function reportsUrl(offset){
 return '/rest/v1/hh_daily_health_ai_reports?select=profile_key,report_date,generated_at,report'+
 '&status=eq.ready&order=report_date.desc,profile_key.asc&limit='+(PAGE+1)+'&offset='+offset;
}
async function load(force,older){
 if(!signed()){rows=[];loadedDay='';paint();return}
 if(busy)return;
 var today=day();
 if(!force&&!older&&loadedDay===today&&Date.now()-lastLoad<120000){paint();return}
 busy=true;error='';paint();
 try{
  var offset=older?rows.length:0,data=await api().request(reportsUrl(offset));
  if(!Array.isArray(data))throw new Error('A privát archívum nem válaszolt');
  hasMore=data.length>PAGE;
  if(older)rows=rows.concat(data.slice(0,PAGE));
  else rows=data.slice(0,PAGE);
  lastLoad=Date.now();loadedDay=today;
  if(!older&&!autoRunning)void autoGenerate(today);
 }catch(e){error=e.message||'A privát előzmények átmenetileg nem érhetők el.'}
 finally{busy=false;paint()}
}
async function readyPublic(today){
 try{
  var r=await fetch('./data/daily-health-public.json?at='+Date.now(),{cache:'no-store'});
  if(!r.ok)return false;
  var j=await r.json();
  return j&&j.schema==='healthhub.daily-health-public/1'&&j.date===today;
 }catch(e){return false}
}
function attemptedRecently(key){
 if(autoAttempted[key])return true;
 try{
  var t=Number(sessionStorage.getItem('hhpai-auto-'+key)||0);
  return Number.isFinite(t)&&t>0&&Date.now()-t<45*60000;
 }catch(e){return false}
}
function noteAttempt(key,on){
 autoAttempted[key]=!!on;
 try{if(on)sessionStorage.setItem('hhpai-auto-'+key,String(Date.now()));
 else sessionStorage.removeItem('hhpai-auto-'+key)}catch(e){}
}
async function autoGenerate(today){
 if(autoRunning||!signed()||today!==day())return;
 var eligible=['monika','zsolt'].filter(function(k){
  return consent(k)&&!reportRows(k).some(function(r){return r.report_date===today})&&!attemptedRecently(today+':'+k);
 });
 if(!eligible.length)return;
 if(!(await readyPublic(today)))return;
 autoRunning=true;paint();
 var changed=false;
 try{
  for(var i=0;i<eligible.length;i++){
   var k=eligible[i],key=today+':'+k;
   noteAttempt(key,true); // avoid repeated AI charges across page reloads
   try{
    var result=await api().request('/functions/v1/healthhub-personal-ai',{method:'POST',data:{mode:'generate',profile_key:k}});
    if(result&&result.ok)changed=true;
    else if(result&&result.reason==='source_not_ready')noteAttempt(key,false);
    else if(result&&result.reason==='generation_failed')notice='⚠️ A napi generálás szerveroldali hibát jelzett. A korábbi briefing továbbra is elérhető.';
   }catch(e){notice='⚠️ Az automatikus jelentéskészítés átmenetileg nem elérhető. Az archívum megmarad.'}
  }
 }finally{
  autoRunning=false;
  if(changed){lastLoad=0;await load(true,false)}
  paint();
 }
}
function mount(target){
 host=target;if(!host)return;
 if(!document.getElementById('hhpai-style')){
  var css=document.createElement('style');css.id='hhpai-style';
  css.textContent=[
   '.hhpai-panel{font-size:12px;color:#16445b;line-height:1.6}',
   '.hhpai-panel p{margin:7px 0}.hhpai-panel h3{font-size:14px;margin:3px 0 8px}',
   '.hhpai-profile{border-top:1px solid #e5eef0;padding:12px 0}',
   '.hhpai-muted{font-size:11px;color:#64818e}.hhpai-date{font-size:11px;font-weight:800;color:#547588}',
   '.hhpai-error{color:#a62e3f;font-weight:750;background:#fff0f0;border:1px solid #f0c6c6;border-radius:9px;padding:10px}',
   '.hhpai-ready{color:#197454;font-weight:700}.hhpai-wait{color:#53758d}',
   '.hhpai-report{background:#f8fbfd;border:1px solid #deebf0;border-radius:12px;padding:12px;margin:10px 0}',
   '.hhpai-report ul{padding-left:18px}.hhpai-history-label{display:block;font-size:12px;font-weight:800;margin:12px 0 0}',
   '.hhpai-history-label select{display:block;box-sizing:border-box;width:100%;min-height:42px;border:1px solid #bedde8;border-radius:10px;padding:9px;background:#fff;color:#194b65;margin-top:6px;font:inherit}',
   '.hhpai-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
   '.hhpai-panel button{background:#e5f3fb;border:1px solid #bddde8;color:#194b65;border-radius:9px;padding:10px 12px;font-size:11px;font-weight:800}',
   '.hhpai-panel button:disabled{opacity:.55}'
  ].join('');
  document.head.appendChild(css);
 }
 if(!host.dataset.hhpaiBound){
  host.dataset.hhpaiBound='1';
  host.addEventListener('click',function(e){
   var b=e.target.closest('button[data-hhpai-refresh],button[data-hhpai-more]');
   if(!b)return;
   if(b.dataset.hhpaiRefresh)load(true,false);
   if(b.dataset.hhpaiMore)load(true,true);
  });
  host.addEventListener('change',function(e){
   var box=e.target.closest('select[data-hhpai-history]');
   if(!box)return;
   archiveSelection[box.dataset.hhpaiHistory]=box.value;paint();
  });
 }
 paint();void load(false,false);
}
window.HH_PRIVATE_DAILY_AI_V321={mount:mount,refresh:function(){return load(true,false)}};
window.addEventListener('healthhub:central-auth-changed',function(){loadedDay='';lastLoad=0;rows=[];archiveSelection={monika:null,zsolt:null};void load(true,false)});
setTimeout(function(){if(window.HH_DAILY_HEALTH_V312&&window.HH_DAILY_HEALTH_V312.render)window.HH_DAILY_HEALTH_V312.render()},0);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&host&&host.isConnected&&signed()&&Date.now()-lastLoad>300000)void load(true,false)});
setInterval(function(){if(document.visibilityState==='visible'&&host&&host.isConnected&&signed()&&Date.now()-lastLoad>300000)void load(true,false)},60000);
})();
