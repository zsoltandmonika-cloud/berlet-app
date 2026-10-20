/* HealthHub Timeline v725 · Verifiable entries only.
 * Canonical Dropbox (nutrition, symptoms, medical document metadata);
 * offline profile-scoped caches; measured Activity day summary when loaded.
 * No new backend, no patient payload in GitHub, no inferred timestamps.
 * Replaces the classic demonstration Timeline surface; leaves its hero/nav intact.
 */
(function(w,d){
 'use strict';
 const ID='hhTimelineTruth725';
 const NUTRITION='hh-nutrition-PREVIEW-v592-';
 const SYMPTOMS='hh-symptom-journal-v1';
 const DAY=/^\d{4}-\d{2}-\d{2}$/;
 const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
 const SEL=document.getElementById('timeline');
 if(!SEL)return;
 let profile=null,records=[],state={mode:'1',day:''},sourceStatus={},loaded=false,sequence=0,requesting=null,lastFetch=0;
 const el=id=>d.getElementById(id);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pkey=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
 const name=p=>p==='monika'?'Mónika':'Zsolt';
 const nowDate=()=>new Date();
 const localDay=x=>{const t=x instanceof Date?x:new Date(x);return Number.isFinite(t.getTime())?
  [t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-'):''};
 const isDay=x=>typeof x==='string'&&DAY.test(x)&&localDay(x+'T12:00:00')===x;
 const validTime=x=>typeof x==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x);
 const isoDate=x=>isDay(x)?x:typeof x==='string'&&Number.isFinite(Date.parse(x))?localDay(x):'';
 const when=iso=>{const t=new Date(iso);return Number.isFinite(t.getTime())?t.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):''};
 const num=x=>x==null||x===''?null:Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
 const fmt=x=>Number(x).toLocaleString('hu-HU',{maximumFractionDigits:1});
 const safeJson=k=>{try{return JSON.parse(w.localStorage.getItem(k)||'null')}catch(_){return null}};
 const vault=()=>{try{const v=w.HH_DROPBOX_VAULT;return v&&v.connected&&v.connected()&&typeof v.downloadJson==='function'?v:null}catch(_){return null}};
 const goodPack=(x,key,p)=>x&&x[key]&&Array.isArray(x[key])&&
  (!x.profileKey||x.profileKey===p)&&(!x.profile||x.profile===p);
 const liveNutrition=(x,p)=>goodPack(x,'entries',p)&&x.schemaVersion==='healthhub.nutrition/1'&&x.profileKey===p;
 const liveSymptoms=x=>x&&x.schema==='healthhub.master.symptoms/1'&&Array.isArray(x.events);
 const localNutrition=p=>{const x=safeJson(NUTRITION+p);return liveNutrition(x,p)?x:null};
 const localSymptoms=()=>{const x=safeJson(SYMPTOMS);return liveSymptoms(x)?x:null};
 function newest(a,b){
  const av=Date.parse(a?.updatedAt||a?.createdAt||'')||0,bv=Date.parse(b?.updatedAt||b?.createdAt||'')||0;
  return bv>=av?b:a;
 }
 function byId(left,right){
  const out=new Map();
  for(const row of [...(Array.isArray(left)?left:[]),...(Array.isArray(right)?right:[])]){
   if(!row||typeof row.id!=='string'||!row.id||row.id.length>150)continue;
   out.set(row.id,out.has(row.id)?newest(out.get(row.id),row):row);
  }
  return [...out.values()];
 }
 function nutritionRows(data,p){
  if(!data||!Array.isArray(data.entries))return[];
  return data.entries.filter(x=>x&&(!x.profile||x.profile===p)&&!x.deleted&&isDay(x.date)&&validTime(x.time)&&typeof x.id==='string'&&typeof x.name==='string')
   .map(x=>({
    id:'nutrition:'+x.id,profile:p,date:x.date,time:x.time,kind:'nutrition',icon:x.kind==='drink'?'🥤':'🍽️',
    title:x.name.slice(0,110),meal:MEALS.includes(x.meal)?x.meal:(x.meal==='Egyéb / Brunch'?'Egyéb':'Egyéb'),
    quantity:typeof x.quantityText==='string'?x.quantityText.slice(0,100):'',
    kcal:num(x.nutrients&&x.nutrients.kcal),source:'Nutrition napló',proof:x.source==='estimated'?'Becsült tápérték · rögzített bevitel':'Rögzített bevitel'
   }));
 }
 const URINE_COLORS=['Nagyon halvány','Halványsárga','Sárga','Aranysárga','Mézsárga','Borostyán','Sötét borostyán','Sötétbarna'];
 function bodyRows(data,p){
  if(!liveNutrition(data,p)||!Array.isArray(data.body))return[];
  return data.body.filter(x=>x&&(!x.profile||x.profile===p)&&!x.deleted&&
    typeof x.id==='string'&&x.id.length>0&&isDay(x.date)&&validTime(x.time)&&
    (x.kind==='stool'||x.kind==='urine')).map(x=>{
   const stool=x.kind==='stool';
   const bristol=stool&&/^[1-7]$/.test(String(x.bristol||''))?Number(x.bristol):null;
   const urine=!stool&&/^[1-8]$/.test(String(x.urineColor||''))?Number(x.urineColor):null;
   return {
    id:'body:'+x.id,profile:p,date:x.date,time:x.time,kind:'observation',
    observationType:stool?'stool':'urine',grade:stool?bristol:urine,icon:stool?'🧻':'💧',
    title:stool?'Széklet · Bristol-skála':'Vizelet · Apple juice színskála',
    quantity:stool?(bristol?'Bristol '+bristol+'/7':'Bristol-fokozat nincs megadva'):
      urine?'Szín '+urine+'/8 · '+URINE_COLORS[urine-1]:'Színfokozat nincs megadva',
    note:typeof x.note==='string'?x.note.slice(0,300):'',
    source:'Nutrition · Testi megfigyelések',proof:'Saját naplóbejegyzés · nem diagnózis'
   };
  });
 }
 function symptomRows(pkg,p){
  if(!pkg||!Array.isArray(pkg.events))return[];
  return pkg.events.filter(x=>x&&!x.deletedAt&&x.profile===p&&x.id&&x.eventAt&&Number.isFinite(Date.parse(x.eventAt)))
   .map(x=>({id:'symptom:'+x.id,profile:p,date:localDay(x.eventAt),time:when(x.eventAt),
    kind:'symptom',icon:'🩺',title:String(x.symptom||'Tünet').slice(0,90),
    quantity:[x.location,x.outcome].filter(Boolean).map(String).join(' · ').slice(0,160),
    severity:num(x.severity),source:'Tünetnapló · saját bejegyzés',symptomId:x.id}));
 }
 function reportRows(pack,p){
  if(!pack||!Array.isArray(pack.documents))return[];
  return pack.documents.filter(x=>x&&x.profile===p&&x.id&&isDay(x.documentDate)&&!x.deletedAt&&!x.deleted)
   .map(x=>({id:'report:'+x.id,profile:p,date:x.documentDate,time:'',
    kind:'medical',icon:'📄',title:String(x.originalName||x.title||x.name||'Orvosi dokumentum').slice(0,120),
    source:'Leletek · dokumentált keltezés',quantity:String(x.facilityName||'').slice(0,100)}));
 }
 function activityRows(p){
  if(w.hhActivity191CurrentProfile!==p)return[];
  const c=w.hhActivity191Cache;if(!c||!Array.isArray(c.daily))return[];
  return c.daily.filter(x=>x&&isDay(x.date)&&num(x.steps)!==null)
   .map(x=>({id:'activity-day:'+x.date,profile:p,date:x.date,time:'',
    kind:'activity',icon:'👣',title:'Napi lépések · összesítés',steps:num(x.steps),
    quantity:fmt(num(x.steps))+' lépés',source:'Activity · Health Connect / Samsung',
    proof:'Napi összeg, nem időpont szerinti esemény'}));
 }
 function dedupe(rows){
  const map=new Map();for(const r of rows)if(r&&r.id&&r.date)map.set(r.id,r);
  return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||
   (b.time||'').localeCompare(a.time||'')||a.id.localeCompare(b.id,'hu-HU'));
 }
 function limitRange(items,mode,day,now){
  const end=localDay(now||nowDate());
  let start=end;
  if(mode==='custom'){start=isDay(day)?day:end;return items.filter(e=>e.date===start)}
  const days=mode==='30'?30:mode==='7'?7:1;
  const dt=new Date(end+'T12:00:00');dt.setDate(dt.getDate()-days+1);start=localDay(dt);
  return items.filter(e=>e.date>=start&&e.date<=end);
 }
 function nutritionSummary(items){
  const foods=items.filter(x=>x.kind==='nutrition');
  const tally=foods.map(x=>x.kcal).filter(x=>x!==null).reduce((s,x)=>s+x,0);
  return {recorded:foods.length,withKcal:foods.filter(x=>x.kcal!==null).length,kcal:tally,
   meals:MEALS.map(m=>({name:m,rows:foods.filter(x=>x.meal===m)}))};
 }
 // Informational RAG pattern, never a diagnostic decision. Green check = saved
 // diary entry, not a clinical assessment or a verified sensor measurement.
 function observationRag(x){
  return w.HH_OBSERVATION_RAG_V728?.classify?.(x?.observationType,x?.grade)||
   {tone:'unknown',label:'Színjelzés nem elérhető',grade:null};
 }
 function observationGroup(rows){
  const ordered=[...rows].sort((a,b)=>
   (a.observationType==='stool'?0:1)-(b.observationType==='stool'?0:1)||
   (a.time||'').localeCompare(b.time||''));
  const parts=['<div class="hhTruthObservationGroup hhRhythmDiary" aria-label="Rögzített testi megfigyelések">',
   '<div class="hhTruthObservationHeading"><span class="hhTruthRecorded" aria-hidden="true">✓</span>',
   '<strong>BS / AJ · Megfigyelések</strong><small>'+ordered.length+' rögzítve</small></div>'];
  ordered.forEach(x=>{
   const isBS=x.observationType==='stool',rag=observationRag(x);
   const code=isBS?'BS':'AJ',title=isBS?'Bristol-skála':'Apple Juice';
   const grade=rag.grade!==null&&rag.grade!==undefined?
    String(rag.grade)+'/'+(isBS?'7':'8'):'Fokozat nélkül';
   parts.push('<div class="hhRhythmRow">'+
    '<span class="hhRhythmCheck" aria-label="Naplóba rögzítve">✓</span>'+
    '<span class="hhRhythmMain"><span class="hhRhythmTitle">'+code+' · '+title+' · '+esc(grade)+'</span>'+
    (x.note?'<span class="hhRhythmNote">'+esc(x.note)+'</span>':'')+'</span>'+
    '<time class="hhRhythmTime">'+esc(x.time)+'</time>'+
    '<span class="hhRhythmDot" data-rag="'+esc(rag.tone)+'" role="img"'+
    ' aria-label="'+esc(rag.label)+' · tájékoztató, nem diagnózis"'+
    ' title="'+esc(rag.label)+'"></span></div>');
  });
  parts.push('<div class="hhRhythmLegend">A zöld ✓ a mentést jelzi; a külön színpont tájékoztató, nem diagnózis.</div></div>');
  return parts.join('');
 }
  function statCards(rows,filter){
  const n=rows.length,food=rows.filter(x=>x.kind==='nutrition'),
   body=rows.filter(x=>x.kind==='observation');
  const total=nutritionSummary(rows);
  const card=(value,label)=>({value:String(value),label});
  if(filter==='nutrition')return[
   card(n,'Étel- és italbevitel'),card(food.filter(x=>x.icon==='🥤').length,'Italok'),
   card(total.withKcal?fmt(total.kcal)+' kcal':'—','Rögzített tápérték · becslés')
  ];
  if(filter==='observation')return[
   card(n,'Testi megfigyelés'),card(body.filter(x=>x.observationType==='stool').length,'Bristol · széklet'),
   card(body.filter(x=>x.observationType==='urine').length,'Apple juice · vizeletszín')
  ];
  if(filter==='symptom'){
   const rated=rows.map(x=>x.severity).filter(x=>x!==null&&x!==undefined);
   return[card(n,'Tünetnapló-esemény'),card(rated.length,'Erősség rögzítve'),
    card(rated.length?fmt(rated.reduce((a,b)=>a+b,0)/rated.length)+'/10':'—','Átlagos rögzített erősség')];
  }
  if(filter==='medical'){
   const days=new Set(rows.map(x=>x.date));
   return[card(n,'Keltezett dokumentum'),card(days.size,'Dokumentált nap'),
    card(rows.length?rows[0].date:'—','Legutóbbi lelet dátuma')];
  }
  if(filter==='activity'){
   const steps=rows.map(x=>x.steps).filter(x=>x!==null&&x!==undefined);
   return[card(n,'Mért napi összesítés'),
    card(steps.length?fmt(steps.reduce((a,b)=>a+b,0)):'—','Mért lépések az időszakban'),
    card(steps.length,'Lépésadatos nap')];
  }
  return [card(n,'Összes rögzített esemény'),card(total.recorded,'Étel- és italbevitel'),
    card(total.withKcal?fmt(total.kcal)+' kcal':'—','Rögzített tápérték · becslés')];
 }
 function ensureStyle(){
  if(el('hhTimelineTruthStyle725'))return;
  const s=d.createElement('style');s.id='hhTimelineTruthStyle725';s.textContent=
   '#timeline .surface.hhTruthSurface{padding:14px 12px 100px!important;background:linear-gradient(145deg,rgba(9,28,52,.94),rgba(17,24,50,.96))!important;'+
    'color:#e9f3ff!important;border-radius:0 0 22px 22px}'+
   '.hhTruthRoot{color:#eaf4ff;font-family:system-ui,sans-serif}.hhTruthRoot *{box-sizing:border-box}'+
   '.hhTruthHeadline{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 12px}'+
   '.hhTruthHeadline strong{font-size:16px;color:#f6faff}.hhTruthHeadline small{font-size:10px;color:#9abbd6}'+
   '.hhTruthModes,.hhTruthFilters{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}'+
   '.hhTruthModes button,.hhTruthFilters button,.hhTruthRefresh{background:#152c4c;color:#c9ddf3;border:1px solid #7299bd80;border-radius:12px;'+
     'padding:9px 12px;font:750 11px system-ui;cursor:pointer;min-height:40px}'+
   '.hhTruthModes button[aria-pressed="true"],.hhTruthFilters button[aria-pressed="true"]{background:linear-gradient(115deg,#236893,#534b8b);'+
     'border-color:#94d5ff;color:white}'+
   '.hhTruthCustom{display:flex;align-items:center;gap:7px;margin:8px 0;font-size:11px;color:#c9e2fb}'+
   '.hhTruthCustom input{color:#eff8ff;background:#142e50;border:1px solid #739bbc;border-radius:10px;padding:8px;min-height:38px;color-scheme:dark}'+
   '.hhTruthStatsTitle{font-size:10px;color:#adcce8;margin:12px 0 4px;font-weight:750}'+
   '.hhTruthStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}'+
   '.hhTruthStat{min-width:0;display:flex;flex-direction:column;gap:4px;border:1px solid #77acde66;border-radius:15px;padding:11px 9px;background:#102744d9}'+
   '.hhTruthStat b{font-size:18px;color:#f6f9ff}.hhTruthStat small{font-size:10px;color:#a4c0dc;line-height:1.4}'+
   '.hhTruthSources{font-size:10px;line-height:1.6;color:#a8c4df;margin:8px 2px 12px;overflow-wrap:anywhere}'+
   '.hhTruthGroupTitle{margin:17px 0 9px;font-weight:900;font-size:13px;color:#daedff}'+
   '.hhTruthEvent{display:grid;grid-template-columns:68px 34px minmax(0,1fr);gap:6px;align-items:start;margin:0 0 9px}'+
   '.hhTruthTime{text-align:right;padding:14px 4px 0 0;font-size:14px;font-weight:750;color:#d3eaff;font-variant-numeric:tabular-nums;white-space:nowrap}'+
   '.hhTruthIcon{height:34px;width:34px;display:grid;place-items:center;margin-top:6px;font-size:18px;border-radius:50%;'+
     'background:#24456b;border:1px solid #8ac9f8a1}'+
   '.hhTruthCard{min-width:0;padding:12px;border-radius:16px;background:linear-gradient(120deg,#183958c9,#272b50b4);border:1px solid #658fbe66}'+
   '.hhTruthCard strong{display:block;font-size:13px;color:#f4f9ff;line-height:1.4;overflow-wrap:anywhere}'+
   '.hhTruthCard small{display:block;font-size:10px;color:#acc8e1;margin-top:6px;line-height:1.5}'+
   '.hhTruthCard .hhTruthMetric{display:inline-block;font-weight:850;font-size:12px;color:#a8e2ff;margin-top:6px}'+
   '.hhTruthCard .hhTruthSource{font-size:9px;color:#a5bad4;margin-top:7px}'+
   '.hhTruthObservationGroup{margin:8px 0 13px 35px;padding:8px 10px;border-radius:14px;border:1px solid #678bb363;background:rgba(15,36,64,.61)}'+
   '.hhTruthObservationHeading{display:flex;align-items:center;gap:7px;margin-bottom:3px;color:#bfd4e8}'+
   '.hhTruthObservationHeading strong{font:750 11px/1.4 system-ui;color:#dce9f7}'+
   '.hhTruthObservationHeading small{margin-left:auto;font:10px system-ui;color:#8faecb}'+
   '.hhTruthRecorded{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#163e33;border:1px solid #42bc89;color:#86eec0;font-size:12px}'+
   '.hhTruthObservationMini{border-top:1px solid #7194bd35}'+
   '.hhTruthObservationMini summary{display:flex;align-items:center;gap:8px;padding:8px 3px;cursor:pointer;list-style:none;min-height:38px}'+
   '.hhTruthObservationMini summary::-webkit-details-marker{display:none}'+
   '.hhTruthObservationMini summary:focus-visible{outline:2px solid #91d1fa;outline-offset:-1px;border-radius:6px}'+
   '.hhTruthObservationCheck{font-size:14px;color:#65d99c;font-weight:900}'+
   '.hhTruthObservationCode{font:850 12px system-ui;color:#eaf8ff}'+
   '.hhTruthObservationName{font:650 11px system-ui;color:#c7dff0;min-width:0}'+
   '.hhTruthObservationTime{margin-left:auto;white-space:nowrap;font:700 11px system-ui;color:#b8d5ef;font-variant-numeric:tabular-nums}'+
   '.hhTruthRag{width:10px;height:10px;display:inline-block;flex:0 0 10px;border-radius:50%;background:#8391a5;box-shadow:0 0 0 2px #ccd5e125}'+
   '.hhTruthRag-green{background:#36c981}.hhTruthRag-amber{background:#efb44c}.hhTruthRag-red{background:#ee777e}.hhTruthRag-unknown{background:#8696aa}'+
   '.hhTruthObservationExpand{color:#9cb5cc;font-size:13px;transition:transform .15s}'+
   '.hhTruthObservationMini[open] .hhTruthObservationExpand{transform:rotate(180deg)}'+
   '.hhTruthObservationDetail{padding:2px 8px 11px 31px;color:#bed7e9;font:11px/1.5 system-ui}'+
   '.hhTruthObservationNote{display:block;overflow-wrap:anywhere;margin:6px 0;color:#d2e3f5}'+
   '.hhTruthObservationDetail small{display:block;margin-top:4px;font-size:9px;color:#93aac4}'+
   '.hhTruthRagLegend{display:block;margin:7px 3px 3px;color:#9ab5cf;font:9px/1.5 system-ui}'+
   '.hhTruthRagLegend .hhTruthRag{width:7px;height:7px;flex-basis:7px;margin-right:2px}'+
   '@media(max-width:380px){.hhTruthObservationGroup{margin-left:22px;padding:7px 7px}.hhTruthObservationMini summary{gap:5px}.hhTruthObservationName{font-size:10px}}'+
   '.hhTruthEmpty{border:1px dashed #7194b77a;border-radius:15px;padding:18px;text-align:center;color:#b6cce1;font-size:12px;line-height:1.65}'+
   '.hhTruthWarning{margin:10px 0;padding:11px;border:1px solid #edbb7066;border-radius:13px;font-size:10px;line-height:1.6;color:#efc99d}'+
   '@media(max-width:380px){.hhTruthEvent{grid-template-columns:58px 30px minmax(0,1fr);gap:5px}'+
   '.hhTruthTime{font-size:13px;padding-right:3px}.hhTruthIcon{width:30px;height:30px;font-size:16px}.hhTruthCard{padding:10px}.hhTruthModes button,.hhTruthFilters button{padding:8px 9px}'+
   '.hhTruthStats{gap:5px}.hhTruthStat{padding:9px 7px}.hhTruthStat b{font-size:16px}}';
  d.head.appendChild(s);
 }
 function shell(){
  const page=el('timeline'),surface=page?.querySelector('.surface');if(!surface)return null;
  if(el(ID))return el(ID);
  ensureStyle();surface.classList.add('hhTruthSurface');
  surface.innerHTML='<div class="hhTruthRoot" id="'+ID+'">'+
   '<div class="hhTruthHeadline"><div><strong>🧭 Idővonal · tényleges események</strong><small id="hhTruthProfile725"></small></div>'+
   '<button type="button" class="hhTruthRefresh" id="hhTruthReload725">↻ Frissítés</button></div>'+
   '<div class="hhTruthModes" id="hhTruthModes725">'+
   '<button data-mode="1" aria-pressed="true">Ma</button><button data-mode="7" aria-pressed="false">7 nap</button>'+
   '<button data-mode="30" aria-pressed="false">30 nap</button><button data-mode="custom" aria-pressed="false">Dátum</button></div>'+
   '<label class="hhTruthCustom" id="hhTruthDateWrap725" hidden>Választott nap <input type="date" id="hhTruthDate725"></label>'+
   '<div class="hhTruthFilters" id="hhTruthFilters725"><button data-kind="all" aria-pressed="true">Mind</button>'+
   '<button data-kind="nutrition" aria-pressed="false">🍽️ Táplálkozás</button>'+
   '<button data-kind="symptom" aria-pressed="false">🩺 Tünetek</button>'+
   '<button data-kind="medical" aria-pressed="false">📄 Leletek</button>'+
   '<button data-kind="activity" aria-pressed="false">👣 Aktivitás</button>'+
   '<button data-kind="observation" aria-pressed="false">🧪 Megfigyelések</button></div>'+
   '<div class="hhTruthStatsTitle" id="hhTruthStatsTitle725"></div>'+
   '<div class="hhTruthStats" id="hhTruthStats725"></div>'+
   '<div class="hhTruthSources" id="hhTruthSources725" role="status" aria-live="polite"></div>'+
   '<div class="hhTruthFeed" id="hhTruthFeed725"></div>'+
   '<p class="hhTruthWarning">Csak dátumhoz és forráshoz köthető adatok látszanak. A hiányzó alvás-, pulzus- és vérnyomásméréseket nem pótoljuk mintaértékekkel.</p>'+
   '</div>';
  state.filter='all';
  const root=el(ID);
  root.querySelector('#hhTruthModes725').addEventListener('click',e=>{
   const b=e.target.closest('button[data-mode]');if(!b)return;state.mode=b.dataset.mode;draw();
  });
  root.querySelector('#hhTruthFilters725').addEventListener('click',e=>{
   const b=e.target.closest('button[data-kind]');if(!b)return;state.filter=b.dataset.kind;draw();
  });
  el('hhTruthDate725').addEventListener('change',e=>{state.day=e.target.value;state.mode='custom';draw()});
  el('hhTruthReload725').addEventListener('click',()=>refresh(true));
  return root;
 }
 function draw(){
  const root=shell();if(!root)return;
  const today=localDay(nowDate());if(!state.day||state.day>today)state.day=today;
  const p=pkey();el('hhTruthProfile725').textContent=name(p)+' · '+(state.mode==='1'?'mai':state.mode==='7'?'heti':state.mode==='30'?'30 napos':'választott napi')+' napló';
  root.querySelectorAll('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
  root.querySelectorAll('button[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===state.filter)));
  el('hhTruthDateWrap725').hidden=state.mode!=='custom';
  const date=el('hhTruthDate725');date.max=today;date.value=state.day;
  const selected=limitRange(records.filter(x=>x.profile===p),state.mode,state.day,nowDate());
  const filtered=selected.filter(x=>state.filter==='all'||x.kind===state.filter);
  const cards=statCards(filtered,state.filter);
  const activeFilter=[['all','Összes'],['nutrition','Táplálkozás'],['symptom','Tünetek'],
    ['medical','Leletek'],['activity','Aktivitás'],['observation','Megfigyelések']]
    .find(x=>x[0]===state.filter)?.[1]||'Összes';
  el('hhTruthStatsTitle725').textContent='Összesítés · '+activeFilter+' · '+(state.mode==='1'?'Ma':state.mode==='7'?'7 nap':state.mode==='30'?'30 nap':state.day);
  el('hhTruthStats725').innerHTML=cards.map(c=>
   '<div class="hhTruthStat"><b>'+esc(c.value)+'</b><small>'+esc(c.label)+'</small></div>').join('');
  const s=sourceStatus,notes=[
   'Nutrition: '+(s.nutrition||'ellenőrzésre vár'),
   'Tünetnapló: '+(s.symptoms||'ellenőrzésre vár'),
   'Leletek: '+(s.medical||'ellenőrzésre vár'),
   'Activity: '+(s.activity||'nem betöltött')
  ];
  el('hhTruthSources725').textContent=notes.join(' · ');
  const byDate=new Map();
  for(const x of filtered){if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x);}
  const output=[];
  byDate.forEach((rows,day)=>{
   output.push('<div class="hhTruthGroupTitle">'+esc(day===''+today?'Ma · '+day:day)+'</div>');
   let observationsRendered=false;
   for(const x of rows){
    if(x.kind==='observation'){
     if(!observationsRendered){output.push(observationGroup(rows.filter(row=>row.kind==='observation')));observationsRendered=true;}
     continue;
    }
    const metric=x.kind==='nutrition'
     ?(x.kcal===null?'Tápérték nincs rögzítve':fmt(x.kcal)+' kcal')
     :(x.kind==='symptom'&&x.severity!==null?'Erősség: '+fmt(x.severity)+'/10':x.kind==='activity'?x.quantity:'');
    const desc=x.kind==='nutrition'?[x.meal,x.quantity].filter(Boolean).join(' · '):
     x.kind==='activity'?'Napi összesítés · pontos óra nincs':
     x.kind==='observation'?[x.quantity,x.note].filter(Boolean).join(' · '):x.quantity||'';
    output.push('<article class="hhTruthEvent'+(x.kind==='symptom'?' hhSJTimelineEvent':'')+'"'+(x.symptomId?' data-symptom-id="'+esc(x.symptomId)+'"':'')+'>'+
     '<span class="hhTruthTime">'+esc(x.time||'nap')+'</span><span class="hhTruthIcon">'+esc(x.icon)+'</span>'+
     '<div class="hhTruthCard"><strong>'+esc(x.title)+'</strong>'+
     (desc?'<small>'+esc(desc)+'</small>':'')+
     (metric?'<span class="hhTruthMetric">'+esc(metric)+'</span>':'')+
     '<span class="hhTruthSource">'+esc(x.source)+(x.proof?' · '+esc(x.proof):'')+'</span></div></article>');
   }
  });
  el('hhTruthFeed725').innerHTML=output.join('')||
    '<div class="hhTruthEmpty">'+(loaded?'Erre az időszakra nincs igazolt, naplózott esemény a megjelenített forrásokból.':'Ellenőrzött adatok betöltése…')+'</div>';
 }
 function mergeViews(p,packages){
  return dedupe([
   ...nutritionRows(packages.nutrition,p),
   ...bodyRows(packages.nutrition,p),
   ...symptomRows(packages.symptoms,p),
   ...reportRows(packages.medical,p),
   ...activityRows(p)
  ]);
 }
 async function refresh(force){
  const page=el('timeline');if(!page)return;
  shell();
  const p=pkey(),run=++sequence;profile=p;
  const localN=localNutrition(p),localS=localSymptoms();
  const a=activityRows(p);
  sourceStatus={nutrition:localN?'helyi mentés':'helyben nincs adat',
   symptoms:localS?'helyi mentés':'helyben nincs adat',
   medical:'Dropbox ellenőrzése',activity:a.length?'betöltött, mért napi összeg':'még nincs hiteles összeg betöltve'};
  records=mergeViews(p,{nutrition:localN,symptoms:localS,medical:null});loaded=!!(localN||localS||a.length);
  draw();lastFetch=Date.now();
  const v=vault();
  if(!v){sourceStatus.medical='Dropbox nincs csatlakoztatva';
   sourceStatus.nutrition=localN?'csak helyi napló':'Dropbox nincs csatlakoztatva';
   sourceStatus.symptoms=localS?'csak helyi napló':'Dropbox nincs csatlakoztatva';
   draw();return;
  }
  const load=async path=>{try{return await v.downloadJson(path)}catch(e){if(e&&(e.status===404||e.status===409))return null;throw e;}};
  const remote=await Promise.allSettled([
   load('/HealthHub/profiles/'+p+'-nutrition.json'),
   load('/HealthHub/master/symptoms.json'),
   load('/HealthHub/master/documents.json')
  ]);
  if(run!==sequence||p!==pkey())return;
  const nut=remote[0].status==='fulfilled'?remote[0].value:null,
        sym=remote[1].status==='fulfilled'?remote[1].value:null,
        med=remote[2].status==='fulfilled'?remote[2].value:null;
  // Strict schema and identity checks; incompatible packages never replace local truth.
  const remoteN=liveNutrition(nut,p)?nut:null;
  const mergedN=localN||remoteN?{schemaVersion:'healthhub.nutrition/1',profileKey:p,
   entries:byId(localN?.entries,remoteN?.entries),body:byId(localN?.body,remoteN?.body)}:null;
  const remoteS=liveSymptoms(sym)?sym:null;
  const mergedS=localS||remoteS?{events:byId(localS?.events,remoteS?.events)}:null;
  const remoteM=med&&med.schema==='healthhub.master.documents/1'&&Array.isArray(med.documents)?med:null;
  sourceStatus={
   nutrition:remote[0].status==='rejected'?'Dropbox hiba · '+(localN?'csak helyi adatok':'nincs adat'):
    remoteN?'Dropbox + helyi napló':nut?'forrásséma/profil eltér · '+(localN?'csak helyi':'nem olvasható'):localN?'helyi napló':'nincs napló',
   symptoms:remote[1].status==='rejected'?'Dropbox hiba · '+(localS?'csak helyi adatok':'nincs adat'):
    remoteS?'Dropbox + helyi napló':sym?'forrásséma eltér':localS?'helyi napló':'nincs napló',
   medical:remote[2].status==='rejected'?'Dropbox olvasási hiba':remoteM?'Medical Master forrás · keltezett leletek':med?'forrásséma eltér':'nincs fájl',
   activity:a.length?'profilazonos Activity-adatok':'csak Activity megnyitása után'
  };
  records=mergeViews(p,{nutrition:mergedN,symptoms:mergedS,medical:remoteM});loaded=true;draw();
 }
 function active(){return !!el('timeline')?.classList.contains('on');}
 function onProfile(){if(active())refresh(false);else{sequence++;profile=null;records=[];}}
  w.HH_TIMELINE_TRUTH_V725={version:'725',refresh,profile:pkey,model:{
   nutritionRows,bodyRows,symptomRows,reportRows,activityRows,limitRange,nutritionSummary,statCards,observationRag,observationGroup,byId,dedupe,liveNutrition,liveSymptoms
  }};
 function decorate(){
  shell();
  if(active())refresh(false);
  const original=w.show;
  if(typeof original==='function'&&!original.__hhTruth725){
   const wrapper=function(page){const result=original.apply(this,arguments);
    if(page==='timeline')setTimeout(()=>{if(profile!==pkey()||Date.now()-lastFetch>1200)refresh(false)},0);return result;};
   wrapper.__hhTruth725=true;w.show=wrapper;
  }
  const obs=new MutationObserver(mutations=>{
   if(mutations.some(m=>m.attributeName==='class')&&active()&&(profile!==pkey()||Date.now()-lastFetch>45000))refresh(false);
  });
  obs.observe(el('timeline'),{attributes:true,attributeFilter:['class']});
  w.addEventListener('healthhub:profile-changed',onProfile);
  w.addEventListener('healthhub:nutrition-updated',()=>{if(active())refresh(false)});
  w.addEventListener('healthhub:symptom-saved',()=>{if(active())refresh(false)});
  w.addEventListener('healthhub:symptom-changed',()=>{if(active())refresh(false)});
  w.addEventListener('healthhub:master-vault-synced',()=>{if(active())refresh(false)});
  w.addEventListener('storage',e=>{if(e.key==='hh-profile')onProfile();
   else if(e.key===NUTRITION+pkey()||e.key===SYMPTOMS){if(active())refresh(false)}});
  d.addEventListener('visibilitychange',()=>{if(!d.hidden&&active()&&Date.now()-lastFetch>30000)refresh(false)});
  w.addEventListener('focus',()=>{if(active()&&Date.now()-lastFetch>45000)refresh(false)});

 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})(window,document);
