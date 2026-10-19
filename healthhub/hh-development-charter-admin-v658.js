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
 '<div class="hhGovHeading"><h3>🧭 HealthHub · Fejlesztési Iránytű</h3><span style="font-size:10px;color:#a5d8eb">GOVERNANCE · v1.2</span></div>'+
 '<p class="hhGovLead">Célorientált, agilis fejlesztés · nem mikromenedzsment · valós használatban ellenőrzött eredmény</p>'+
 '<div class="hhGovPillars"><div class="hhGovPillar"><span>❤️</span>Gondoskodás</div>'+
 '<div class="hhGovPillar"><span>📚</span>Adatismeret</div><div class="hhGovPillar"><span>🧠</span>Intelligencia</div></div>'+
 '<details><summary>🎯 Döntési mandátum és Golden Standard</summary><ul>'+
 '<li>Léna önállóan rangsorolhat és végrehajthat visszafordítható technikai, UX és adatminőségi változtatásokat, ha azok mérhetően jobbak.</li>'+
 '<li>Elsőre végleges architektúra: minimális kattintás, egységes sötét üvegfelület, profilhoz illő szín, gyors mobil UX.</li>'+
 '<li>Minden változtatásnál cél → fejlesztés → teszt → deploy → éles próba → hibajavítás → újratesztelés; visszaállítási tervvel.</li>'+
 '<li>Felhasználói egyeztetés kell visszafordíthatatlan törléshez, adatmegosztáshoz, költséges szolgáltatáshoz és egészségügyi terápiás döntéshez.</li>'+
 '</ul></details>'+
 '<details><summary>🚀 Agile Delivery · Definition of Done</summary><ul>'+'<li>A technikai részletdöntések delegáltak. Nincs mikromenedzsment: a prioritás a működő felhasználói eredmény.</li>'+'<li>CODED = kód készen; TESTED = tesztelt; DEPLOYED = élesítve; LIVE VERIFIED = valós készüléken/kapcsolattal ellenőrzött; USER ACCEPTED = tényleges felhasználói elfogadás.</li>'+'<li>GitHub-commit, mock teszt vagy preview nem bizonyítja a LIVE VERIFIED és USER ACCEPTED állapotot.</li>'+'<li>Trial &amp; error = rövid, visszaállítható fejlesztési ciklus. Reprodukált hiba → célzott javítás → újratesztelés; klinikai adatvesztést nem kockáztatunk.</li>'+'<li>Éles klinikai adatot csak jogosult, elkülönített, biztonságos adatfolyamon használunk; irreverzibilis és magas kockázatú változást külön engedélyhez kötünk.</li>'+'</ul></details>'+'<details><summary>🩺 Medical Knowledge Base 2.0 · adatvédelmi és minőségi szabályok</summary><ul>'+
 '<li>Orvosi eredeti változatlan; SHA-256-alapú egyezőség, soha nem csak fájlnév szerinti törlés vagy összevonás.</li>'+
 '<li>Profilhoz kötött jogosultság, privát tárhely, pontos dokumentum- és oldalszintű forrásazonosítás.</li>'+
 '<li>Vizsgálati időpont ≠ fájlmódosítási időpont. Eredeti mértékegység és szöveg mindig megmarad.</li>'+
 '<li>OCR és AI-kinyerés ellenőrizendő; bizonytalan, történeti és ellentmondó állítások külön jelölést kapnak.</li>'+
 '<li>Samsung Watch EKG PDF: a beágyazott szöveg megőrzése független a grafikus rendereléstől; sikertelen vagy túl alacsony felbontású képkivonatnál nincs COMPLETE állapot.</li>'+
 '<li>Ask Léna képeinek tartós archiválása csak az adott tartalomra adott külön hozzájárulással; nincsenek titkos pszichológiai profilok vagy rejtett klinikai naplók.</li>'+
  '<li>Orvosi tény csak eredeti PDF-hez, oldalszámhoz és ellenőrzött idézethez kötve; a SHA-256 szövegegyezés NEM orvosi szakvélemény.</li>'+
 '</ul></details>'+
 '<details><summary>🧠 Medical Intelligence · v675 forrásbizonyíték</summary><ul>'+
  '<li>Az idővonal csoportosítása csak megjelenítés: az eredeti tények és bizonyítékok változatlanul, külön-külön megmaradnak.</li>'+
  '<li>A forrásidézet igazolásához egyeznie kell a profilnak, az eredeti PDF SHA-256-nak, a forrásoldalnak és az oldalszövegből újraszámolt SHA-256-nak.</li>'+
  '<li>Hibás, kihagyott vagy bizonytalan forrásból nincs automatikusan igazolt tény. A felülvizsgálat státusza minden kártyán külön látható.</li>'+
  '<li>Ask Léna klinikai következtetéseihez további konfliktuskezelés és szakmai ellenőrzési kapu szükséges; a pontos tárolás nem jelent diagnózist.</li>'+
  '</ul></details>'+
  '<details><summary>⚙️ Folyamatfejlesztés és mérőszámok</summary><ul>'+
 '<li>Feldolgozási lefedettség (dokumentum/oldal), forrás nélküli tények száma, OCR-review, sikertelen feladatok és visszaállíthatóság.</li>'+
 '<li>Válaszminőség: ellenőrizhető források, tévedések javítása, megfelelő klinikai bizonytalanság, látható magyarázat.</li>'+
 '<li>Rendszer: stabilitás, sebesség, mobil használhatóság, adatfrissesség és profilszeparáció. Zöld státusz csak sikeres ellenőrzés után.</li>'+
 '<li>Admin dokumentáció és GitHub technikai dokumentáció egyaránt frissítendő minden jelentős irányváltáskor.</li>'+
 '</ul></details>'+
 '<details><summary>🔐 Eredeti PDF · v692 SHA-256 ütközésfeloldás</summary><ul>'+
 '<li>Eltérő eszközön külön helyi PDF-cache lehet; Mónika és Zsolt bejelentkezéseit dokumentumhibára hivatkozva nem változtatjuk meg.</li>'+
 '<li>Duplikált Drive dokumentumazonosító esetén csak ellenőrzött profil + pontos dokumentumazonosító + SHA-256 egyezés alapján választható eredeti.</li>'+
 '<li>Az eredeti PDF tényleges letöltött bájtjain SHA-256, PDF-aláírás és fájlméret-ellenőrzés kötelező. SHA vagy pontos találat nélkül nem találgatunk.</li>'+
 '<li>Nincs törlés, újrafeltöltés, tömeges újraindexelés vagy kliensoldali Google-token. LIVE VERIFIED csak valós mobilpróba után.</li>'+
 '</ul></details>'+
