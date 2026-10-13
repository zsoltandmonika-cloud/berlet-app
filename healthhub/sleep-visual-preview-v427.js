(function(){
'use strict';
// Explicit preview opt-in; disabled by default even when the script is present.
try{if(new URLSearchParams(window.location.search).get('hh_sleep_v427_preview')==='1')window.HH_SLEEP_VISUAL_V427_ENABLED=true;}catch(e){}
/* v427: opt-in, read-only visual adapter for the existing canonical Sleep data.
   Never fetches, stores, uploads or merges profiles. Disabled unless enabled explicitly. */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function day(iso){var d=new Date(iso);return isFinite(d.getTime())?d.toLocaleDateString('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit'}):''}
function clock(iso){var d=new Date(iso);return isFinite(d.getTime())?d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—'}
function minutes(sec){return Math.max(0,Math.round(sec/60))+' p'}
var colors={1:'#f15e91',4:'#8769eb',5:'#4531b4',6:'#c0acff'};
var names={1:'Ébren',4:'Könnyű',5:'Mély',6:'REM'};
var state={zsolt:'',monika:''};
function getSessions(rows){
 return (Array.isArray(rows)?rows:[]).filter(function(s){
  return s&&isFinite(Date.parse(s.startTime))&&isFinite(Date.parse(s.endTime))&&Date.parse(s.endTime)>Date.parse(s.startTime);
 }).slice().sort(function(a,b){return Date.parse(b.endTime)-Date.parse(a.endTime)});
}
function sessionHtml(s,index){
 var a=Date.parse(s.startTime),b=Date.parse(s.endTime),duration=b-a;
 var stages=(Array.isArray(s.stages)?s.stages:[]).filter(function(x){
  return colors[Number(x.stage)]&&isFinite(Date.parse(x.startTime))&&isFinite(Date.parse(x.endTime))&&Date.parse(x.endTime)>Date.parse(x.startTime);
 });
 var sums={},segments=stages.map(function(x){
  var l=Math.max(0,Date.parse(x.startTime)-a),r=Math.min(duration,Date.parse(x.endTime)-a),c=Number(x.stage);
  if(r<=l)return '';
  sums[c]=(sums[c]||0)+(r-l)/1000;
  return '<i style="position:absolute;top:'+({1:0,6:25,4:50,5:75}[c])+'%;height:24%;left:'+(100*l/duration).toFixed(3)+'%;width:'+(100*(r-l)/duration).toFixed(3)+'%;background:'+colors[c]+'" title="'+esc(names[c]+' '+clock(x.startTime)+'–'+clock(x.endTime))+'"></i>';
 }).join('');
 var known=[4,5,6].some(function(k){return Object.prototype.hasOwnProperty.call(sums,k)});
 var asleep=known?minutes((sums[4]||0)+(sums[5]||0)+(sums[6]||0)):'nincs adat';
 return '<div style="padding:12px 0;border-top:1px solid #dfe6ee"><b>'+index+'. '+esc(clock(s.startTime))+'–'+esc(clock(s.endTime))+'</b><div>Teljes időszak: '+minutes(duration/1000)+' · Tényleges alvás: '+asleep+' · Ébren: '+(sums[1]!=null?minutes(sums[1]):'nincs adat')+'</div>'+
 '<div role="img" aria-label="Valódi mért alvásfázisok időaránya" style="position:relative;width:100%;height:116px;background:#edf0f5;border-radius:8px;overflow:hidden;margin-top:8px">'+segments+'</div>'+
 '<div style="display:flex;justify-content:space-between;font-size:12px"><span>'+esc(clock(s.startTime))+'</span><span>'+esc(clock(s.endTime))+'</span></div>'+
 '<small>Forrás: '+esc(s.sourcePackage||'nem ismert')+'</small></div>';
}
function render(rows,p){
 if(window.HH_SLEEP_VISUAL_V427_ENABLED!==true)return '';
 if(!['zsolt','monika'].includes(p))return '';
 var list=getSessions(rows),today=day(new Date().toISOString()),dates=[];
 // local noon dates, not UTC-midnight arithmetic
 var now=new Date();
 for(var i=29;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,12);dates.push(day(d.toISOString()))}
 var grouped={};list.forEach(function(s){var k=day(s.endTime);if(k)(grouped[k]||(grouped[k]=[])).push(s)});
 var selected=state[p]&&dates.includes(state[p])?state[p]:(dates.filter(function(k){return !!grouped[k]}).pop()||today);
 state[p]=selected;
 var buttons=dates.map(function(k){
  var n=(grouped[k]||[]).length;
  return '<button type="button" data-hh-sleep-v427-day="'+esc(k)+'" aria-pressed="'+(k===selected)+'" '+(!n?'disabled':'')+' style="flex:none;min-width:65px;padding:8px;border-radius:8px;border:1px solid #cedae7;background:'+(k===selected?'#155c9c':'#e6edf5')+';color:'+(k===selected?'white':'#233b52')+';opacity:'+(!n?'.55':'1')+'">'+esc(k.slice(5))+'<br>'+(n?'● '+n:'–')+'</button>';
 }).join('');
 var selectedRows=grouped[selected]||[];
 return '<section class="hhSleepVisualV427 hhSleepCard" data-hh-sleep-v427-profile="'+esc(p)+'" style="padding:16px;margin:12px 0;color:#173652">'+
 '<h3 style="margin:0 0 8px">🌙 Alvás · 30 napos naptár (előnézet)</h3>'+
 '<p style="font-size:13px">A már szinkronizált '+(p==='monika'?'Mónika':'Zsolt')+'-adatokból. Ébredési nap szerint; új adatolvasás nem történik.</p>'+
 '<div style="display:flex;gap:5px;overflow-x:auto;padding:4px 0 10px" class="hhSleepVisualV427Days">'+buttons+'</div>'+
 '<h4 style="margin:8px 0">'+esc(selected)+' · '+selectedRows.length+' alvásrekord</h4>'+
 (selectedRows.length>1?'<p style="font-size:13px">Több különálló alvásrekord. Nem vonjuk össze őket.</p>':'')+
 (selectedRows.length?selectedRows.map(sessionHtml).join(''):'<p>Ehhez a naphoz nincs szinkronizált alvásadat.</p>')+
 '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px">'+[1,4,5,6].map(function(k){return '<span><i style="display:inline-block;width:10px;height:10px;background:'+colors[k]+';border-radius:3px"></i> '+names[k]+'</span>'}).join('')+'</div>'+
 '<p style="font-size:12px">Előnézet: nem számít alváspontszámot, nem módosít szinkronizált adatot.</p></section>';
}
document.addEventListener('click',function(e){
 var btn=e.target&&e.target.closest&&e.target.closest('[data-hh-sleep-v427-day]');if(!btn)return;
 var card=btn.closest('[data-hh-sleep-v427-profile]');if(!card)return;
 var p=card.getAttribute('data-hh-sleep-v427-profile');
 if(p!==profile())return; // prevent stale profile card from altering view
 state[p]=btn.getAttribute('data-hh-sleep-v427-day');
 if(typeof window.hhRenderSleep==='function')window.hhRenderSleep(p);
});
window.HH_SLEEP_VISUAL_V427={render:render};
})();
