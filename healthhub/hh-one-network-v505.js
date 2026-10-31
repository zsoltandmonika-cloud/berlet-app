/* HH One v505 · source-backed, read-only connectivity indicators.
 * Consumes only existing device reports and prior verified Vault reads.
 * Does NOT scan networks, request permissions, start GPS or poll cloud.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_ONE_NETWORK_V505=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const TTL=20*60*1000;
 const owners=[['zsolt','Zsolt'],['monika','Mónika']];
 function time(v){const n=Date.parse(typeof v==='string'?v:'');return Number.isFinite(n)?n:null}
 function timestamp(v){const t=time(v);return t===null?'Nincs jelentés':new Date(t).toLocaleString('hu-HU')}
 function idOk(v){return typeof v==='string'&&/^[A-Za-z0-9-]{1,90}$/.test(v)}
 function signal(id,label,color,detail){return {id,label,color,detail}}
 function derive(input){
  input=input||{};
  const now=Number.isFinite(input.now)?input.now:Date.now();
  const online=input.browserOnline;
  const verifiedAt=time(input.cloudVerifiedAt);
  const proofFresh=input.cloudProof==='verified'&&verifiedAt!==null&&
   verifiedAt<=now+60000&&now-verifiedAt<=TTL;
  const internet=online===false?'red':proofFresh?'green':'amber';
  const dropbox=online===false?'amber':input.cloudProof==='disconnected'?'red':
   proofFresh?'green':'amber';
  const result=[
   signal('internet','Internet',internet,online===false?'A böngésző offline állapotot jelez.':
    proofFresh?'Korábbi sikeres hitelesített Dropbox-lekérés · '+timestamp(input.cloudVerifiedAt):
    'Nincs friss, sikeres hálózati lekérés igazolva. A böngésző online állapota önmagában nem bizonyít internetet.'),
   signal('dropbox','Dropbox',dropbox,input.cloudProof==='disconnected'?'A Dropbox-fiók nincs csatlakoztatva (ez nem feltétlen szerverhiba).':
    input.cloudProof==='failed'?'A legutóbbi Dropbox-olvasás sikertelen.':
    proofFresh?'A regiszter és eszközlista hitelesített lekérése sikeres · '+timestamp(input.cloudVerifiedAt):
    'Nincs friss, sikeresen ellenőrzött Dropbox-lekérés.'),
   signal('supabase','Supabase','gray','Nem történt ezen a felületen ellenőrzött Supabase-lekérés. A jelzés kedvéért nincs új API-hívás.')
  ];
  const reg=input.registry;
  const valid=reg&&reg.schema==='healthhub.device_registry/1'&&reg.activePhones&&Array.isArray(reg.archived);
  owners.forEach(([owner,name])=>{
   const id=valid&&reg.activePhones[owner];
   const d=idOk(id)&&Array.isArray(input.devices)?input.devices.find(x=>x&&
    x.deviceType==='android'&&x.activeProfile===owner&&x.deviceId===id&&
    !reg.archived.includes(id)):null;
   const seen=d?time(d.lastSeenAt):null;
   const fresh=seen!==null&&seen<=now+60000&&now-seen>=0&&now-seen<=TTL;
   const network=d&&d.networkStatus&&typeof d.networkStatus==='object'?d.networkStatus:{};
   const transport=['wifi','mobile','ethernet'].includes(network.transport)?network.transport:'unknown';
   const info=d?' · Android jelentés: '+timestamp(d.lastSeenAt):' · nincs hitelesített készülékjelentés';
   const desc=network.internetValidated===true?'az Android internetkapcsolatot validált':
    network.internetValidated===false?'az Android nem validált internetkapcsolatot':
    'internetvalidálás nincs jelentve';
   function carrier(type,label){
    const active=fresh&&transport===type;
    const color=!fresh?'gray':active?(network.internetValidated===true?'green':'amber'):'gray';
    const detail=!d?'Nincs kijelölt Android-telefon jelentése.':
     !fresh?'A készülékjelentés elavult, nem igazolja az aktuális kapcsolatot.':
     active?'A telefon '+(type==='wifi'?'Wi-Fi':'mobiladat')+' útvonalat jelentett; '+desc+'.':
     'A legutóbbi jelentés szerint nem ez volt az aktív adatútvonal. Kikapcsolt állapot ebből nem igazolható.';
    return signal(owner+'-'+type,name+' · '+label,color,detail+info+
     (type==='mobile'?' A 3G/4G/5G technológia pontos típusa nem ismert.':''));
   }
   result.push(carrier('wifi','Wi-Fi'),carrier('mobile','Mobiladat'));
   result.push(signal(owner+'-bluetooth',name+' · Bluetooth','gray',
    'Az Android-agent még nem továbbít Bluetooth-állapotot. Engedélyt nem kérünk.'));
  });
  return result;
 }
 return Object.freeze({derive});
});
