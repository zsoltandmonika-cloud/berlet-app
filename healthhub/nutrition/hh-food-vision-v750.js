/* HealthHub Nutrition · AI Food Vision v750
 * Puter multimodal analysis, privacy-first image conversion, manual confirmation.
 * No photo persistence, no unconfirmed diary entry.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),api=()=>w.HH_NUTRITION_QUICK_API;
const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
const PREFERRED=['gpt-6.1-sol','gemini-4-argon','gpt-6-luna','gemini-3.8-flash','gpt-5.6-luna'];
let activeFile=null,photoUrl='',draft=null,editing=null,profile='',busy=false,model='',loadPromise=null;
const node=(tag,cls='',label)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n};
const numeric=x=>x===null||x===undefined||x===''?null:Number(x);
function parse(result){
 let s=typeof result==='string'?result:typeof result?.message?.content==='string'?result.message.content:
 Array.isArray(result?.message?.content)?result.message.content.map(x=>x?.text||'').join(''):
 typeof result?.text==='string'?result.text:'';
 s=s.replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'');
 const start=s.indexOf('{'),end=s.lastIndexOf('}');
 if(start<0||end<=start)throw Error('Az AI nem adott értelmezhető eredményt.');
 let raw;try{raw=JSON.parse(s.slice(start,end+1))}catch(_){throw Error('Az AI válasza nem szabályos JSON.')}
 if(!raw||!Array.isArray(raw.items)||!raw.items.length||raw.items.length>16)throw Error('Nem sikerült értelmezni a tányér tartalmát.');
 const items=raw.items.map(v=>{
  const name=String(v?.name||'').trim().slice(0,85),grams=numeric(v?.grams),per={};
  if(!name||!Number.isFinite(grams)||grams<1||grams>3000)throw Error('Hiányzó vagy irreális adagbecslés.');
  for(const key of ['kcal','protein','carbs','fat']){
   const x=numeric(v?.per100?.[key]);
   per[key]=x===null||!Number.isFinite(x)||x<0||x>(key==='kcal'?950:100)?null:x;
  }
  return {name,grams,per,uncertain:!!v.uncertain};
 });
 return {name:String(raw.name||'Felismert étkezés').trim().slice(0,85),items,
  notes:String(raw.notes||'').slice(0,450)};
}
function totals(items){
 const out={};
 for(const key of ['kcal','protein','carbs','fat']){
  out[key]=items.some(i=>!Number.isFinite(i.grams)||i.grams<1||i.grams>3000||
   i.per[key]===null||!Number.isFinite(i.per[key])||i.per[key]<0||i.per[key]>(key==='kcal'?950:100))?null:
   Math.round(items.reduce((s,i)=>s+i.grams*i.per[key]/100,0)*10)/10;
 }
 return out;
}
function defaultMeal(){const h=new Date().getHours();return h<10?'Reggeli':h<12?'Tízórai':h<15?'Ebéd':h<18?'Uzsonna':h<21?'Vacsora':'Egyéb'}
function prompt(){
 return [
 'Te Léna vagy, egy magyar táplálkozási napló fényképfelismerője.',
 'Ismerd fel a képen ténylegesen látható ételösszetevőket magyar néven. Ne találj ki rejtett összetevőket.',
 'Becsüld a valószínűleg elfogyasztandó tömeget (grams); ne állítsd, hogy mért mennyiség.',
 'per100: kcal, protein, carbs, fat 100 grammonként, közelítő élelmiszer-adatok. Ismeretlen adatot null-lal jelölj, ne nullának feltételezd.',
 'Ha nem állapítható meg az olaj, vaj, szósz, cukor, pontos recept vagy adag, a notes mezőben jelezd.',
 'Az items minden eleme {name,grams,per100:{kcal,protein,carbs,fat},uncertain} legyen.',
 'A válaszod KIZÁRÓLAG JSON legyen, ebben a sémában:',
 '{"name":"étkezés","items":[{"name":"főtt rizs","grams":150,"per100":{"kcal":130,"protein":2.7,"carbs":28,"fat":0.3},"uncertain":true}],"notes":"A mennyiségek fotóból becsültek."}'
 ].join('\n');
}
function info(message,bad=false){const e=$('hhVisionStatus750');if(e){e.textContent=message;e.dataset.bad=String(bad)}}
function cleanPhoto(){if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=''}activeFile=null;const img=$('hhVisionPreview750');if(img){img.hidden=true;img.removeAttribute('src')}}
async function encode(file){
 if(!file||file.size>8*1024*1024)throw Error('A fotó legfeljebb 8 MB lehet.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPEG, PNG vagy WebP fotó használható.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const ratio=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=d.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Képátalakítás sikertelen')),'image/jpeg',0.86));
  return new File([blob],'healthhub-food.jpg',{type:'image/jpeg'});
 }finally{URL.revokeObjectURL(url)}
}
async function loadPuter(){
 if(w.puter?.ai?.chat&&w.puter?.ai?.listModels)return w.puter;
 if(loadPromise)return loadPromise;
 loadPromise=new Promise((resolve,reject)=>{
  const ready=()=>w.puter?.ai?.chat&&w.puter?.ai?.listModels;
  const present=Array.from(d.scripts).some(x=>x.src?.includes('js.puter.com/v2/'));
  if(present){
   let tries=0;const retry=()=>ready()?resolve(w.puter):tries++>70?reject(Error('Puter szolgáltatás nem válaszol')):w.setTimeout(retry,200);retry();return;
  }
  const s=node('script');s.src='https://js.puter.com/v2/';s.async=true;
  s.onload=()=>ready()?resolve(w.puter):reject(Error('Puter nem töltődött be.'));
  s.onerror=()=>reject(Error('Puter nem érhető el.'));d.head.append(s);
 }).catch(e=>{loadPromise=null;throw e});
 return loadPromise;
}
async function availableModels(puter){
 const models=await puter.ai.listModels();
 if(!Array.isArray(models)||!models.length)throw Error('Nem érhető el a Puter modellkatalógusa.');
 return PREFERRED.map(name=>models.find(x=>{
  const id=String(x?.id||'');
  return id.replace(/:(free|flex|priority)$/,'').split(/[/:]/).pop()===name &&
   x.vision!==false&&x.supports_vision!==false&&x.image_input!==false;
 })?.id).filter(Boolean);
}
function calc(){
 const e=$('hhVisionTotals750'),save=$('hhVisionSave750');if(!e||!save||!draft)return;
 const v=totals(draft.items);
 const fmt=n=>n===null?'—':n.toLocaleString('hu-HU',{maximumFractionDigits:1});
 e.textContent='Becsült teljes adag: '+fmt(v.kcal)+' kcal · Fehérje '+fmt(v.protein)+' g · Szénhidrát '+fmt(v.carbs)+' g · Zsír '+fmt(v.fat)+' g';
 save.disabled=busy||Object.values(v).some(x=>x===null)||draft.items.some(x=>!x.name.trim());
}
function editor(){
 const box=$('hhVisionItems750');box.replaceChildren();
 draft.items.forEach((item,i)=>{
  const card=node('div','hhVisionFood750');box.append(card);
  for(const [key,label] of [['name','Összetevő'],['grams','Adag (g)'],['kcal','kcal / 100 g'],['protein','Fehérje / 100 g'],['carbs','Szénhidrát / 100 g'],['fat','Zsír / 100 g']]){
   const holder=node('label','',label),input=node('input');
   input.dataset.index=i;input.dataset.key=key;input.type=key==='name'?'text':'number';
   input.inputMode=key==='name'?'text':'decimal';input.step=key==='grams'?'1':'0.1';input.min=key==='grams'?'1':'0';input.max=key==='name'?'':key==='grams'?'3000':key==='kcal'?'950':'100';
   input.value=key==='name'?item.name:key==='grams'?item.grams:item.per[key]??'';
   holder.append(input);card.append(holder);
  }
  if(item.uncertain)card.append(node('small','hhVisionWarn750','⚠ Bizonytalan adag vagy összetevő.'));
  const remove=node('button','hhVisionRemove750','× Törlés');remove.type='button';
  remove.onclick=()=>{if(draft.items.length===1)return info('Legalább egy összetevő szükséges.',true);draft.items.splice(i,1);editor()};
  card.append(remove);
 });
 calc();
}
function editInput(e){
 const input=e.target,k=input.dataset.key,i=Number(input.dataset.index),x=draft?.items?.[i];if(!x||!k)return;
 const value=numeric(input.value);
 if(k==='name')x.name=input.value.slice(0,85);
 else if(k==='grams')x.grams=value===null?NaN:value;
 else x.per[k]=value===null?null:value;
 calc();
}
async function recognize(){
 if(busy||!activeFile)return;
 busy=true;draft=null;$('hhVisionScan750').disabled=true;$('hhVisionSave750').disabled=true;
 info('A legfrissebb elérhető modellek ellenőrzése…');
 try{
  if(profile!==api()?.getProfile())throw Error('A profil megváltozott.');
  const puter=await loadPuter(),choices=await availableModels(puter);
  if(!choices.length)throw Error('Nem találtam azonosított, képfelismerésre alkalmas modellt.');
  let response=null,last=null;
  for(const choice of choices){
   info('Étel felismerése: '+choice+'…');
   try{response=await puter.ai.chat(prompt(),activeFile,false,{model:choice,normalize:true,max_tokens:2400});model=choice;break}
   catch(e){
    last=e;
    if(!/model.*(unavailable|not found|not supported)|unknown model|vision.*not supported/i.test(String(e.message||e)))throw e;
   }
  }
  if(!response)throw last||Error('Az AI-modellek nem elérhetők.');
  draft=parse(response);
  $('hhVisionName750').value=draft.name;
  $('hhVisionNotes750').textContent=draft.notes||'A fotóból nem lehet pontos tömeget és elkészítési módot meghatározni.';
  editor();info('✓ AI-felismerés: '+model+' · Ellenőrizd az adagokat és a tápértékeket mentés előtt.');
 }catch(e){info('⚠ '+String(e?.message||e).slice(0,260),true)}
 finally{busy=false;$('hhVisionScan750').disabled=!activeFile;calc()}
}
function save(){
 if(busy||!draft||profile!==api()?.getProfile()){info('A profil megváltozott vagy az elemzés még folyik.',true);return}
 const meal=$('hhVisionMeal750').value,name=$('hhVisionName750').value.trim(),nutrients=totals(draft.items);
 if(!MEALS.includes(meal)||!name||Object.values(nutrients).some(x=>x===null)){info('Ellenőrizd a nevet, az összetevőket és az adagokat.',true);return}
 try{
  api().recordAiMeal({expectedProfile:profile,id:editing?.id||null,name,meal,
   components:draft.items.map(x=>({name:x.name,grams:x.grams,per100:{...x.per},uncertain:x.uncertain})),
   nutrients,model:editing?.aiVision?.model||model,notes:draft.notes});
  info('✓ Mentés kész.');close();
 }catch(e){info('⚠ '+String(e?.message||e),true)}
}
function close(){if(busy)return;$('hhVisionDialog750')?.close();cleanPhoto();draft=null;editing=null}
async function selected(f){
 try{
  cleanPhoto();activeFile=await encode(f);photoUrl=URL.createObjectURL(activeFile);
  const img=$('hhVisionPreview750');img.src=photoUrl;img.hidden=false;
  draft=null;$('hhVisionItems750').replaceChildren();$('hhVisionSave750').disabled=true;$('hhVisionScan750').disabled=false;
  info('Fotó kész. Az AI-elemzés indításakor a képet a Puter dolgozza fel.');
 }catch(e){info('⚠ '+String(e.message||e),true)}
}
function open(row){
 if(!$('hhVisionDialog750'))init();
 const dialog=$('hhVisionDialog750');
 if(!dialog){const status=$('hhBevitelInfo');if(status){status.textContent='A fotós AI ablaka nem tudott elindulni. Frissítsd az oldalt (Ctrl+F5).';status.hidden=false}return;}
 cleanPhoto();editing=row||null;draft=null;busy=false;profile=api()?.getProfile()||'';
 $('hhVisionProfile750').textContent='Profil: '+(profile==='monika'?'Mónika':'Zsolt');
 $('hhVisionName750').value=row?.name||'';
 $('hhVisionMeal750').value=row?.meal||defaultMeal();
 $('hhVisionPicker750').hidden=!!row;$('hhVisionPreview750').hidden=true;$('hhVisionScan750').disabled=true;
 $('hhVisionSave750').disabled=true;$('hhVisionItems750').replaceChildren();
 $('hhVisionNotes750').textContent='';
 if(row){
  model=row.aiVision?.model||'';
  draft={name:row.name,items:row.aiVision.components.map(x=>({name:x.name,grams:x.grams,per:{...x.per100},uncertain:x.uncertain})),notes:row.aiVision.notes};
  editor();info('Korábban rögzített AI-becslés. Az eredeti fotót nem tároljuk.');
 }else info('Válassz fotót. Az AI kérés a Puter-fiók keretét használhatja.');
 dialog.showModal();
}
function init(){
 const ai=$('hhBevitelAI');
 if(!ai)return;
 if(ai.dataset.hhVisionBound751!=='1'){
  ai.dataset.hhVisionBound751='1';
  ai.addEventListener('click',()=>{
   try{open()}catch(e){
    const status=$('hhBevitelInfo');
    if(status){status.textContent='AI ablakhiba: '+String(e?.message||e).slice(0,180);status.hidden=false}
   }
  });
 }
 if($('hhVisionDialog750')||!api()?.recordAiMeal)return;
 const dialog=node('dialog','hhVisionDialog750');dialog.id='hhVisionDialog750';
 const shell=node('div','hhVisionShell750');dialog.append(shell);
 const head=node('header','hhVisionHead750');head.append(node('strong','','📸 Léna AI · ételfelismerés'));
 const exit=node('button','','×');exit.type='button';exit.onclick=close;head.append(exit);shell.append(head);
 const pr=node('p');pr.id='hhVisionProfile750';shell.append(pr);
 const picker=node('div','hhVisionPicker750');picker.id='hhVisionPicker750';
 for(const [title,capture] of [['📷 Fotó készítése',true],['🖼️ Galériából',false]]){
  const button=node('button','hhVisionAction750',title),input=node('input');button.type='button';input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;
  if(capture)input.setAttribute('capture','environment');
  button.onclick=()=>input.click();input.onchange=()=>{void selected(input.files?.[0])};
  picker.append(button,input);
 }
 shell.append(picker);
 const preview=node('img','hhVisionPreview750');preview.id='hhVisionPreview750';preview.alt='Elemzésre kijelölt ételfotó';preview.hidden=true;shell.append(preview);
 shell.append(node('p','hhVisionDisclosure750','A fényképet kizárólag a külön indított felismeréskor küldjük a Puter AI-nak. Az eredeti képet nem mentjük a Nutrition naplóba. A Puter használata díjköteles lehet.'));
 const scan=node('button','hhVisionAction750 hhVisionPrimary750','✨ AI felismerés');scan.id='hhVisionScan750';scan.type='button';scan.onclick=()=>{void recognize()};shell.append(scan);
 const status=node('p','hhVisionStatus750');status.id='hhVisionStatus750';status.setAttribute('role','status');status.setAttribute('aria-live','polite');shell.append(status);
 const nameLabel=node('label','hhVisionLabel750','Étel neve'),name=node('input');name.id='hhVisionName750';name.maxLength=85;nameLabel.append(name);shell.append(nameLabel);
 const mealLabel=node('label','hhVisionLabel750','Étkezés'),meal=node('select');meal.id='hhVisionMeal750';
 MEALS.forEach(x=>{const o=node('option','',x);o.value=x;meal.append(o)});mealLabel.append(meal);shell.append(mealLabel);
 const notes=node('p','hhVisionNotes750');notes.id='hhVisionNotes750';shell.append(notes);
 const list=node('div','hhVisionItems750');list.id='hhVisionItems750';list.addEventListener('input',editInput);shell.append(list);
 const total=node('strong','hhVisionTotals750','A tápérték még nincs kiszámolva.');total.id='hhVisionTotals750';shell.append(total);
 const saveButton=node('button','hhVisionAction750 hhVisionCommit750','✓ Jóváhagyás és naplózás');saveButton.id='hhVisionSave750';saveButton.type='button';saveButton.onclick=save;shell.append(saveButton);
 d.body.append(dialog);
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else cleanPhoto()});
}
w.HH_FOOD_VISION_V750={version:'750',parse,totals,availableModels,open,init};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.addEventListener('focus',init);
})(window,document);