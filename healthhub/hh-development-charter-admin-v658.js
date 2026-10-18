(function(){
'use strict';
/* HH Admin Governance v658: public policy text, private live aggregates on explicit action.
 * Never persist, publish, or log clinical data. No remote side effects. */
var ID='hhDevCharter658', CSS='hhDevCharter658Css', installing=false;
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function service(){return window.HH_DAILY_HEALTH_SYNC_V319}
function status(){
 var api=service(), s=api&&api.getStatus&&api.getStatus();
 var p=profile();
 if(!api||!s||!s.authenticated||!Array.isArray(s.authorizedProfiles)||!s.authorizedProfiles.includes(p))
  return null;
 return api;
}
function style(){
 if(document.getElementById(CSS))return;
 var s=document.createElement('style');s.id=CSS;
 s.textContent=
 '#'+ID+'{margin:0 0 14px;padding:14px;border:1px solid rgba(147,190,219,.32);border-radius:20px;'+
 'color:#edf6ff;background:linear-gradient(130deg,#11253d 0%,#1a3451 60%,#25384f 100%);'+
 'box-shadow:0 12px 32px rgba(7,21,42,.20);font:400 12px/1.5 system-ui,sans-serif;'+
 'content-visibility:auto;contain-intrinsic-size:440px}'+
 '#'+ID+' *{box-sizing:border-box}#'+ID+' .hhGovHeading{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}'+
 '#'+ID+' h3{font-size:16px;margin:0;color:#fff;line-height:1.25}#'+ID+' .hhGovLead{font-size:11px;color:#afc7dd;margin:5px 0 12px}'+
 '#'+ID+' .hhGovPillars{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:8px 0 13px}'+
 '#'+ID+' .hhGovPillar{border:1px solid rgba(209,235,255,.15);border-radius:13px;padding:9px 6px;text-align:center;'+
 'background:rgba(217,240,255,.07);font-size:10px;font-weight:800}'+
 '#'+ID+' .hhGovPillar span{display:block;font-size:20px;margin-bottom:2px}'+
 '#'+ID+' details{border-top:1px solid rgba(209,235,255,.13);padding:9px 0}#'+ID+' summary{font-size:12px;'+
 'font-weight:800;color:#edf6ff;cursor:pointer;list-style-position:inside}'+
 '#'+ID+' ul{padding-left:20px;margin:7px 0 1px;color:#cadcea;font-size:11px}#'+ID+' li{margin:5px 0}'+
 '#'+ID+' .hhGovActions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:8px 0 3px}'+
 '#'+ID+' button{padding:8px 12px;border-radius:10px;border:1px solid rgba(174,224,246,.35);'+
 'background:#1f6987;color:white;font:800 11px system-ui;min-height:35px;cursor:pointer}'+
 '#'+ID+' button:disabled{opacity:.5;cursor:default}'+
 '#'+ID+' .hhGovAudit{padding:10px;border-radius:12px;background:rgba(3,13,29,.22);border:1px solid rgba(181,217,240,.14);'+
 'font-size:11px;white-space:pre-line;color:#d9edf8}'+
 '#'+ID+' .hhGovFoot{font-size:10px;color:#a8bed3;margin-top:9px}'+
 '@media(min-width:600px){#'+ID+'{padding:18px}#'+ID+' .hhGovPillar{font-size:12px}}';
 document.head.appendChild(s);
}
function mount(){
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody');
 if(!ov||!body||!ov.classList.contains('on'))return;
 if(document.getElementById(ID))return;
 style();
 var box=document.createElement('section');box.id=ID;
 box.setAttribute('aria-label','HealthHub fejlesztési iránytű és adatminőség');
 box.innerHTML=
 '<div class="hhGovHeading"><h3>🧭 HealthHub · Fejlesztési Iránytű</h3><span style="font-size:10px;color:#a5d8eb">GOVERNANCE · v1.0</span></div>'+
 '<p class="hhGovLead">Élő admin irányelvek · három pillér · biztonságos fejlődés · visszakövethető döntések</p>'+
 '<div class="hhGovPillars"><div class="hhGovPillar"><span>❤️</span>Gondoskodás</div>'+
 '<div class="hhGovPillar"><span>📚</span>Adatismeret</div><div class="hhGovPillar"><span>🧠</span>Intelligencia</div></div>'+
 '<details><summary>🎯 Döntési mandátum és Golden Standard</summary><ul>'+
 '<li>Léna önállóan rangsorolhat és végrehajthat visszafordítható technikai, UX és adatminőségi változtatásokat, ha azok mérhetően jobbak.</li>'+
 '<li>Elsőre végleges architektúra: minimális kattintás, egységes sötét üvegfelület, profilhoz illő szín, gyors mobil UX.</li>'+
 '<li>Minden változtatásnál diagnózis → döntés → mentési/rollback terv → teszt → élesítés → utóellenőrzés.</li>'+
 '<li>Felhasználói egyeztetés kell visszafordíthatatlan törléshez, adatmegosztáshoz, költséges szolgáltatáshoz és egészségügyi terápiás döntéshez.</li>'+
 '</ul></details>'+
 '<details><summary>🩺 Medical Knowledge Base 2.0 · adatvédelmi és minőségi szabályok</summary><ul>'+
 '<li>Orvosi eredeti változatlan; SHA-256-alapú egyezőség, soha nem csak fájlnév szerinti törlés vagy összevonás.</li>'+
 '<li>Profilhoz kötött jogosultság, privát tárhely, pontos dokumentum- és oldalszintű forrásazonosítás.</li>'+
 '<li>Vizsgálati időpont ≠ fájlmódosítási időpont. Eredeti mértékegység és szöveg mindig megmarad.</li>'+
 '<li>OCR és AI-kinyerés ellenőrizendő; bizonytalan, történeti és ellentmondó állítások külön jelölést kapnak.</li>'+
 '<li>Ask Léna képeinek tartós archiválása csak az adott tartalomra adott külön hozzájárulással; nincsenek titkos pszichológiai profilok vagy rejtett klinikai naplók.</li>'+
 '</ul></details>'+
 '<details><summary>⚙️ Folyamatfejlesztés és mérőszámok</summary><ul>'+
 '<li>Feldolgozási lefedettség (dokumentum/oldal), forrás nélküli tények száma, OCR-review, sikertelen feladatok és visszaállíthatóság.</li>'+
 '<li>Válaszminőség: ellenőrizhető források, tévedések javítása, megfelelő klinikai bizonytalanság, látható magyarázat.</li>'+
 '<li>Rendszer: stabilitás, sebesség, mobil használhatóság, adatfrissesség és profilszeparáció. Zöld státusz csak sikeres ellenőrzés után.</li>'+
 '<li>Admin dokumentáció és GitHub technikai dokumentáció egyaránt frissítendő minden jelentős irányváltáskor.</li>'+
 '</ul></details>'+
 '<details><summary>📊 Knowledge Base · ellenőrzött élő állapot</summary>'+
 '<p class="hhGovFoot">A lekérdezés csak a kiválasztott, hitelesítetten engedélyezett profil összesített metaadatait kéri le. Nincs automatikus adatfeltöltés vagy tartalomnaplózás.</p>'+
 '<div class="hhGovActions"><button type="button" id="hhGovAuditBtn658">↻ Élő adatminőség-ellenőrzés</button></div>'+
 '<div id="hhGovAudit658" class="hhGovAudit" role="status" aria-live="polite">Még nincs ellenőrzés. A privát Health Vault-kapcsolat szükséges.</div></details>'+
 '<p class="hhGovFoot">Forrás: HealthHub Governance v1.0 · 2026.10.18. · A feldolgozottságot csak tényleges, ellenőrzött adat alapján jelezzük.</p>';
 body.insertBefore(box,body.firstChild);
 var button=box.querySelector('#hhGovAuditBtn658');
 if(button)button.addEventListener('click',audit);
}
async function audit(){
 var button=document.getElementById('hhGovAuditBtn658'),box=document.getElementById('hhGovAudit658'),api=status(),p=profile();
 if(!button||!box)return;
 if(!api){box.textContent='🔒 Nincs érvényes, ehhez a profilhoz engedélyezett Health Vault-kapcsolat. Jelentkezz be az Admin / Központi Health Vault felületén.';return}
 button.disabled=true;box.textContent='Ellenőrzés folyamatban…';
 try{
  var prefix='/rest/v1/', filter='&profile_key=eq.'+encodeURIComponent(p);
  async function paged(table,columns){
   var out=[],offset=0;
   for(var page=0;page<40;page++){
    if(p!==profile()||!status())throw Error('A profil vagy jogosultság időközben megváltozott.');
    var part=await api.request(prefix+table+'?select='+columns+filter+'&limit=500&offset='+offset,{method:'GET'});
    if(!Array.isArray(part))throw Error('Érvénytelen lapozott válasz.');
    out.push.apply(out,part);
    if(part.length<500)return out;
    offset+=500;
   }
   throw Error('Túl sok rekord; nagy volumenű szerveroldali riport szükséges.');
  }
  var result=await Promise.all([
   paged('hh_mkb_sources','original_name,parse_status,sha256'),
   paged('hh_kb_documents','id,status,profile_key'),
   paged('hh_mkb_facts','id')
  ]);
  if(p!==profile()||!status())throw Error('Profil- vagy hozzáférésváltozás, az ellenőrzés megszakadt.');
  var sources=result[0],docs=result[1],facts=result[2];
  if(!Array.isArray(sources)||!Array.isArray(docs)||!Array.isArray(facts))throw Error('A válasz nem ellenőrizhető.');
  var names=new Set(),duplicateNames=0,withoutHash=0,rawDiscovered=0;
  sources.forEach(function(row){
   var n=String(row.original_name||'').trim().toLocaleLowerCase('hu-HU').replace(/\s+/g,' ');
   if(names.has(n))duplicateNames++;else names.add(n);
   if(!row.sha256)withoutHash++;
   if(row.parse_status==='discovered')rawDiscovered++;
  });
  var completed=docs.filter(function(d){return d.status==='complete'}).length;
  box.textContent='Profil: '+(p==='monika'?'Mónika':'Zsolt')+
    '\nRegisztrált forrás: '+sources.length+
    '\nForrásfeldolgozásra vár: '+rawDiscovered+
    '\nSHA-256 hiányzik: '+withoutHash+
    '\nAzonos nevű további fájlok: '+duplicateNames+' (nem bizonyított bináris duplikátum)'+
    '\nPDF-index: '+docs.length+' · teljesként jelölt: '+completed+
    '\nKinyert, forrásolt orvosi tények: '+facts.length+
    '\nEllenőrizve: '+new Date().toLocaleString('hu-HU');
 }catch(e){
  box.textContent='⚠ Nem sikerült hitelesen ellenőrizni az adatbázist. Nincs automatikus újrapróbálkozás vagy módosítás.';
 }finally{button.disabled=false}
}
function init(){
 if(installing)return;installing=true;
 function tryMount(){mount()}
 var count=0;
 (function find(){
  var ov=document.getElementById('haOv');
  if(!ov){if(++count<24)setTimeout(find,500);return}
  new MutationObserver(tryMount).observe(ov,{attributes:true,attributeFilter:['class']});
  var body=document.getElementById('haBody');
  if(body){
   var queued=false;
   new MutationObserver(function(){
    if(queued||document.getElementById(ID))return;
    queued=true;Promise.resolve().then(function(){queued=false;tryMount()});
   }).observe(body,{childList:true});
  }
  tryMount();
 })();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();