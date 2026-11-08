/* HealthHub Nutrition v1154: cookbook cooked-dish mass scaling (no AI, no storage). */
(function(root){
'use strict';
function servingCount(text){
 const s=String(text||'').trim().toLocaleLowerCase('hu');
 const m=s.match(/^(\d{1,3})\s*(?:fő|fo|adag|személy|szemely|darab|db|stangli|szelet|pohár|pohar)$/u);
 if(!m)return null;
 const count=Number(m[1]);return count>0&&count<=100?count:null;
}
function positive(v){return typeof v==='number'&&Number.isFinite(v)&&v>0}
function calculate(n,grams=320){
 if(!n||typeof n!=='object'||!n.perServing)throw Error('Ehhez a recepthez még nincs Nutri Info.');
 const count=servingCount(n.servings);
 if(!count)throw Error('A recept adagjainak száma nem egyértelmű. Ellenőrizd a Recept Stúdióban.');
 const total=Number(n.finishedWeightGrams);
 if(!positive(total)||total<50||total>50000)throw Error('Az elkészült étel teljes tömegét egyszer add meg a Recept Stúdió Nutri Info részében.');
 const portion=Number(grams);
 if(!positive(portion)||portion<1||portion>3000)throw Error('A porció mérete 1 és 3000 g között lehet.');
 if(portion>total)throw Error('A 320 grammos adag nagyobb, mint az egész elkészült étel.');
 const p=n.perServing;
 for(const key of ['kcal','protein_g','carbs_g','fat_g']){
  if(p[key]==null||p[key]===''||!Number.isFinite(Number(p[key]))||Number(p[key])<0)
   throw Error('Hiányzó vagy hibás alap tápérték: '+key);
 }
 if(Number(p.kcal)<=0)throw Error('A recept energiaértéke nem megfelelő, frissítsd a Nutri Info-t.');
 const ratio=count*portion/total;
 const round=(value,digits)=>Math.round((value+Number.EPSILON)*10**digits)/10**digits;
 const scale=(value,digits=1)=>value==null||value===''?null:round(Number(value)*ratio,digits);
 const nutrients={
  kcal:scale(p.kcal,1),protein:scale(p.protein_g),carbs:scale(p.carbs_g),
  fat:scale(p.fat_g),fiber:scale(p.fiber_g)
 };
 if(Object.values(nutrients).some(x=>x!=null&&(!Number.isFinite(x)||x<0))
   ||nutrients.kcal>5000)throw Error('A kiszámított tápérték érvénytelen.');
 return {grams:portion,finishedWeightGrams:total,servings:count,nutrients,source:'estimated'};
}
root.HH_COOKBOOK_PORTION_MATH_V1154=Object.freeze({servingCount,calculate});
})(typeof window!=='undefined'?window:globalThis);
