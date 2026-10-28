/* SH9 MÁV Smart Rail · source-safe mobile interactions, no idle traffic. */
(function(){'use strict';
const lib=window.SH9_MAV_RAIL_V1,$=id=>document.getElementById(id);if(!lib)return;
const modeButtons=[...document.querySelectorAll('[data-mode]')],prefs=['pax','class','seat','discount','dog','bike','access'];
let mode='now',active='zsolt',toastTimer=null,soundAllowed=false;
function read(k,fallback){try{const s=JSON.parse(localStorage.getItem(k));return s===null?fallback:s}catch(_){return fallback}}
function put(k,value){try{localStorage.setItem(k,JSON.stringify(value));return true}catch(_){return false}}
function current(){try{return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
const favKey=()=>`sh9-mav-rail-favorites-v1-${active}`,prefKey=()=>`sh9-mav-rail-preferences-v1-${active}`;
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500)}
function status(message,error=false){const el=$('status');el.textContent=message;el.dataset.error=error?'yes':'no'}
function getJourney(){const j=lib.journey($('from').value,$('to').value);if(!j)status('Írj be két különböző, érvényes indulási és célállomást.',true);return j}
function setMode(next){if(!['now','depart','arrive'].includes(next))return;mode=next;modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('whenBox').hidden=mode==='now';if(mode!=='now'&&!$('when').value){const d=new Date(Date.now()+30*60000);const n=new Date(d.getTime()-d.getTimezoneOffset()*60000);$('when').value=n.toISOString().slice(0,16)} }
function validDate(){if(mode==='now')return true;const d=Date.parse($('when').value);if(!Number.isFinite(d)||d<Date.now()-60000){status('Kérlek, válassz egy érvényes jövőbeli időpontot.',true);return false}return true}
function openExternal(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove()}
function favorites(){return lib.normalizeFavorites(read(favKey(),[]))}
function renderFavorites(){const list=favorites(),host=$('favoriteList');host.replaceChildren();$('favCount').textContent=list.length+' útvonal';if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent='Még nincs mentett kedvenc útvonal.';host.append(e);return}for(const [i,j] of list.entries()){const row=document.createElement('div');row.className='favorite';const b=document.createElement('button');b.type='button';b.className='favorite-select';b.textContent=j.from+' → '+j.to;const s=document.createElement('small');s.textContent='Érintsd meg a betöltéshez';b.append(s);b.addEventListener('click',()=>{$('from').value=j.from;$('to').value=j.to;status('Kedvenc útvonal betöltve. A menetrendhez indítsd a hivatalos keresést.');window.scrollTo({top:0,behavior:'smooth'})});const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='✕';remove.setAttribute('aria-label','Kedvenc eltávolítása: '+j.from+' → '+j.to);remove.addEventListener('click',()=>{const a=favorites();a.splice(i,1);if(put(favKey(),a)){renderFavorites();toast('Kedvenc törölve.')}else toast('A helyi mentés nem sikerült.')});row.append(b,remove);host.append(row)}}
function addFavorite(){const j=getJourney();if(!j)return;const a=favorites();if(a.some(x=>x.from===j.from&&x.to===j.to)){toast('Ez az útvonal már a kedvencek között van.');return}if(a.length>=12){toast('Profilonként legfeljebb 12 kedvenc menthető.');return}if(put(favKey(),[...a,j])){renderFavorites();toast('❤️ Kedvenc útvonal mentve.')}else toast('A böngésző nem engedte a mentést.')}
function savePrefs(){let values={};for(const id of prefs){const el=$(id);values[id]=el.type==='checkbox'?el.checked:el.value}const pax=Number(values.pax);if(!Number.isInteger(pax)||pax<1||pax>10){toast('Az utasok száma 1 és 10 között lehet.');return}if(put(prefKey(),values))toast('Preferenciák a helyi profilba mentve.');else toast('A preferenciák nem menthetők ebben a böngészőben.')}
function loadPrefs(){const values=read(prefKey(),null);for(const id of prefs){const el=$(id);if(!values||!(id in values)){if(el.type==='checkbox')el.checked=false;else if(id==='pax')el.value='2';else el.selectedIndex=0;continue}if(el.type==='checkbox')el.checked=values[id]===true;else el.value=String(values[id]);}}
function syncProfile(){active=current();document.documentElement.dataset.profile=active==='monika'?'m':'z';$('profile').textContent=(active==='monika'?'Mónika':'Zsolt')+' ⇄';loadPrefs();renderFavorites()}
function toggleProfile(){const next=current()==='monika'?'z':'m';try{localStorage.setItem('hh-profile',next)}catch(_){toast('Profilváltás nem menthető.');return}syncProfile();try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{code:next,profile:active,source:'sh9-mav'}}))}catch(_){}}
const sound=new Audio('./assets/flirt-signal.mp3');sound.preload='none';sound.volume=.6;
function flipSound(){soundAllowed=!soundAllowed;$('signal').setAttribute('aria-pressed',String(soundAllowed));$('signal').textContent=soundAllowed?'🔇 Szignál kikapcsolás':'🔊 FLIRT szignál';if(soundAllowed){sound.currentTime=0;sound.play().catch(()=>toast('Hang lejátszása blokkolva. Ellenőrizd a készülék hangbeállítását.'))}else{sound.pause();sound.currentTime=0}}
$('signal').addEventListener('click',flipSound);
$('profile').addEventListener('click',toggleProfile);
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('swap').addEventListener('click',()=>{const a=$('from').value;$('from').value=$('to').value;$('to').value=a});
$('addFav').addEventListener('click',addFavorite);
$('savePrefs').addEventListener('click',savePrefs);
$('openPlanner').addEventListener('click',()=>{if(!getJourney()||!validDate())return;status('A MÁVPlusz saját keresőjében add meg az állomásokat, időpontot és foglalási preferenciákat.');openExternal(lib.OFFICIAL.planner)});
$('maps').addEventListener('click',()=>{const j=getJourney();if(!j||!validDate())return;status('Google Térkép tömegközlekedési keresés. A megadott időpontot a térképen külön állítsd be; buszjáratot is ajánlhat.');openExternal(lib.directionsUrl(j.from,j.to))});
window.addEventListener('storage',e=>{if(e.key==='hh-profile'||e.key===favKey()||e.key===prefKey())syncProfile()});window.addEventListener('pageshow',syncProfile);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncProfile()});
syncProfile();setMode('now');
})();
