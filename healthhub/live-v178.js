(function(){
'use strict';
/* HealthHub v1.98 — medication reminder sound library + volume */
var STORAGE='hh-med-reminder-v1-';
var tick=null,lastMinute='';

function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return profile()==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function defaults(){
 return {sound:'soft',volume:85,alarms:[
  {id:uid(),time:'08:00',label:'Reggeli gyógyszerek',enabled:profile()==='monika',meds:[]},
  {id:uid(),time:'20:00',label:'Esti gyógyszerek',enabled:profile()==='monika',meds:[]}
 ]};
}
function load(){
 try{var x=JSON.parse(localStorage.getItem(STORAGE+profile())||'null');if(x&&Array.isArray(x.alarms)){if(!Number.isFinite(Number(x.volume)))x.volume=85;return x}}catch(e){}
 var d=defaults();save(d);return d;
}
function save(c){localStorage.setItem(STORAGE+profile(),JSON.stringify(c))}
function medsFromPage(){
 return Array.from(document.querySelectorAll('#healthSubContent .hrRow')).map(function(r){
  var b=r.querySelector('b');return b?b.textContent.trim():'';
 }).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i});
}
function fmtCount(n){return n?n+' gyógyszer':'nincs gyógyszer kiválasztva'}

function chime(kind,volume){
 try{
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  var c=new AC(),now=c.currentTime,level=Math.max(.2,Math.min(1,(Number(volume)||85)/100));
  try{if(c.state==='suspended')c.resume()}catch(e){}
  var master=c.createGain();master.gain.value=level;master.connect(c.destination);
  function tone(freq,start,dur,vol,type){
   var o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=freq;
   g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(vol,start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
   o.connect(g).connect(master);o.start(start);o.stop(start+dur+.035);
  }
  if(kind==='double'){
   tone(660,now,.34,.13,'sine');tone(820,now+.38,.42,.12,'sine');
  }else if(kind==='crystal'){
   tone(1046,now,.42,.13,'sine');tone(1318,now+.13,.48,.11,'sine');tone(1568,now+.28,.55,.085,'sine');
  }else if(kind==='bell'){
   tone(523,now,.58,.15,'sine');tone(784,now+.04,.72,.11,'sine');tone(1046,now+.08,.85,.075,'sine');
  }else if(kind==='strong'){
   tone(740,now,.22,.17,'square');tone(880,now+.28,.22,.16,'square');tone(740,now+.56,.28,.17,'square');
  }else{
   tone(720,now,.48,.12,'sine');
  }
  setTimeout(function(){try{c.close()}catch(e){}},1900);
 }catch(e){}
}
window.hhMedAlarmTest=function(){
 var c=load(),sel=document.getElementById('hhMedSound'),vol=document.getElementById('hhMedVolume');
 chime(sel?sel.value:(c.sound||'soft'),vol?Number(vol.value):(Number(c.volume)||85));
};

function notifyNative(a){
 try{
  if(window.Notification&&Notification.permission==='granted'){
   new Notification('💊 '+a.label,{body:'HealthHub · '+pname()+' · '+fmtCount((a.meds||[]).length)});
  }
 }catch(e){}
}
function dueCheck(){
 var d=new Date(),hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),key=d.toISOString().slice(0,10)+'|'+hm+'|'+profile();
 if(key===lastMinute)return;
 var c=load(),a=c.alarms.find(function(x){return x.enabled&&x.time===hm});
 if(!a)return;
 lastMinute=key;chime(c.sound||'soft',c.volume);notifyNative(a);openReminder(a);
}
function startTick(){if(tick)clearInterval(tick);tick=setInterval(dueCheck,15000);dueCheck()}

function cardHtml(){
 var c=load(),on=c.alarms.filter(function(a){return a.enabled});
 return '<div class="hhMedAlarmCard"><div class="hhMedAlarmClock"><div class="bell">⏰</div><div><small>GYÓGYSZER EMLÉKEZTETŐ</small><b>'+esc(pname())+' napi emlékeztetői</b><span>'+(on.length?on.map(function(a){return esc(a.time)}).join(' · '):'Nincs aktív időpont')+'</span></div></div>'+
 '<div class="hhMedAlarmTimes">'+c.alarms.slice(0,3).map(function(a){return '<div class="'+(a.enabled?'on':'')+'"><b>'+esc(a.time)+'</b><small>'+esc(a.label)+'</small><span>'+esc(fmtCount((a.meds||[]).length))+'</span></div>'}).join('')+'</div>'+
 '<button type="button" class="hhMedAlarmSetup" onclick="hhOpenMedAlarmSettings()">⚙ Emlékeztetők beállítása</button></div>';
}
function inject(){
 if(window.healthSectionKind!=='medications')return;
 var root=document.getElementById('healthSubContent');if(!root||root.querySelector('.hhMedAlarmCard'))return;
 root.insertAdjacentHTML('afterbegin',cardHtml());
}
function rebuild(){var c=document.querySelector('.hhMedAlarmCard');if(c)c.remove();inject()}

