(function(){
'use strict';
/* HealthHub v1.228 — Sleep dashboard + Cloud Health Connect + Sleep Helper */
var BRIDGE_DB='healthhub-connect-v1';
var sleepState=window.hhSleepState||{period:'7d'};
var sleepRenderSeq=0;
window.hhSleepState=sleepState;
var helper={ctx:null,source:null,gain:null,timer:null,endAt:0,wake:null,raf:null,mode:'brown',minutes:10};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function otherName(){return pkey()==='monika'?'Zsolt':'Mónika'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function fmtTime(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—'}
function fmtDate(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'}):'—'}
function durMin(a,b){var v=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(v)&&v>0?v:0}
function durText(min){min=Math.round(min||0);var h=Math.floor(min/60),m=min%60;return h?h+' ó '+m+' p':m+' p'}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:0}
function stageName(v){return ({0:'Ismeretlen',1:'Ébren',2:'Alvás',3:'Ágyon kívül',4:'Könnyű',5:'Mély',6:'REM'})[Number(v)]||'Szakasz'}
function stageClass(v){return ({1:'awake',2:'sleep',3:'out',4:'light',5:'deep',6:'rem'})[Number(v)]||'unknown'}

async function sleepSessions(){
 var map=new Map(),profile=pkey(),cutoff=Date.now()-95*86400000,cloudUsed=false;

 function addRows(a,importedAt){
  if(!Array.isArray(a))return;
  a.forEach(function(s){
   if(!s||!s.startTime||!s.endTime)return;
   if(Date.parse(s.endTime||0)<cutoff)return;
   var id=String(s.id||s.startTime+'|'+s.endTime);
   if(!map.has(id))map.set(id,Object.assign({},s,{_importedAt:importedAt||''}));
  });
 }

 /* Cloud first: this is the same Health Connect bundle used by Activity.
    That makes Sleep visible on PC and every other HealthHub device too. */
 try{
  var v=window.HH_DROPBOX_VAULT;
  if(v&&v.connected&&v.connected()&&typeof v.downloadJson==='function'){
   var raw=null,path='/HealthHub/profiles/'+profile+'-health-connect.json';
   try{raw=await v.downloadJson(path)}
   catch(e){
    if(e&&e.status!==409)throw e;
    path='/incoming-'+profile+'.json';
    raw=await v.downloadJson(path);
   }
   if(raw&&String(raw.profile||'').toLowerCase()===profile){
    addRows(raw.records&&raw.records.sleepSessions,raw.exportedAt);
    cloudUsed=true;
    localStorage.setItem('hh-sleep-cloud-last-'+profile,new Date().toISOString());
    localStorage.setItem('hh-sleep-cloud-path-'+profile,path);
   }
  }
 }catch(e){console.warn('Sleep Cloud read failed',e)}

 /* Local fallback / merge for the phone or a browser that already imported data. */
 try{
  var db=await openBridgeDb();try{
   await new Promise(function(resolve){
    var tx=db.transaction('imports'),st=tx.objectStore('imports'),req=st.openCursor(null,'prev');
    req.onerror=function(){resolve()};
    req.onsuccess=function(){
     var cur=req.result;if(!cur){resolve();return}
     var i=cur.value;
     if(i&&i.profile===profile&&i.bundle&&i.bundle.records){
      addRows(i.bundle.records.sleepSessions,i.importedAt);
     }
     cur.continue();
    };
   });
  }finally{db.close()}
 }catch(e){}

 window.hhSleepDataSource=cloudUsed?'Dropbox Cloud + Health Connect':'Helyi Health Connect cache';
 return Array.from(map.values()).sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)});
}
function periodDays(){return sleepState.period==='30d'?30:sleepState.period==='90d'?90:7}
function filtered(rows){var min=Date.now()-periodDays()*86400000;return rows.filter(function(x){return Date.parse(x.endTime)>=min})}
function heroHtml(){
 var date=document.getElementById('dateH')||document.getElementById('dateHome');
 return '<div class="hhSleepDoctorHero"><button class="hhSleepProfileHit" onclick="hhSleepToggleProfile(event)" aria-label="Egy kattintás: váltás '+esc(otherName())+' profiljára" title="Váltás '+esc(otherName())+' profiljára"></button><div class="hhSleepHeroActions"><button onclick="hhCloseSleep()" aria-label="Kezdőlap">⌂</button><button onclick="hhRenderSleep()" aria-label="Frissítés">↻</button></div><div class="hhSleepDoctorTitle"><button class="hhSleepProfileName" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button><h1>Sleep</h1><span>'+esc(date&&date.textContent||'')+'</span></div></div>';
}
function bottomNav(){
 return '<nav class="hhSleepNav"><button onclick="hhCloseSleep()"><span>⌂</span><b>Kezdőlap</b></button><button class="on"><span>🌙</span><b>Sleep</b></button><button onclick="hhCloseSleep();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button onclick="hhCloseSleep();if(window.show)show(\'timeline\')"><span>▥</span><b>Idővonal</b></button></nav>';
}
function stageBar(s){
 var stages=Array.isArray(s&&s.stages)?s.stages:[];if(!stages.length)return '<div class="hhSleepEmpty">Nincs részletes alvási szakasz adat.</div>';
 var start=Date.parse(s.startTime),end=Date.parse(s.endTime),span=end-start;if(!(span>0))return '';
 return '<div class="hhStageBar">'+stages.map(function(x){
   var a=Math.max(start,Date.parse(x.startTime)),b=Math.min(end,Date.parse(x.endTime)),w=Math.max(0,(b-a)/span*100);
   return '<i class="'+stageClass(x.stage)+'" style="width:'+w.toFixed(2)+'%" title="'+esc(stageName(x.stage))+'"></i>';
 }).join('')+'</div><div class="hhStageLegend"><span>Ébren</span><span>Könnyű</span><span>Mély</span><span>REM</span></div>';
}
function stageSummary(s){
 var out={1:0,4:0,5:0,6:0},st=Array.isArray(s&&s.stages)?s.stages:[];
 st.forEach(function(x){var k=Number(x.stage);if(out[k]!=null)out[k]+=durMin(x.startTime,x.endTime)});
 var total=Object.values(out).reduce(function(a,b){return a+b},0)||durMin(s.startTime,s.endTime);
 function p(k){return total?Math.round(out[k]/total*100):0}
 return '<div class="hhSleepStageGrid"><div><small>KÖNNYŰ</small><b>'+p(4)+'%</b></div><div><small>MÉLY</small><b>'+p(5)+'%</b></div><div><small>REM</small><b>'+p(6)+'%</b></div><div><small>ÉBREN</small><b>'+p(1)+'%</b></div></div>';
}
function chart(rows){
 if(!rows.length)return '<div class="hhSleepEmpty">Nincs alvásadat ebben az időszakban.</div>';
 var vals=rows.map(function(x){return durMin(x.startTime,x.endTime)/60}),max=Math.max.apply(null,vals.concat([8])),w=620,h=180,pad=26;
 var pts=rows.map(function(x,i){var xx=pad+(w-pad*2)*(rows.length===1?.5:i/(rows.length-1)),yy=h-pad-(h-pad*2)*(vals[i]/max);return {x:xx,y:yy}});
 var path=pts.map(function(p,i){return(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)}).join(' ');
 var grid='';for(var g=0;g<4;g++){var y=pad+(h-pad*2)*(g/3),v=max-(max)*(g/3);grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'" stroke="#e9edf6"/><text x="2" y="'+(y+3)+'" font-size="8" fill="#8893aa">'+v.toFixed(1)+'h</text>'}
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+grid+'<path d="'+path+'" fill="none" stroke="var(--a)" stroke-width="2.5"/>'+
 pts.map(function(p){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="2.8" fill="var(--a)"/>'}).join('')+
 '<text x="'+pad+'" y="'+(h-4)+'" font-size="8" fill="#8893aa">'+esc(fmtDate(rows[0].endTime))+'</text><text x="'+(w-pad)+'" y="'+(h-4)+'" text-anchor="end" font-size="8" fill="#8893aa">'+esc(fmtDate(rows[rows.length-1].endTime))+'</text></svg>';
}
function trendSummary(rows){
 if(!rows.length)return '';
 var mins=rows.map(function(x){return durMin(x.startTime,x.endTime)}),latest=rows[rows.length-1],first=rows[0],delta=mins[mins.length-1]-mins[0];
 return '<div class="hhSleepSummary"><div><small>ÁTLAG</small><b>'+durText(avg(mins))+'</b></div><div><small>LEGUTÓBBI</small><b>'+durText(mins[mins.length-1])+'</b></div><div><small>LEGHOSSZABB</small><b>'+durText(Math.max.apply(null,mins))+'</b></div><div><small>VÁLTOZÁS</small><b>'+(delta>0?'+':'')+Math.round(delta)+' p</b></div></div>';
}
async function render(){
 var page=document.getElementById('hhSleepPage');if(!page)return;
 var renderId=++sleepRenderSeq,requestedProfile=pkey();
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepTop"><div><small>HEALTH CONNECT · <span id="hhSleepSourceLabel">ALVÁS</span></small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div><div class="hhSleepCard hhSleepLoading"><div class="hhSleepSpinner"></div><b>Alvásadatok betöltése…</b><small>Health Connect adatok feldolgozása</small></div></div>'+bottomNav();
 var rows=await sleepSessions();
 if(renderId!==sleepRenderSeq||requestedProfile!==pkey())return;
 var latest=rows[rows.length-1]||null,period=filtered(rows),total=latest?durMin(latest.startTime,latest.endTime):0;var srcLabel=(window.hhSleepDataSource||'Health Connect').toUpperCase();
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface">'+
 '<div class="hhSleepTop"><div><small>HEALTH CONNECT · ALVÁS</small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div>'+
 (latest?'<div class="hhSleepHeroCard"><div class="moon">🌙</div><div><small>LEGUTÓBBI ALVÁS</small><b>'+durText(total)+'</b><span>'+fmtTime(latest.startTime)+' → '+fmtTime(latest.endTime)+' · '+fmtDate(latest.endTime)+'</span></div></div>'+stageBar(latest)+stageSummary(latest):
 '<div class="hhSleepEmpty big">Még nincs Health Connect alvásadat ennél a profilnál.</div>')+
 '<div class="hhSleepCard"><div class="hhSleepCardHead"><div><small>TREND</small><h3>Alvásidő</h3></div><div class="hhSleepPeriods"><button class="'+(sleepState.period==='7d'?'on':'')+'" onclick="hhSleepPeriod(\'7d\')">Heti</button><button class="'+(sleepState.period==='30d'?'on':'')+'" onclick="hhSleepPeriod(\'30d\')">Havi</button><button class="'+(sleepState.period==='90d'?'on':'')+'" onclick="hhSleepPeriod(\'90d\')">3 hónap</button></div></div>'+chart(period)+trendSummary(period)+'</div>'+
 '<div class="hhSleepCard helperCard"><div class="hhSleepCardHead"><div><small>SLEEP HELPER</small><h3>Elalvássegítő</h3></div><span>API-mentes</span></div><p>Válassz időt és hangot. A meleg fény lassan elsötétül, a hang pedig fokozatosan elhalkul.</p>'+
 '<div class="hhHelperTimes"><button class="on" data-min="10" onclick="hhHelperMinutes(10,this)">10 perc</button><button data-min="15" onclick="hhHelperMinutes(15,this)">15 perc</button><button data-min="20" onclick="hhHelperMinutes(20,this)">20 perc</button></div>'+
 '<div class="hhHelperModes"><button class="on" data-mode="brown" onclick="hhHelperMode(\'brown\',this)">🟤 Brown noise</button><button data-mode="soft" onclick="hhHelperMode(\'soft\',this)">🌧 Lágy zaj</button><button data-mode="breath" onclick="hhHelperMode(\'breath\',this)">🌬 Légzés</button><button data-mode="light" onclick="hhHelperMode(\'light\',this)">🌙 Csak fény</button></div>'+
 '<button class="hhHelperStart" onclick="hhStartSleepHelper()">🌙 ELALVÁS INDÍTÁSA</button></div>'+
 '<p class="privacyNote">Az alvási adatok tájékoztató jellegűek. A HealthHub nem értékeli diagnosztikusan az alvást.</p></div>'+bottomNav();
}
function ensurePage(){
 if(document.getElementById('hhSleepPage'))return;
 var s=document.createElement('section');s.id='hhSleepPage';s.className='hhSleepPage';document.body.appendChild(s);
}
function wireButton(){
 var btn=Array.from(document.querySelectorAll('.homeModule')).find(function(b){var x=b.querySelector('b');return x&&x.textContent.trim()==='Sleep'});
 if(btn){btn.dataset.hhSleepWired='1';btn.removeAttribute('onclick');btn.style.pointerEvents='auto';btn.style.cursor='pointer'}
}
function delegatedSleepClick(e){
 var btn=e.target&&e.target.closest?e.target.closest('.homeModule'):null;if(!btn)return;
 var lab=btn.querySelector('b');if(!lab||lab.textContent.trim()!=='Sleep')return;
 e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 window.hhOpenSleep();
}
window.hhOpenSleep=function(){ensurePage();var p=document.getElementById('hhSleepPage');p.classList.add('on');p.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepTop"><div><small>HEALTH CONNECT · ALVÁS</small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div><div class="hhSleepCard hhSleepLoading"><div class="hhSleepSpinner"></div><div><b>Alvásadatok betöltése…</b><small>Health Connect adatok feldolgozása</small></div></div></div>'+bottomNav();requestAnimationFrame(function(){render().catch(function(e){console.error(e);var q=document.getElementById('hhSleepPage');if(q)q.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepEmpty big">Az alvásadatok betöltése nem sikerült. Frissítsd az oldalt, majd próbáld újra.</div></div>'})})};
window.hhCloseSleep=function(){stopHelper();var p=document.getElementById('hhSleepPage');if(p)p.classList.remove('on')};
window.hhRenderSleep=render;
window.hhSleepToggleProfile=function(e){
 if(e){e.preventDefault();e.stopPropagation();}
 /* Invalidate any in-flight Sleep read before changing profile. */
 sleepRenderSeq++;
 var next=pkey()==='monika'?'z':'m';
 if(typeof window.setProfile==='function')window.setProfile(next);
 else localStorage.setItem('hh-profile',next);
 if(document.getElementById('hhSleepPage')?.classList.contains('on'))render();
 return false;
};
window.hhSleepPeriod=function(p){sleepState.period=p;render()};
window.hhHelperMinutes=function(m,el){helper.minutes=m;document.querySelectorAll('.hhHelperTimes button').forEach(function(b){b.classList.toggle('on',b===el)})};
window.hhHelperMode=function(m,el){helper.mode=m;document.querySelectorAll('.hhHelperModes button').forEach(function(b){b.classList.toggle('on',b===el)})};

function noiseBuffer(ctx,mode){
 var len=ctx.sampleRate*2,b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0),last=0;
 for(var i=0;i<len;i++){var w=Math.random()*2-1;if(mode==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}else d[i]=w*.35}
 return b;
}
async function startAudio(mode,seconds){
 if(mode==='light'||mode==='breath')return;
 var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 helper.ctx=new AC();var src=helper.ctx.createBufferSource(),gain=helper.ctx.createGain(),filter=helper.ctx.createBiquadFilter();
 src.buffer=noiseBuffer(helper.ctx,mode);src.loop=true;filter.type='lowpass';filter.frequency.value=mode==='brown'?650:1800;
 gain.gain.setValueAtTime(.18,helper.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0008,helper.ctx.currentTime+seconds);
 src.connect(filter).connect(gain).connect(helper.ctx.destination);src.start();helper.source=src;helper.gain=gain;
}
function helperOverlay(){
 var o=document.getElementById('hhSleepHelperOverlay');if(o)return o;
 o=document.createElement('div');o.id='hhSleepHelperOverlay';o.innerHTML='<button class="hhHelperClose" onclick="hhStopSleepHelper()">×</button><div class="hhBreathOrb"></div><div class="hhHelperClock"></div><div class="hhHelperHint">Lassan engedd el a napot.</div>';
 document.body.appendChild(o);return o;
}
function updateClock(){
 var o=document.getElementById('hhSleepHelperOverlay');if(!o)return;
 var left=Math.max(0,helper.endAt-Date.now()),sec=Math.ceil(left/1000),m=Math.floor(sec/60),s=sec%60;
 var clock=o.querySelector('.hhHelperClock');if(clock)clock.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
 var total=helper.minutes*60000,progress=1-left/total;o.style.setProperty('--fade',String(Math.max(.08,1-progress*.92)));
 if(left<=0){stopHelper();return}
 helper.raf=requestAnimationFrame(updateClock);
}
window.hhStartSleepHelper=async function(){
 stopHelper();var sec=helper.minutes*60,o=helperOverlay();o.className='on mode-'+helper.mode;o.style.setProperty('--dur',helper.minutes+'min');helper.endAt=Date.now()+sec*1000;
 try{if(navigator.wakeLock)helper.wake=await navigator.wakeLock.request('screen')}catch(e){}
 try{await startAudio(helper.mode,sec)}catch(e){}
 helper.timer=setTimeout(stopHelper,sec*1000);updateClock();
};
function stopHelper(){
 if(helper.timer)clearTimeout(helper.timer);helper.timer=null;if(helper.raf)cancelAnimationFrame(helper.raf);helper.raf=null;
 try{helper.source&&helper.source.stop()}catch(e){}try{helper.ctx&&helper.ctx.close()}catch(e){}helper.source=null;helper.ctx=null;
 try{helper.wake&&helper.wake.release()}catch(e){}helper.wake=null;
 var o=document.getElementById('hhSleepHelperOverlay');if(o)o.className='';
}
window.hhStopSleepHelper=stopHelper;

function style(){
 if(document.getElementById('hh-v170-style'))return;
 var s=document.createElement('style');s.id='hh-v170-style';s.textContent=
 '.hhSleepPage{display:none;position:fixed;inset:0;z-index:5000;overflow-y:auto;background:linear-gradient(180deg,var(--wash2),var(--wash));width:min(100vw,420px);margin:auto;box-shadow:0 0 0 1px #d6e3ea;padding-bottom:64px}.hhSleepPage.on{display:block}.hhSleepDoctorHero{height:205px;position:relative;overflow:hidden;background-image:var(--hh-role-atlas);background-size:auto 200%;background-position:left top;background-repeat:no-repeat;color:#173f61}.hhSleepDoctorHero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 46%,rgba(255,255,255,.10) 70%,rgba(255,255,255,.22) 100%);pointer-events:none}.hhSleepProfileHit{position:absolute;left:0;top:0;width:52%;height:100%;border:0;background:transparent;padding:0;z-index:4;cursor:pointer}.hhSleepHeroActions{position:absolute;right:10px;top:10px;z-index:6;display:flex;gap:7px}.hhSleepHeroActions button{width:35px;height:35px;border:1px solid rgba(23,63,97,.16);border-radius:50%;background:rgba(255,255,255,.82);color:#173f61;font-size:18px;box-shadow:0 4px 14px rgba(40,70,100,.10)}.hhSleepDoctorTitle{position:absolute;left:56%;right:28px;top:49%;z-index:3;color:#173f61}.hhSleepProfileName{display:block;border:0;background:transparent;padding:0;margin:0 0 2px;color:var(--a);font-size:9px;font-weight:850;cursor:pointer}.hhSleepDoctorTitle h1{font-size:30px;line-height:1;margin:0 0 5px}.hhSleepDoctorTitle span{font-size:8px;font-weight:750;color:#5e7387}.hhSleepSurface{margin-top:-13px!important;background:linear-gradient(180deg,var(--wash2),var(--wash))!important;border-radius:24px 24px 0 0!important}.hhSleepNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7000;width:min(100vw,420px);height:58px;background:rgba(255,255,255,.97);box-shadow:0 -5px 18px rgba(28,66,92,.08);display:grid;grid-template-columns:repeat(4,1fr);align-items:center}.hhSleepNav button{border:0;background:transparent;color:#70869a;font-size:7px;display:flex;flex-direction:column;align-items:center;gap:2px}.hhSleepNav button span{font-size:20px;line-height:1}.hhSleepNav button b{font-size:7.5px}.hhSleepNav button.on{color:var(--a)}.hhSleepLoading{display:flex;align-items:center;gap:10px;min-height:72px}.hhSleepLoading b{display:block;font-size:10px;color:#27375b}.hhSleepLoading small{display:block;font-size:7px;color:#8993a5}.hhSleepSpinner{width:22px;height:22px;border:3px solid #e5e1f6;border-top-color:var(--a);border-radius:50%;animation:hhSpin .8s linear infinite}@keyframes hhSpin{to{transform:rotate(360deg)}}.hhSleepSurface{padding-top:12px;padding-bottom:80px}.hhSleepTop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}.hhSleepTop small,.hhSleepCardHead small{font-size:7px;font-weight:900;letter-spacing:.12em;color:var(--a)}.hhSleepTop h2{font-size:16px;margin:2px 0;color:#173f62}.hhSleepProfile{font-size:8px;font-weight:850;color:var(--a);background:var(--soft);border:0;border-radius:999px;padding:6px 8px;cursor:pointer}.hhSleepHeroCard{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#173f61,var(--a));color:#fff;border-radius:18px;padding:14px;box-shadow:0 8px 22px rgba(51,45,105,.18)}.hhSleepHeroCard .moon{font-size:32px}.hhSleepHeroCard small{font-size:7px;letter-spacing:.1em;opacity:.8;font-weight:850}.hhSleepHeroCard b{display:block;font-size:25px;margin:2px 0}.hhSleepHeroCard span{font-size:8px;opacity:.88}.hhStageBar{display:flex;height:18px;margin:9px 2px 3px;border-radius:9px;overflow:hidden;background:#edf0f8}.hhStageBar i{display:block;min-width:1px}.hhStageBar .awake{background:#e9a6b1}.hhStageBar .light{background:color-mix(in srgb,var(--a) 35%,#fff)}.hhStageBar .deep{background:color-mix(in srgb,var(--a) 78%,#173f61)}.hhStageBar .rem{background:color-mix(in srgb,var(--a2) 45%,#fff)}.hhStageBar .sleep{background:color-mix(in srgb,var(--a) 28%,#fff)}.hhStageBar .out,.hhStageBar .unknown{background:#dce0ea}.hhStageLegend{display:flex;justify-content:space-between;font-size:6.8px;color:#7c879a;margin:0 4px 9px}.hhSleepStageGrid,.hhSleepSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0}.hhSleepStageGrid div,.hhSleepSummary div{background:#fff;border:1px solid #e8ebf3;border-radius:12px;padding:8px}.hhSleepStageGrid small,.hhSleepSummary small{display:block;font-size:6.5px;color:#8993a5;font-weight:850}.hhSleepStageGrid b,.hhSleepSummary b{display:block;font-size:11px;color:#27375b;margin-top:2px}.hhSleepCard{background:#fff;border-radius:17px;padding:12px;margin-top:9px;box-shadow:0 6px 17px rgba(38,74,101,.055)}.hhSleepCardHead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.hhSleepCardHead h3{font-size:13px;margin:2px 0;color:#173f62}.hhSleepPeriods,.hhHelperTimes,.hhHelperModes{display:flex;flex-wrap:wrap;gap:5px}.hhSleepPeriods button,.hhHelperTimes button,.hhHelperModes button{border:1px solid #dfe4ed;background:#fff;color:#52627a;border-radius:11px;padding:6px 8px;font-size:8px;font-weight:800}.hhSleepPeriods button.on,.hhHelperTimes button.on,.hhHelperModes button.on{background:var(--soft);border-color:color-mix(in srgb,var(--a) 35%,#fff);color:var(--a)}.hhSleepCard svg{width:100%;height:180px;margin-top:8px}.hhSleepEmpty{font-size:8.5px;color:#7f8b9a;padding:10px;text-align:center}.hhSleepEmpty.big{background:#fff;border-radius:16px;padding:20px}.helperCard p{font-size:8.5px;line-height:1.4;color:#607188}.hhHelperTimes{margin:9px 0}.hhHelperModes{margin-bottom:9px}.hhHelperStart{width:100%;border:0;border-radius:14px;padding:11px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:10px;font-weight:900}.hhSleepSummary{margin-bottom:0}'+
 '#hhSleepHelperOverlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(35,22,21,var(--fade,.95));transition:background 2s;color:#fff}#hhSleepHelperOverlay.on{display:flex}.hhHelperClose{position:absolute;right:18px;top:18px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.18);color:#fff;font-size:22px}.hhBreathOrb{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#ffd8a6,#b97954 60%,rgba(89,50,40,.2));box-shadow:0 0 70px rgba(255,178,111,.35);animation:hhBreathe 10s ease-in-out infinite}.mode-light .hhBreathOrb{animation:none}.mode-brown .hhBreathOrb,.mode-soft .hhBreathOrb{animation:hhGlow 14s ease-in-out infinite}.hhHelperClock{font-size:28px;font-weight:800;margin-top:28px;letter-spacing:.04em}.hhHelperHint{font-size:10px;opacity:.72;margin-top:6px}@keyframes hhBreathe{0%,100%{transform:scale(.72);opacity:.5}45%{transform:scale(1.12);opacity:1}}@keyframes hhGlow{0%,100%{transform:scale(.92);opacity:.55}50%{transform:scale(1.03);opacity:.9}}';
 document.head.appendChild(s);
}
style();ensurePage();wireButton();document.addEventListener('click',delegatedSleepClick,true);
var prevSet=window.setProfile;if(typeof prevSet==='function')window.setProfile=function(){var r=prevSet.apply(this,arguments);setTimeout(function(){if(document.getElementById('hhSleepPage')?.classList.contains('on'))render()},60);return r};
setTimeout(wireButton,300);setInterval(wireButton,2000);
document.documentElement.dataset.healthhubSleep='1.237';window.HH_LIVE_BUILD='v1.237-sleep-profile-race-fix';
})();