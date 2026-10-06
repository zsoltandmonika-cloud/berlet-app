(function(){
'use strict';
/* HealthHub v1.285 — reliable save ta-da feedback */
var DB='healthhub-healthradar-v2', PAGE='hhWeightPage270', MODAL='hhWeightWheel283', STYLE='hh-v283-style';
var state={step:'weight',weight:null,fat:null,baseWeight:null,baseFat:null};
var audioCtx=null,lastTick=null,itemH=46,raf=0;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function round1(n){return Math.round(n*10)/10}
function fmt(n){return Number(n).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '.hhWW283{display:none;position:fixed;inset:0;z-index:9300;background:rgba(5,25,40,.58);backdrop-filter:blur(8px);align-items:flex-end;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.hhWW283.on{display:flex}.hhWWCard{width:min(100vw,430px);margin:0 auto;background:linear-gradient(180deg,#fbfdff,#f4f9fc);border-radius:25px 25px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 44px rgba(0,0,0,.22);color:#173f62}.hhWWHead{display:grid;grid-template-columns:42px 1fr 42px;align-items:center}.hhWWClose{width:38px;height:38px;border:0;border-radius:50%;background:#eaf2f7;color:#284d69;font-size:22px}.hhWWTitle{text-align:center}.hhWWTitle small{display:block;font-size:8px;font-weight:900;letter-spacing:.08em;color:var(--a)}.hhWWTitle b{display:block;font-size:17px;margin-top:2px}.hhWWStep{text-align:right;font-size:8px;font-weight:900;color:#8195a4}.hhWWValue{text-align:center;margin:8px 0 3px}.hhWWValue strong{font-size:36px;line-height:1;color:#143c5d;letter-spacing:-.03em}.hhWWValue span{font-size:13px;font-weight:900;color:var(--a);margin-left:5px}.hhWWSub{text-align:center;font-size:8px;color:#7990a1;font-weight:750;margin-bottom:8px}.hhWWPickerWrap{position:relative;height:230px;margin:0 9px 12px;border-radius:18px;background:#fff;border:1px solid #dfeaf1;overflow:hidden;box-shadow:inset 0 5px 15px rgba(38,73,99,.025)}.hhWWPicker{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:92px 0}.hhWWPicker::-webkit-scrollbar{display:none}.hhWWItem{height:46px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;font-size:17px;font-weight:760;color:#9caeba;transition:transform .12s,opacity .12s,color .12s;font-variant-numeric:tabular-nums}.hhWWItem.near{color:#667f91;font-size:19px}.hhWWItem.sel{font-size:28px;font-weight:900;color:#173f62;transform:scale(1.04)}.hhWWFocus{position:absolute;left:10px;right:10px;top:92px;height:46px;border-top:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);border-bottom:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);background:color-mix(in srgb,var(--a) 7%,transparent);pointer-events:none;border-radius:10px}.hhWWFadeTop,.hhWWFadeBottom{position:absolute;left:0;right:0;height:72px;pointer-events:none;z-index:2}.hhWWFadeTop{top:0;background:linear-gradient(#fff,rgba(255,255,255,0))}.hhWWFadeBottom{bottom:0;background:linear-gradient(rgba(255,255,255,0),#fff)}.hhWWActions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px}.hhWWActions button{height:46px;border-radius:14px;border:1px solid #dbe6ed;background:#fff;color:#45647b;font-size:10px;font-weight:900}.hhWWActions .primary{border:0;color:#fff;background:linear-gradient(135deg,var(--a),var(--a2));box-shadow:0 7px 15px color-mix(in srgb,var(--a) 22%,transparent)}.hhWWNote{text-align:center;font-size:7.5px;color:#8a9ba8;margin-top:8px;font-weight:700}.hhWLcdTop,.hhWLcdBottom{cursor:pointer}.hhWLcdTop:active,.hhWLcdBottom:active{filter:brightness(1.12)}';
 document.head.appendChild(s);
}
function ensureModal(){
 ensureStyle();var o=document.getElementById(MODAL);if(o)return o;
 o=document.createElement('div');o.id=MODAL;o.className='hhWW283';
 o.innerHTML='<div class="hhWWCard"><div class="hhWWHead"><button class="hhWWClose" type="button">×</button><div class="hhWWTitle"><small>HEALTHHUB · GYORS MÉRÉS</small><b></b></div><div class="hhWWStep"></div></div><div class="hhWWValue"><strong>0,0</strong><span>kg</span></div><div class="hhWWSub"></div><div class="hhWWPickerWrap"><div class="hhWWPicker"></div><div class="hhWWFocus"></div><div class="hhWWFadeTop"></div><div class="hhWWFadeBottom"></div></div><div class="hhWWActions"><button class="hhWWCancel" type="button">Mégse</button><button class="hhWWNext primary" type="button">Tovább →</button></div><div class="hhWWNote">0,1-es lépések · görgetéskor hang + finom rezgés</div></div>';
 document.body.appendChild(o);
 o.querySelector('.hhWWClose').addEventListener('click',close);
 o.querySelector('.hhWWCancel').addEventListener('click',close);
 o.querySelector('.hhWWNext').addEventListener('click',next);
 o.addEventListener('click',function(e){if(e.target===o)close()});
 return o;
}
async function latest(){
 var db=await openDb();try{
  var st=db.transaction('measurements','readonly').objectStore('measurements'),all;
  if(st.indexNames.contains('profile'))all=await reqP(st.index('profile').getAll(pkey()));else all=(await reqP(st.getAll())).filter(function(x){return x.profile===pkey()});
  all=(all||[]).sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)});
  var w=null,f=null;
  for(var i=0;i<all.length;i++){
   var x=all[i],wv=Number(x.weightKg),fv=Number(x.bodyFatPercent);
   if(w==null&&Number.isFinite(wv)&&wv>=20&&wv<=400)w=wv;
   if(f==null&&Number.isFinite(fv)&&fv>=1&&fv<=75)f=fv;
   if(w!=null&&f!=null)break;
  }
  return {weight:w,fat:f};
 }finally{db.close()}
}
function initAudio(){
 try{
  if(!audioCtx){var A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A()}
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
 }catch(e){}
}
function tick(){
 try{
  if(audioCtx){
   var osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),t=audioCtx.currentTime;
   osc.type='square';osc.frequency.setValueAtTime(1180,t);
   gain.gain.setValueAtTime(.018,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.018);
   osc.connect(gain);gain.connect(audioCtx.destination);osc.start(t);osc.stop(t+.019);
  }
 }catch(e){}
 try{if(navigator.vibrate)navigator.vibrate(7)}catch(e){}
}
function successTada(){
 try{
  if(!audioCtx){initAudio()}
  if(!audioCtx)return;
  var t=audioCtx.currentTime+.015;
  function note(freq,start,dur,vol,type){
   var o=audioCtx.createOscillator(),g=audioCtx.createGain();
   o.type=type||'triangle';
   o.frequency.setValueAtTime(freq,start);
   g.gain.setValueAtTime(.0001,start);
   g.gain.exponentialRampToValueAtTime(vol,start+.012);
   g.gain.exponentialRampToValueAtTime(.0001,start+dur);
   o.connect(g);g.connect(audioCtx.destination);o.start(start);o.stop(start+dur+.03);
  }
  note(523.25,t,.18,.075,'triangle');
  note(659.25,t+.11,.28,.065,'triangle');
  note(783.99,t+.11,.32,.060,'triangle');
  note(1046.50,t+.24,.42,.055,'sine');
 }catch(e){console.warn('HealthHub tada',e)}
 try{if(navigator.vibrate)navigator.vibrate([20,28,20,28,42])}catch(e){}
}
function rangeFor(step){
 var base=step==='weight'?(state.weight!=null?state.weight:(state.baseWeight!=null?state.baseWeight:75)):(state.fat!=null?state.fat:(state.baseFat!=null?state.baseFat:30));
 var span=5,min=step==='weight'?20:1,max=step==='weight'?400:75;
 var lo=round1(clamp(base-span,min,max)),hi=round1(clamp(base+span,min,max)),vals=[];
 for(var n=Math.round(lo*10);n<=Math.round(hi*10);n++)vals.push(n/10);
 return {vals:vals,base:round1(clamp(base,min,max))};
}
function renderPicker(){
 var o=ensureModal(),picker=o.querySelector('.hhWWPicker'),info=rangeFor(state.step),vals=info.vals,base=info.base;
 picker.innerHTML=vals.map(function(v,i){return '<div class="hhWWItem" data-i="'+i+'" data-v="'+v.toFixed(1)+'">'+fmt(v)+'</div>'}).join('');
 picker.dataset.values=JSON.stringify(vals);
 var idx=vals.reduce(function(best,v,i){return Math.abs(v-base)<Math.abs(vals[best]-base)?i:best},0);
 picker.scrollTop=idx*itemH;lastTick=idx;
 updateVisual(idx,false);
 requestAnimationFrame(function(){picker.scrollTop=idx*itemH;updateVisual(idx,false)});
 picker.onscroll=function(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(function(){
   var i=clamp(Math.round(picker.scrollTop/itemH),0,vals.length-1);
   if(i!==lastTick){lastTick=i;updateVisual(i,true)}
  });
 };
}
function updateVisual(idx,feedback){
 var o=document.getElementById(MODAL);if(!o)return;
 var picker=o.querySelector('.hhWWPicker'),vals=JSON.parse(picker.dataset.values||'[]'),v=vals[idx];if(v==null)return;
 if(state.step==='weight')state.weight=v;else state.fat=v;
 var val=o.querySelector('.hhWWValue strong'),unit=o.querySelector('.hhWWValue span');
 val.textContent=fmt(v);unit.textContent=state.step==='weight'?'kg':'%';
 var items=picker.querySelectorAll('.hhWWItem');
 items.forEach(function(el,i){el.classList.toggle('sel',i===idx);el.classList.toggle('near',Math.abs(i-idx)===1)});
 if(feedback)tick();
}
function fillStep(){
 var o=ensureModal(),isW=state.step==='weight';
 o.querySelector('.hhWWTitle b').textContent=isW?'Testsúly':'Testzsír';
 o.querySelector('.hhWWStep').textContent=isW?'1 / 2':'2 / 2';
 o.querySelector('.hhWWSub').textContent=isW?'Előző érték: '+(state.baseWeight!=null?fmt(state.baseWeight)+' kg':'nincs'):'Előző érték: '+(state.baseFat!=null?fmt(state.baseFat)+'%':'nincs');
 o.querySelector('.hhWWNext').textContent=isW?'Tovább →':'✓ Mentés';
 renderPicker();
}
async function open(step){
 initAudio();var l=await latest();
 state.baseWeight=l.weight;state.baseFat=l.fat;state.weight=l.weight!=null?round1(l.weight):75;state.fat=l.fat!=null?round1(l.fat):30;state.step=step||'weight';
 var o=ensureModal();fillStep();o.classList.add('on');
}
function close(){var o=document.getElementById(MODAL);if(o)o.classList.remove('on')}
async function next(){
 initAudio();
 tick();
 if(state.step==='weight'){state.step='fat';fillStep();return}
 try{if(audioCtx&&audioCtx.state==='suspended')await audioCtx.resume()}catch(e){}
 await save();
}
async function save(){
 var kg=Number(state.weight),fat=Number(state.fat);
 if(!(kg>=20&&kg<=400)){toast('Érvénytelen testsúly.');return}
 if(!(fat>=1&&fat<=75)){toast('Érvénytelen testzsír.');return}
 var profile=pkey(),now=new Date().toISOString();
 var x={id:'weight-wheel-'+profile+'-'+Date.now(),profile:profile,measuredAt:now,systolic:null,diastolic:null,pulse:null,weightKg:round1(kg),bodyFatPercent:round1(fat),bloodGlucose:null,oxygenSaturation:null,source:'manual_weight_wheel',notes:'HealthHub Testsúly modul · gyors görgős rögzítés',createdAt:now,updatedAt:now};
 try{
  var db=await openDb();try{
   var stores=['measurements'];if(db.objectStoreNames.contains('profiles'))stores.push('profiles');
   var t=db.transaction(stores,'readwrite');t.objectStore('measurements').put(x);
   if(stores.length>1){var ps=t.objectStore('profiles'),p=await reqP(ps.get(profile));if(p){p.weightKg=x.weightKg;p.updatedAt=now;ps.put(p)}}
   await txDone(t);
  }finally{db.close()}
  close();
  try{if(window.hhDropboxPushCurrentProfile)await window.hhDropboxPushCurrentProfile()}catch(e){console.warn('Weight Dropbox sync',e)}
  window.hhRenderLiveKpis&&window.hhRenderLiveKpis();
  window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
  try{window.dispatchEvent(new CustomEvent('healthhub:measurement-saved',{detail:{profile:profile,type:'weight',id:x.id}}))}catch(e){}
  if(window.hhRenderWeight270)await window.hhRenderWeight270();
  if(window.hhRenderWeightTrend277)setTimeout(window.hhRenderWeightTrend277,60);
  successTada();
  toast('Mérés mentve · '+fmt(x.weightKg)+' kg · '+fmt(x.bodyFatPercent)+'%');
 }catch(e){console.error(e);toast('A mérés mentése nem sikerült.')}
}
function toast(s){if(window.toast)window.toast(s);else alert(s)}
function hook(){
 ensureStyle();ensureModal();var page=document.getElementById(PAGE);if(!page){setTimeout(hook,120);return}
 if(page.dataset.hhWheel283)return;page.dataset.hhWheel283='1';
 page.addEventListener('click',function(e){
  var top=e.target&&e.target.closest&&e.target.closest('.hhWLcdTop');
  var bottom=e.target&&e.target.closest&&e.target.closest('.hhWLcdBottom');
  var fresh=e.target&&e.target.closest&&e.target.closest('[data-act="new"]');
  if(!top&&!bottom&&!fresh)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(bottom)open('fat');else open('weight');
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
window.addEventListener('healthhub:profile-changed',function(){close();setTimeout(hook,30)});
window.hhOpenWeightWheel283=function(){open('weight')};
document.documentElement.dataset.healthhubWeightWheel='1.285';
})();