function ensureOverlay(){
 if(document.getElementById('hhMedAlarmOverlay'))return;
 var o=document.createElement('div');o.id='hhMedAlarmOverlay';o.className='hhMedAlarmOverlay';document.body.appendChild(o);
}
function medChecks(selected,alarmId){
 var meds=medsFromPage();
 if(!meds.length)return '<p class="hhMedNoMeds">A gyógyszerlista nem olvasható ezen a képernyőn.</p>';
 return '<div class="hhMedChecks">'+meds.map(function(m){
  var on=(selected||[]).includes(m);
  return '<label><input type="checkbox" data-alarm="'+esc(alarmId)+'" value="'+esc(m)+'" '+(on?'checked':'')+'><span>'+esc(m)+'</span></label>';
 }).join('')+'</div>';
}
window.hhOpenMedAlarmSettings=function(){
 ensureOverlay();var c=load(),o=document.getElementById('hhMedAlarmOverlay');
 o.innerHTML='<div class="hhMedSheet"><div class="hhMedSheetTop"><div><small>HEALTHRADAR · '+esc(pname())+'</small><h2>Gyógyszer emlékeztetők</h2></div><button onclick="hhCloseMedAlarmSettings()">×</button></div>'+
 '<div class="hhMedSound"><b>Emlékeztető hang</b><select id="hhMedSound"><option value="soft" '+(c.sound==='soft'?'selected':'')+'>Finom csengő</option><option value="double" '+(c.sound==='double'?'selected':'')+'>Lágy dupla hang</option><option value="crystal" '+(c.sound==='crystal'?'selected':'')+'>Kristály</option><option value="bell" '+(c.sound==='bell'?'selected':'')+'>Harang</option><option value="strong" '+(c.sound==='strong'?'selected':'')+'>Határozott emlékeztető</option></select><button onclick="hhMedAlarmTest()">▶ Próba</button><div class="hhMedVolumeRow"><span>🔊 Hangerő</span><input id="hhMedVolume" type="range" min="20" max="100" step="5" value="'+esc(Number(c.volume)||85)+'" oninput="hhMedVolumeLabel(this.value)"><b id="hhMedVolumeValue">'+esc(Number(c.volume)||85)+'%</b></div></div>'+
 '<div id="hhMedAlarmEditor">'+c.alarms.map(function(a,i){return alarmEditor(a,i)}).join('')+'</div>'+
 '<button class="hhMedAdd" onclick="hhAddMedAlarm()">＋ További időpont</button>'+
 '<div class="hhMedPermission"><button onclick="hhRequestMedNotifications()">🔔 Böngésző értesítés engedélyezése</button><small>A webes emlékeztető akkor megbízható, amikor a HealthHub nyitva van. A háttérben működő telefonos riasztást később a Bridge kapja meg.</small></div>'+
 '<button class="hhMedSave" onclick="hhSaveMedAlarmSettings()">MENTÉS</button></div>';
 o.classList.add('on');
};
function alarmEditor(a,i){
 return '<div class="hhMedAlarmEdit" data-id="'+esc(a.id)+'"><div class="hhMedAlarmEditTop"><label class="hhSwitch"><input type="checkbox" class="hhAEnabled" '+(a.enabled?'checked':'')+'><i></i></label><input type="time" class="hhATime" value="'+esc(a.time)+'"><input type="text" class="hhALabel" value="'+esc(a.label)+'" placeholder="Megnevezés"><button class="hhMedDel" onclick="hhDeleteMedAlarm(\''+esc(a.id)+'\')">×</button></div><small>Ehhez az időponthoz:</small>'+medChecks(a.meds,a.id)+'</div>';
}
window.hhAddMedAlarm=function(){
 var c=load();if(c.alarms.length>=6)return;
 c.alarms.push({id:uid(),time:'12:00',label:'Gyógyszer emlékeztető',enabled:false,meds:[]});save(c);window.hhOpenMedAlarmSettings();
};
window.hhDeleteMedAlarm=function(id){
 var c=load();if(c.alarms.length<=2)return;
 c.alarms=c.alarms.filter(function(a){return a.id!==id});save(c);window.hhOpenMedAlarmSettings();
};
window.hhMedVolumeLabel=function(v){var e=document.getElementById('hhMedVolumeValue');if(e)e.textContent=String(v)+'%'};
window.hhCloseMedAlarmSettings=function(){var o=document.getElementById('hhMedAlarmOverlay');if(o)o.classList.remove('on')};
window.hhSaveMedAlarmSettings=function(){
 var c=load();c.sound=document.getElementById('hhMedSound').value||'soft';c.volume=Math.max(20,Math.min(100,Number(document.getElementById('hhMedVolume').value)||85));
 var rows=Array.from(document.querySelectorAll('.hhMedAlarmEdit'));
 c.alarms=rows.map(function(r){
  var id=r.dataset.id,old=c.alarms.find(function(a){return a.id===id})||{};
  return {id:id,time:r.querySelector('.hhATime').value||'08:00',label:r.querySelector('.hhALabel').value.trim()||'Gyógyszer emlékeztető',enabled:r.querySelector('.hhAEnabled').checked,meds:Array.from(r.querySelectorAll('.hhMedChecks input:checked')).map(function(x){return x.value})};
 });
 save(c);window.hhCloseMedAlarmSettings();rebuild();startTick();
};
window.hhRequestMedNotifications=async function(){
 try{if(!window.Notification)return;if(Notification.permission!=='granted')await Notification.requestPermission()}catch(e){}
};

