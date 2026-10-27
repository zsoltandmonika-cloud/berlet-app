/* Daily Tasks v881 · Mobile Quick Add voice + Buddy success animation
   Uses in-browser speech recognition when available; no background listening,
   no additional Supabase requests. Success is signaled only by confirmed DB save.
*/
(function(w,d){'use strict';
const $=id=>d.getElementById(id);
let recognizer=null,recording=false,audio=null,savedOnce=false;
function status(text){const el=$('fhVoiceFeedback');if(el)el.textContent=text}
function setListening(on){
 recording=on;
 const btn=$('fhMic');if(!btn)return;
 btn.setAttribute('aria-pressed',String(on));
 btn.setAttribute('aria-label',on?'Diktálás leállítása':'Magyar hangbevitel indítása');
 btn.textContent=on?'⏹️':'🎙️';
}
function getRecorder(){
 if(recognizer)return recognizer;
 const Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Constructor)return null;
 const r=new Constructor();
 r.lang='hu-HU';r.interimResults=false;r.continuous=false;r.maxAlternatives=1;
 r.onresult=e=>{
  const speech=String(e.results?.[0]?.[0]?.transcript||'').trim();
  const input=$('fhTitle');if(!input||!speech)return;
  input.value=(input.value.trim()?input.value.trim()+' ':'')+speech;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  status('✓ Felismert magyar szöveg. Koppints a mezőre, ha szerkesztenéd.');
 };
 r.onerror=e=>{setListening(false);const code=e.error||'';
  status(code==='not-allowed'?'A mikrofon nincs engedélyezve. Használd a Samsung billentyűzet diktálását.':
  'A diktálás nem sikerült. Használhatod a billentyűzet mikrofonját.');
 };
 r.onend=()=>setListening(false);
 recognizer=r;return recognizer;
}
function dictation(){
 if(recording){try{recognizer?.stop()}catch(_){}setListening(false);return}
 const r=getRecorder();
 if(!r){status('Ezen a böngészőn a külön mikrofon nem támogatott. A Samsung billentyűzet mikrofonja használható.');return}
 try{r.start();setListening(true);status('🎙️ Figyelek… Diktálj magyarul. A felismert szöveg szerkeszthető.')}
 catch(_){setListening(false);status('A diktálás most nem indítható. Próbáld a billentyűzet mikrofonját.')}
}
function unlockSound(){
 if(audio)return;
 try{const C=w.AudioContext||w.webkitAudioContext;if(!C)return;
 audio=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});
 }catch(_){audio=null}
}
function tada(){
 try{
  if(!audio||audio.state==='closed')return;
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const notes=[{hz:523.25,at:0,d:0.12},{hz:659.25,at:0.105,d:0.12},{hz:783.99,at:0.205,d:0.14},{hz:1046.5,at:0.31,d:0.35}];
  const t=audio.currentTime+0.035;
  for(const n of notes){
   const o=audio.createOscillator(),g=audio.createGain();
   o.type='sine';o.frequency.setValueAtTime(n.hz,t+n.at);
   g.gain.setValueAtTime(.0001,t+n.at);
   g.gain.exponentialRampToValueAtTime(.065,t+n.at+.015);
   g.gain.exponentialRampToValueAtTime(.0001,t+n.at+n.d);
   o.connect(g);g.connect(audio.destination);
   o.start(t+n.at);o.stop(t+n.at+n.d+.02);
  }
 }catch(_){/* Audio is optional: visual acknowledgement remains. */}
}
function showSuccess(detail){
 const success=$('fhSuccess');
 if(!success)return;
 const recipient=detail.recipient==='lena'?'Lénának':detail.recipient==='monika'?'Mónikának':'Zsoltnak';
 $('fhSuccessMessage').textContent=(detail.recipient===detail.owner?
   'Saját teendőd elmentve!':
   recipient+' kiosztva a feladat!')+' Buddy a helyén. 🐿️';
 success.hidden=false;
 tada();
 $('fhSuccessClose').focus({preventScroll:true});
}
function closeSuccess(){
 const node=$('fhSuccess');if(node)node.hidden=true;
 const btn=$('fhAdd');if(btn)btn.focus({preventScroll:true});
}
function setup(){
 const mic=$('fhMic');
 if(mic)mic.addEventListener('click',dictation);
 const sheet=$('fhSheet');
 if(sheet){const obs=new MutationObserver(()=>{
  if(sheet.hidden&&recording){try{recognizer?.stop()}catch(_){}setListening(false)}
 });obs.observe(sheet,{attributes:true,attributeFilter:['hidden']});}
 $('fhForm')?.addEventListener('submit',unlockSound);
 $('fhSuccessClose')?.addEventListener('click',closeSuccess);
 $('fhSuccess')?.addEventListener('click',ev=>{if(ev.target.id==='fhSuccess')closeSuccess()});
 d.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('fhSuccess')?.hidden)closeSuccess()});
 w.addEventListener('hh-family-task-saved',ev=>showSuccess(ev.detail||{}));
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})(window,document);
