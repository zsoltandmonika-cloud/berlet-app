/* SH9 MÁV Smart Rail Phase 2H · Health Check v610
 * On-demand, local and READ-ONLY. No remote requests, timers, GPS or writes.
 * The status reflects only what this browser can verify; no fabricated live availability.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_HEALTH_V610=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const STATUS=Object.freeze({ok:'ok',warn:'warn',error:'error'});
 const item=(id,title,state,detail)=>({id,title,state,detail});
 function inspect(doc,win,now=new Date()){
  const results=[];
  const get=id=>doc.getElementById(id);
  function check(id,title,fn){
   try{results.push(fn())}
   catch(_){results.push(item(id,title,STATUS.error,'Nem lehetett ellenőrizni ezen a készüléken. Frissítsd az oldalt, majd próbáld újra.'))}
  }
  check('calendar','Naptár és időválasztó',()=>{
   const date=get('rail-date'),time=get('rail-time'),when=get('when');
   const controls=['rail-date-trigger','rail-time-trigger','dateTxt','timeTxt'].every(id=>!!get(id));
   const modes=['now','depart','arrive'].every(mode=>!!doc.querySelector('[data-mode="'+mode+'"]'));
   if(!controls||!modes||!date||!time||!when||
      date.type!=='date'||time.type!=='time'||when.type!=='datetime-local')
    return item('calendar','Naptár és időválasztó',STATUS.error,'Hiányzó vagy nem megfelelő dátum-/időmező. Az oldal frissítése szükséges.');
   if(typeof date.showPicker!=='function'||typeof time.showPicker!=='function')
    return item('calendar','Naptár és időválasztó',STATUS.warn,'A vezérlők megvannak, de a natív showPicker API nem érhető el. Érintéssel ellenőrizd a naptár és az óra megnyitását.');
   return item('calendar','Naptár és időválasztó',STATUS.ok,'A dátum, az óra és a három időmód elérhető. A felugró ablak tényleges megnyílását külön koppintással kell ellenőrizni.');
  });
  check('profile','Profil és kedvencek',()=>{
   const p=win.SH9_MAV_PERSONAL_V607,j=win.SH9_MAV_JOURNEY_MANAGER_V608;
   const active=doc.documentElement?.dataset?.profile;
   if(!get('profile')||!get('profile-photo')||!['m','z'].includes(active)||
      !p||!j||!win.SH9_MAV_PERSONAL_UI||!win.SH9_MAV_JOURNEYS_UI)
    return item('profile','Profil és kedvencek',STATUS.error,'A profilváltó vagy az egyik személyes adatmodul hiányzik.');
   const pairs=[
    [p.favoritesKey?.('z'),p.favoritesKey?.('m')],
    [p.historyKey?.('z'),p.historyKey?.('m')],
    [j.storageKey?.('z'),j.storageKey?.('m')]
   ];
   if(pairs.some(([a,b])=>!a||!b||a===b)||new Set(pairs.flat()).size!==6)
    return item('profile','Profil és kedvencek',STATUS.error,'A Zsolt/Mónika profilok tárolási kulcsai nem különülnek el.');
   return item('profile','Profil és kedvencek',STATUS.ok,
    'Aktív profil: '+(active==='m'?'Mónika':'Zsolt')+'. A kedvencek, előzmények és utazások külön profilkulcsokat használnak.');
  });
  check('storage','Helyi adatok',()=>{
   const store=win.localStorage,p=win.SH9_MAV_PERSONAL_V607,j=win.SH9_MAV_JOURNEY_MANAGER_V608;
   if(!store||!p||!j)throw Error('No local stores');
   const keys=['z','m'].flatMap(id=>[p.favoritesKey(id),p.historyKey(id),j.storageKey(id)]);
   for(const key of keys){
    const raw=store.getItem(key);
    if(raw!==null){
     const parsed=JSON.parse(raw);
     if(!Array.isArray(parsed))return item('storage','Helyi adatok',STATUS.error,'A mentett adatok egyik listája sérült. Mentés előtt ne töröld a böngésző adatait.');
    }
   }
   const a={f:0,h:0,j:0};
   for(const id of ['z','m']){
    a.f+=p.loadFavorites(store,id).length;
    a.h+=p.loadHistory(store,id,now.getTime()).length;
    a.j+=j.read(store,id).length;
   }
   return item('storage','Helyi adatok',STATUS.ok,
    'Olvasható helyi listák · '+a.f+' kedvenc, '+a.h+' előzmény, '+a.j+' utazási terv összesen. Nincs módosítás.');
  });
  check('backup','Biztonsági mentés',()=>{
   const b=win.SH9_MAV_BACKUP_V609,store=win.localStorage;
   if(!b||typeof b.build!=='function'||typeof b.encode!=='function'||typeof b.parse!=='function'||!store)
    return item('backup','Biztonsági mentés',STATUS.error,'Az offline Backup & Restore modul nem érhető el.');
   // Read-only in-memory round trip: NEVER invoke restore()/download() here.
   const archive=b.build(store,now),text=b.encode(archive),roundTrip=b.parse(text,now.getTime());
   if(roundTrip.format!=='sh9-mav-backup-v1'||!roundTrip.profiles?.z||!roundTrip.profiles?.m||
      ['z','m'].some(id=>roundTrip.profiles[id].journeys.some(x=>['ticket','note','car','seat'].some(k=>k in x))))
    return item('backup','Biztonsági mentés',STATUS.error,'A mentési séma vagy a magánadatok kizárása nem ellenőrizhető.');
   return item('backup','Biztonsági mentés',STATUS.ok,
    'A helyi, magánadatokat kihagyó JSON előállítható és visszaolvasható. A tényleges fájlletöltés/import külön tesztelendő.');
  });
  check('planner','Belső útvonaltervező',()=>{
   const ui=win.SH9_MAV_JOURNEYS_INSTANCE;
   if(!get('find')||!get('from')||!get('to')||!ui||
      typeof ui.currentQuery!=='function'||typeof ui.showTimetable!=='function')
    return item('planner','Belső útvonaltervező',STATUS.error,'Az útvonalkereső vezérlő vagy a belső keresőmodul hiányzik.');
   return item('planner','Belső útvonaltervező',STATUS.ok,
    'Az SH9 saját keresőmodulja betöltött. Ez nem jelent élő vasúti találatot.');
  });
  check('gtfs','MÁV GTFS menetrend',()=>{
   const cfg=win.SH9_MAV_GTFS_CONFIG;
   if(!cfg||typeof cfg.enabled!=='boolean')
    return item('gtfs','MÁV GTFS menetrend',STATUS.error,'A GTFS konfiguráció nem olvasható.');
   if(!cfg.enabled)return item('gtfs','MÁV GTFS menetrend',STATUS.warn,
    'Tudatosan kikapcsolva. Engedélyezett menetrendi adat nélkül nincs saját élő járatlista.');
   if(!win.SH9_MAV_GTFS_CORE_V1)
    return item('gtfs','MÁV GTFS menetrend',STATUS.error,'A GTFS engedélyezve van, de a menetrendi motor hiányzik.');
   return item('gtfs','MÁV GTFS menetrend',STATUS.warn,
    'A GTFS konfiguráció aktív, de az adatforrás elérhetőségét, frissességét és jogosultságát a Health Check nem ellenőrzi.');
  });
  check('google','Google Routes B terv',()=>{
   const cfg=win.SH9_MAV_GOOGLE_ROUTES_CONFIG;
   if(!cfg||typeof cfg.enabled!=='boolean')
    return item('google','Google Routes B terv',STATUS.error,'A Google Routes konfiguráció nem olvasható.');
   if(!cfg.enabled)return item('google','Google Routes B terv',STATUS.warn,
    'A fizetős Google Routes jelenleg kikapcsolva. A díjmentes, külön megnyitható Térkép gomb ettől független.');
   const limited=Number(cfg.maxRequestsPerSession)>0&&Number(cfg.maxRequestsPerSession)<=6&&Number(cfg.cooldownSeconds)>=30;
   return item('google','Google Routes B terv',limited?STATUS.warn:STATUS.error,limited?
    'A fizetős adapter be van kapcsolva, helyi limitkonfigurációval. Nem történt API-próba vagy számlázás-ellenőrzés.':
    'Az aktív Google Routes konfigurációban hiányzik a minimum költségkorlát.');
  });
  check('traffic','Forgalom- és költségvédelem',()=>{
   const g=win.SH9_MAV_GOOGLE_ROUTES_CONFIG,gtfs=win.SH9_MAV_GTFS_CONFIG;
   if(!g||!gtfs)return item('traffic','Forgalom- és költségvédelem',STATUS.error,'Hiányzó provider-konfiguráció; a forgalomvédelmi állapot nem igazolható.');
   const active=!!g.enabled||!!gtfs.enabled;
   return item('traffic','Forgalom- és költségvédelem',active?STATUS.warn:STATUS.ok,active?
    'Legalább egy menetrendi adapter engedélyezett. Ez a vizsgálat nem indít hálózati kérést; valós fogyasztást külön kell ellenőrizni.':
    'Mindkét menetrendi adapter kikapcsolva. Ez a vizsgálat sem hálózati kérést, sem tárhelyírást nem indít.');
  });
  const counts={ok:0,warn:0,error:0};
  results.forEach(x=>{if(x.state in counts)counts[x.state]++});
  return {checkedAt:now.toISOString(),results,counts};
 }
 function mount(doc,win){
  const action=doc.getElementById('rail-health-run'),area=doc.getElementById('rail-health-results'),
   overview=doc.getElementById('rail-health-summary'),time=doc.getElementById('rail-health-checked');
  if(!action||!area||!overview||!time)return null;
  let last=null;
  const titles={ok:'Rendben',warn:'Figyelem',error:'Hiba'};
  action.addEventListener('click',()=>{
   const report=inspect(doc,win);
   last=report;area.replaceChildren();
   for(const entry of report.results){
    const row=doc.createElement('div');row.className='rail-health-row';row.dataset.rag=entry.state;
    const top=doc.createElement('div');top.className='rail-health-row-head';
    const name=doc.createElement('strong');name.textContent=entry.title;
    const mark=doc.createElement('span');mark.className='rail-health-pill';mark.textContent=
     (entry.state==='ok'?'● ':entry.state==='warn'?'▲ ':'✕ ')+titles[entry.state];
    top.append(name,mark);
    const detail=doc.createElement('p');detail.textContent=entry.detail;
    row.append(top,detail);area.append(row);
   }
   overview.textContent='Rendben: '+report.counts.ok+' · Figyelem: '+report.counts.warn+' · Hiba: '+report.counts.error;
   time.textContent='Ellenőrizve: '+new Date(report.checkedAt).toLocaleString('hu-HU')+
    ' · Csak helyi, olvasási vizsgálat. Nem helyettesít telefonos érintéspróbát.';
  });
  return {getLast:()=>last};
 }
 return Object.freeze({inspect,mount});
});
if(typeof window!=='undefined'&&typeof document!=='undefined'&&window.SH9_MAV_HEALTH_V610){
 window.SH9_MAV_HEALTH_UI=window.SH9_MAV_HEALTH_V610.mount(document,window);
}
