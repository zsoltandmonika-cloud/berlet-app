(function(){
'use strict';
/* HealthHub v1.76 — API-free cross-signal Insights */
var DB='healthhub-healthradar-v2',BRIDGE_DB='healthhub-connect-v1';
var state=window.hhInsightState||{period:'30d'};window.hhInsightState=state;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function days(){return state.period==='7d'?7:state.period==='90d'?90:30}
function cutoff(){return Date.now()-days()*86400000}
function dayKey(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}
function fmt(v,d){return Number(v).toLocaleString('hu-HU',{maximumFractionDigits:d==null?1:d})}
function pct(v){return (v>0?'+':'')+fmt(v,1)+'%'}
function deltaLabel(v){if(Math.abs(v)<1)return'lényegében változatlan';return v>0?'magasabb':'alacsonyabb'}
function pearson(a,b){if(a.length<2||a.length!==b.length)return null;var ma=avg(a),mb=avg(b),num=0,da=0,db=0;for(var i=0;i<a.length;i++){var x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y}return da&&db?num/Math.sqrt(da*db):null}

async function measurements(){
 try{var db=await openDb();try{return (await reqP(db.transaction('measurements').objectStore('measurements').getAll())||[]).filter(function(x){return x.profile===pkey()&&Date.parse(x.measuredAt||0)>=cutoff()})}finally{db.close()}}catch(e){return[]}
}
async function bridge(){
 var out={activity:[],sleep:[],resting:[]};
 try{
  var db=await openBridgeDb();try{
   var tx=db.transaction(['activity','imports']),acts=await reqP(tx.objectStore('activity').getAll())||[],ims=await reqP(tx.objectStore('imports').getAll())||[];
   out.activity=acts.filter(function(x){return x.profile===pkey()&&Date.parse((x.date||'')+'T12:00:00')>=cutoff()});
   var sleepMap=new Map(),restMap=new Map();
   ims.filter(function(i){return i.profile===pkey()&&i.bundle&&i.bundle.records}).forEach(function(i){
    var r=i.bundle.records;
    (Array.isArray(r.sleepSessions)?r.sleepSessions:[]).forEach(function(s){if(Date.parse(s.endTime||0)>=cutoff()){var id=String(s.id||s.startTime+'|'+s.endTime);if(!sleepMap.has(id))sleepMap.set(id,s)}});
    (Array.isArray(r.restingHeartRate)?r.restingHeartRate:[]).forEach(function(x){if(Date.parse(x.time||0)>=cutoff()){var id=String(x.id||x.time);if(!restMap.has(id))restMap.set(id,x)}});
   });
   out.sleep=Array.from(sleepMap.values());out.resting=Array.from(restMap.values());
  }finally{db.close()}
 }catch(e){}
 return out
}
function metricRows(ms,key){
 return ms.filter(function(x){
  if(key==='bp')return Number.isFinite(Number(x.systolic))&&Number.isFinite(Number(x.diastolic));
  return Number.isFinite(Number(x[key]));
 }).sort(function(a,b){return Date.parse(a.measuredAt)-Date.parse(b.measuredAt)})
}
function compareSeries(rows,getter,minCount){
 minCount=minCount||4;if(rows.length<minCount)return null;
 var cut=Math.max(1,Math.floor(rows.length/3)),first=rows.slice(0,cut),last=rows.slice(-cut),a=avg(first.map(getter)),b=avg(last.map(getter));
 if(!Number.isFinite(a)||!Number.isFinite(b))return null;
 return {first:a,last:b,abs:b-a,pct:a?((b-a)/Math.abs(a))*100:0,count:rows.length};
}
function item(icon,title,text,tag,cls){
 return '<div class="hhInsightItem '+(cls||'')+'"><div class="hhInsightIcon">'+icon+'</div><div><small>'+esc(tag)+'</small><b>'+esc(title)+'</b><p>'+esc(text)+'</p></div></div>'
}
function trendItems(ms,b){
 var items=[];
 var bp=compareSeries(metricRows(ms,'bp'),function(x){return Number(x.systolic)},4);
 if(bp)items.push(item('🫀','Vérnyomás','A szisztolés mérések utolsó szakaszának átlaga '+deltaLabel(bp.abs)+' az időszak elejéhez képest ('+(bp.abs>0?'+':'')+fmt(bp.abs,1)+' Hgmm).','VÁLTOZÁS'));
 else items.push(item('🫀','Vérnyomás','Ehhez az időszakhoz még kevés összehasonlítható mérés áll rendelkezésre.','KEVÉS ADAT','muted'));

 [['weightKg','⚖️','Testsúly','kg'],['pulse','♥','Pulzus','/perc'],['oxygenSaturation','🫁','SpO₂','%'],['bloodGlucose','●','Vércukor','mmol/L']].forEach(function(m){
  var r=metricRows(ms,m[0]),c=compareSeries(r,function(x){return Number(x[m[0]])},4);
  if(c)items.push(item(m[1],m[2], 'Az időszak utolsó szakaszának átlaga '+deltaLabel(c.abs)+' ('+(c.abs>0?'+':'')+fmt(c.abs,1)+' '+m[3]+').','VÁLTOZÁS'));
  else items.push(item(m[1],m[2],'Ehhez az időszakhoz még kevés adatpont van trend összehasonlításhoz.','KEVÉS ADAT','muted'));
 });
 var acts=b.activity.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))});
 var ac=compareSeries(acts,function(x){return Number(x.steps)||0},4);
 if(ac)items.push(item('🚶','Lépések','A napi lépésszám utolsó szakaszának átlaga '+deltaLabel(ac.pct)+' ('+pct(ac.pct)+').','AKTIVITÁS'));
 else items.push(item('🚶','Lépések','Még nincs elég napi lépésadat ehhez az időszakhoz.','KEVÉS ADAT','muted'));
 var sl=b.sleep.slice().sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)});
 var sc=compareSeries(sl,function(x){return (Date.parse(x.endTime)-Date.parse(x.startTime))/3600000},4);
 if(sc)items.push(item('🌙','Alvásidő','Az utolsó éjszakák átlagos alvásideje '+deltaLabel(sc.abs)+' ('+(sc.abs>0?'+':'')+fmt(sc.abs,1)+' óra).','ALVÁS'));
 else items.push(item('🌙','Alvásidő','Még nincs elég alvásadat összehasonlításhoz.','KEVÉS ADAT','muted'));
 return items;
}
function dailyMaps(ms,b){
 var maps={steps:{},sleep:{},rest:{},weight:{},pulse:{},sys:{}};
 b.activity.forEach(function(x){if(Number.isFinite(Number(x.steps)))maps.steps[x.date]=Number(x.steps)});
 b.sleep.forEach(function(x){var k=dayKey(x.endTime),h=(Date.parse(x.endTime)-Date.parse(x.startTime))/3600000;if(k&&h>0)maps.sleep[k]=h});
 b.resting.forEach(function(x){var k=dayKey(x.time);if(k&&Number.isFinite(Number(x.bpm)))maps.rest[k]=Number(x.bpm)});
 ms.forEach(function(x){var k=dayKey(x.measuredAt);if(!k)return;if(Number.isFinite(Number(x.weightKg)))maps.weight[k]=Number(x.weightKg);if(Number.isFinite(Number(x.pulse)))maps.pulse[k]=Number(x.pulse);if(Number.isFinite(Number(x.systolic)))maps.sys[k]=Number(x.systolic)});
 return maps;
}
function corrCard(maps,a,b,label){
 var ks=Object.keys(maps[a]).filter(function(k){return maps[b][k]!=null}),x=ks.map(function(k){return maps[a][k]}),y=ks.map(function(k){return maps[b][k]}),r=pearson(x,y);
 if(ks.length<5||r==null||Math.abs(r)<.45)return null;
 var strength=Math.abs(r)>=.7?'markáns':'mérsékelt',dir=r>0?'azonos irányú':'ellentétes irányú';
 return item('↔',label,'A közös napokon '+strength+', '+dir+' együttmozgás látszik (n='+ks.length+'). Ez összefüggés, nem ok-okozati bizonyíték.','EGYÜTTMOZGÁS');
}
function correlations(ms,b){
 var m=dailyMaps(ms,b),out=[
  corrCard(m,'steps','sleep','Lépések ↔ alvás'),
  corrCard(m,'sleep','rest','Alvás ↔ nyugalmi pulzus'),
  corrCard(m,'steps','weight','Lépések ↔ testsúly'),
  corrCard(m,'sleep','pulse','Alvás ↔ pulzus'),
  corrCard(m,'sys','pulse','Vérnyomás ↔ pulzus')
 ].filter(Boolean);
 return out.length?out:[item('↔','Kapcsolatok','Ebben az időszakban nincs elég, azonos napokra eső adat ahhoz, hogy értelmes együttmozgást mutassunk.','KEVÉS KÖZÖS ADAT','muted')];
}
function completeness(ms,b){
 var c=[
  ['Vérnyomás',metricRows(ms,'bp').length],
  ['Testsúly',metricRows(ms,'weightKg').length],
  ['Pulzus',metricRows(ms,'pulse').length],
  ['SpO₂',metricRows(ms,'oxygenSaturation').length],
  ['Vércukor',metricRows(ms,'bloodGlucose').length],
  ['Lépésnap',b.activity.length],
  ['Alvás',b.sleep.length]
 ];
 return '<div class="hhInsightCoverage">'+c.map(function(x){var level=x[1]>=10?'good':x[1]>=4?'mid':'low';return '<div><span>'+esc(x[0])+'</span><b>'+x[1]+'</b><i class="'+level+'"></i></div>'}).join('')+'</div>';
}
function hero(){
 return '<div class="hhInsightHero"><div class="hhInsightHeroActions"><button onclick="hhCloseInsights()">⌂</button><button onclick="hhRenderInsights()">↻</button></div><div class="hhInsightHeroTitle"><small>'+esc(pname())+'</small><h1>Insights</h1><span>HealthHub adatértelmezés</span></div></div>';
}
function nav(){
 return '<nav class="hhInsightNav"><button onclick="hhCloseInsights()"><span>⌂</span><b>Kezdőlap</b></button><button onclick="hhCloseInsights();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button class="on"><span>▥</span><b>Insights</b></button><button onclick="hhCloseInsights();if(window.show)show(\'timeline\')"><span>⌁</span><b>Idővonal</b></button></nav>';
}
async function render(){
 var p=document.getElementById('hhInsightPage');if(!p)return;
 p.innerHTML=hero()+'<div class="surface hhInsightSurface"><div class="hhInsightLoading"><div class="hhInsightSpinner"></div><div><b>Insightok készülnek…</b><small>A helyi HealthHub adatok elemzése</small></div></div></div>'+nav();
 var data=await Promise.all([measurements(),bridge()]),ms=data[0],b=data[1],items=trendItems(ms,b),corr=correlations(ms,b);
 p.innerHTML=hero()+'<div class="surface hhInsightSurface">'+
  '<div class="hhInsightHead"><div><small>API-MENTES · HELYI ELEMZÉS</small><h2>Mi változott?</h2></div><span>'+esc(pname())+'</span></div>'+
  '<div class="hhInsightPeriods"><button class="'+(state.period==='7d'?'on':'')+'" onclick="hhInsightPeriod(\'7d\')">7 nap</button><button class="'+(state.period==='30d'?'on':'')+'" onclick="hhInsightPeriod(\'30d\')">30 nap</button><button class="'+(state.period==='90d'?'on':'')+'" onclick="hhInsightPeriod(\'90d\')">90 nap</button></div>'+
  '<section class="hhInsightCard"><div class="hhInsightCardHead"><small>SNAPSHOT INSIGHT</small><h3>Legfontosabb változások</h3></div><div class="hhInsightList">'+items.join('')+'</div></section>'+
  '<section class="hhInsightCard"><div class="hhInsightCardHead"><small>CORRELATION INSIGHT</small><h3>Együttmozgó jelek</h3></div><div class="hhInsightList">'+corr.join('')+'</div></section>'+
  '<section class="hhInsightCard"><div class="hhInsightCardHead"><small>ADATLEFEDETTSÉG</small><h3>Miből dolgozik az Insight?</h3></div>'+completeness(ms,b)+'</section>'+
  '<div class="hhInsightNote"><b>Mit jelent ez?</b><p>Az Insight trendeket és együttmozgásokat ír le a saját adataidból. Nem diagnózis, nem orvosi minősítés, és az együttmozgás nem bizonyít ok-okozati kapcsolatot.</p></div>'+
 '</div>'+nav();
}
function ensurePage(){if(document.getElementById('hhInsightPage'))return;var s=document.createElement('section');s.id='hhInsightPage';s.className='hhInsightPage';document.body.appendChild(s)}
function wire(){var btn=Array.from(document.querySelectorAll('.homeModule')).find(function(b){var x=b.querySelector('b');return x&&x.textContent.trim()==='Insights'});if(btn){btn.removeAttribute('onclick');btn.style.pointerEvents='auto';btn.style.cursor='pointer'}}
function delegated(e){var btn=e.target&&e.target.closest?e.target.closest('.homeModule'):null;if(!btn)return;var b=btn.querySelector('b');if(!b||b.textContent.trim()!=='Insights')return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();window.hhOpenInsights()}
window.hhOpenInsights=function(){ensurePage();var p=document.getElementById('hhInsightPage');p.classList.add('on');render().catch(function(){p.innerHTML=hero()+'<div class="surface hhInsightSurface"><div class="hhInsightError">Az Insight betöltése nem sikerült.</div></div>'+nav()})};
window.hhCloseInsights=function(){var p=document.getElementById('hhInsightPage');if(p)p.classList.remove('on')};
window.hhRenderInsights=render;
window.hhInsightPeriod=function(v){state.period=v;render()};

