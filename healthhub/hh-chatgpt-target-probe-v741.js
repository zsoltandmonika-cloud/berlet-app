/* HealthHub v741 · User-triggered Dropbox destination write/readback PROBE.
 * Writes only an explicitly labelled non-medical diagnostic JSON file.
 * No Health Connect, Digital Wellbeing, Nutrition, vault or partner data.
 * This only establishes capability; it does NOT activate any synchronization.
 */
(function(w,d){
'use strict';
const FILE='/HealthHub-ChatGPT-Analytics/healthhub-connection-test-v741.json';
const SCHEMA='healthhub.dropbox.connection-test/1';
const auth=()=>w.HH_CHATGPT_TARGET_AUTH_V739;
let busy=false;
function nonce(){
 const buf=new Uint8Array(16);w.crypto.getRandomValues(buf);
 return Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('');
}
async function probe(){
 if(busy)throw Error('A teszt már folyamatban van.');
 busy=true;
 try{
  if(!auth()||!(await auth().read()))throw Error('A cél Dropbox nincs engedélyezve.');
  const folder=await w.HH_CHATGPT_TARGET_ONBOARD_V739.verifyTargetFolder();
  const item={schema:SCHEMA,purpose:'Non-medical Dropbox permission test only',
   generatedAt:new Date().toISOString(),nonce:nonce()};
  const body=JSON.stringify(item),token=await auth().accessToken();
  const sent=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
   method:'POST',headers:{
    Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
    'Dropbox-API-Arg':JSON.stringify({path:FILE,mode:'overwrite',autorename:false,mute:true})},
   body
  });
  if(!sent.ok)throw Error('Cél Dropbox tesztfeltöltés sikertelen: HTTP '+sent.status);
  const metadata=await sent.json();
  if(String(metadata.path_lower||'').toLowerCase()!==FILE.toLowerCase()||
   Number(metadata.size)!==new TextEncoder().encode(body).length)
   throw Error('A cél Dropbox nem a várt tesztfájlt mentette.');
  const received=await w.fetch('https://content.dropboxapi.com/2/files/download',{
   method:'POST',headers:{Authorization:'Bearer '+token,
    'Dropbox-API-Arg':JSON.stringify({path:FILE})}
  });
  if(!received.ok)throw Error('Cél Dropbox tesztvisszaolvasás sikertelen: HTTP '+received.status);
  const text=await received.text();
  if(text!==body)throw Error('A feltöltött és a visszaolvasott tesztadat eltér.');
  return {folderId:folder.id,filename:FILE,readback:true,size:Number(metadata.size),
   timestamp:item.generatedAt,nonce:item.nonce};
 }finally{busy=false}
}
function mount(){
 const panel=d.getElementById('hhTargetAuth739');
 if(!panel||d.getElementById('hhDropboxProbeV741'))return;
 const wrap=d.createElement('div');wrap.id='hhDropboxProbeV741';
 wrap.style.cssText='border-top:1px solid #8fb3d755;margin-top:12px;padding-top:12px;';
 const desc=d.createElement('p');desc.textContent='Következő ellenőrzés: nem egészségügyi tesztfájl feltöltése a cél Dropboxba, majd pontos visszaolvasása. Ez nem kapcsol be szinkronizációt.';
 const button=d.createElement('button');button.type='button';button.textContent='🧪 Írás + visszaolvasás teszt';
 button.style.cssText='background:#225b83;color:white;border:1px solid #91c9ec;border-radius:10px;padding:10px 12px';
 const status=d.createElement('p');status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');status.textContent='Teszt még nem indult.';
 button.addEventListener('click',()=>{
  button.disabled=true;status.textContent='Dropbox feltöltés, majd tényleges visszaolvasás…';
  void probe().then(x=>{status.textContent='✓ Írás és visszaolvasás sikeres: '+
   x.filename+' · '+x.size+' bájt · mappa: '+x.folderId+
   '. A ChatGPT-oldali olvasást még külön ellenőrizni kell.'})
   .catch(e=>{status.textContent='⚠ '+String(e.message||e)})
   .finally(()=>{button.disabled=false});
 });
 wrap.append(desc,button,status);panel.append(wrap);
}
w.HH_CHATGPT_TARGET_PROBE_V741={version:'741',probe,mount,filename:FILE};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
w.setInterval(()=>{if(!d.hidden)mount()},4000);
})(window,document);