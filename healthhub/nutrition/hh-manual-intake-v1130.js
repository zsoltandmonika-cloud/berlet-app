/* HealthHub Nutrition v1130 · Lightweight manual food entry.
 * Voice (HU), predictive input, user-reviewed AI estimate, personal/category/favorites,
 * optional shared Dropbox library and generated card images. No silent diary logging.
 */
(function(w,d){
'use strict';
if(w.HH_NUTRITION_MANUAL_V1130)return;
const $=id=>d.getElementById(id),api=()=>w.HH_NUTRITION_QUICK_API;
const KEYS=['kcal','protein','carbs','fat'];
const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
let session='',busy=false,known=[],matched=null,imageData='',recognition=null,aiPromise=null,aiEstimated=false;
const text=v=>String(v??'').trim().replace(/\s+/g,' ');
const lower=v=>text(v).toLocaleLowerCase('hu-HU');
const field=k=>$('hhManual'+k[0].toUpperCase()+k.slice(1)+'1130');
const tell=(message,error=false)=>{const e=$('hhManualStatus1130');if(e){e.textContent=message;e.dataset.error=String(error)}const b=$('hhManualActionFeedback1135');if(b){b.textContent=message;b.dataset.error=String(error);b.hidden=false}};
const num=(value,max)=>value===''||value===null||value===undefined?null:(Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=max?Number(value):NaN);
function amount(){
 const name=text($('hhManualName1130').value).slice(0,80),quantity=num($('hhManualQty1130').value,3000);
 const nutrients=Object.fromEntries(KEYS.map(k=>[k,num(field(k).value,k==='kcal'?5000:1000)]));
 if(name.length<2||quantity===null||Number.isNaN(quantity)||quantity<1||!MEALS.includes($('hhManualMeal1130').value))throw Error('Adj meg egy ételnevet, érvényes adagot és étkezést.');
 for(const k of KEYS)if(Number.isNaN(nutrients[k]))throw Error('Érvénytelen tápérték: '+k);
 return {expectedProfile:session,name,quantity,unit:$('hhManualUnit1130').value,meal:$('hhManualMeal1130').value,
 category:$('hhManualCategory1130').value,nutrients};
}
function clearImage(){imageData='';const img=$('hhManualPhoto1130');img.src='';img.hidden=true}
function invalidateNutrition(){
 if(aiEstimated||matched){for(const k of KEYS)field(k).value='';tell('Az étel vagy adag megváltozott. Frissítsd a tápértékbecslést.');}
 aiEstimated=false;matched=null;
}
function suggestions(){
 const items=api()?.getManualSuggestions?.()||[];
 const saved=api()?.getData?.()?.quickRecipes||[];
 const shared=w.HH_SHARED_FOOD_LIBRARY_V1118?.getItems?.()||[];
 known=[...items.map(x=>({...x,source:'catalog'})),
  ...saved.map(x=>({...x,source:'favorite',category:x.category,nutrients:x.nutrients})),
  ...shared.map(x=>({...x,source:'shared',category:x.categories?.[0],nutrients:x.nutrients}))];
 const box=$('hhManualNames1130');box.replaceChildren();
 const found=new Set();
 for(const item of known){const key=lower(item.name);if(key.length<2||found.has(key))continue;found.add(key);
  const o=d.createElement('option');o.value=item.name;box.append(o)}
 const categories=new Set(['Főételek','Reggeli','Édesség','Gyümölcs','Italok','Egyéb']);
 d.querySelectorAll('#hhQuickEditCategory option,#customCategory option').forEach(x=>categories.add(x.value||x.textContent));
 known.forEach(x=>{if(x.category)categories.add(x.category)});
 const s=$('hhManualCategory1130'),old=s.value;s.replaceChildren();
 for(const category of categories){const o=d.createElement('option');o.value=category;o.textContent=category;s.add(o)}
 s.value=categories.has(old)?old:'Főételek';
}
function showPredictions(){
 const box=$('hhManualSuggestions1130'),q=lower($('hhManualName1130').value);
 box.replaceChildren();
 if(q.length<2){box.hidden=true;return}
 const offered=new Set();
 for(const item of known){
  const name=text(item.name),key=lower(name);
  if(!key.includes(q)||offered.has(key))continue;
  offered.add(key);
  const button=d.createElement('button');button.type='button';button.textContent=name;
  button.addEventListener('click',()=>{
   invalidateNutrition();$('hhManualName1130').value=name;box.hidden=true;clearImage();predict();
  });
  box.append(button);
  if(offered.size===5)break;
 }
 box.hidden=!box.children.length;
}
function predict(){
 const item=known.find(x=>lower(x.name)===lower($('hhManualName1130').value));
 if(!item)return;
 $('hhManualSuggestions1130').hidden=true;
 const cat=$('hhManualCategory1130');
 if(item.category&&[...cat.options].some(o=>o.value===item.category))cat.value=item.category;
 if(item.source==='catalog'&&item.per100){
  matched=item;aiEstimated=false;const portion=Number($('hhManualQty1130').value);
  for(const k of KEYS)field(k).value=item.per100[k]==null?'':(Number(item.per100[k])*portion/100).toFixed(1);
  tell('📚 A meglévő élelmiszer tápértéke az adagra számolva. Ellenőrizd.');
 }else if(item.nutrients){
  matched=null;aiEstimated=false;for(const k of KEYS)field(k).value=item.nutrients[k]??'';
  tell('⭐ Mentett adag értékei betöltve. Más adagnál kérj új becslést.');
 }
}
function openLegacyManual(){
 if(!api()?.recordManualMeal)return w.alert('A kézi bevitel még nem töltődött be. Frissítsd az oldalt.');
 session=api().getProfile();matched=null;aiEstimated=false;busy=false;clearImage();
 $('hhManualForm1130').reset();$('hhManualQty1130').value='250';
 $('hhManualOwnPhoto1133').value='';
 const hour=new Date().getHours();
 $('hhManualMeal1130').value=hour<10?'Reggeli':hour<12?'Tízórai':hour<15?'Ebéd':hour<18?'Uzsonna':hour<21?'Vacsora':'Egyéb';
 $('hhManualFamilyWrap1130').hidden=!w.HH_NUTRITION_CLOUD_V626?.connected();
 suggestions();$('hhManualStatus1130').textContent='';const feedback=$('hhManualActionFeedback1135');feedback.textContent='';feedback.hidden=true;
 $('hhManualDialog1130').showModal();$('hhManualName1130').focus();
 w.HH_SHARED_FOOD_LIBRARY_V1118?.load?.().then(()=>{if($('hhManualDialog1130').open) suggestions()}).catch(()=>{});
}
function open(){
 // Quick Intake now opens the existing Favorites Studio add screen.
 // No separate checkboxes, duplicate form, or automatic diary write.
 const studio=w.HH_NUTRITION_FAVORITES_STUDIO_V1147;
 if(typeof studio?.openNewFavorite==='function'){
  studio.openNewFavorite();return;
 }
 // Fail visibly instead of opening a different form with unchecked favorites.
 const toast=$('hhManualToast1135');
 if(toast){toast.textContent='⚠ A Kedvencek hozzáadása még nem töltődött be. Frissítsd az oldalt.';
  toast.dataset.state='error';toast.hidden=false;}
 else w.alert('A Kedvencek szerkesztője nem érhető el. Frissítsd az oldalt.');
}

function speechResult(result){
 let phrase=text(result),remaining=phrase;
 const part=remaining.match(/(\d+(?:[.,]\d+)?)\s*(gramm|gr|g|dkg|deka|dekagramm|ml|milliliter)\b/i);
 if(part){
  const v=Number(part[1].replace(',','.'))*(/^(dkg|deka|dekagramm)$/i.test(part[2])?10:1);
  if(v>=1&&v<=3000)$('hhManualQty1130').value=v;
  $('hhManualUnit1130').value=/^(ml|milliliter)$/i.test(part[2])?'ml':'g';
  remaining=text(remaining.replace(part[0],''));
 }
 remaining=remaining.replace(/^(ettem|ittam|megettem|elfogyasztottam|kérek)\s+/i,'');
 remaining=remaining.replace(/^(reggelire|tízóraira|ebédre|uzsonnára|vacsorára)\s+(ettem|ittam)\s+/i,'$1 ');
 for(const [meal,pattern] of [['Reggeli',/^reggelire\s+/i],['Tízórai',/^tízóraira\s+/i],
  ['Ebéd',/^ebédre\s+/i],['Uzsonna',/^uzsonnára\s+/i],['Vacsora',/^vacsorára\s+/i]]){
  if(pattern.test(remaining)){$('hhManualMeal1130').value=meal;remaining=text(remaining.replace(pattern,''));break}
 }
 invalidateNutrition();$('hhManualName1130').value=(remaining||phrase).slice(0,80);predict();
 tell('🎤 Felismertem. Ellenőrizd az étel nevét és adagját.');
}
function voice(){
 const C=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!C){$('hhManualName1130').focus();return tell('A böngésző hangfelismerése nem elérhető. Használd a Samsung-billentyűzet mikrofonját.')}
 if(recognition){recognition.stop();return}
 recognition=new C();recognition.lang='hu-HU';recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onresult=e=>speechResult(e.results[0][0].transcript);
 recognition.onerror=e=>tell('🎤 '+e.error+'. Próbáld a billentyűzet mikrofonját.',true);
 recognition.onend=()=>{recognition=null;$('hhManualVoice1130').textContent='🎤'};
 $('hhManualVoice1130').textContent='⏹';tell('🎤 Figyelek. Például: „250 gramm rakott krumpli”.');
 try{recognition.start()}catch(e){recognition=null;$('hhManualVoice1130').textContent='🎤';tell(String(e.message||e),true)}
}
/* v1133 · use the same Puter SDK instance as AI Scan, without requiring a model-catalog call. */
function provider(){
 if(w.puter?.ai?.chat)return Promise.resolve(w.puter);
 if(aiPromise)return aiPromise;
 aiPromise=new Promise((resolve,reject)=>{
  let tries=0,finished=false;
  const check=(err)=>{
   if(finished)return;
   if(err){finished=true;reject(err);return}
   if(w.puter?.ai?.chat){finished=true;resolve(w.puter);return}
   if(++tries>150){finished=true;reject(Error('Puter szolgáltatás nem indult el; ellenőrizd a hálózatot és a bejelentkezést.'));return}
   setTimeout(check,200);
  };
  if([...d.scripts].some(s=>s.src?.includes('js.puter.com/v2/'))){check();return}
  const script=d.createElement('script');script.src='https://js.puter.com/v2/';script.async=true;
  script.onload=()=>check();script.onerror=()=>check(Error('A Puter AI nem tölthető be.'));
  d.head.append(script);
 }).catch(e=>{aiPromise=null;throw e});
 return aiPromise;
}
function readableAIError(e){
 const raw=String(e?.message||e?.code||e||'ismeretlen hiba');
 if(/insufficient.fund|credit|balance|payment|quota/i.test(raw))
  return 'A Puter AI-keret nem elegendő. Ellenőrizd a Puter fiókot; a kézi mentés továbbra is működik.';
 if(/auth|login|unauthori|popup.block|sign.?in/i.test(raw))
  return 'Puter bejelentkezés vagy felugró ablak engedélyezése szükséges. '+raw.slice(0,85);
 return raw.slice(0,230);
}
function extract(result){
 const raw=typeof result==='string'?result:typeof result?.message?.content==='string'?result.message.content:
  Array.isArray(result?.message?.content)?result.message.content.map(x=>x.text||'').join(''):String(result?.text||'');
 const from=raw.indexOf('{'),to=raw.lastIndexOf('}');
 if(from<0||to<=from)throw Error('Az AI nem adott értelmezhető becslést.');
 const obj=JSON.parse(raw.slice(from,to+1)),out={};
 for(const k of KEYS){const n=num(obj[k],k==='kcal'?5000:1000);
  if(n===null||Number.isNaN(n))throw Error('A '+k+' becslése hiányzik.');
  out[k]=Math.round(n*10)/10;
 }
 return {out,note:text(obj.note).slice(0,170)};
}
/* Text-only estimate uses documented Puter chat signatures, no listModels dependency. */
async function estimate(){
 if(busy)return;
 let info;try{info=amount()}catch(e){return tell(e.message,true)}
 const started=session,originalName=info.name,originalAmount=info.quantity;
 busy=true;$('hhManualEstimate1130').disabled=true;
 tell('✨ Léna AI-becslés indítása · '+info.name+' · '+info.quantity+' '+info.unit+'…');
 try{
  const p=await provider();
  const prompt=[
   'Magyar nyelvű, óvatos étkezési tápértékbecslést készítesz.',
   'Csak egy érvényes JSON objektumot adj vissza: {"kcal":250,"protein":10,"carbs":35,"fat":8,"note":"becslési bizonytalanság"}',
   'Az adatok a teljes megadott adagra vonatkoznak, NEM 100 g-ra.',
   'Étel: '+info.name+'. Adag: '+info.quantity+' '+info.unit+'.',
   'Nincs ismert recept vagy hozzávalólista. A note mezőben jelezd a fő bizonytalanságot.',
   'Ne tegyél úgy, mintha mért érték lenne, ne adj egészségügyi tanácsot.',
   'Ha az adat nem becsülhető, az értéket null-ként add meg.'
  ].join('\n');
  let response;
  try{response=await p.ai.chat(prompt,{model:'gpt-5.4-nano',normalize:true,max_tokens:400})}
  catch(first){
   const reason=String(first?.message||first?.code||first);
   if(/insufficient.fund|credit|balance|payment|auth|login|popup.block/i.test(reason))throw first;
   // A different supported model can recover from a provider/model outage. Never silently fabricate values.
   try{response=await p.ai.chat(prompt,{normalize:true,max_tokens:400})}
   catch(second){throw Error('Első modell: '+reason.slice(0,100)+' · Második: '+String(second?.message||second?.code||second).slice(0,115))}
  }
  const result=extract(response);
  if(started!==api()?.getProfile()||!$('hhManualDialog1130').open||
     text($('hhManualName1130').value)!==originalName||Number($('hhManualQty1130').value)!==originalAmount)
   throw Error('A profil, az étel vagy az adag módosult. Kérj új becslést.');
  matched=null;aiEstimated=true;
  for(const [k,v]of Object.entries(result.out))field(k).value=v;
  tell('✓ AI becslés elkészült (nem mérés). '+(result.note||'Ellenőrizd a tápértékeket és az adagot.'));
 }catch(e){tell('⚠ AI-becslés sikertelen: '+readableAIError(e),true)}
 finally{busy=false;$('hhManualEstimate1130').disabled=false}
}
async function image(){
 if(busy)return;let info;
 try{info=amount()}catch(e){return tell(e.message,true)}
 const profile=session;busy=true;$('hhManualImage1130').disabled=true;
 tell('✨ Léna ételkártyaképet generál…');
 try{
  const library=w.HH_SHARED_FOOD_LIBRARY_V1118;
  if(!library?.generateCardImage)throw Error('A képgeneráló Stúdió nem érhető el.');
  const data=await library.generateCardImage({name:info.name,kind:info.unit==='ml'?'drink':'food'});
  if(profile!==api()?.getProfile()||text($('hhManualName1130').value)!==info.name||!$('hhManualDialog1130').open)
   throw Error('Az étel vagy a profil közben megváltozott.');
  imageData=data;const pic=$('hhManualPhoto1130');pic.src=data;pic.hidden=false;
  tell('✓ Kártyakép elkészült. Tartós képtároláshoz Dropbox-kapcsolat szükséges.');
 }catch(e){tell('⚠ AI-kép sikertelen: '+readableAIError(e)+' · Választhatsz saját fotót is.',true)}
 finally{busy=false;$('hhManualImage1130').disabled=false}
}
const newId=()=> 'quick:manual-'+(w.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi,'').slice(0,54);
/* v1131 · Diary is PRIMARY. A favorite/category/photo failure must never cancel a food log. */
async function save(e){
 e?.preventDefault?.();
 if(busy){tell('A mentés már folyamatban van.');return}
 let info;
 try{info=amount()}catch(err){return tell('⚠ Nincs mentés: '+String(err.message||err),true)}
 const food=$('hhManualSaveFood1130').checked,favorite=$('hhManualFavorite1130').checked,
  family=$('hhManualFamily1130').checked,photo=imageData;
 const submit=$('hhManualSubmit1130'),launch=$('hhManualLaunch1130'),
  notice=$('hhManualDiaryNotice1131');
 busy=true;submit.disabled=true;launch.disabled=true;
 tell('📒 Mentés a Napi naplóba…');
 let result;
 try{
  if(info.expectedProfile!==api()?.getProfile())throw Error('A profil közben megváltozott.');
  result=api().recordManualMeal(info);
  if(!result?.id||result.profile!==info.expectedProfile)throw Error('A napló visszaigazolása hiányzik.');
 }catch(err){
  tell('⚠ NEM MENTETTEM: '+String(err?.message||err).slice(0,215),true);
  busy=false;submit.disabled=false;launch.disabled=false;
  return;
 }
 // This point is reached only when the canonical diary API returned a saved record.
 $('hhManualDialog1130').close();clearImage();
 const profileName=info.expectedProfile==='monika'?'Mónika':'Zsolt';
 const base='✓ '+info.name+' · '+info.quantity+' '+info.unit+' · '+info.meal+
   ' a Napi naplóba mentve ('+profileName+').';
 notice.hidden=false;notice.dataset.state='saved';notice.textContent='🎉 TADAAA! '+base;
 const toast=$('hhManualToast1135');if(toast){toast.textContent='🎉 TADAAA! '+info.name+' · '+info.quantity+' '+info.unit+' naplózva';toast.hidden=false;toast.dataset.state='saved';w.setTimeout?.(()=>{toast.hidden=true},5200)}
 // v1137: the TADAAA sound is emitted only after the canonical diary API confirms success.
 try{w.dispatchEvent(new CustomEvent('hh:nutrition:manual-saved',{
  detail:{profile:info.expectedProfile,name:info.name,entryId:result.id}
 }))}catch(_){/* Sound/celebration is optional and never blocks a saved entry. */}
 const row=d.querySelector('#log .entry[data-entry-id="'+result.id+'"]');
 if(row){
  row.classList.add('hh-manual-saved-row-v1131');
  row.scrollIntoView({behavior:'smooth',block:'center'});
 }else $('log')?.scrollIntoView({behavior:'smooth',block:'start'});
 const completed=[],warnings=[];
 try{
  if(family&&!food&&!favorite)warnings.push('A családi ételtárhoz jelöld be a kategóriát vagy a Kedvenceket.');
  else if((food||favorite)&&info.nutrients.kcal===null)
   warnings.push('A kategóriába/Kedvencekhez külön mentés nem történt meg: előbb kcal-adat vagy AI-becslés szükséges.');
  else if(family&&!w.HH_NUTRITION_CLOUD_V626?.connected())
   warnings.push('A közös ételtár nem mentődött: a Dropbox nincs csatlakoztatva.');
  else if(family&&(food||favorite)&&KEYS.some(k=>info.nutrients[k]===null))
   warnings.push('A közös ételtárhoz négy tápérték kell. A napló már megvan.');
  else if(food||favorite){
   let ref=null;
   if(photo){
    const vault=w.HH_NUTRITION_IMAGE_V641;
    if(vault?.connected()){
     try{ref=await vault.save(family?'shared':info.expectedProfile,photo)}
     catch(err){warnings.push('A fotó nem töltődött fel: '+String(err.message||err).slice(0,90))}
    }else warnings.push('A kártyaképhez Dropbox szükséges; a szöveges mentést folytatom.');
   }
   if(info.expectedProfile!==api()?.getProfile())throw Error('Profilváltás miatt a gyűjteménybe mentés megszakadt. A napló megmaradt.');
   if(family){
    try{
     const lib=w.HH_SHARED_FOOD_LIBRARY_V1118;
     if(!lib?.upsert)throw Error('A közös ételtár nem elérhető.');
     await lib.upsert({name:info.name,categories:food?[info.category]:[],
      favorite,kind:info.unit==='ml'?'drink':'food',meal:info.meal,
      nutrients:info.nutrients,imageRef:ref,description:info.quantity+' '+info.unit+' · kézi bevitel',
      ingredients:'1 mentett adag: '+info.quantity+' '+info.unit});
     completed.push('közös családi ételtár');
    }catch(err){warnings.push('A közös ételtár nem mentődött: '+String(err.message||err).slice(0,110))}
   }else{
    if(food){
     try{api().saveManualFood({...info,imageRef:ref});completed.push('saját ételkategória')}
     catch(err){warnings.push('A saját ételkategória nem mentődött: '+String(err.message||err).slice(0,110))}
    }
    if(favorite){
     try{
      api().saveRecipe({id:newId(),name:info.name,category:info.category,
       meal:info.meal,kind:info.unit==='ml'?'drink':'food',icon:info.unit==='ml'?'🥤':'🍽️',
       theme:'meal',description:info.quantity+' '+info.unit+' · saját adag',
       ingredients:'Kézi bevitel',nutrients:info.nutrients,order:700,
       volumeMl:info.unit==='ml'?info.quantity:null,imageRef:ref,archived:false});
      completed.push('Kedvencek');
     }catch(err){warnings.push('A Kedvencekhez nem mentődött: '+String(err.message||err).slice(0,110))}
    }
   }
  }
 }catch(err){warnings.push(String(err.message||err).slice(0,175))}
 finally{
  if(completed.length)notice.textContent='🎉 TADAAA! '+base+' + Mentve: '+completed.join(', ')+'.';
  if(warnings.length){notice.textContent+=' ⚠ '+warnings.join(' ');notice.dataset.state='partial'}
  busy=false;submit.disabled=false;launch.disabled=false;
 }
}
function init(){
 if(!$('hhManualLaunch1130')||!api()?.recordManualMeal)return;
 $('hhManualLaunch1130').addEventListener('click',open);
 $('hhBalanceQuickAdd1139')?.addEventListener('click',()=>{
  const heading=$('hhNutritionQuickHeadingV1144');
  if(!heading)return;
  heading.scrollIntoView({behavior:w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});
 });
 $('hhManualClose1130').addEventListener('click',()=>$('hhManualDialog1130').close());
 $('hhManualVoice1130').addEventListener('click',voice);
 $('hhManualName1130').addEventListener('change',()=>{clearImage();predict()});
 $('hhManualName1130').addEventListener('input',()=>{invalidateNutrition();clearImage();showPredictions()});
 $('hhManualQty1130').addEventListener('change',()=>{if(matched)predict();else invalidateNutrition()});
 $('hhManualUnit1130').addEventListener('change',invalidateNutrition);
 for(const k of KEYS)field(k).addEventListener('input',()=>{aiEstimated=false;matched=null});
 $('hhManualEstimate1130').addEventListener('click',estimate);
 $('hhManualImage1130').addEventListener('click',image);
 $('hhManualOwnPhotoBtn1133').addEventListener('click',()=>$('hhManualOwnPhoto1133').click());
 $('hhManualOwnPhoto1133').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>9*1024*1024)
   return tell('Csak JPEG/PNG/WebP fotó használható, legfeljebb 9 MB.',true);
  const started=session;busy=true;tell('📷 Saját fotó betöltése…');
  let src='';
  try{
   src=URL.createObjectURL(file);
   const image=new Image();image.src=src;await image.decode();
   const ratio=Math.min(1,900/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=d.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.75);
   if(data.length>1200000)throw Error('A fotó túl nagy, válassz kisebbet.');
   if(started!==api()?.getProfile()||!$('hhManualDialog1130').open)
    throw Error('A profil vagy az ablak megváltozott.');
   imageData=data;const pic=$('hhManualPhoto1130');pic.src=data;pic.hidden=false;
   tell('✓ Saját fotó csatolva. A gyűjteménybe mentéshez Dropbox-kapcsolat szükséges.');
  }catch(err){tell('⚠ Fotóhiba: '+String(err.message||err).slice(0,155),true)}
  finally{busy=false;if(src)URL.revokeObjectURL(src)}
 });

 $('hhManualSubmit1130').addEventListener('click',save);
 $('hhManualForm1130').addEventListener('submit',save);
 $('hhManualDialog1130').addEventListener('close',()=>{if(recognition){recognition.stop();recognition=null}});
}
w.HH_NUTRITION_MANUAL_V1130={version:'1130',init};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
