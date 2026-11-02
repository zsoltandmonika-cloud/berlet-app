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
let session='',busy=false,known=[],matched=null,imageData='',recognition=null,aiPromise=null;
const text=v=>String(v??'').trim().replace(/\s+/g,' ');
const lower=v=>text(v).toLocaleLowerCase('hu-HU');
const field=k=>$('hhManual'+k[0].toUpperCase()+k.slice(1)+'1130');
const tell=(message,error=false)=>{const e=$('hhManualStatus1130');e.textContent=message;e.dataset.error=String(error)};
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
   $('hhManualName1130').value=name;box.hidden=true;clearImage();predict();
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
  matched=item;const portion=Number($('hhManualQty1130').value);
  for(const k of KEYS)field(k).value=item.per100[k]==null?'':(Number(item.per100[k])*portion/100).toFixed(1);
  tell('📚 A meglévő élelmiszer tápértéke az adagra számolva. Ellenőrizd.');
 }else if(item.nutrients){
  matched=null;for(const k of KEYS)field(k).value=item.nutrients[k]??'';
  tell('⭐ Mentett adag értékei betöltve. Más adagnál kérj új becslést.');
 }
}
function open(){
 if(!api()?.recordManualMeal)return w.alert('A kézi bevitel még nem töltődött be. Frissítsd az oldalt.');
 session=api().getProfile();matched=null;busy=false;clearImage();
 $('hhManualForm1130').reset();$('hhManualQty1130').value='250';
 const hour=new Date().getHours();
 $('hhManualMeal1130').value=hour<10?'Reggeli':hour<12?'Tízórai':hour<15?'Ebéd':hour<18?'Uzsonna':hour<21?'Vacsora':'Egyéb';
 $('hhManualFamilyWrap1130').hidden=!w.HH_NUTRITION_CLOUD_V626?.connected();
 suggestions();tell('Írj vagy diktálj egy ételt. A kalória és a gyűjteménybe mentés opcionális.');
 $('hhManualDialog1130').showModal();$('hhManualName1130').focus();
 w.HH_SHARED_FOOD_LIBRARY_V1118?.load?.().then(()=>{if($('hhManualDialog1130').open) suggestions()}).catch(()=>{});
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
 $('hhManualName1130').value=(remaining||phrase).slice(0,80);matched=null;predict();
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
function provider(){
 if(w.puter?.ai?.chat&&w.puter?.ai?.listModels)return Promise.resolve(w.puter);
 if(aiPromise)return aiPromise;
 aiPromise=new Promise((resolve,reject)=>{
  const ready=()=>!!w.puter?.ai?.chat&&!!w.puter?.ai?.listModels;
  let tries=0;const poll=()=>ready()?resolve(w.puter):++tries>75?reject(Error('AI szolgáltatás nem válaszol')):setTimeout(poll,200);
  if([...d.scripts].some(s=>s.src?.includes('js.puter.com/v2/'))){poll();return}
  const s=d.createElement('script');s.src='https://js.puter.com/v2/';s.async=true;
  s.onload=poll;s.onerror=()=>reject(Error('A Puter AI szolgáltatás nem tölthető be.'));d.head.append(s);
 }).catch(e=>{aiPromise=null;throw e});
 return aiPromise;
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
async function estimate(){
 if(busy)return;let info;
 try{info=amount()}catch(e){return tell(e.message,true)}
 const started=session;busy=true;$('hhManualEstimate1130').disabled=true;
 tell('✨ AI-becslést kérek az ételhez és a megadott adaghoz…');
 try{
  const p=await provider(),models=await p.ai.listModels();
  const wanted=['gpt-6.1-sol','gemini-3.8-flash','gpt-5.6-luna'];
  const chosen=wanted.map(n=>models.find(m=>String(m?.id||'').includes(n))?.id).find(Boolean)||
   models.find(m=>m?.id&&m.text_input!==false)?.id;
  if(!chosen)throw Error('Nem érhető el szöveges AI-modell.');
  const prompt='Magyar élelmiszer- és étkezési tápértékbecslés. Válasz kizárólag JSON: {"kcal":szám,"protein":szám,"carbs":szám,"fat":szám,"note":"rövid bizonytalanság"}. '+
    'TELJES ADAG tápértékét add meg, ne a 100 grammra vetítettet. '+info.name+', '+info.quantity+' '+info.unit+
    '. Recept és elkészítés nem ismert, becsülj óvatosan. Bizonytalanságot jelezd. Ha nincs megfelelő adat, adj null értékeket.';
  const result=extract(await p.ai.chat(prompt,{model:chosen,normalize:true,max_tokens:360}));
  if(started!==api()?.getProfile()||!$('hhManualDialog1130').open||
     text($('hhManualName1130').value)!==info.name||Number($('hhManualQty1130').value)!==info.quantity)
   throw Error('Az étel, az adag vagy a profil közben változott.');
  matched=null;for(const [k,v] of Object.entries(result.out))field(k).value=v;
  tell('✨ Becsült érték, nem mérés. '+(result.note||'Kérlek, ellenőrizd a tápértéket.'));
 }catch(e){tell('⚠ AI-becslés nem sikerült: '+String(e.message||e).slice(0,155),true)}
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
 }catch(e){tell('⚠ A kép nem készült el: '+String(e.message||e).slice(0,160),true)}
 finally{busy=false;$('hhManualImage1130').disabled=false}
}
const newId=()=> 'quick:manual-'+(w.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi,'').slice(0,54);
async function save(e){
 e.preventDefault();if(busy)return;let info;
 try{info=amount()}catch(err){return tell(err.message,true)}
 const food=$('hhManualSaveFood1130').checked,favorite=$('hhManualFavorite1130').checked,
  family=$('hhManualFamily1130').checked;
 if(family&&!food&&!favorite)return tell('Válassz egy ételkategóriát vagy a Kedvenceket a közös mentéshez.',true);
 if((food||favorite)&&info.nutrients.kcal===null)
  return tell('Kategóriába/Kedvencekbe mentéshez kcal-adat kell. Kérj AI-becslést, vagy csak naplózz.',true);
 if(family&&!w.HH_NUTRITION_CLOUD_V626?.connected())
  return tell('Közös mentéshez Dropbox-kapcsolat szükséges.',true);
 if(family&&(food||favorite)&&KEYS.some(k=>info.nutrients[k]==null))
  return tell('A közös családi ételtárhoz minden tápérték kell. Kérj AI-becslést.',true);
 if(food){
  for(const k of KEYS){const n=info.nutrients[k];if(n!=null&&n*100/info.quantity>(k==='kcal'?950:100))
   return tell('Ellenőrizd a '+k+' adatát a 100 g-ra vetítéshez.',true)}
 }
 busy=true;$('hhManualSubmit1130').disabled=true;tell('A kiválasztott helyekre mentem…');
 let recorded=false;
 try{
  if(info.expectedProfile!==api()?.getProfile())throw Error('Közben megváltozott a profil.');
  let ref=null,warning='';
  if(imageData&&(food||favorite)){
   const vault=w.HH_NUTRITION_IMAGE_V641;
   if(vault?.connected())ref=await vault.save(family?'shared':session,imageData);
   else warning=' A kártyakép Dropbox nélkül csak előnézetben látható.';
  }
  if(family&&(food||favorite)){
   const lib=w.HH_SHARED_FOOD_LIBRARY_V1118;
   if(!lib?.upsert)throw Error('A közös ételtár nem elérhető.');
   await lib.upsert({name:info.name,categories:food?[info.category]:[],favorite,
    kind:info.unit==='ml'?'drink':'food',meal:info.meal,
    nutrients:info.nutrients,imageRef:ref,description:info.quantity+' '+info.unit+' · kézi ételbevitel',
    ingredients:'1 mentett adag: '+info.quantity+' '+info.unit});
  }else{
   if(food)api().saveManualFood({...info,imageRef:ref});
   if(favorite)api().saveRecipe({id:newId(),name:info.name,category:info.category,
    meal:info.meal,kind:info.unit==='ml'?'drink':'food',icon:info.unit==='ml'?'🥤':'🍽️',
    theme:'meal',description:info.quantity+' '+info.unit+' · saját adag',
    ingredients:'Kézi bevitel',nutrients:info.nutrients,order:700,
    volumeMl:info.unit==='ml'?info.quantity:null,imageRef:ref,archived:false});
  }
  if(info.expectedProfile!==api()?.getProfile())throw Error('Közben megváltozott a profil.');
  api().recordManualMeal(info);recorded=true;
  $('hhManualDialog1130').close();clearImage();
  const banner=$('hhBevitelInfo');
  if(banner){banner.textContent='✓ '+info.name+' · '+info.quantity+' '+info.unit+' naplózva.'+
    ((food||favorite)?' Gyűjteménybe is mentve.':'')+warning;banner.hidden=false}
 }catch(err){tell('⚠ '+String(err.message||err).slice(0,190)+'. Ellenőrizd a naplót újrapróbálás előtt.',true)}
 finally{busy=false;$('hhManualSubmit1130').disabled=false}
}
function init(){
 if(!$('hhManualLaunch1130')||!api()?.recordManualMeal)return;
 $('hhManualLaunch1130').addEventListener('click',open);
 $('hhManualClose1130').addEventListener('click',()=>$('hhManualDialog1130').close());
 $('hhManualVoice1130').addEventListener('click',voice);
 $('hhManualName1130').addEventListener('change',()=>{clearImage();predict()});
 $('hhManualName1130').addEventListener('input',()=>{matched=null;clearImage();showPredictions()});
 $('hhManualQty1130').addEventListener('change',()=>{if(matched)predict()});
 $('hhManualEstimate1130').addEventListener('click',estimate);
 $('hhManualImage1130').addEventListener('click',image);
 $('hhManualForm1130').addEventListener('submit',save);
 $('hhManualDialog1130').addEventListener('close',()=>{if(recognition){recognition.stop();recognition=null}});
}
w.HH_NUTRITION_MANUAL_V1130={version:'1130',init};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
