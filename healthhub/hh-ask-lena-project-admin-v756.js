/* SH9 / HealthHub · Ask Léna central Admin settings v756.
   The existing v712 ChatGPT Project API is the ONLY registry and validator.
   Never writes private project IDs into GitHub source or public server. */
(function(w,d){
'use strict';
const ID='hhAskLenaProjectAdminV756',INPUT='hhAskLenaAdminProjectUrl756';
const project=()=>w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
let styled=false;
function make(tag,cls,text){
 const x=d.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;
}
function style(){
 if(styled)return;styled=true;
 const e=make('style');e.id='hhAskLenaProjectAdminCSSV756';
 e.textContent=`
 #${ID}{order:22!important;display:flex!important;flex-direction:column!important;gap:10px!important;
   padding:16px!important;margin:6px 0!important;border:1px solid #659bbdaa!important;
   border-radius:16px!important;background:linear-gradient(138deg,#0d2e4c,#192440)!important;
   box-shadow:0 6px 20px #06152855!important;color:#e9f6ff!important;}
 #${ID} h3{color:#f5fbff!important;font:800 15px/1.3 Inter,'Segoe UI',sans-serif!important;margin:0!important}
 #${ID} p{color:#c7e2f5!important;font:500 11px/1.5 Inter,'Segoe UI',sans-serif!important;margin:0!important}
 #${ID} label{display:block;font:700 11px Inter,'Segoe UI',sans-serif!important;color:#e4f3ff!important}
 #${ID} input{box-sizing:border-box;width:100%;min-height:42px;padding:9px 10px;background:#071c35!important;
   color:#f5fbff!important;border:1px solid #79bae888!important;border-radius:10px!important;
   font:500 12px/1.3 Inter,'Segoe UI',sans-serif!important}
 #${ID} button{padding:10px 14px;min-height:42px;border-radius:11px;border:1px solid #84bbee;
   color:#fff!important;background:#205b89!important;font:750 12px Inter,'Segoe UI',sans-serif!important;
   cursor:pointer;touch-action:manipulation}
 #${ID} .hhLenaAdminButtons756{display:flex;flex-wrap:wrap;gap:8px}
 #${ID} button[data-act="clear"]{background:#172f49!important;border-color:#749cb6}
 #${ID} .hhLenaAdminStatus756{color:#a9e9ff!important;font-weight:650!important}
 #${ID} button:focus-visible,#${ID} input:focus-visible{outline:3px solid #b6e8ff;outline-offset:2px}
 `;
 d.head.appendChild(e);
}
function ensure(){
 const root=d.getElementById('healthSubContent'),api=project();
 if(!root||!root.isConnected||d.documentElement.dataset.hhInlineAdmin!=='yes'||!api||typeof api.save!=='function')return;
 if(d.getElementById(ID))return;
 const box=make('section');box.id=ID;box.dataset.hhAdminGroup='cloud';
 box.setAttribute('aria-label','Ask Léna ChatGPT-projekt központi beállítása');
 const h=make('h3',null,'💬 Ask Léna · ChatGPT-projekt');
 const info=make('p',null,'Az SH9 Ask Léna csempéje és a HealthHub ugyanazt a projektbeállítást használja. Nincs külön beállítás a két oldalon.');
 const label=make('label',null,'Saját ChatGPT-projekt címe');label.htmlFor=INPUT;
 const inp=make('input');inp.id=INPUT;inp.type='url';inp.inputMode='url';inp.spellcheck=false;
 inp.autocomplete='off';inp.placeholder='https://chatgpt.com/g/g-p-.../project';inp.value=api.saved()||'';
 const controls=make('div','hhLenaAdminButtons756');
 const save=make('button',null,'✓ Projektcím mentése');save.type='button';
 const clear=make('button',null,'Helyi cím törlése');clear.type='button';clear.dataset.act='clear';
 const status=make('p','hhLenaAdminStatus756',inp.value?'✓ A projektcím ezen az eszközön be van állítva.':'Egyszer add meg a projektcímet a ChatGPT címsorából.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const note=make('p',null,'Adatvédelem: a cím nem kerül a nyilvános kódba. Jelenleg böngésző-/alkalmazáshelyi beállítás; másik eszközön külön meg kell adni.');
 save.addEventListener('click',function(){
  try{const url=api.save(inp.value);inp.value=url;status.textContent='✓ Mentve. Az Ask Léna mostantól egy érintéssel nyitja a ChatGPT-projektet.';}
  catch(err){status.textContent='⚠ '+(err&&err.message||'Érvénytelen projektcím.');}
 });
 clear.addEventListener('click',function(){
  if(!w.confirm('Törlöd az Ask Léna projektcímét ebből a böngészőből?'))return;
  try{api.clearProject();inp.value='';status.textContent='A helyi projektcím törölve.';}
  catch(err){status.textContent='A cím törlése nem sikerült.';}
 });
 controls.append(save,clear);
 box.append(h,info,label,inp,controls,status,note);root.appendChild(box);
 if(new URLSearchParams(w.location.search).get('sh9cfg')==='asklena'){
  try{const u=new URL(w.location.href);u.searchParams.delete('sh9cfg');w.history.replaceState(w.history.state,'',u.toString());}catch(e){}
  w.setTimeout(function(){if(box.isConnected){box.scrollIntoView({behavior:'smooth',block:'center'});inp.focus({preventScroll:true});}},300);
 }
}
function init(){style();ensure();w.setInterval(ensure,1100);}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