function style(){
 if(document.getElementById('hh-v176-style'))return;var s=document.createElement('style');s.id='hh-v176-style';s.textContent=
 '.hhInsightPage{display:none;position:fixed;inset:0;z-index:5100;overflow-y:auto;background:linear-gradient(180deg,var(--wash2),var(--wash));width:min(100vw,420px);margin:auto;padding-bottom:64px}.hhInsightPage.on{display:block}.hhInsightHero{height:205px;position:relative;background-image:var(--hh-role-atlas);background-size:auto 200%;background-position:left top;background-repeat:no-repeat;color:#173f61}.hhInsightHero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,transparent 46%,rgba(255,255,255,.10) 70%,rgba(255,255,255,.24) 100%);pointer-events:none}.hhInsightHeroActions{position:absolute;right:10px;top:10px;z-index:4;display:flex;gap:7px}.hhInsightHeroActions button{width:35px;height:35px;border:1px solid rgba(23,63,97,.16);border-radius:50%;background:rgba(255,255,255,.84);color:#173f61;font-size:18px}.hhInsightHeroTitle{position:absolute;left:56%;right:24px;top:49%;z-index:3}.hhInsightHeroTitle small{font-size:9px;font-weight:850;color:var(--a)}.hhInsightHeroTitle h1{font-size:29px;line-height:1;margin:2px 0 5px}.hhInsightHeroTitle span{font-size:8px;color:#61768b;font-weight:750}.hhInsightSurface{margin-top:-13px!important;border-radius:24px 24px 0 0!important;background:linear-gradient(180deg,var(--wash2),var(--wash))!important;padding-bottom:74px!important}.hhInsightHead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.hhInsightHead small,.hhInsightCardHead small{font-size:7px;font-weight:900;letter-spacing:.11em;color:var(--a)}.hhInsightHead h2,.hhInsightCardHead h3{color:#173f62;margin:2px 0}.hhInsightHead h2{font-size:16px}.hhInsightHead>span{font-size:8px;background:var(--soft);color:var(--a);border-radius:999px;padding:6px 8px;font-weight:850}.hhInsightPeriods{display:flex;gap:5px;margin:9px 0}.hhInsightPeriods button{flex:1;border:1px solid #dfe7ed;background:#fff;border-radius:12px;padding:7px;font-size:8px;font-weight:850;color:#587086}.hhInsightPeriods button.on{background:var(--soft);color:var(--a);border-color:color-mix(in srgb,var(--a) 35%,#fff)}.hhInsightCard{background:#fff;border-radius:17px;padding:12px;margin-top:9px;box-shadow:0 6px 17px rgba(38,74,101,.055)}.hhInsightCardHead h3{font-size:13px}.hhInsightList{margin-top:7px}.hhInsightItem{display:grid;grid-template-columns:34px 1fr;gap:9px;padding:9px 0;border-top:1px solid #edf1f5}.hhInsightItem:first-child{border-top:0}.hhInsightIcon{width:34px;height:34px;border-radius:11px;background:var(--soft);display:grid;place-items:center;font-size:16px}.hhInsightItem small{display:block;font-size:6.5px;color:var(--a);font-weight:900;letter-spacing:.08em}.hhInsightItem b{display:block;font-size:10px;color:#173f62;margin:1px 0}.hhInsightItem p{font-size:8px;line-height:1.42;color:#607487;margin:0}.hhInsightItem.muted{opacity:.72}.hhInsightCoverage{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}.hhInsightCoverage div{position:relative;background:#f9fbfd;border:1px solid #e8eef3;border-radius:12px;padding:8px;overflow:hidden}.hhInsightCoverage span{font-size:7px;color:#74889a}.hhInsightCoverage b{float:right;font-size:10px;color:#173f62}.hhInsightCoverage i{position:absolute;left:0;bottom:0;height:3px;width:100%}.hhInsightCoverage i.good{background:var(--a)}.hhInsightCoverage i.mid{background:color-mix(in srgb,var(--a) 55%,#fff)}.hhInsightCoverage i.low{background:#dfe6ec}.hhInsightNote{margin:10px 2px;padding:10px;border-radius:14px;background:var(--soft);color:#51697b}.hhInsightNote b{font-size:9px;color:var(--a)}.hhInsightNote p{font-size:8px;line-height:1.4;margin:3px 0 0}.hhInsightNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7200;width:min(100vw,420px);height:58px;background:rgba(255,255,255,.97);box-shadow:0 -5px 18px rgba(28,66,92,.08);display:grid;grid-template-columns:repeat(4,1fr);align-items:center}.hhInsightNav button{border:0;background:transparent;color:#70869a;font-size:7px;display:flex;flex-direction:column;align-items:center;gap:2px}.hhInsightNav button span{font-size:19px}.hhInsightNav button b{font-size:7.5px}.hhInsightNav button.on{color:var(--a)}.hhInsightLoading{display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:14px}.hhInsightLoading b{display:block;font-size:10px;color:#173f62}.hhInsightLoading small{font-size:7px;color:#8193a1}.hhInsightSpinner{width:22px;height:22px;border:3px solid #e6edf2;border-top-color:var(--a);border-radius:50%;animation:hhISpin .8s linear infinite}@keyframes hhISpin{to{transform:rotate(360deg)}}.hhInsightError{background:#fff;border-radius:16px;padding:18px;font-size:9px;color:#607487;text-align:center}';
 document.head.appendChild(s)
}
style();ensurePage();wire();document.addEventListener('click',delegated,true);setInterval(wire,2000);
document.documentElement.dataset.healthhubInsights='1.76';
})();