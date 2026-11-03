/* HealthHub v1150 · logged wearable insights for Activity + Sleep.
 * Display-only; canonical profile-scoped Health Connect snapshot first, then
 * existing local import if Cloud cannot be accessed. NO watch APK, permissions,
 * sensors, GPS, uploads, automation, medical alerts or live connection claims.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)api.install(root);
})(typeof window==='object'?window:null,function(){
 'use strict';
 var CACHE_MS=45000,IDB='healthhub-connect-v1';
 var selections={activity:['heart','resting','oxygen','vo2','fat'],sleep:['nightHeart','nightOxygen','resting']};
 function profile(p){return p==='monika'||p==='m'?'monika':p==='zsolt'||p==='z'?'zsolt':null}
 function arr(v){return Array.isArray(v)?v:[]}
 function n(v,min,max){if(v===null||v===undefined||v==='')return null;var x=Number(v);return Number.isFinite(x)&&x>=min&&x<=max?x:null}
 function ms(v,now){if(typeof v!=='string')return null;var t=Date.parse(v);return Number.isFinite(t)&&t>0&&t<=((now||Date.now())+300000)?t:null}
 function eligible(row,key,min,max,now){if(!row)return null;var t=ms(row.time,now),value=n(row[key],min,max);return t!==null&&value!==null?{t:t,value:value,source:String(row.sourcePackage||'').slice(0,110)}:null}
 function latest(rows,key,min,max,now,between){
  var result=null;arr(rows).forEach(function(row){
   var x=eligible(row,key,min,max,now);if(!x)return;
   if(between&&(x.t<between[0]||x.t>between[1]))return;
   if(!result||x.t>result.t)result=x;
  });return result;
 }
 function pulse(rows,now,between){
  var best=null;
  arr(rows).forEach(function(row){
   var source=String(row&&row.sourcePackage||'').slice(0,110);
   arr(row&&row.samples).forEach(function(s){
    var t=ms(s&&s.time,now),v=n(s&&s.bpm,25,240);
    if(t===null||v===null||(between&&(t<between[0]||t>between[1])))return;
    if(!best||t>best.t)best={t:t,value:v,source:source};
   });
  });return best;
 }
 function latestNight(records,now){
  var best=null;
  arr(records.sleepSessions).forEach(function(r){
   var a=ms(r&&r.startTime,now),b=ms(r&&r.endTime,now);
   if(a===null||b===null||b<=a||b-a>24*3600000)return;
   if(!best||b>best[1])best=[a,b];
  });return best;
 }
 function summarize(bundle,kind,now){
  now=now||Date.now();var r=bundle&&bundle.records||{},night=latestNight(r,now);
  var readings={
   heart:pulse(r.heartRate,now),
   resting:latest(r.restingHeartRate,'bpm',25,240,now),
   oxygen:latest(r.oxygenSaturation,'percent',50,100,now),
   vo2:latest(r.vo2Max,'mlKgMin',5,100,now),
   fat:latest(r.bodyFat,'percent',2,75,now),
   nightHeart:night?pulse(r.heartRate,now,night):null,
   nightOxygen:night?latest(r.oxygenSaturation,'percent',50,100,now,night):null
  };
  return {kind:kind,readings:readings,night:night,exportedAt:ms(bundle&&bundle.exportedAt,now),source:bundle&&bundle.source||'nem ellenőrzött'};
 }
 function escaped(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function time(msValue){return msValue===null||msValue===undefined?'—':new Date(msValue).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
 function num(x,d){return x.toLocaleString('hu-HU',{minimumFractionDigits:d,maximumFractionDigits:d})}
 var labels={
  heart:['❤️','Utolsó pulzus','bpm',0],
  resting:['💗','Nyugalmi pulzus','bpm',0],
  oxygen:['🫁','Utolsó SpO₂','%',1],
  vo2:['🫀','VO₂ max','ml/kg/perc',1],
  fat:['⚖️','Testzsír','%',1],
  nightHeart:['❤️','Pulzus az utolsó alvásszakaszból','bpm',0],
  nightOxygen:['🫁','SpO₂ az utolsó alvásszakaszból','%',1]
 };
 function card(key,x,now){
  var l=labels[key],empty=!x,value=empty?'—':num(x.value,l[3]),stale=x&&now-x.t>86400000;
  var info=empty?'Nincs mért adat':('Mérve: '+time(x.t)+(stale?' · Régebbi mérés':''));
  var origin=!empty&&x.source?'<span class="hhWH1150Origin">'+escaped(x.source)+'</span>':'';
  return '<div class="hhWH1150Card"><span class="hhWH1150Name">'+l[0]+' '+l[1]+'</span>'+
   '<div class="hhWH1150Number">'+value+(empty?'':' <small>'+escaped(l[2])+'</small>')+'</div>'+
   '<span class="hhWH1150When">'+escaped(info)+'</span>'+origin+'</div>';
 }
 function markup(summary,kind,owner,now){
  var header=kind==='sleep'?'🌙 Naplózott éjszakai mérések':'⌚ Naplózott egészségadatok';
  var note=kind==='sleep'?
   'A legutóbbi rögzített alvásszakasz időablakába eső mérések. A teljes éjszaka átlagai a meglévő alváskártyákon maradnak.':
   'Legutóbbi érvényes Health Connect-mérések, nem élő órás adatok.';
  var meta=summary.exportedAt!==null?'Utolsó adatcsomag: '+time(summary.exportedAt):'Szinkronidő: nem igazolt';
  var body=selections[kind].map(function(key){return card(key,summary.readings[key],now)}).join('');
  if(kind==='sleep'&&!summary.night)note='Nincs érvényes rögzített alvásszakasz az adatcsomagban.';
  return '<section class="hhWH1150" id="hhWearHistory1150-'+kind+'" data-owner="'+owner+'" aria-label="'+escaped(header)+'">'+
   '<div class="hhWH1150Head"><b>'+header+'</b><small>HEALTH CONNECT · NAPLÓ</small></div>'+
   '<div class="hhWH1150Grid">'+body+'</div>'+
   '<p class="hhWH1150Foot">'+escaped(note)+'</p>'+
   '<div class="hhWH1150Meta">📥 '+escaped(meta)+' · '+escaped(summary.source)+
   '<br>Az adatforrás csomagneve nem bizonyítja a Watch9 vagy Watch5 Pro eredetét. Nem orvosi monitor.</div></section>';
 }
 function css(doc){
  if(doc.getElementById('hh-wear-history-css-v1150'))return;
  var st=doc.createElement('style');st.id='hh-wear-history-css-v1150';
  st.textContent=
   '.hhWH1150{--wh:#a9cdef;box-sizing:border-box;margin:11px 0 15px;padding:13px;border-radius:20px;border:1px solid rgba(177,205,238,.27);background:linear-gradient(145deg,rgba(20,38,66,.97),rgba(30,56,89,.96));box-shadow:0 9px 28px rgba(7,24,51,.16);color:#eff7ff;clear:both}'+
   '.hhWH1150[data-owner="monika"]{--wh:#f0aecf;border-color:rgba(239,174,207,.34)}'+
   '.hhWH1150Head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}'+
   '.hhWH1150Head b{font-size:14px;font-weight:850}.hhWH1150Head small{font-size:9px;color:var(--wh);letter-spacing:.055em;font-weight:800}'+
   '.hhWH1150Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'+
   '.hhWH1150Card{box-sizing:border-box;min-width:0;border-radius:13px;padding:10px;border:1px solid rgba(203,222,244,.18);background:rgba(255,255,255,.075)}'+
   '.hhWH1150Name{font-size:10.5px;display:block;line-height:1.3;color:#dce9f8;font-weight:700;min-height:28px}'+
   '.hhWH1150Number{font-size:22px;font-weight:900;color:var(--wh);margin:4px 0 3px;line-height:1.12}'+
   '.hhWH1150Number small{font-size:10px;color:#dce9f8;font-weight:600}'+
   '.hhWH1150When{display:block;font-size:9px;color:#d4e4f5;line-height:1.4}'+
   '.hhWH1150Origin{display:block;font-size:8px;color:#9db9d1;overflow-wrap:anywhere;margin-top:3px}'+
   '.hhWH1150Foot{font-size:10px;line-height:1.5;color:#d4e7f8;margin:10px 0 5px}'+
   '.hhWH1150Meta{font-size:9px;line-height:1.5;color:#a9c0d8;border-top:1px solid rgba(214,230,255,.14);padding-top:8px}'+
   '@media(max-width:360px){.hhWH1150{padding:10px}.hhWH1150Grid{gap:6px}.hhWH1150Card{padding:8px}.hhWH1150Number{font-size:19px}}';
  doc.head.appendChild(st);
 }
 function loadLocal(win,p){
  return new Promise(function(resolve){
   if(!win.indexedDB)return resolve(null);
   var req;
   try{req=win.indexedDB.open(IDB)}catch(_){return resolve(null)}
   req.onerror=function(){resolve(null)};
   req.onupgradeneeded=function(){/* no mutation of store schema */};
   req.onsuccess=function(){
    var db=req.result;
    if(!db.objectStoreNames.contains('imports')){db.close();return resolve(null)}
    var q;
    try{q=db.transaction('imports','readonly').objectStore('imports').getAll()}
    catch(_){db.close();return resolve(null)}
    q.onerror=function(){db.close();resolve(null)};
    q.onsuccess=function(){
     db.close();
     var rows=arr(q.result).filter(function(x){
      return x&&profile(x.profile)===p&&x.bundle&&
       (!x.bundle.profile||profile(x.bundle.profile)===p);
     });
     rows.sort(function(a,b){return (Date.parse(b.importedAt||0)||0)-(Date.parse(a.importedAt||0)||0)});
     if(!rows.length)return resolve(null);
     var chosen=rows[0];resolve({records:chosen.bundle.records||{},exportedAt:chosen.bundle.exportedAt||chosen.importedAt||null,source:'Helyi Health Connect import'});
    };
   };
  });
 }
 async function read(win,p){
  var v=win.HH_DROPBOX_VAULT;
  if(v&&typeof v.connected==='function'&&v.connected()&&typeof v.downloadJson==='function'){
   try{
    var raw=await v.downloadJson('/HealthHub/profiles/'+p+'-health-connect.json');
    if(raw&&profile(raw.profile)===p&&raw.records&&typeof raw.records==='object')
     return {records:raw.records,exportedAt:raw.exportedAt||null,source:'Dropbox · Health Connect'};
   }catch(_){/* preserve local fallback, do not fabricate zero */}
  }
  return loadLocal(win,p);
 }
 function install(win){
  var doc=win.document,cache=new Map(),installed=new WeakSet(),pending={activity:null,sleep:null};
  var seq={activity:0,sleep:0};
  function owner(){try{return win.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}}
  function active(kind){return kind==='activity'?doc.getElementById('hhActivityPage'):doc.getElementById('hhSleepPage')}
  function get(p){
   var entry=cache.get(p);
   if(entry&&Date.now()-entry.time<CACHE_MS)return entry.promise;
   var promise=read(win,p).catch(function(){return null});
   cache.set(p,{time:Date.now(),promise:promise});return promise;
  }
  function ready(kind,page){
   return kind==='activity'?!!page.querySelector('.hhActTopGrid,.a191Top'):
     (!!page.querySelector('.hhSleepTop')&&!page.querySelector('.hhSleepLoading'));
  }
  function place(kind,page,node){
   var anchor=kind==='activity'?page.querySelector('.hhActSmallGrid,.a191Top,.hhActTopGrid'):
    page.querySelector('.hhSleepTop');
   if(!anchor)return false;
   anchor.insertAdjacentElement('afterend',node);return true;
  }
  async function update(kind){
   var page=active(kind),p=owner();
   if(!page||!page.classList.contains('on')||!ready(kind,page))return;
   var id='hhWearHistory1150-'+kind;
   var existing=page.querySelector('#'+id);
   if(existing&&existing.dataset.owner===p)return;
   var token=++seq[kind],bundle=await get(p);
   page=active(kind);
   if(token!==seq[kind]||owner()!==p||!page||!page.classList.contains('on')||!ready(kind,page))return;
   var old=page.querySelector('#'+id);if(old)old.remove();
   var now=Date.now(),summary=summarize(bundle||{records:{},source:'Nincs szinkronizált adat'},kind,now);
   var shell=doc.createElement('div');
   shell.innerHTML=markup(summary,kind,p,now);
   var node=shell.firstElementChild;
   if(!node)return;
   place(kind,page,node);
  }
  function schedule(kind,delay){
   if(pending[kind]!==null)win.clearTimeout(pending[kind]);
   pending[kind]=win.setTimeout(function(){pending[kind]=null;update(kind)},delay||120);
  }
  function scan(){
   ['activity','sleep'].forEach(function(kind){
    var page=active(kind);if(!page||installed.has(page))return;
    installed.add(page);
    var watch=new win.MutationObserver(function(events){
     if(events.some(function(e){return e.target===page&&e.type==='childList'}))schedule(kind,220);
    });
    watch.observe(page,{childList:true,subtree:false});
    if(page.classList.contains('on'))schedule(kind,200);
   });
  }
  function reset(){
   cache.clear();
   ['activity','sleep'].forEach(function(k){
    seq[k]++;var p=active(k);
    if(p){var c=p.querySelector('#hhWearHistory1150-'+k);if(c)c.remove()}
    schedule(k,300);
   });
  }
  function setup(){
   if(!doc.body||!win.MutationObserver)return;
   css(doc);scan();
   var finder=new win.MutationObserver(scan);
   finder.observe(doc.body,{childList:true,subtree:false});
   win.addEventListener('healthhub:health-cloud-synced',function(e){
    var changed=profile(e&&e.detail&&e.detail.profile);
    if(!changed||changed===owner())reset();
   });
   win.addEventListener('healthhub:profile-changed',reset);
   win.addEventListener('storage',function(e){if(e.key==='hh-profile')reset()});
   // Hook public render endpoints as a fallback; existing Activity/Sleep render
   // functions, charts and navigation remain the owners of their own DOM.
   ['hhOpenActivity','hhRenderActivity','hhOpenSleep','hhRenderSleep'].forEach(function(name){
    var old=win[name];if(typeof old!=='function'||old.__wear1150)return;
    var kind=name.includes('Activity')?'activity':'sleep';
    var wrapped=function(){
     var result=old.apply(this,arguments);
     Promise.resolve(result).then(function(){schedule(kind,220)},function(){});
     return result;
    };
    wrapped.__wear1150=true;win[name]=wrapped;
   });
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
 }
 return {profile:profile,summarize:summarize,latestNight:latestNight,pulse:pulse,latest:latest,markup:markup,install:install};
});