function ensureReminder(){
 if(document.getElementById('hhMedReminder'))return;
 var o=document.createElement('div');o.id='hhMedReminder';o.className='hhMedReminder';document.body.appendChild(o);
}
function openReminder(a){
 ensureReminder();var o=document.getElementById('hhMedReminder'),meds=a.meds||[];
 o.innerHTML='<div class="hhMedReminderCard"><div class="hhMedReminderBell">💊</div><small>'+esc(a.time)+' · '+esc(pname())+'</small><h2>'+esc(a.label)+'</h2>'+
 (meds.length?'<div class="hhMedReminderList">'+meds.map(function(m){return '<div><span>✓</span><b>'+esc(m)+'</b></div>'}).join('')+'</div>':'<p class="hhMedReminderEmpty">Ehhez az időponthoz még nincs gyógyszer kiválasztva.</p>')+
 '<div class="hhMedReminderActions"><button class="later" onclick="hhMedSnooze()">10 perc múlva</button><button class="done" onclick="hhMedTaken()">Bevettem</button></div></div>';
 o.classList.add('on');o.dataset.alarm=a.id;
}
window.hhMedTaken=function(){var o=document.getElementById('hhMedReminder');if(o)o.classList.remove('on');try{localStorage.setItem('hh-med-last-taken-'+profile(),new Date().toISOString())}catch(e){}};
window.hhMedSnooze=function(){
 var o=document.getElementById('hhMedReminder');if(o)o.classList.remove('on');
 setTimeout(function(){var c=load(),a=c.alarms.find(function(x){return x.id===(o&&o.dataset.alarm)});if(a){chime(c.sound||'soft',c.volume);openReminder(a)}},10*60*1000);
};

