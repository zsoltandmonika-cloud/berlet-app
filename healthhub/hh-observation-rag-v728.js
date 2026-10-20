/* HealthHub BB / AJ v728. A single, non-diagnostic display rule for Nutrition and Timeline.
   These RAG colors are observational guidance only: green != medical normality,
   amber != a disease, red != an emergency. Symptoms and trends need clinical context.
   No records, profiles, persistence, networking, or personal data are used here. */
(function(root){
 'use strict';
 function classify(kind,raw){
  var n=typeof raw==='number'?raw:typeof raw==='string'&&/^[1-8]$/.test(raw)?Number(raw):NaN;
  var valid=Number.isInteger(n);
  if(kind==='stool'||kind==='bristol'){
   if(!valid||n<1||n>7)return {tone:'unknown',label:'Nincs besorolható Bristol-fokozat',grade:null};
   if(n===3||n===4)return {tone:'green',label:'Bristol 3–4 · általában szokásos állag',grade:n};
   if(n===2||n===5||n===6)return {tone:'amber',label:'Bristol 2, 5 vagy 6 · figyelendő állag',grade:n};
   return {tone:'red',label:'Bristol 1 vagy 7 · fokozott figyelem',grade:n};
  }
  if(kind==='urine'||kind==='applejuice'){
   if(!valid||n<1||n>8)return {tone:'unknown',label:'Nincs besorolható vizeletszín-fokozat',grade:null};
   if(n<=3)return {tone:'green',label:'AJ 1–3 · világosabb árnyalat',grade:n};
   if(n<=5)return {tone:'amber',label:'AJ 4–5 · sötétedő árnyalat',grade:n};
   return {tone:'red',label:'AJ 6–8 · sötét árnyalat, figyelendő',grade:n};
  }
  return {tone:'unknown',label:'Nem besorolt megfigyelés',grade:null};
 }
 root.HH_OBSERVATION_RAG_V728=Object.freeze({version:'728',classify:classify});
})(window);
