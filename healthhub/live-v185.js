(function(){
'use strict';
/* HealthHub v1.89 — Activity mobile layout + full categories + manual exercise input */
var KEY='hh-activity-manual-v185-';
var CATS=[
 {k:'walk',label:'Gyaloglás',short:'Séta',icon:'🚶',tone:'pink'},
 {k:'run',label:'Futás',short:'Futás',icon:'🏃',tone:'orange'},
 {k:'bike',label:'Kerékpár',short:'Kerékpár',icon:'🚴',tone:'blue'},
 {k:'workout',label:'Edzés',short:'Edzés',icon:'🏋️',tone:'violet'},
 {k:'yoga',label:'Jóga',short:'Jóga',icon:'🧘',tone:'purple'},
 {k:'pilates',label:'Pilates',short:'Pilates',icon:'🤸',tone:'cyan'},
 {k:'hike',label:'Túrázás',short:'Túrázás',icon:'🥾',tone:'green'},
 {k:'other',label:'Egyéb',short:'Egyéb',icon:'✨',tone:'violet'}
];
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{maximumFractionDigits:d==null?0:d}):'—'}
function mins(a,b){var m=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(m)&&m>0?m:0}
function dur(m){m=Math.round(Number(m)||0);var h=Math.floor(m/60),x=m%60;return h?(h+' ó '+x+' p'):(m+' p')}
function fmtDate(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function infer(s){
 var raw=((s&&s.manualType)||'')+' '+((s&&s.title)||''); raw=raw.toLocaleLowerCase('hu-HU');
 if(raw.indexOf('pilat')>=0)return 'pilates';
 if(raw.indexOf('jóga')>=0||raw.indexOf('yoga')>=0)return 'yoga';
 if(raw.indexOf('túra')>=0||raw.indexOf('hike')>=0||raw.indexOf('hiking')>=0)return 'hike';
 if(raw.indexOf('séta')>=0||raw.indexOf('gyalog')>=0||raw.indexOf('walk')>=0)return 'walk';
 if(raw.indexOf('fut')>=0||raw.indexOf('run')>=0)return 'run';
 if(raw.indexOf('kerék')>=0||raw.indexOf('bike')>=0||raw.indexOf('cycl')>=0)return 'bike';
 if(raw.indexOf('edzés')>=0||raw.indexOf('erős')>=0||raw.indexOf('workout')>=0||raw.indexOf('strength')>=0)return 'workout';
 var t=Number(s&&s.exerciseType); if(t===16)return'hike';if(t===20)return'run';if(t===56)return'walk';if(t===79)return'yoga';if(t===2)return'bike';if(t===35)return'workout';
 return 'other';
}
function cat(k){return CATS.find(function(x){return x.k===k})||CATS[CATS.length-1]}
function loadManual(){try{var a=JSON.parse(localStorage.getItem(KEY+pkey())||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function saveManual(a){localStorage.setItem(KEY+pkey(),JSON.stringify(a))}
function manualAsSession(x){return {id:x.id,title:cat(x.type).label,manualType:x.type,startTime:x.startTime,endTime:new Date(Date.parse(x.startTime)+(Number(x.duration)||0)*60000).toISOString(),distanceKm:Number(x.distance)||0,caloriesKcal:Number(x.calories)||0,avgBpm:Number(x.avgBpm)||0,_manual:true}}
function combined(){var c=window.hhActivityCache||{sessions:[],heart:[]};return (c.sessions||[]).concat(loadManual().map(manualAsSession)).sort(function(a,b){return Date.parse(b.startTime||b.endTime||0)-Date.parse(a.startTime||a.endTime||0)})}
function hrForLocal(s){if(Number(s.avgBpm)>0)return Number(s.avgBpm);var c=window.hhActivityCache||{},a=Date.parse(s.startTime),b=Date.parse(s.endTime),v=(c.heart||[]).filter(function(x){var t=Date.parse(x.time),z=Number(x.bpm);return t>=a&&t<=b&&Number.isFinite(z)}).map(function(x){return Number(x.bpm)});return v.length?v.reduce(function(x,y){return x+y},0)/v.length:null}
function distance(s){var d=Number(s.distanceKm);if(d>0)return d;d=Number(s.distanceMeters);if(d>0)return d/1000;return null}
function calories(s){var v=Number(s.caloriesKcal);if(v>0)return v;v=Number(s.energyKcal);return v>0?v:null}
function periodCut(){var st=window.hhActivityState||{period:'1d'},days=st.period==='1d'?1:(st.period==='7d'?7:(st.period==='30d'?30:365));return Date.now()-days*86400000}
function enhanceTypes(){
 var host=document.querySelector('#hhActivityPage .hhActTypes');if(!host)return;var cut=periodCut(),ss=combined().filter(function(s){return Date.parse(s.endTime||s.startTime||0)>=cut});
 var cnt={};CATS.forEach(function(x){cnt[x.k]=0});ss.forEach(function(s){cnt[infer(s)]=(cnt[infer(s)]||0)+1});
 host.innerHTML=CATS.map(function(x,i){return '<button class="hhActType '+x.tone+(i===0?' on':'')+'" onclick="hhActivityManualOpen(\''+x.k+'\')"><span>'+x.icon+'</span><b>'+esc(x.label)+'</b><small>'+(cnt[x.k]||0)+' alkalom</small></button>'}).join('');
 var card=host.closest('.hhActTypesCard');if(card){var title=card.querySelector('.hhActTitle>strong');if(title)title.textContent='8 kategória';}
}
function recentRow(s){var c=cat(infer(s)),m=mins(s.startTime,s.endTime),d=distance(s),k=calories(s),h=hrForLocal(s);return '<div class="row"><span class="rI">'+c.icon+'</span><div class="rT"><b>'+esc(c.label)+(s._manual?' · manuális':'')+'</b><small>'+esc(fmtDate(s.startTime))+'</small></div><div class="rS">'+(d!=null?'<span>📍 '+n(d,2)+' km</span>':'')+'<span>⏱ '+dur(m)+'</span>'+(k!=null?'<span>🔥 '+n(k,0)+' kcal</span>':'')+(h!=null?'<span>💗 '+n(h,0)+' bpm</span>':'')+'</div><strong>›</strong></div>'}
function enhanceRecent(){var host=document.querySelector('#hhActivityPage .hhActRecent');if(!host)return;var ss=combined().slice(0,5);host.innerHTML=ss.length?ss.map(recentRow).join(''):'<div class="hhActNo">Nincs rögzített edzés.</div>';var card=host.closest('.hhActRecentCard');if(card)card.style.height='auto'}
function addManual(){
 var body=document.querySelector('#hhActivityPage .hhActBody');if(!body||body.querySelector('.hhActManualCard'))return;var card=document.createElement('section');card.className='hhActManualCard';
 card.innerHTML='<div class="hhActTitle"><span>➕</span><b>Manuális rögzítés</b><strong>HealthHub</strong></div><div class="hhActManualGrid">'+CATS.map(function(x){return '<button class="'+x.tone+'" onclick="hhActivityManualOpen(\''+x.k+'\')"><span>'+x.icon+'</span><b>'+esc(x.short)+'</b></button>'}).join('')+'</div>';
 body.appendChild(card);
}
function enhance(){if(!document.getElementById('hhActivityPage')||!document.querySelector('#hhActivityPage .hhActTopGrid'))return;enhanceTypes();enhanceRecent();addManual();}
window.hhActivityManualOpen=function(type){
 var m=document.getElementById('hhActModal');if(!m)return;var c=cat(type||'walk'),now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
 m.innerHTML='<div class="hhActSheet hhManualSheet"><div class="hhActSheetHead"><div><small>MANUÁLIS AKTIVITÁS</small><h3>'+c.icon+' '+esc(c.label)+'</h3></div><button onclick="hhActivityCloseModal()">×</button></div><div class="hhManualForm"><label>Aktivitás<select id="hhManType">'+CATS.map(function(x){return '<option value="'+x.k+'"'+(x.k===c.k?' selected':'')+'>'+esc(x.label)+'</option>'}).join('')+'</select></label><label>Kezdés<input id="hhManStart" type="datetime-local" value="'+local+'"></label><label>Időtartam<input id="hhManDur" type="number" min="1" step="1" value="30" inputmode="numeric"><span>perc</span></label><label>Távolság<input id="hhManDist" type="number" min="0" step="0.1" inputmode="decimal" placeholder="opcionális"><span>km</span></label><label>Kalória<input id="hhManCal" type="number" min="0" step="1" inputmode="numeric" placeholder="opcionális"><span>kcal</span></label><label>Átlag pulzus<input id="hhManHr" type="number" min="0" step="1" inputmode="numeric" placeholder="opcionális"><span>bpm</span></label><button class="hhManualSave" onclick="hhActivityManualSave()">Mentés az Activity-be</button></div></div>';m.classList.add('on');
};
window.hhActivityManualSave=function(){
 var type=document.getElementById('hhManType').value,start=document.getElementById('hhManStart').value,durv=Number(document.getElementById('hhManDur').value);if(!start||!durv||durv<1)return;
 var a=loadManual();a.unshift({id:'manual-'+Date.now(),type:type,startTime:new Date(start).toISOString(),duration:durv,distance:Number(document.getElementById('hhManDist').value)||0,calories:Number(document.getElementById('hhManCal').value)||0,avgBpm:Number(document.getElementById('hhManHr').value)||0,createdAt:new Date().toISOString()});saveManual(a.slice(0,250));if(window.hhActivityCloseModal)window.hhActivityCloseModal();setTimeout(enhance,40);
};
function style(){if(document.getElementById('hh-v189-style'))return;var s=document.createElement('style');s.id='hh-v189-style';s.textContent=
'.hhActivityPage{width:100%!important;max-width:430px!important;height:100dvh!important;inset:0 auto 0 50%!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;background:#eef8fd!important}'+
'.hhActHero{aspect-ratio:853/398!important;min-height:184px!important;max-height:214px!important}.hhActHero>img{image-rendering:auto!important;filter:saturate(1.03) contrast(1.015)!important}'+
'.hhActBody{padding:6px 6px calc(76px + env(safe-area-inset-bottom))!important;background:linear-gradient(180deg,#eef9fe,#f7fbfe)!important}.hhActTopGrid,.hhActSmallGrid{gap:6px!important;margin-bottom:6px!important}.hhActMetric{border-radius:14px!important;box-shadow:0 5px 15px rgba(32,84,117,.055)!important}.hhActTopGrid .hhActMetric{height:104px!important;padding:9px 7px 8px!important}.hhActSmallGrid .hhActMetric{height:67px!important;padding:8px 7px!important}.hhActMetric .ico{font-size:27px!important}.hhActSmallGrid .ico{font-size:20px!important}.hhActMetric small{font-size:9px!important;margin-top:6px!important}.hhActSmallGrid small{font-size:8px!important}.hhActMetric b{font-size:23px!important}.hhActSmallGrid b{font-size:17px!important}.hhActMetric em{font-size:9px!important}.hhActSmallGrid em{font-size:8px!important}'+
'.hhActChartCard,.hhActTypesCard,.hhActRecentCard,.hhActManualCard{border-radius:15px!important;box-shadow:0 5px 16px rgba(32,84,117,.05)!important;margin-bottom:7px!important}.hhActChartCard{height:157px!important;padding:9px 10px 7px!important}.hhActChart{height:122px!important}.hhActTitle{gap:7px!important}.hhActTitle>span{font-size:19px!important}.hhActTitle>b{font-size:12px!important}.hhActTitle>strong{font-size:9px!important}.hhActTitle .leg{font-size:7px!important}.hhActTitle .leg i{width:7px!important;height:7px!important}'+
'.hhActTypesCard{height:auto!important;padding:9px 10px 10px!important}.hhActTypes{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;margin-top:8px!important}.hhActTypes>button.hhActType{height:78px!important;border:1px solid #e8eef4;border-radius:13px;background:linear-gradient(180deg,#fff,#f8fbfd);padding:7px 3px;min-width:0;color:#123a5e}.hhActTypes>button.hhActType.on{border-color:#ff4f8d;background:#fff7fb}.hhActTypes .hhActType span{display:block;font-size:25px!important;line-height:1}.hhActTypes .hhActType b{display:block;font-size:9px!important;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActTypes .hhActType small{display:block;font-size:7px!important;color:#73899b;margin-top:2px}'+
'.hhActRecentCard{height:auto!important;padding:9px 10px 8px!important}.hhActRecent{margin-top:6px!important}.hhActRecent .row{grid-template-columns:36px minmax(0,1fr) auto 10px!important;gap:7px!important;min-height:43px!important;height:auto!important;padding:3px 0!important}.hhActRecent .rI{width:33px!important;height:33px!important;font-size:18px!important}.hhActRecent .rT b{font-size:9px!important}.hhActRecent .rT small{font-size:7px!important}.hhActRecent .rS{display:grid!important;grid-template-columns:auto auto!important;gap:2px 8px!important}.hhActRecent .rS span{font-size:7px!important}.hhActRecent .row>strong{font-size:16px!important}'+
'.hhActManualCard{background:#fff;border:1px solid #e8eef3;padding:9px 10px 10px}.hhActManualGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px}.hhActManualGrid button{height:54px;border:1px solid #edf1f4;border-radius:12px;background:linear-gradient(180deg,#fff,#f7fafc);color:#123a5e;display:flex;align-items:center;justify-content:center;gap:5px;padding:4px}.hhActManualGrid button span{font-size:20px}.hhActManualGrid button b{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.hhActNav{max-width:430px!important;height:58px!important;padding-bottom:env(safe-area-inset-bottom)!important;box-sizing:content-box!important}.hhActNav button span{font-size:21px!important}.hhActNav button b{font-size:8px!important;margin-top:2px!important}'+
'.hhManualForm{display:grid;grid-template-columns:1fr 1fr;gap:9px}.hhManualForm label{position:relative;font-size:8px;font-weight:800;color:#668094}.hhManualForm input,.hhManualForm select{display:block;width:100%;height:42px;box-sizing:border-box;margin-top:4px;border:1px solid #dae6ee;border-radius:11px;background:#fff;color:#173f62;padding:8px;font-size:14px}.hhManualForm label>span{position:absolute;right:8px;bottom:12px;font-size:8px;color:#8294a3}.hhManualSave{grid-column:1/-1;height:44px;border:0;border-radius:13px;background:linear-gradient(135deg,#ff2f7f,#ff6b9e);color:#fff;font-weight:900;font-size:12px;box-shadow:0 7px 17px rgba(255,47,127,.2)}'+
'@media(max-width:380px){.hhActBody{padding-left:4px!important;padding-right:4px!important}.hhActTopGrid,.hhActSmallGrid{gap:4px!important}.hhActTopGrid .hhActMetric{height:99px!important}.hhActMetric b{font-size:20px!important}.hhActSmallGrid b{font-size:15px!important}.hhActMetric small{font-size:8px!important}.hhActTypes,.hhActManualGrid{gap:5px!important}.hhActTypes>button.hhActType{height:74px!important}.hhActRecent .rS span:nth-child(1){display:none!important}}';document.head.appendChild(s)}
style();
var mo=new MutationObserver(function(){clearTimeout(window.__hhAct189t);window.__hhAct189t=setTimeout(enhance,25)});var page=document.getElementById('hhActivityPage');if(page)mo.observe(page,{childList:true,subtree:true});setTimeout(enhance,500);
var oldOpen=window.hhOpenActivity;if(typeof oldOpen==='function')window.hhOpenActivity=function(){var r=oldOpen.apply(this,arguments);setTimeout(enhance,160);return r};
var oldPeriod=window.hhActivityPeriod;if(typeof oldPeriod==='function')window.hhActivityPeriod=function(v){var r=oldPeriod.apply(this,arguments);setTimeout(enhance,160);return r};
document.documentElement.dataset.healthhubActivity='1.89';
window.HH_LIVE_BUILD='v1.89-activity-mobile-manual';
})();