/* Léna Recept Stúdió v1155 · Golden Standard Nutri Info.
 * Existing recipe nutrition backfill and automatic new-Golden-card nutrition.
 * Uses the current signed-in Puter account. No fake precise cooked weights:
 * an AI-predicted finished yield is marked 'ai_estimate', manually weighed
 * values remain 'measured'. No AI call occurs merely by loading this script.
 */
(function(w,d){
'use strict';
const api=()=>w.LENA_NUTRI_STANDARD_CONTEXT_V1155;
const byId=id=>d.getElementById(id);
let running=false,stopRequested=false;
const required=['kcal','protein_g','carbs_g','fat_g'];
// v1157: Before an AI call, check the official remaining monthly allowance.
// Puter owns the native upgrade dialog; this prevents repeated denied calls,
// it does not conceal billing information or pretend AI output was created.
const MIN_AI_REMAINING_MICROCENTS=5000000; // $0.05 safety buffer
async function guardPuterBudget(){
 // v1159 local-first gate is authoritative even if monthly usage cannot be read.
 const gate=w.LENA_PUTER_CREDIT_GATE_V1159;
 if(gate&&!await gate.permit())throw new Error('A Puter kerete alacsony vagy nem ellenőrizhető; AI-generálás kihagyva, a recept helyben menthető.');
 const c=api();
 if(typeof c?.getMonthlyUsage!=='function')return;
 let usage;
 try{usage=await c.getMonthlyUsage()}catch(e){
  console.warn('Puter usage check unavailable; keeping normal SDK billing enforcement',e);
  return;
 }
 const remaining=usage?.allowanceInfo?.remaining;
 if(!Number.isFinite(remaining)||remaining>=MIN_AI_REMAINING_MICROCENTS)return;
 const e=new Error('A Puter AI-keret alacsony ('+Math.max(0,Math.round(remaining/1000000))+' cent). A generálás a számlázási felugrók ismétlődésének megelőzésére megállt. A korábban mentett receptek megmaradnak.');
 e.code='low_balance_guard';
 throw e;
}
function isCreditFailure(e){
 const value=String(e?.code||'')+' '+String(e?.message||e||'');
 return /insufficient[_ -]?funds|low.?balance|low_balance_guard|monthly.?(credit|balance)|not.enough.credit|billing.hard.limit|quota.exhausted/i.test(value);
}
const numeric=(v,min,max)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
const round=(v,digits=1)=>Math.round(Number(v)*10**digits)/10**digits;
const servingsMatch=s=>String(s||'').trim().match(/^(\d{1,3})\s*(fő|fo|adag|személy|szemely|darab|db|stangli|szelet|pohár|pohar)$/iu);
const hasMacro=n=>!!n?.perServing&&required.every(k=>numeric(n.perServing[k],k==='kcal'?0.1:0,k==='kcal'?5000:1000));
const hasWeight=n=>Number.isInteger(Number(n?.finishedWeightGrams))&&Number(n.finishedWeightGrams)>=50&&Number(n.finishedWeightGrams)<=50000;
const ready=n=>hasMacro(n)&&hasWeight(n)&&!!servingsMatch(n.servings);
function signature(id){
 const c=api(),r=c?.getRecipe(id),read=c?.getReadable(id);
 if(!r||!read)return'';
 const servings=String(r.studioData?.servings||c.recipeServingText(id,read)||'').trim().toLowerCase();
 return JSON.stringify({servings,ingredients:(read.ingredients||[]).map(s=>String(s).trim().toLowerCase())});
}
function supported(id){
 const c=api(),r=c?.getRecipe(id),read=c?.getReadable(id);
 return !!r&&!r.deleted&&read?.status==='verified'&&Array.isArray(read.ingredients)&&read.ingredients.length>0;
}
function needs(id){
 if(!supported(id))return false;
 const c=api(),n=c.getNutrition(id),sig=signature(id);
 if(!ready(n))return true;
 // Legacy records with no signature are preserved, especially manually weighed.
 return !!n.ingredientsSignature&&n.ingredientsSignature!==sig;
}
function stats(){
 const c=api();if(!c)return {total:0,ready:0,missing:0,unstructured:0};
 let total=0,complete=0,missing=0,unstructured=0;
 for(const r of c.allRecipes().filter(r=>!r.deleted)){
  total++;
  if(!supported(r.id))unstructured++;
  else if(needs(r.id))missing++;
  else complete++;
 }
 return {total,ready:complete,missing,unstructured};
}
function status(text,bad=false){
 const el=byId('nutriBulkStatusV1155');if(!el)return;
 el.textContent=text;el.dataset.error=bad?'true':'false';
}
function refresh(){
 const s=stats(),el=byId('nutriBulkCountsV1155');
 if(el)el.textContent=s.total+' recept · '+s.ready+' kész · '+s.missing+' pótlásra vár'+(s.unstructured?' · '+s.unstructured+' előkészítendő':'');
 const start=byId('nutriBulkStartV1155');
 if(start)start.disabled=running||s.missing===0;
 const stop=byId('nutriBulkStopV1155');
 if(stop)stop.hidden=!running;
 return s;
}
function recipeServings(r,read){
 const fromStudio=String(r.studioData?.servings||'').trim();
 if(servingsMatch(fromStudio))return fromStudio;
 for(const note of read.notes||[]){
  const m=String(note).match(/\b(\d{1,3})\s*(?:fő|fo|adag|személy|szemely|darab|db|stangli|szelet)\b/iu);
  if(m)return m[0];
 }
 return null;
}
function makePrompt(id,mode){
 const c=api(),r=c.getRecipe(id),read=c.getReadable(id),old=c.getNutrition(id);
 const listedServings=recipeServings(r,read);
 return [
  'Magyar élelmiszer-tápérték becslő vagy. Az alábbi recept hozzávalói alapján készíts reális, óvatos becslést.',
  'A teljes elkészült fogás tömegét grammban becsüld, a főzés/sütés vízvesztését, vízfelvételét és a hozzáadott folyadékot is figyelembe véve.',
  'Az opcionális hozzávalókat alaphelyzetben NE számold bele. Ha a mennyiségek hiányoznak, használj tipikus mennyiséget és írd le a bizonytalanságot.',
  'A súly soha nem mért adat. A felhasználó később mérleggel pontosíthatja.',
  'Ha a teljes készétel tömege nem becsülhető ésszerűen, finishedWeightGrams legyen null.',
  'A servings mező legyen EGY konkrét egész szám és egy megnevezés, pl. "4 fő", "8 szelet", "12 darab", tartományt ne adj.',
  'Válaszod KIZÁRÓLAG JSON, markdown nélkül.',
  mode==='yield'
   ?'JSON séma: {"servings":"4 fő","finishedWeightGrams":1200,"weightConfidence":"low","uncertaintyNotes":"..."}'
   :'JSON séma: {"servings":"4 fő","perServing":{"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0},"finishedWeightGrams":1200,"weightConfidence":"low","uncertaintyNotes":"..."}',
  'Recept: '+r.title,
  'Kategória: '+r.category,
  'Recept szerinti adagok: '+(listedServings||'nincs egyértelműen megadva: becsüld meg, és jelezd'),
  mode==='yield'&&old?.servings?'Korábbi Nutri Info adagjelölés: '+old.servings:'',
  'Hozzávalók: '+read.ingredients.slice(0,75).join(' | '),
  'Elkészítés: '+(read.steps||[]).slice(0,20).join(' | ')
 ].filter(Boolean).join('\n');
}
function normalizeEstimation(raw,id,mode,opts={}){
 const c=api(),r=c.getRecipe(id),old=c.getNutrition(id),read=c.getReadable(id);
 const s=String((mode==='yield'&&servingsMatch(old?.servings)?old.servings:null)||recipeServings(r,read)||raw?.servings||'').trim();
 if(!servingsMatch(s))throw Error('Az adagok száma nem értelmezhető.');
 const estimateWeight=raw?.finishedWeightGrams;
 const weight= numeric(estimateWeight,50,50000)&&Number.isInteger(Number(estimateWeight))?Number(estimateWeight):null;
 const p=mode==='yield'&&hasMacro(old)?old.perServing:raw?.perServing;
 if(!p||!required.every(k=>numeric(p[k],k==='kcal'?0.1:0,k==='kcal'?5000:1000)))
  throw Error('A generált energia vagy makrotápérték hiányos.');
 const perServing={
  kcal:round(p.kcal,0),protein_g:round(p.protein_g),carbs_g:round(p.carbs_g),
  fat_g:round(p.fat_g),fiber_g:numeric(p.fiber_g,0,1000)?round(p.fiber_g):null
 };
 if(perServing.kcal<=0)throw Error('Nulla kalóriájú receptbecslést nem mentünk.');
 const gramsExisting=hasWeight(old)&&old.weightSource==='measured'
  &&!opts.ingredientsChanged&&(!old.ingredientsSignature||old.ingredientsSignature===signature(id));
 // Never downgrade a measured finished yield to an AI suggestion.
 const mass=gramsExisting?Number(old.finishedWeightGrams):weight;
 const weightSource=gramsExisting?'measured':mass==null?'missing':'ai_estimate';
 return {
  id,title:r.title,servings:s,
  perServing,finishedWeightGrams:mass,weightSource,
  weightConfidence:gramsExisting?'measured':String(raw?.weightConfidence||'low').slice(0,24),
  uncertaintyNotes:String(raw?.uncertaintyNotes||'AI becslés. A készétel tömege mérleggel pontosítható.').slice(0,300),
  ingredientsSignature:signature(id),
  updatedAt:new Date().toISOString(),source:'ai_estimate',
  nutriStandardVersion:1155
 };
}
async function generateOne(id,opts={}){
 const c=api();
 if(!c||!supported(id))throw Error('Ehhez a recepthez még ellenőrzött, strukturált hozzávalók szükségesek.');
 const old=c.getNutrition(id);
 if(!opts.force&&!needs(id))return {ok:true,skipped:true,record:old};
 await c.ensureSignedIn();
 if(!c.puterAvailable())throw Error('A Puter Nutri Info AI nem érhető el.');
 await guardPuterBudget();
 const mode=!opts.ingredientsChanged&&hasMacro(old)&&!hasWeight(old)&&(!old.ingredientsSignature||old.ingredientsSignature===signature(id))?'yield':'full';
 const raw=await c.chatNutrition(makePrompt(id,mode));
 const row=normalizeEstimation(raw,id,mode,opts);
 if(!row.finishedWeightGrams){
  // Save useful macros even when cooked yield is too uncertain, but keep it
  // explicitly not importable as a 320 g portion until measured.
  row.weightSource='missing';
 }
 await c.setCloudNutrition(id,row);
 const checked=await c.getCloudNutrition(id);
 if(!checked||checked.updatedAt!==row.updatedAt||checked.ingredientsSignature!==row.ingredientsSignature)
  throw Error('A Nutri Info Puter-felhőmentésének visszaellenőrzése sikertelen.');
 c.cacheNutrition(id,row);
 c.renderNutrition(id);
 refresh();
 return {ok:true,record:row,importable:ready(row)};
}
async function afterGoldenSave(id,options={}){
 try{
  await api().ensureSignedIn();
  const r=await generateOne(id,{force:!!options.ingredientsChanged,ingredientsChanged:!!options.ingredientsChanged});
  return {ok:true,record:r.record,skipped:r.skipped};
 }catch(e){console.warn('Golden Standard: Nutri Info később pótlandó',id,e);
  return {ok:false,reason:String(e?.message||e).slice(0,180)};
 }
}
async function batch(){
 if(running)return;
 const c=api();
 if(!c){status('A recepttár még nem töltődött be.',true);return;}
 running=true;stopRequested=false;refresh();
 let done=0,failed=0,consecutive=0,skipped=0,creditStopped=false;
 try{
  status('☁ Puter kapcsolat ellenőrzése és hiányzó Nutri Info előkészítése…');
  await c.ensureSignedIn();
  // Refresh cloud first. Existing data should not be regenerated just
  // because another device has already saved its version.
  await c.loadNutritionCache();
  const queue=c.allRecipes().filter(r=>!r.deleted&&needs(r.id));
  const total=queue.length;
  if(!total){status('✓ Minden strukturált receptnek már van Nutri Info és készétel-tömeg becslése.');return;}
  for(const [i,r] of queue.entries()){
   if(stopRequested){status('⏸ Megállítva. '+done+' mentve · '+failed+' hiba. Folytatáskor a mentetteket kihagyjuk.');break;}
   status('🥗 '+(i+1)+' / '+total+' · '+r.title+' · Nutri Info számítása…');
   try{
    const result=await generateOne(r.id);
    if(result.skipped)skipped++;else done++;
    consecutive=0;
   }catch(e){
    failed++;consecutive++;
    console.warn('Nutri Info batch',r.id,e);
    status('⚠ '+(i+1)+' / '+total+' · '+r.title+': '+String(e?.message||e).slice(0,100),true);
    if(isCreditFailure(e)){
     creditStopped=true;
     status('⚠ A Puter AI-keret elfogyott vagy túl alacsony. A további AI-hívásokat leállítottam, hogy ne ismétlődjön a számlázási figyelmeztetés. '+done+' recept kész; a többi később folytatható.',true);
     break;
    }
    if(consecutive>=3){status('⚠ Három egymást követő hiba miatt megállítottam. '+done+' recept mentve. Ellenőrizd a Puter AI keretét, majd folytatható.',true);break;}
   }
   await new Promise(resolve=>setTimeout(resolve,240));
  }
  if(!stopRequested&&!creditStopped&&consecutive<3){
   const s=refresh();
   status('✓ Feldolgozás kész · '+done+' új Nutri Info · '+skipped+' már kész · '+failed+' hiba · '+s.missing+' még hiányzik.'+(s.unstructured?' '+s.unstructured+' recept strukturálásra vár.':''));
  }
 }catch(e){
  status('⚠ A tömeges pótlás megszakadt: '+String(e?.message||e).slice(0,170),true);
 }finally{
  running=false;
  refresh();
 }
}
const start=byId('nutriBulkStartV1155'),stop=byId('nutriBulkStopV1155');
start?.addEventListener('click',()=>void batch());
stop?.addEventListener('click',()=>{stopRequested=true;status('⏸ Megállítás a most futó recept elkészülte után…');});
w.LENA_NUTRI_STANDARD_V1155=Object.freeze({version:1155,generateOne,afterGoldenSave,refresh,stats,needs,signature});
refresh();
})(window,document);
