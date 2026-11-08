/* HealthHub Nutrition v1161 · Profile-safe, offline-first diary editor.
 * Edit the original diary record in-place; NEVER replace the source recipe.
 * Fully local maths, no Puter or other AI requests.
 */
(function(root,d){
'use strict';
const math=root.HH_NUTRITION_DIARY_SCALE_V1161;
const api=()=>root.HH_NUTRITION_QUICK_API;
if(!math)return;
const LABELS={kcal:'Kalória (kcal)',protein:'Fehérje (g)',carbs:'Szénhidrát (g)',fat:'Zsír (g)',fiber:'Rost (g)'};
const NUTRI_KEYS=Object.keys(LABELS);
const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
let state=null;
const dialog=d.createElement('dialog');
dialog.id='hhDiaryEditDialogV1161';
dialog.className='hh-diary-edit-dialog-v1161';
dialog.setAttribute('aria-label','Napi napló bevitelének szerkesztése');
dialog.innerHTML=[
 '<form id="hhDiaryEditFormV1161" class="hh-diary-edit-form-v1161" novalidate>',
 '<div class="hh-diary-edit-head-v1161"><div><small>HEALTHHUB · NAPI NAPLÓ</small><h2>✏️ Bevitel szerkesztése</h2></div><button type="button" class="hh-diary-edit-dismiss-v1161" aria-label="Bezárás">✕</button></div>',
 '<div class="hh-diary-edit-grid-v1161">',
 '<label class="hh-diary-edit-wide-v1161">Étel / ital neve<input id="hhDiaryEditNameV1161" type="text" maxlength="80" required autocomplete="off"></label>',
 '<label>Napszak / étkezés<select id="hhDiaryEditMealV1161"></select></label>',
 '<label>Időpont<input id="hhDiaryEditTimeV1161" type="time" required></label>',
 '<label>Nap<input id="hhDiaryEditDateV1161" type="date" required></label>',
 '<label id="hhDiaryEditBaselineWrapV1162" class="hh-diary-edit-wide-v1161" hidden>Kiinduló súly (g)<input id="hhDiaryEditBaselineV1162" type="number" inputmode="decimal" min="0.01" max="50000" step="any" placeholder="Pl. 320"></label>',
 '<label id="hhDiaryEditWeightLabelV1162" class="hh-diary-edit-weight-label-v1162">Súly (g)<input id="hhDiaryEditAmountV1161" type="number" inputmode="decimal" min="0.01" max="50000" step="any" placeholder="Pl. 200" required></label>',
 '</div>',
 '<p class="hh-diary-edit-scale-v1161" id="hhDiaryEditScaleV1161" aria-live="polite">A súly (g) változtatásakor az összes tápérték automatikusan átskálázódik.</p>',
 '<div class="hh-diary-edit-nutrients-v1161" id="hhDiaryEditNutrientsV1161"></div>',
 '<p class="hh-diary-edit-hint-v1161">📐 A súly (g) módosításakor minden tápérték arányosan változik. A számok kézzel is javíthatók. A hiányzó értékeket nem találjuk ki. Az eredeti recept és receptkép megmarad.</p>',
 '<p class="hh-diary-edit-error-v1161" id="hhDiaryEditErrorV1161" role="alert" hidden></p>',
 '<div class="hh-diary-edit-actions-v1161"><button type="button" id="hhDiaryEditCancelV1161">Mégse</button><button type="submit" id="hhDiaryEditSaveV1161">✓ Módosítás mentése</button></div>',
 '</form>'
].join('');
d.body.append(dialog);
const el=id=>d.getElementById(id);
const form=el('hhDiaryEditFormV1161');
const amount=el('hhDiaryEditAmountV1161');
const baseline=el('hhDiaryEditBaselineV1162');
const baselineWrap=el('hhDiaryEditBaselineWrapV1162');
const weightLabel=el('hhDiaryEditWeightLabelV1162');
const meal=el('hhDiaryEditMealV1161');
MEALS.forEach(name=>{
 const option=d.createElement('option');option.value=name;option.textContent=name;meal.append(option);
});
const panel=el('hhDiaryEditNutrientsV1161');
const fields={};
for(const [key,title] of Object.entries(LABELS)){
 const label=d.createElement('label');label.textContent=title;
 const input=d.createElement('input');
 input.type='number';input.inputMode='decimal';input.min='0';input.max=key==='kcal'?'5000':'2000';
 input.step='any';input.placeholder='Nincs adat';input.dataset.nutrient=key;
 label.append(input);panel.append(label);fields[key]=input;
}
const error=el('hhDiaryEditErrorV1161');
const ratioInfo=el('hhDiaryEditScaleV1161');
const round=x=>Math.round((x+Number.EPSILON)*1000)/1000;
const fmt=x=>Number(x).toLocaleString('hu-HU',{maximumFractionDigits:2});
const parsed=v=>String(v).trim()===''?null:Number(String(v).replace(',','.'));
function fail(message){error.hidden=false;error.textContent=String(message||'A módosítás nem menthető.');}
function clearError(){error.hidden=true;error.textContent='';}
function referenceWeight(){
 if(!state)throw Error('Nincs szerkeszthető naplóbejegyzés.');
 if(state.originalAmount!=null)return state.originalAmount;
 const value=parsed(baseline.value);
 if(value==null)throw Error('A régi naplóban csak adagszám szerepel. Add meg az eredeti étel súlyát grammban.');
 return math.validation(value,state.unit,state.entry.cookbookImport?.finishedWeightGrams);
}
function validAmount(){
 if(!state)throw Error('Nincs szerkeszthető naplóbejegyzés.');
 // Never scale from "1 adag"; require the real starting weight in grams.
 referenceWeight();
 const q=parsed(amount.value);
 if(q==null)throw Error(state.unit==='ml'?'Add meg a tényleges mennyiséget ml-ben.':'Add meg az elfogyasztott súlyt grammban.');
 return math.validation(q,state.unit,state.entry.cookbookImport?.finishedWeightGrams);
}
function liveScale(){
 if(!state)return;
 clearError();
 let q;
 try{q=validAmount()}catch(e){fail(e.message);return}
 const original=referenceWeight();
 const ratio=q/original;
 const oldKcal=state.originalNutrients.kcal;
 const kcalAnchor=state.anchors.kcal;
 const calcKcal=kcalAnchor?.value==null?null:round(kcalAnchor.value*q/(kcalAnchor.amount||original));
 ratioInfo.textContent='⚖️ '+fmt(original)+' '+state.unit+' → '+fmt(q)+' '+state.unit+
  ' · '+fmt(ratio*100)+'%'+(oldKcal==null||calcKcal==null?' · Kalóriaadat nincs':' · 🔥 '+fmt(calcKcal)+' kcal');
 for(const key of NUTRI_KEYS){
  const anchor=state.anchors[key];
  fields[key].value=anchor?.value==null?'':String(round(anchor.value*q/(anchor.amount||original)));
 }
}
function open(entry){
 if(!entry?.id)return false;
 if(!api()?.updateDiaryEntry){console.warn('HealthHub diary update API missing');return false}
 if(dialog.open)dialog.close();
 const quantity=math.infer(entry);
 state={
  entry:JSON.parse(JSON.stringify(entry)),id:entry.id,
  profile:api().getProfile(),originalAmount:quantity.amount,
  originalNutrients:{...(entry.nutrients||{})},unit:quantity.unit,anchors:{}
 };
 for(const key of NUTRI_KEYS){
  const raw=entry.nutrients?.[key];
  state.anchors[key]={value:raw==null?null:Number(raw),amount:quantity.amount};
 }
 el('hhDiaryEditNameV1161').value=String(entry.name||'');
 el('hhDiaryEditDateV1161').value=entry.date||'';
 el('hhDiaryEditTimeV1161').value=entry.time||'';
 meal.value=MEALS.includes(entry.meal)?entry.meal:'Egyéb';
 const needsWeight=quantity.amount==null;
 baselineWrap.hidden=!needsWeight;
 baseline.value='';
 if(weightLabel.firstChild)weightLabel.firstChild.textContent=quantity.unit==='ml'?'Mennyiség (ml)':'Súly (g)';
 amount.value=needsWeight?'':String(quantity.amount);
 clearError();
 if(needsWeight){
  ratioInfo.textContent='⚖️ A régi bejegyzésben nincs grammban mért súly. Előbb add meg a kiinduló súlyt (g), majd az elfogyasztott súlyt (g).';
  for(const key of NUTRI_KEYS)fields[key].value=state.anchors[key].value==null?'':String(state.anchors[key].value);
 }else liveScale();
 dialog.showModal();amount.focus({preventScroll:true});
 return true;
}
amount.addEventListener('input',liveScale);
baseline.addEventListener('input',()=>{
 if(state?.originalAmount!=null)return;
 if(amount.value.trim()===''&&baseline.value.trim()!=='')amount.value=baseline.value;
 liveScale();
});
for(const [key,input] of Object.entries(fields)){
 input.addEventListener('input',()=>{
  if(!state)return;
  const atAmount=parsed(amount.value);
  if(atAmount==null||atAmount<=0)return;
  const value=parsed(input.value);
  if(value!=null&&(!Number.isFinite(value)||value<0||value>Number(input.max))){
   fail('Érvénytelen '+LABELS[key]+' érték.');return;
  }
  // A manual correction becomes the anchor for *future* weight edits.
  state.anchors[key]={value,amount:atAmount};
  clearError();
  if(state.anchors.kcal?.value!=null)ratioInfo.textContent='✏️ Kézi javítás rögzítve · '+fmt(state.anchors.kcal.value)+' kcal';
 });
}
function close(){if(dialog.open)dialog.close();state=null;}
el('hhDiaryEditCancelV1161').addEventListener('click',close);
dialog.querySelector('.hh-diary-edit-dismiss-v1161').addEventListener('click',close);
dialog.addEventListener('close',()=>{state=null});
form.addEventListener('submit',event=>{
 event.preventDefault();if(!state)return;
 clearError();
 try{
  const q=validAmount(),original=referenceWeight(),nutrients=math.scale(state.originalNutrients,original,q);
  for(const key of NUTRI_KEYS){
   const val=parsed(fields[key].value);
   if(val!=null&&(!Number.isFinite(val)||val<0||val>Number(fields[key].max)))
    throw Error('Hibás tápérték: '+LABELS[key]);
   nutrients[key]=val;
  }
  const name=el('hhDiaryEditNameV1161').value.trim();
  if(name.length<2)throw Error('Add meg az étel nevét.');
  const result=api().updateDiaryEntry({
   expectedProfile:state.profile,id:state.id,name,
   quantity:q,unit:state.unit,originalWeight:original,
   meal:meal.value,date:el('hhDiaryEditDateV1161').value,
   time:el('hhDiaryEditTimeV1161').value,
   nutrients
  });
  dialog.close();state=null;
  root.HH_NUTRITION_DIARY_EDIT_V1161.lastSaved=result;
 }catch(e){fail(e?.message||String(e))}
});
root.HH_NUTRITION_DIARY_EDIT_V1161={version:1161,open,lastSaved:null};
})(window,document);
