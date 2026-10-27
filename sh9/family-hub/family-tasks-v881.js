/* SH9 Family Tasks v881 UI enhancement.
 * Keeps all v880 task, auth, Realtime, audit and assignment logic unchanged.
 * Speech recognition is invoked only from a user tap; successful sound/animation
 * is emitted only on confirmed Supabase insert from v880.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
let recognition=null,recognizing=false,ctx=null,celebrationTimer=null;
function speakStatus(t){const info=$('fhVoiceInfoV881');if(info)info.textContent=t}
function micUi(on){
 const mic=$('fhMicV881');if(!mic)return;
 mic.classList.toggle('recording',on);
 mic.setAttribute('aria-pressed',String(on));
 mic.textContent=on?'⏹':'🎙️';
 mic.setAttribute('aria-label',on?'Diktálás befejezése':'Magyar hangbevitel indítása');
}
function stopRecognition(){
 if(recognition){try{recognition.stop()}catch(_){}}
 recognizing=false;micUi(false);
}
function startSpeech(){
 if(recognizing){stopRecognition();speakStatus('A diktálás befejeződött.');return}
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 const input=$('fhTitle');
 if(!Speech){
  speakStatus('Ezen a böngészőn nincs beépített beszédfelismerés. A billentyűzet mikrofonjával diktálhatsz.');
  input.focus();return;
 }
 const r=new Speech();
 recognition=r;r.lang='hu-HU';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
 const base=input.value.trim(),prefix=base?base+' ':'';
 r.onstart=()=>{recognizing=true;micUi(true);speakStatus('🎙️ Magyar diktálás… mondhatod a feladatot.')};
 r.onresult=e=>{
  let phrase='';for(let i=0;i<e.results.length;i++)phrase+=e.results[i][0].transcript||'';
  input.value=(prefix+phrase).slice(0,180);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  speakStatus(e.results[e.results.length-1]?.isFinal?'✓ Diktálás rögzítve, szabadon szerkeszthető.':'🎙️ Figyelek…');
 };
 r.onerror=e=>{
  recognizing=false;micUi(false);
  const msg=e.error==='not-allowed'?'Nincs mikrofonengedély; engedélyezd a böngészőben, vagy használd a billentyűzetet.':
     e.error==='no-speech'?'Nem hallottam beszédet, próbáld újra.':
     'A diktálás most nem elérhető. A billentyűzet mikrofonja továbbra is használható.';
  speakStatus(msg);
 };
 r.onend=()=>{recognizing=false;micUi(false);recognition=null};
 try{r.start()}catch(_){speakStatus('A diktálás nem indult. Próbáld a billentyűzet mikrofonját.');recognizing=false;micUi(false)}
}
function unlockSound(){
 const Audio=w.AudioContext||w.webkitAudioContext;
 if(!Audio)return;
 try{if(!ctx)ctx=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{})}catch(_){}
}
function tada(){
 if(!ctx||ctx.state!=='running')return;
 const now=ctx.currentTime+.02;
 // Soft, short four-note success fanfare; only plays after a confirmed save.
 for(const [i,frequency] of [523.25,659.25,783.99,1046.5].entries()){
  const start=now+i*.095,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.105,start+.012);
  gain.gain.exponentialRampToValueAtTime(.001,start+.235+(i===3?.07:0));
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(start);osc.stop(start+.29+(i===3?.07:0));
 }
}
function celebrate(detail){
 const pop=$('fhSuccessV881'),msg=$('fhSuccessTextV881');if(!pop)return;
 tada();
 msg.textContent=detail?.assignedTo==='lena'?'Lénának kiosztva! Az AI teendő végrehajtása külön indítható.':
   detail?.assignedTo==='zsolt'?'Feladat elmentve! Buddy szól Zsoltnak.':
   detail?.assignedTo==='monika'?'Feladat elmentve! Buddy szól Mónikának.':'Feladat sikeresen mentve!';
 pop.hidden=false;
 if(celebrationTimer)w.clearTimeout(celebrationTimer);
 celebrationTimer=w.setTimeout(()=>{pop.hidden=true;celebrationTimer=null},2500);
}
function initialize(){
 const mic=$('fhMicV881'),form=$('fhForm'),close=$('fhClose'),sheet=$('fhSheet');
 if(!mic||!form||!sheet)return;
 mic.addEventListener('click',startSpeech);
 // Direct submit remains owned by v880; this just unlocks the browser audio.
 form.addEventListener('submit',unlockSound);
 close?.addEventListener('click',stopRecognition);
 $('fhBackdrop')?.addEventListener('click',stopRecognition);
 d.addEventListener('keydown',e=>{if(e.key==='Escape')stopRecognition()});
 $('fhSuccessV881')?.addEventListener('click',()=>{$('fhSuccessV881').hidden=true});
 w.addEventListener('hh-family-tasks-saved-v881',e=>{stopRecognition();celebrate(e.detail||{})});
 // No focus() or auto keyboard on sheet open. Input focuses solely on tap.
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})(window,document);
