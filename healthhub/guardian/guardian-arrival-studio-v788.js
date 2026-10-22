/* HealthHub Guardian v788 · Smart Arrival Studio (editor and manual preview only).
 * This does NOT listen to GPS or send real notifications; it changes only local preferences.
 * One device's settings never grant another device permission to share locations.
 */
(function(w,d){
'use strict';
const KEY='hh-guardian-smart-arrival-studio-v788';
const PEOPLE=['zsolt','monika'],PLACES=['home','work'],EVENTS=['arrive','leave'];
const SOUNDS=['mokuska','tada','chime','soft','silent'];
const $=id=>d.getElementById(id);
const personNames={zsolt:'Zsolt',monika:'Mónika'};
const placeNames={home:'Otthon',work:'Munkahely'};
let data={},dirty=false,timeout=null,context=null;
function field(id){const el=$(id);return el?el.value:''}
function setField(id,value){const el=$(id);if(el)el.value=value}
function enabled(id){const el=$(id);return !!(el&&el.checked)}
function note(s){const el=$('hhArrivalStatus');if(el)el.textContent=s}
function key(){return [field('hhArrivalPerson'),field('hhArrivalPlace'),field('hhArrivalEvent')].join(':')}
function defaults(){
 const person=personNames[field('hhArrivalPerson')]||'Családtag';
 const place=field('hhArrivalPlace')||'home';
 const arriving=field('hhArrivalEvent')!=='leave';
 const loc=placeNames[place]||'a kijelölt hely';
 return {
  title:arriving?(place==='home'?person+' hazaért! 🏡':person+' megérkezett a munkahelyére! 💼'):person+' elindult: '+loc+' 🚶',
  body:arriving?'Mókuska jelenti: '+person+' megérkezett.':'Mókuska jelenti: '+person+' elhagyta a kijelölt helyet.',
  sound:'mokuska',animation:true,quiet:true,enabled:true
 };
}
function tidy(obj){
 const fallback=defaults(),v=obj&&typeof obj==='object'?obj:{};
 return {
  title:typeof v.title==='string'&&v.title.trim()?v.title.trim().slice(0,90):fallback.title,
  body:typeof v.body==='string'&&v.body.trim()?v.body.trim().slice(0,240):fallback.body,
  sound:SOUNDS.includes(v.sound)?v.sound:'mokuska',
  animation:v.animation!==false,quiet:v.quiet!==false,enabled:v.enabled!==false
 };
}
function load(){
 try{
  const json=JSON.parse(w.localStorage.getItem(KEY)||'{}');
  if(!json||typeof json!=='object'||Array.isArray(json))return {};
  const out={};
  for(const name of Object.keys(json)){
   const [p,l,e]=name.split(':');
   if(PEOPLE.includes(p)&&PLACES.includes(l)&&EVENTS.includes(e)&&name.split(':').length===3)out[name]=json[name];
  }
  return out;
 }catch(_){return {}}
}
function current(){
 return tidy({
  title:field('hhArrivalTitle'),body:field('hhArrivalBody'),sound:field('hhArrivalSound'),
  animation:enabled('hhArrivalAnimation'),quiet:enabled('hhArrivalQuiet'),enabled:enabled('hhArrivalEnabled')
 });
}
function preview(){
 const x=current();
 const t=$('hhArrivalPreviewTitle'),b=$('hhArrivalPreviewText'),m=$('hhArrivalPreviewMascot');
 const s=$('hhArrivalPreviewSound'),a=$('hhArrivalPreviewActive');
 if(t)t.textContent=x.title;
 if(b)b.textContent=x.body;
 if(m)m.hidden=!x.animation;
 if(s)s.textContent={mokuska:'🐿️ Játékos Mókuska',tada:'🎺 Ta-daaa!',chime:'🔔 Csilingelés',soft:'✨ Diszkrét',silent:'🔕 Néma'}[x.sound];
 if(a)a.textContent=x.enabled?'Értesítés: BE':'Értesítés: KI';
}
function fill(){
 const x=tidy(data[key()]||defaults());
 setField('hhArrivalTitle',x.title);setField('hhArrivalBody',x.body);setField('hhArrivalSound',x.sound);
 if($('hhArrivalAnimation'))$('hhArrivalAnimation').checked=x.animation;
 if($('hhArrivalQuiet'))$('hhArrivalQuiet').checked=x.quiet;
 if($('hhArrivalEnabled'))$('hhArrivalEnabled').checked=x.enabled;
 context=key();dirty=false;preview();
 note(data[key()]?'Mentett sablon betöltve erről a telefonról.':'Alapértelmezett sablon, még nincs elmentve.');
}
function switchContext(){
 if(dirty&&!w.confirm('Elvetjük a még nem mentett változtatásokat?')){
  const [p,l,e]=(context||'monika:home:arrive').split(':');
  setField('hhArrivalPerson',p);setField('hhArrivalPlace',l);setField('hhArrivalEvent',e);
  return;
 }
 fill();
}
function save(){
 const next={...data,[key()]:current()};
 try{w.localStorage.setItem(KEY,JSON.stringify(next))}
 catch(_){note('A mentés nem sikerült. Ellenőrizd a böngésző tárhelyét.');return}
 data=next;dirty=false;
 note('✓ Sablon elmentve ezen a készüléken. Valós érkezési értesítés még nincs bekapcsolva.');
}
function reset(){
 if(!w.confirm('Visszaállítod ennek az eseménynek az alapértelmezett Mókuska-sablonját?'))return;
 const next={...data};delete next[key()];
 try{w.localStorage.setItem(KEY,JSON.stringify(next))}
 catch(_){note('A visszaállítást nem sikerült menteni.');return}
 data=next;fill();note('Alapértelmezett sablon visszaállítva.');
}
function tone(ctx,frequency,at,length,type,volume){
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type||'sine';
 osc.frequency.setValueAtTime(frequency,at);
 gain.gain.setValueAtTime(0.0001,at);
 gain.gain.exponentialRampToValueAtTime(volume||0.055,at+0.025);
 gain.gain.exponentialRampToValueAtTime(0.0001,at+length);
 osc.connect(gain);gain.connect(ctx.destination);
 osc.start(at);osc.stop(at+length+0.02);
}
function play(sound){
 if(sound==='silent')return;
 const Ctx=w.AudioContext||w.webkitAudioContext;
 if(!Ctx){note('A böngésző nem támogatja a hangeffekt-előnézetet.');return}
 try{
  const ctx=new Ctx(),start=ctx.currentTime+0.02;
  let notes=[];
  if(sound==='mokuska')notes=[[740,0,.115,'triangle'],[920,.12,.12,'triangle'],[1175,.245,.19,'sine'],[950,.455,.12,'sine']];
  if(sound==='tada')notes=[[392,0,.16,'triangle'],[523,.18,.16,'triangle'],[784,.36,.42,'triangle']];
  if(sound==='chime')notes=[[784,0,.31,'sine'],[1046,.23,.43,'sine']];
  if(sound==='soft')notes=[[660,0,.32,'sine']];
  notes.forEach(n=>tone(ctx,n[0],start+n[1],n[2],n[3],sound==='mokuska'?0.045:0.035));
  w.setTimeout(()=>{if(ctx.close)ctx.close().catch(()=>{})},1800);
 }catch(_){note('A hang nem játszható le ezen a készüléken.')}
}
function closeTest(){
 const box=$('hhArrivalTestPopup');if(box)box.hidden=true;
 if(timeout){w.clearTimeout(timeout);timeout=null}
}
function test(){
 const x=current(),box=$('hhArrivalTestPopup');
 if(!box)return;
 closeTest();
 const t=$('hhArrivalTestTitle'),b=$('hhArrivalTestText'),m=$('hhArrivalTestMascot');
 if(t)t.textContent=x.title;if(b)b.textContent=x.body;if(m)m.hidden=!x.animation;
 box.hidden=false;
 // Audio is never emitted automatically. Only the explicit manual test button calls this.
 play(x.sound);
 timeout=w.setTimeout(closeTest,6500);
 note('TESZT ELŐNÉZET · nem jelent valódi érkezési vagy távozási eseményt.');
}
function init(){
 if(!$('hhArrivalStudio')||!w.localStorage)return;
 data=load();fill();
 for(const id of ['hhArrivalPerson','hhArrivalPlace','hhArrivalEvent']){
  const el=$(id);if(el)el.addEventListener('change',switchContext);
 }
 for(const id of ['hhArrivalTitle','hhArrivalBody','hhArrivalSound','hhArrivalAnimation','hhArrivalQuiet','hhArrivalEnabled']){
  const el=$(id);if(!el)continue;
  for(const ev of ['input','change'])el.addEventListener(ev,()=>{dirty=true;preview();note('Nem mentett módosítások.');});
 }
 const handlers={hhArrivalSave:save,hhArrivalReset:reset,hhArrivalTest:test,hhArrivalTestClose:closeTest};
 for(const id of Object.keys(handlers)){const el=$(id);if(el)el.addEventListener('click',handlers[id])}
 w.addEventListener('pagehide',closeTest);
}
w.HH_GUARDIAN_ARRIVAL_STUDIO_V788=Object.freeze({init,version:'788'});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
