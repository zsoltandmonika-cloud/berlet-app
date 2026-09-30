(function(){
'use strict';

/* HealthRadar parity: original pharmacy quick-help under Medications. */
var DB='healthhub-healthradar-v2';
var GROUPS=[
 {id:'pain',title:'Fájdalom, láz és görcs',items:[
  {use:'Erősebb fájdalom, láz',known:'Algopyrin 500 mg',active:'metamizol-nátrium 500 mg',alternatives:'Panalgorin 500 mg; Algozone 500 mg; Metamizol STADA / Meditop 500 mg'},
  {use:'Fájdalom, láz, gyulladás',known:'Nurofen 200 mg',active:'ibuprofén 200 mg',alternatives:'Ibumax 200 mg'},
  {use:'Fájdalom, gyulladás',known:'Advil Ultra Forte / Algoflex Forte Dolo 400 mg',active:'ibuprofén 400 mg',alternatives:'Ibuprofen Sandoz 400 mg; Ibustar 400 mg; Melfen 400 mg'},
  {use:'Enyhébb fájdalom, láz',known:'Panadol Rapid / Rubophen 500 mg',active:'paracetamol 500 mg',alternatives:'Paracetamol Sandoz 500 mg; Paracetamol PXGPharma 500 mg; Ben-u-ron 500 mg'},
  {use:'Hasi vagy menstruációs görcs',known:'No-Spa 40 mg',active:'drotaverin-hidroklorid 40 mg',alternatives:'Drotaverin-Chinoin 40 mg'}
 ]},
 {id:'digestion',title:'Emésztés és köhögés',items:[
  {use:'Akut hasmenés',known:'Imodium 2 mg',active:'loperamid 2 mg',alternatives:'Lopedium 2 mg; Lopacut 2 mg; Teva-Enterobene 2 mg'},
  {use:'Gyomorégés, reflux',known:'Controloc Control 20 mg',active:'pantoprazol 20 mg',alternatives:'Nolpaza Control 20 mg'},
  {use:'Hurutos köhögés',known:'Mucosolvan 30 mg',active:'ambroxol 30 mg',alternatives:'Ambroxol-Teva 30 mg; Ambroxol-EGIS 30 mg; Teva-Ambrobene 30 mg'},
  {use:'Hurutos köhögés',known:'ACC 200 mg',active:'acetilcisztein 200 mg',alternatives:'Fluimucil 200 mg; Solmucol 200 mg – azonos hatóanyag, de eltérhet a gyógyszerforma'},
  {use:'Száraz köhögés',known:'Sinecod',active:'butamirát-citrát',alternatives:'Nincs széles körben kapható, egyértelmű generikum; azonos erősséget és gyógyszerformát kérjetek a patikában'}
 ]},
 {id:'allergy',title:'Orrdugulás és allergia',items:[
  {use:'Orrdugulás',known:'Otrivin Rapid 1 mg/ml',active:'xilometazolin 1 mg/ml',alternatives:'Xilomare 1 mg/ml'},
  {use:'Allergia',known:'Zyrtec 10 mg',active:'cetirizin 10 mg',alternatives:'Cetirizin-EP 10 mg; Cetirizin Hexal 10 mg; Cetimax 10 mg'},
  {use:'Allergia',known:'Claritine 10 mg',active:'loratadin 10 mg',alternatives:'Loratadin Hexal 10 mg; Erolin 10 mg; Loratadin-ratiopharm 10 mg'},
  {use:'Allergia',known:'Aerius 5 mg',active:'dezloratadin 5 mg',alternatives:'Dassergo 5 mg; Desloratadine Teva / Actavis / STADA 5 mg – a vénykötelességet a patika ellenőrizze'}
 ]}
];
var openGroups={pain:true,digestion:false,allergy:false};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function privateMeds(){
 try{
  var db=await openDb(),x=await reqP(db.transaction('meta','readonly').objectStore('meta').get('private-reference'));db.close();
  var ref=x&&x.payload,p=pkey();return ref&&ref.profiles&&ref.profiles[p]?ref.profiles[p].medications||[]:[];
 }catch(e){return []}
}
function card(x){
 return '<article style="border:1px solid #edf1f4;background:#f9fbfc;border-radius:14px;padding:11px;font-size:9px;line-height:1.5">'+
  '<b style="display:block;color:#102f4f;margin-bottom:7px">'+esc(x.use)+'</b>'+
  '<div><span style="color:#73879a;font-weight:700">Ismert márka:</span> '+esc(x.known)+'</div>'+
  '<div><span style="color:#73879a;font-weight:700">Hatóanyag:</span> '+esc(x.active)+'</div>'+
  '<div style="margin-top:7px"><span style="color:#317f77;font-weight:850">Alternatívák:</span> '+esc(x.alternatives)+'</div></article>';
}
function group(g){
 var open=!!openGroups[g.id];
 return '<section style="border-top:1px solid #eef2f5;padding-top:6px;margin-top:8px">'+
  '<button type="button" onclick="hhTogglePharmacyGroup(\''+g.id+'\')" style="width:100%;display:flex;align-items:center;justify-content:space-between;border:0;background:transparent;padding:9px 2px;color:#243f5b;font:inherit;cursor:pointer;text-align:left">'+
   '<span style="font-size:10px;font-weight:780">'+esc(g.title)+'</span><span style="display:flex;align-items:center;gap:8px"><span style="background:#f0f4f8;border-radius:999px;padding:4px 7px;font-size:7px;color:#61758a">'+g.items.length+'</span><span style="font-size:10px">'+(open?'⌃':'⌄')+'</span></span></button>'+
  (open?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;padding:3px 0 9px">'+g.items.map(card).join('')+'</div>':'')+
  '</section>';
}
async function warning(){
 var meds=await privateMeds(),names=new Set(meds.map(function(x){return x.name}));
 if(names.has('Entresto')){
  return '<div style="margin-top:9px;border:1px solid #f1d277;background:#fff8e8;border-radius:13px;padding:10px;font-size:8px;line-height:1.5;color:#6b4e16"><b>Mónikánál:</b> az ibuprofén-, diklofenák- és naproxentabletta az Entresto és a szívbetegség miatt ne legyen automatikus első választás. A jelenlegi Noacid 40 mg nem azonos a gyorssegédlet 20 mg-os pantoprazol-készítményeivel.</div>';
 }
 if(names.has('Tolura')){
  return '<div style="margin-top:9px;border:1px solid #f1d277;background:#fff8e8;border-radius:13px;padding:10px;font-size:8px;line-height:1.5;color:#6b4e16"><b>Zsoltnál:</b> a Tolura mellett a több napig szedett ibuprofén – különösen kiszáradáskor – növelheti a vesekockázatot. A Tanydon 40 mg ugyanazt a hatóanyagot tartalmazza, mint a Tolura 40 mg, ezért a kettőt ne szedje együtt.</div>';
 }
 return '';
}
window.hhTogglePharmacyGroup=function(id){openGroups[id]=!openGroups[id];renderGuide()};
async function renderGuide(){
 if(window.healthSectionKind!=='medications')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var old=document.getElementById('hhPharmacyGuide');if(old)old.remove();
 var s=document.createElement('div');s.id='hhPharmacyGuide';s.className='hrSectionCard';
 s.innerHTML='<div style="display:flex;gap:10px;align-items:flex-start"><div class="hrIco">↪</div><div><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#b85e54;text-transform:uppercase">Patikai gyorssegédlet</div><h3 style="margin:4px 0 3px">Azonos hatóanyagú gyógyszeralternatívák</h3><small style="color:#70869a">14 gyakori készítménycsoport. Az ár, készlet, vénykötelesség és helyettesíthetőség változhat.</small></div></div>'+
  '<div style="margin-top:10px;border:1px solid #bfead9;background:#eefbf5;border-radius:13px;padding:10px;font-size:8px;line-height:1.5;color:#254b3e"><b>Csak akkor valódi alternatíva, ha egyszerre egyezik:</b> a hatóanyag, az erősség és a gyógyszerforma. A Rapid, Forte, Duo, Cold, Extra és retard változatok nem feltétlenül cserélhetők fel.</div>'+
  GROUPS.map(group).join('')+
  '<div style="margin-top:9px;border:1px solid #cfe1f5;background:#f3f8ff;border-radius:13px;padding:10px;font-size:8px;line-height:1.5;color:#244a74"><b>Patikában ezt mondjátok:</b> „Ebből a hatóanyagból és erősségből kérem a legolcsóbb, elérhető készítményt. Kérem, ellenőrizze a gyógyszerformát és a vénykötelességet is.”</div>'+
  await warning()+
  '<p style="font-size:7px;line-height:1.5;color:#74899a;margin:9px 0 0">Nyákoldót vagy köptetőt ne használjatok köhögéscsillapítóval együtt. Véres vagy magas lázzal járó hasmenésnél loperamid csak orvosi egyeztetés után használható.</p>';
 root.appendChild(s);
}
var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);await renderGuide();return r};
}
setTimeout(renderGuide,120);
document.documentElement.dataset.healthhubPharmacyGuide='1.31';
window.HH_LIVE_BUILD='v1.31-pharmacy-guide';
})();