'<details><summary>📄 Eredeti PDF hozzáférés · v690 QA</summary><ul>'+
 '<li>Helyi eredeti hiányakor csak pontos dokumentumazonosító és profiljogosultság mellett próbálható a privát, szerveroldali Google Drive-olvasás.</li>'+
 '<li>Nincs fájlnév-alapú találgatás, nyilvános PDF-link, Google-token a böngészőben vagy automatikus újraimportálás.</li>'+
 '<li>PDF-aláírás, méretkorlát, rendelkezésre álló SHA-256 és profilváltás közbeni megszakítás a kötelező biztonsági ellenőrzés.</li>'+
 '<li>CODED és szintetikus TESTED nem LIVE VERIFIED. A két profil éles PDF-megnyitása és felhasználói elfogadása még külön igazolandó.</li>'+
 '</ul></details>'+
 '<details><summary>📊 Knowledge Base · ellenőrzött élő állapot</summary>'+
 '<p class="hhGovFoot">A lekérdezés csak a kiválasztott, hitelesítetten engedélyezett profil összesített metaadatait kéri le. Nincs automatikus adatfeltöltés vagy tartalomnaplózás.</p>'+
 '<div class="hhGovActions"><button type="button" id="hhGovAuditBtn658">↻ Élő adatminőség-ellenőrzés</button></div>'+
 '<div id="hhGovAudit658" class="hhGovAudit" role="status" aria-live="polite">Még nincs ellenőrzés. A privát Health Vault-kapcsolat szükséges.</div></details>'+
 '<p class="hhGovFoot">Forrás: HealthHub Governance v1.2 · 2026.10.19. · A feldolgozottságot csak tényleges, ellenőrzött adat alapján jelezzük.</p>';
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
   paged('hh_mkb_sources','original_name,parse_status,sha256,duplicate_of,source_metadata'),
   paged('hh_kb_documents','id,status,profile_key,text_integrity_status'),
   paged('hh_mkb_facts','id,review_status'),
   paged('hh_mkb_evidence','id')
  ]);
  if(p!==profile()||!status())throw Error('Profil- vagy hozzáférésváltozás, az ellenőrzés megszakadt.');
  var sources=result[0],docs=result[1],facts=result[2],evidences=result[3];
  if(!Array.isArray(sources)||!Array.isArray(docs)||!Array.isArray(facts)||!Array.isArray(evidences))throw Error('A válasz nem ellenőrizhető.');
  var names=new Set(),duplicateNames=0,withoutHash=0,rawDiscovered=0,confirmedDuplicates=0;
  sources.forEach(function(row){
   var n=String(row.original_name||'').trim().toLocaleLowerCase('hu-HU').replace(/\s+/g,' ');
   if(names.has(n))duplicateNames++;else names.add(n);
   if(!row.sha256)withoutHash++;
   if(row.duplicate_of)confirmedDuplicates++;
   if(row.parse_status==='discovered')rawDiscovered++;
  });
  var completed=docs.filter(function(d){return d.status==='complete'}).length;
   var qaDocs=docs.filter(function(d){return d.status==='complete'&&d.text_integrity_status==='verified'}).length;
   var excluded=sources.filter(function(s){return s.source_metadata&&s.source_metadata.ingest_scope==='excluded'}).length;
   var pendingFacts=facts.filter(function(f){return f.review_status==='pending'}).length;
  box.textContent='Profil: '+(p==='monika'?'Mónika':'Zsolt')+
    '\nRegisztrált forrás: '+sources.length+
     '\nOpcionálisan kihagyva: '+excluded+' · kötelező körben: '+(sources.length-excluded)+
    '\nForrásfeldolgozásra vár: '+rawDiscovered+
    '\nSHA-256 ellenőrizve: '+(sources.length-withoutHash)+'/'+sources.length+
    '\nSHA-256 hiányzik: '+withoutHash+
    '\nIgazolt tartalmi duplikátum hivatkozások: '+confirmedDuplicates+
    '\nAzonos nevű további fájlok: '+duplicateNames+' (önmagában nem bizonyít azonosságot)'+
    '\nPDF-index: '+docs.length+' · teljesként jelölt: '+completed+
     ' · szövegellenőrzött: '+qaDocs+
    '\nKinyert, forrásolt orvosi tények: '+facts.length+
     ' · szakmai ellenőrzésre vár: '+pendingFacts+
     '\nTárolt forrásbizonyíték: '+evidences.length+' (pontos idézet és SHA-256 QA: Medical Intelligence → Idővonal)'+
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