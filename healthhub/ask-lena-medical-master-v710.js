/* HealthHub v710 · Ask Léna private Master Golden Standard QA.
 * Only active with ?hhMasterQA=v1. No fallback to older answers on failure.
 * The 7th JSON lives in the user's private Dropbox; only the chosen profile
 * is sent after fresh, one-time explicit OpenAI processing consent.
 */
(function(root){
 'use strict';
 if(new URLSearchParams(root.location.search).get('hhMasterQA')!=='v1')return;
 const PATH='/HealthHub/master/medical-master.json';
 const LIMIT=620000;
 let busy=false,ctrl=null;
 function activeProfile(){return root.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';}
 const el=id=>document.getElementById(id);
 function preflight(p){
  const svc=root.HH_DAILY_HEALTH_SYNC_V319;
  if(!svc||typeof svc.stream!=='function')throw Error('A biztonságos Health Vault AI-kapcsolat nem érhető el.');
  const s=svc.getStatus&&svc.getStatus();
  if(!s||!s.authenticated){
   if(svc.openLogin)svc.openLogin();
   throw Error('Jelentkezz be a Health Vaultba az AI-kutatás előtt.');
  }
  if(!Array.isArray(s.authorizedProfiles)||!s.authorizedProfiles.includes(p))
   throw Error('Az aktív egészségügyi profilhoz nincs ellenőrzött hozzáférés.');
  const v=root.HH_DROPBOX_VAULT;
  if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')
   throw Error('A Medical Masterhez csatlakozz a privát Dropbox HealthHub Vaultba.');
  return {svc,v};
 }
 function select(master,p){
  if(!master||master.schema!=='healthhub.medical-master/1'||
    !master.patients||!master.patients[p]||!master.audit||!master.audit[p]||
    !master.sourceManifestVersion||
    master.audit.unmatchedExplanations!==0||master.audit.unmatchedAppointments!==0)
   throw Error('A hetedik Medical Master hiányos vagy nem v709 verziójú.');
  const patient=master.patients[p],a=master.audit[p];
  if(patient.profile!==p||!Array.isArray(patient.documents)||
    !Array.isArray(patient.lenaExplanations)||
    !Array.isArray(patient.medicalProfile)||
    !Array.isArray(patient.medications)||
    !Array.isArray(patient.appointments)||
    patient.documents.length!==a.documents||
    patient.lenaExplanations.length!==a.lenaExplanations||
    a.documents<1||a.lenaExplanations<1)
   throw Error('Medical Master profil- vagy rekordellenőrzési hiba.');
  const docs=new Set();
  for(const d of patient.documents){
   if(!d||d.profile!==p||typeof d.id!=='string'||docs.has(d.id))throw Error('Sérült dokumentumindex.');
   docs.add(d.id);
  }
  const seen=new Set();
  for(const e of patient.lenaExplanations){
   if(!e||e.profile!==p||!docs.has(e.documentId)||seen.has(e.documentId)||
      (!e.manual&&!e.imported))throw Error('Hibás Léna-magyarázat kapcsolat.');
   seen.add(e.documentId);
  }
  const chosen=JSON.parse(JSON.stringify(patient)); // never include the other profile
  return {patient:chosen,auditForProfile:{documents:a.documents,lenaExplanations:a.lenaExplanations},
   sourceManifestVersion:master.sourceManifestVersion,masterSchema:master.schema};
 }
 function parseSse(chunk,consume){
  let event='',data='';
  for(const line of chunk.split('\n')){
   if(line.startsWith('event:'))event=line.slice(6).trim();
   if(line.startsWith('data:'))data+=line.slice(5).trim();
  }
  if(!data)return;
  let row;try{row=JSON.parse(data);}catch(e){throw Error('Sérült válaszcsomag.');}
  consume(event,row);
 }
 async function run(args){
  const {question,p,q,result,print,showError,renderAnswerText,alignAnswerTop}=args;
  if(busy){print('Már fut egy Medical Master kutatás.');return;}
  busy=true;
  const b=el('hhRun299');
  if(b)b.disabled=true;
  q.disabled=true;try{q.blur();}catch(e){}
  const signalController=new AbortController();ctrl=signalController;
  let responseCommitted=false;
  try{
   if(question.length>1800)throw Error('A kérdés legfeljebb 1800 karakter lehet.');
   const {svc,v}=preflight(p);
   print('🧠 Medical Master v710: privát, mentett hetedik JSON beolvasása…');
   const master=await v.downloadJson(PATH);
   if(!master)throw Error('A Dropboxban nem találom a medical-master.json fájlt.');
   if(activeProfile()!==p)throw Error('Időközben megváltozott az aktív profil.');
   const slice=select(master,p);
   const payload={
    schema:'healthhub.medical-master.research/1',profile:p,
    question:question,consent:true,researchMode:'golden-master-v710',...slice
   };
   const encoded=JSON.stringify(payload);
   if(encoded.length>LIMIT)throw Error('A Master túl nagy; teljes, csonkítás nélküli kutatás nem indítható.');
   const privacy='HH MEDICAL MASTER TESZT\n\nA '+(p==='monika'?'MÓNIKA':'ZSOLT')+
    ' profil '+slice.auditForProfile.documents+' dokumentumindexét és '+
    slice.auditForProfile.lenaExplanations+' meglévő Léna-magyarázatát a biztonságos Health Vault szerver OpenAI API-feldolgozásra küldi, CSAK ERRE AZ EGY KÉRDÉSRE.\n\n'+
    'Az eredeti PDF nem kerül át. A másik profil Master adatait nem küldjük tovább. '+
    'A műveletnek API-költsége lehet.\n\nENGEDÉLYEZED?';
   if(!root.confirm(privacy)){print('A kutatást nem engedélyezted. Nincs OpenAI-feldolgozás.');return;}
   if(activeProfile()!==p)throw Error('Profilváltás történt; kutatás megszakítva.');
   root.dispatchEvent(new CustomEvent('healthhub:ask-lena-start',{detail:{profile:p,engine:'medical-master-v710'}}));
   print('🧪 Golden Standard kutatás az aktív profil Medical Masteréből…');
   const resp=await svc.stream('/functions/v1/hh-medical-master-golden-v710',payload,signalController.signal);
   if(!resp.ok){
    let message={};try{message=await resp.json();}catch(e){}
    throw Error('Medical Master szerver: '+(message.error||resp.status));
   }
   if(!(resp.headers.get('Content-Type')||'').includes('text/event-stream')||!resp.body)
    throw Error('A szerver nem küldött hitelesíthető válaszfolyamot.');
   const reader=resp.body.getReader(),decoder=new TextDecoder();
   let buffer='',body='',verified=false,audit=null,model='';
   const consume=(event,row)=>{
    if(event==='stage'){print('Léna: '+String(row.message||'').slice(0,200));return;}
    if(event==='error')throw Error('Kutatási hiba: '+String(row.reason||'ismeretlen').slice(0,100));
    if(event==='delta'){
     body+=String(row.text||'');
     if(body.length>90000)throw Error('A válasz meghaladta a méretkorlátot.');
     return;
    }
    if(event==='done'){
     if(verified||row.model!=='gpt-6.1-sol'||!row.evidenceAudit||
        row.evidenceAudit.mode!=='golden-master-v710'||
        row.evidenceAudit.authorizedProfile!==p||
        row.evidenceAudit.sourceDocuments!==slice.auditForProfile.documents||
        row.evidenceAudit.sourceExplanations!==slice.auditForProfile.lenaExplanations||
        row.evidenceAudit.citationIdsValidated!==true||
        row.evidenceAudit.originalPdfIncluded!==false||
        body.trim().length<90)
      throw Error('Nem teljes vagy nem ellenőrizhető Golden Standard AI-válasz.');
     verified=true;audit=row.evidenceAudit;model=row.model;
    }
   };
   while(true){
    const step=await reader.read();if(step.done)break;
    if(activeProfile()!==p)throw Error('Profilváltás miatt a kutatás megszakadt.');
    buffer+=decoder.decode(step.value,{stream:true}).replace(/\r\n/g,'\n');
    const packets=buffer.split('\n\n');buffer=packets.pop()||'';
    for(const item of packets)parseSse(item,consume);
   }
   if(buffer.trim())parseSse(buffer,consume);
   if(!verified)throw Error('A szerver nem erősítette meg a teljes választ.');
   if(activeProfile()!==p)throw Error('Profilváltás: a válasz nem jeleníthető meg.');
   renderAnswerText(body,90000);result.classList.add('on');
   const foot=el('hhAi331Foot');
   if(foot)foot.textContent='🧠 Medical Master v710 · '+model+' · '+audit.sourceDocuments+
    ' dokumentum · '+audit.sourceExplanations+' korábbi Léna-magyarázat · '+
    audit.citedDocuments+' dokumentumhivatkozás · másodlagos források, nem hitelesített eredeti PDF.';
   responseCommitted=true;
   print('✅ Medical Master Golden Standard AI-válasz elkészült. Most hasonlítsd a ChatGPT referenciához.');
   try{root.dispatchEvent(new CustomEvent('healthhub:ask-lena-complete',{
    detail:{profile:p,successful:true,question,answer:body,generatedAt:new Date().toISOString(),
    model,answerMode:'medical-master-v710-preview'}}));}catch(e){}
   setTimeout(alignAnswerTop,80);
  }catch(e){
   if(!responseCommitted){
    result.classList.remove('on');
    const answer=el('hhAi331Text'),foot=el('hhAi331Foot');
    if(answer)answer.textContent='';if(foot)foot.textContent='';
    showError('Medical Master v710 · '+String(e.message||'kutatási hiba').slice(0,200)+
     ' · NEM készült AI-válasz; helyi sablon nincs.');
   }
  }finally{
   signalController.abort();
   if(ctrl===signalController)ctrl=null;
   if(b)b.disabled=false;
   q.disabled=false;busy=false;
  }
 }
 root.HH_MEDICAL_MASTER_GOLDEN_V710={run,select,parseSse,path:PATH};
})(window);