function style(){
 if(document.getElementById('hh-v178-style'))return;var s=document.createElement('style');s.id='hh-v178-style';s.textContent=
 '.hhMedAlarmCard{background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--soft) 48%,#fff));border:1px solid color-mix(in srgb,var(--a) 18%,#e5edf2);border-radius:18px;padding:12px;margin-bottom:10px;box-shadow:0 8px 22px rgba(31,65,91,.07)}.hhMedAlarmClock{display:flex;align-items:center;gap:10px}.hhMedAlarmClock .bell{width:42px;height:42px;border-radius:14px;background:var(--soft);display:grid;place-items:center;font-size:22px}.hhMedAlarmClock small{display:block;font-size:6.5px;letter-spacing:.11em;color:var(--a);font-weight:900}.hhMedAlarmClock b{display:block;font-size:12px;color:#173f62;margin:2px 0}.hhMedAlarmClock span{font-size:8px;color:#70869a}.hhMedAlarmTimes{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:10px 0}.hhMedAlarmTimes>div{border:1px solid #e5edf2;border-radius:13px;padding:8px;background:#fff}.hhMedAlarmTimes>div.on{border-color:color-mix(in srgb,var(--a) 35%,#fff);background:var(--soft)}.hhMedAlarmTimes b{display:block;font-size:15px;color:#173f62}.hhMedAlarmTimes small,.hhMedAlarmTimes span{display:block;font-size:6.8px;color:#70869a}.hhMedAlarmSetup{width:100%;border:0;border-radius:13px;padding:9px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:8px;font-weight:900}.hhMedAlarmOverlay,.hhMedReminder{position:fixed;inset:0;z-index:9000;background:rgba(18,38,57,.38);backdrop-filter:blur(7px);display:none;align-items:flex-end;justify-content:center}.hhMedAlarmOverlay.on,.hhMedReminder.on{display:flex}.hhMedSheet{width:min(100%,420px);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#fff,var(--wash));border-radius:24px 24px 0 0;padding:14px 12px 24px}.hhMedSheetTop{display:flex;justify-content:space-between;align-items:flex-start}.hhMedSheetTop small{font-size:7px;color:var(--a);font-weight:900}.hhMedSheetTop h2{font-size:17px;color:#173f62;margin:3px 0 10px}.hhMedSheetTop button{width:34px;height:34px;border:0;border-radius:50%;background:var(--soft);color:var(--a);font-size:20px}.hhMedSound{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;background:#fff;border-radius:14px;padding:10px;margin-bottom:8px}.hhMedSound>b{grid-column:1/-1;font-size:9px;color:#173f62}.hhMedSound select{border:1px solid #dfe8ee;border-radius:10px;padding:8px;font-size:8px;min-width:0}.hhMedVolumeRow{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr 38px;gap:7px;align-items:center;margin-top:3px;padding-top:8px;border-top:1px solid #edf2f5}.hhMedVolumeRow span{font-size:8px;font-weight:850;color:#536f86;white-space:nowrap}.hhMedVolumeRow input{width:100%;accent-color:var(--a)}.hhMedVolumeRow b{font-size:8px!important;color:var(--a)!important;text-align:right;white-space:nowrap}.hhMedSound button,.hhMedAdd,.hhMedPermission button{border:0;border-radius:10px;padding:8px;background:var(--soft);color:var(--a);font-size:8px;font-weight:850}.hhMedAlarmEdit{background:#fff;border-radius:15px;padding:10px;margin:8px 0;border:1px solid #e7edf2}.hhMedAlarmEditTop{display:grid;grid-template-columns:auto 78px 1fr auto;gap:5px;align-items:center}.hhMedAlarmEdit input[type=time],.hhMedAlarmEdit input[type=text]{min-width:0;border:1px solid #dfe8ee;border-radius:9px;padding:7px;font-size:8px}.hhMedAlarmEdit>small{display:block;font-size:7px;color:#7a8d9d;margin:9px 0 4px}.hhSwitch input{display:none}.hhSwitch i{display:block;width:32px;height:18px;border-radius:10px;background:#dfe5e9;position:relative}.hhSwitch i:after{content:"";position:absolute;width:14px;height:14px;left:2px;top:2px;border-radius:50%;background:#fff;transition:.2s}.hhSwitch input:checked+i{background:var(--a)}.hhSwitch input:checked+i:after{left:16px}.hhMedDel{border:0;background:transparent;color:#9aa7b1;font-size:18px}.hhMedChecks{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.hhMedChecks label{display:flex;align-items:center;gap:5px;background:#f8fbfc;border-radius:9px;padding:6px;font-size:7.5px;color:#536b7d}.hhMedChecks input{accent-color:var(--a)}.hhMedAdd{width:100%;margin:4px 0 8px}.hhMedPermission{background:#fff;border-radius:14px;padding:9px;margin:8px 0}.hhMedPermission button{width:100%}.hhMedPermission small{display:block;font-size:6.8px;line-height:1.4;color:#7a8c9b;margin-top:5px}.hhMedSave{width:100%;border:0;border-radius:14px;padding:11px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:9px;font-weight:900}.hhMedReminder{align-items:center}.hhMedReminderCard{width:min(calc(100% - 28px),390px);background:linear-gradient(160deg,#fff,var(--wash2));border:1px solid color-mix(in srgb,var(--a) 20%,#fff);border-radius:24px;padding:20px;text-align:center;box-shadow:0 25px 80px rgba(18,48,72,.22)}.hhMedReminderBell{width:62px;height:62px;margin:auto;border-radius:22px;background:var(--soft);display:grid;place-items:center;font-size:31px}.hhMedReminderCard>small{display:block;margin-top:10px;font-size:7px;color:var(--a);font-weight:900;letter-spacing:.1em}.hhMedReminderCard h2{font-size:18px;color:#173f62;margin:4px 0 12px}.hhMedReminderList{display:grid;gap:5px;text-align:left}.hhMedReminderList div{display:flex;gap:8px;align-items:center;background:#fff;border-radius:11px;padding:8px}.hhMedReminderList span{color:var(--a);font-weight:900}.hhMedReminderList b{font-size:9px;color:#38576f}.hhMedReminderEmpty{font-size:8px;color:#7c8e9d}.hhMedReminderActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.hhMedReminderActions button{border:0;border-radius:13px;padding:10px;font-size:8px;font-weight:900}.hhMedReminderActions .later{background:var(--soft);color:var(--a)}.hhMedReminderActions .done{background:linear-gradient(135deg,var(--a),var(--a2));color:#fff}';
 document.head.appendChild(s)
}
style();ensureOverlay();ensureReminder();

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);setTimeout(inject,30);return r};
}
document.addEventListener('visibilitychange',function(){if(!document.hidden)dueCheck()});
setTimeout(inject,300);startTick();
document.documentElement.dataset.healthhubMedicationReminder='1.98';
})();