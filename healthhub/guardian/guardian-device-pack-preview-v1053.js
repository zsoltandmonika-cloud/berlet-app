/* Family Guard v1053 · strictly opt-in single glass pack.
 * Reuses v841 Battery, v845 GPS/Health, v1042 OTA device evidence.
 * NO GPS, Dropbox, Supabase or Android network calls; preview only.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_DEVICE_PACK_V1053=api;
})(typeof window==='object'?window:null,function(w){
 'use strict';
 const TTL=20*60*1000,IDS=['ota','wifi','mobile','bluetooth','cloud'];
 const glyph={
  ota:'<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  wifi:'<path d="M2 8.5a16 16 0 0 1 20 0M5.5 12.2a11 11 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><path d="M12 19.4h.01"/>',
  mobile:'<path d="M3 20v-3h3v3M9 20v-7h3v7M15 20V9h3v11M21 4v16"/>',
  bluetooth:'<path d="m7 7 10 10-5 4V3l5 4L7 17"/>',
  cloud:'<path d="M7 19h12a4 4 0 0 0 .5-8A7 7 0 0 0 6 10.2 4.5 4.5 0 0 0 7 19Z"/>'
 };
 const label={ota:'OTA',wifi:'Wi-Fi',mobile:'Mobil',bluetooth:'Bluetooth',cloud:'Cloud'};
 function owner(store){try{return store?.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
 function verified(x,p,now=Date.now()){
  if(!x||x.profile!==p)return null;
  const stamp=Date.parse(x.lastSeenAt||''),read=Date.parse(x.verifiedAt||'');
  if(!Number.isFinite(stamp)||!Number.isFinite(read)||
   stamp>now+5000||read>now+5000||now-stamp>TTL||now-read>TTL)return null;
  return x;
 }
 function derive(p,record,ota,online,now=Date.now()){
  const d=verified(record,p,now);
  const transport=d?.networkStatus?.transport;
  const validation=d?.networkStatus?.internetValidated;
  function link(kind){
   const active=d&&transport===kind;
   return {color:!d?'gray':active?(validation===true?'green':'amber'):'gray',
    details:!d?'Nincs friss, kiválasztott telefonról származó, ellenőrzött Android-hálózati jelentés.':
     active?'A kiválasztott telefon '+(kind==='wifi'?'Wi-Fi':'mobiladat')+
      ' adatútvonalon jelentkezett; internet validálása: '+
      (validation===true?'igen':validation===false?'nem':'ismeretlen')+
      '. Utolsó Android-jelentés: '+new Date(Date.parse(d.lastSeenAt)).toLocaleString('hu-HU'):
     'A legutóbbi Android-jelentés szerint nem ez volt az aktív adatútvonal. Nem bizonyítja, hogy a rádió ki van kapcsolva.'};
  }
  const isUpdate=ota==='update'&&!!d;
  const isCurrent=ota==='current'&&!!d;
  const otaState={color:isUpdate?'amber':isCurrent?'green':'gray',
   details:isUpdate?'Ellenőrzött, kiadott HH One-frissítés elérhető a kiválasztott telefonhoz.':
    isCurrent?'Az utolsó ellenőrzött Android- és aláírt kiadási jelentés alapján naprakész.':
    'Nincs friss, hitelesített HH One verzió-összehasonlítás. Nem állítjuk, hogy naprakész.'};
  const cloudState={color:d?'green':online===false?'red':'gray',
   details:d?'Sikeres, hitelesített Dropbox eszközregiszter-olvasás: '+
    new Date(Date.parse(d.verifiedAt)).toLocaleString('hu-HU')+
    '. Supabase külön nem igazolt. Ez nem igazolja a GPS- vagy egészségadat-feltöltést.':
    online===false?'A böngésző offline állapotot jelez; felhőkapcsolat nem igazolt.':
    'Nincs friss, igazolt Dropbox-olvasás. Supabase állapota ismeretlen.'};
  return {
   ota:otaState,
   wifi:link('wifi'),
   mobile:{...link('mobile'),details:link('mobile').details+' A 3G/4G/5G technológia ebből az adatból nem azonosítható.'},
   bluetooth:{color:'gray',details:'A HH One agent Bluetooth-állapotot még nem továbbít. Nem állítjuk, hogy ki van kapcsolva.'},
   cloud:cloudState
  };
 }
 function install(){
  const d=w.document;
  if(!d||d.documentElement?.dataset?.hhDevicePackPreview!=='on')return false;
  const container=d.getElementById('guardianTrioV845');
  if(!container||d.getElementById('guardianPackOtaV1053'))return false;
  container.setAttribute('aria-label','Family Guard · egységes 8 állapotjelző · előnézet');
  const buttons={},icons={};
  const dialog=d.createElement('dialog');dialog.id='guardianDevicePackDialogV1053';
  const title=d.createElement('h3');title.id='guardianDevicePackTitleV1053';
  const desc=d.createElement('p');desc.id='guardianDevicePackDescV1053';
  const close=d.createElement('button');close.type='button';close.textContent='Bezárás';
  dialog.setAttribute('aria-labelledby',title.id);
  dialog.append(title,desc,close);d.body.appendChild(dialog);
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  let previous=null,otaState='unknown';
  const selected=()=>owner(w.localStorage);
  function checkOta(){
   const msg=d.getElementById('guardianOtaStatusV1042')?.textContent||'';
   const alert=d.getElementById('guardianOtaAlertV1042');
   // Only the signed OTA flow can confirm an update or matching current build.
   if(alert&&!alert.hidden&&/Frissítés elérhető|frissítés telepítése/i.test(msg+alert.textContent))return 'update';
   if(/HH One naprakész a legutóbbi telefonjelentés szerint/.test(msg))return 'current';
   return 'unknown';
  }
  function open(kind){
   const values=derive(selected(),previous,checkOta(),w.navigator?.onLine);
   title.textContent=(selected()==='monika'?'Mónika':'Zsolt')+' · '+label[kind];
   desc.textContent=values[kind].details;
   dialog.showModal?.();
  }
  for(const id of IDS){
   const button=d.createElement('button');button.type='button';
   button.id='guardianPack'+id[0].toUpperCase()+id.slice(1)+'V1053';
   button.className='hh-device-pack-signal-v1053';
   button.dataset.signal='gray';
   button.setAttribute('aria-label',label[id]+' · nincs ellenőrzött állapot');
   const icon=d.createElement('span');icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+glyph[id]+'</svg>';
   const text=d.createElement('span');text.textContent=label[id];button.append(icon,text);
   button.addEventListener('click',()=>open(id));
   container.appendChild(button);buttons[id]=button;
  }
  function paint(){
   const states=derive(selected(),previous,checkOta(),w.navigator?.onLine);
   for(const id of IDS){
    buttons[id].dataset.signal=states[id].color;
    buttons[id].setAttribute('aria-label',(selected()==='monika'?'Mónika':'Zsolt')+' · '+label[id]+' · '+states[id].details);
    buttons[id].title=states[id].details;
   }
  }
  function clear(){previous=null;if(dialog.open)dialog.close();paint()}
  w.addEventListener('hh-guardian-device-evidence-v1053',event=>{
   const value=event?.detail;
   if(value?.profile!==selected())return;
   previous=value;paint();
  });
  const profileButton=d.getElementById('guardianProfileSwitch');
  profileButton?.addEventListener('click',()=>w.setTimeout(clear,0));
  w.addEventListener('storage',event=>{if(event.key==='hh-profile')clear()});
  w.addEventListener('hh-guardian-auth-changed',()=>{
   const auth=w.HH_GUARDIAN_LIVE_V785;
   if(!auth?.authenticated)clear();
  });
  w.addEventListener('online',paint);w.addEventListener('offline',paint);
  const feedback=d.getElementById('guardianOtaStatusV1042');
  if(feedback&&typeof w.MutationObserver==='function')new w.MutationObserver(paint)
   .observe(feedback,{childList:true,characterData:true,subtree:true});
  d.addEventListener('visibilitychange',()=>{if(!d.hidden)paint()});
  paint();
  return true;
 }
 if(w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
 return Object.freeze({owner,verified,derive,install});
});
