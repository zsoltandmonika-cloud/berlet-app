/* HealthHub v555 | Restore the standard Health Hero one-tap profile switch,
   status name at bottom-left, source-derived environment RAG, and official NNGYK
   infection summary. Reuses v553 canonical profile control and v308/v310 data. */
(function(root){
'use strict';
var ID='hhInfectionCompact555', HERO='hhHeroProfileLabel555';
var curInfection=null, fetchPromise=null, cacheKey='hh-infection-watch-public-v1';
var LEVELS={low:{name:'Alacsony',css:'low'},watch:{name:'Figyelendő',css:'watch'},
 elevated:{name:'Emelkedett',css:'elevated'},high:{name:'Magas',css:'high'},
 unknown:{name:'Nincs trendadat',css:'unknown'}};
function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function profile(){try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(e){return 'z'}}
function labelName(){return profile()==='m'?'Mónika':'Zsolt'}
function heroLabel(){
 var hero=el('heroH');if(!hero)return;
 var tag=el(HERO);
 if(!tag){tag=document.createElement('span');tag.id=HERO;tag.setAttribute('aria-hidden','true');hero.appendChild(tag)}
 var p=profile();
 tag.textContent=(p==='m'?'MÓNIKA':'ZSOLT')+'  ⇄';
 tag.dataset.profile=p;
 /* Keep v553's native full-frame button as the sole Hero click target. */
}
function environmentRag(){
 var c=el('hhEnvCard308');if(!c)return;
 var snapshot=null;
 try{snapshot=root.HH_ENVIRONMENT_V1&&root.HH_ENVIRONMENT_V1.getCurrent&&root.HH_ENVIRONMENT_V1.getCurrent()}catch(e){}
 var k=snapshot&&snapshot.assessment&&snapshot.assessment.key||'unknown';
 var t=Date.parse(snapshot&&(snapshot.fetchedAt||snapshot.observedAt)||'');
 if(!isFinite(t)||Date.now()-t>90*60*1000||Date.now()<t-10*60*1000)k='unknown';
 if(!/^(normal|watch|high)$/.test(k))k='unknown';
 c.dataset.hhEnvRag555=k;
 c.setAttribute('data-hh-env-status-text',k==='normal'?'Normál':k==='watch'?'Figyelmet érdemlő':k==='high'?'Magas terhelés':'Nincs friss adat');
}
function valid(d){return !!(d&&d.schema==='healthhub.infection-watch/1'&&Array.isArray(d.items)&&d.periodEnd&&d.sourceWeek&&d.sources)}
function upstream(){
 try{var w=root.HH_INFECTION_WATCH_V1,x=w&&w.get();if(valid(x))return x}catch(e){}
 return null;
}
function cached(){
 try{var x=JSON.parse(root.localStorage.getItem(cacheKey)||'null');return valid(x)?x:null}catch(e){return null}
}
function stale(d){
 if(!d)return true;
 var t=Date.parse(d.periodEnd+'T12:00:00Z');
 return !isFinite(t)||Date.now()-t>21*86400000||Date.now()<t-100*86400000;
}
function date(s){
 var d=new Date(String(s||'')+'T12:00:00Z');
 return isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{month:'2-digit',day:'2-digit',timeZone:'UTC'}):'—';
}
function itemRow(i,outdated){
 var k=LEVELS[i.level]||LEVELS.unknown,cls=outdated?'stale':k.css;
 return '<div class="hh555Row '+cls+'"><i class="hh555Dot" aria-hidden="true"></i>'+
 '<span class="hh555Disease">'+esc(i.name)+'</span>'+
 '<span class="hh555State">'+(outdated?'Régi adat':esc(i.label||k.name))+'</span></div>';
}
function markup(d){
 if(!valid(d)){
  return '<div class="hh555Top"><h3>🦠 Járványügyi jelentés</h3><span class="hh555Week">NNGYK</span></div>'+
   '<p class="hh555Unknown">A hivatalos heti jelentés betöltése folyamatban. Ismeretlen státuszt nem jelölünk zöldnek.</p>';
 }
 var old=stale(d),alerts=d.items.filter(function(i){return /^(watch|elevated|high)$/.test(i.level)}).length;
 var summary=old?'⚪ Elavult adat, új heti jelentés szükséges':
   alerts?('● '+alerts+' figyelmet igénylő jelzés'):'Nincs kiemelt megfigyelési jelzés';
 var rows=d.items.map(function(i){return itemRow(i,old)}).join('');
 return '<div class="hh555Top"><h3>🦠 Járványügyi jelentés</h3>'+
  '<span class="hh555Week">NNGYK · '+esc(d.sourceWeek)+'</span></div>'+
  '<div class="hh555Summary '+(old?'stale':alerts?'watch':'normal')+'">'+esc(summary)+'</div>'+
  '<div class="hh555Rows">'+rows+'</div>'+
  '<div class="hh555Foot"><span>Időszak: '+date(d.periodStart)+'–'+date(d.periodEnd)+
  ' · '+(old?'nem aktuális':'forrás: NNGYK')+'</span>'+
  '<button class="hh555Details" type="button">Részletes jelentés ↗</button></div>'+
  '<div class="hh555Note">A színek HealthHub-tájékoztató jelzések, nem hatósági riasztási szintek vagy egyéni kockázatbecslések.</div>';
}
function detail(){
 if(typeof root.show==='function'){
  try{root.show('environmental')}catch(e){root.console&&root.console.warn('Infection details route',e)}
  root.setTimeout(function(){
   var block=el('hhInfectionWatch310');if(block&&block.scrollIntoView)block.scrollIntoView({behavior:'smooth',block:'start'});
  },180);
 }
}
function showInfection(){
 var c=el(ID);if(!c)return;
 var d=upstream()||curInfection||cached();
 if(valid(d))curInfection=d;
 var signature=valid(d)?[d.edition,d.sourceWeek,d.periodEnd,d.reviewedOn,stale(d),d.items.map(function(i){return i.level+':'+i.label}).join('|')].join('~'):'loading';
 if(c.dataset.hhSignature===signature)return;
 c.dataset.hhSignature=signature;
 c.innerHTML=markup(d);
 var btn=c.querySelector('.hh555Details');if(btn)btn.addEventListener('click',detail);
}
function mountInfection(){
 var page=el('health'),surface=page&&page.querySelector('.surface');if(!surface)return;
 var c=el(ID);
 if(!c){
  c=document.createElement('section');c.id=ID;c.className='card hh555Infection';
  c.setAttribute('aria-label','Járványügyi jelentés, NNGYK heti adatok');
  var env=el('hhEnvCard308'),quick=surface.querySelector('.quick');
  if(env&&env.parentNode===surface)env.insertAdjacentElement('afterend',c);
  else if(quick)quick.insertAdjacentElement('afterend',c);
  else surface.appendChild(c);
 }
 showInfection();
}
function loadInfection(){
 if(fetchPromise)return fetchPromise;
 /* Let the original v310 data source refresh itself; same single source of truth. */
 var original=root.HH_INFECTION_WATCH_V1;
 if(original&&typeof original.refresh==='function'){
  try{original.refresh(false).then(function(x){if(valid(x)){curInfection=x;showInfection()}}).catch(function(){})}catch(e){}
 }
 fetchPromise=fetch('./data/infection-watch.json?v=555',{cache:'no-store'})
 .then(function(r){if(!r.ok)throw Error('NNGYK snapshot '+r.status);return r.json()})
 .then(function(x){if(valid(x)){curInfection=x;showInfection()}})
 .catch(function(){showInfection()})
 .then(function(){fetchPromise=null});
 return fetchPromise;
}
function refresh(){
 heroLabel();environmentRag();mountInfection();showInfection();
}
function init(){
 refresh();
 loadInfection();
 root.setTimeout(refresh,400);root.setTimeout(refresh,1600);
 /* Redraws of old v308 cards should never reset RAG decoration indefinitely. */
 root.setInterval(function(){var h=el('health');if(h&&h.classList.contains('on'))refresh()},60000);
}
root.addEventListener('healthhub:environment-updated',environmentRag);
root.addEventListener('healthhub:profile-changed',function(){heroLabel();environmentRag()});
root.addEventListener('storage',function(e){if(e.key==='hh-profile')heroLabel()});
root.addEventListener('pageshow',refresh);
root.addEventListener('focus',function(){refresh();loadInfection()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.HH_HEALTH_RESTORED_V555=Object.freeze({refresh:refresh,showInfection:showInfection});
})(window);
