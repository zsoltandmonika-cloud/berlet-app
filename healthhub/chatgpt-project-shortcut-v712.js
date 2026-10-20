/* HealthHub v712 | A direct shortcut to an existing private ChatGPT Project.
 * No AI/API calls, no Dropbox reads, no medical-data transfer and no changes
 * to the Ask Lena research engine. Configure once in the browser.
 */
(function(root){
 'use strict';
 const STORAGE='hh-chatgpt-project-shortcut-v712';
 const BUTTONS=['hhPlain299','askChat323'];
 let installed=false;
 const el=id=>document.getElementById(id);
 function normalizeProjectUrl(raw){
  if(typeof raw!=='string'||raw.length>2000)throw Error('Érvénytelen projekthivatkozás.');
  let u;
  try{u=new URL(raw.trim());}catch(_){throw Error('Teljes https://chatgpt.com/... címet adj meg.');}
  if(u.protocol!=='https:'||u.hostname!=='chatgpt.com'||u.username||u.password||u.port)
   throw Error('Biztonsági okból csak eredeti chatgpt.com projektcímet fogadunk el.');
  // Also accept a project conversation URL but always open the project's HOME.
  const m=u.pathname.match(/^\/g\/(g-p-[a-z0-9-]+)(?:\/(?:project|c\/[a-z0-9-]+))?\/?$/i);
  if(!m)throw Error('A ChatGPT PROJEKT webcímét másold ki a böngésző címsorából, nem a beszélgetés vagy Megosztás linkjét.');
  return 'https://chatgpt.com/g/'+m[1]+'/project';
 }
 function stored(){
  try{
   const saved=root.localStorage.getItem(STORAGE);
   return saved?normalizeProjectUrl(saved):null;
  }catch(_){return null;}
 }
 function save(raw){
  const url=normalizeProjectUrl(raw);
  root.localStorage.setItem(STORAGE,url);
  refresh();return url;
 }
 function status(s){
  const node=el('hhChatGptProjectStatus712');
  if(node)node.textContent=s;
 }
 function configure(){
  const existing=stored()||'';
  const text='Nyisd meg a saját ChatGPT-projektedet, és másold ide a BÖNGÉSZŐ CÍMSORÁBAN látható https://chatgpt.com/g/g-p-… projektcímet.\n\nNe a „Megosztás” gomb linkjét használd.\n\nA címet csak ez a böngésző jegyzi meg.';
  const value=root.prompt(text,existing);
  if(value===null)return false;
  try{
   save(value);
   status('✅ A ChatGPT-projekt megnyitásra kész. Egy kattintás.');
   return true;
  }catch(e){
   root.alert(e.message||'Hibás projekthivatkozás.');
   return false;
  }
 }
 function openProject(){
  const url=stored();
  if(!url){
   if(configure())status('✅ Projekt elmentve. Kattints újra a megnyitáshoz.');
   return false;
  }
  // noopener: the external ChatGPT page cannot control the HealthHub tab.
  root.open(url,'_blank','noopener,noreferrer');
  return true;
 }
 function addSmallSettings(){
  const main=el('hhPlain299');
  if(!main||el('hhChatGptProjectSettings712'))return;
  const gear=document.createElement('button');
  gear.id='hhChatGptProjectSettings712';gear.type='button';gear.textContent='⚙';
  gear.className='askBtn';
  gear.title='ChatGPT-projektcím beállítása / módosítása';
  gear.setAttribute('aria-label','ChatGPT-projektcím módosítása');
  gear.style.cssText='min-width:38px;padding:8px 10px;border-radius:12px;';
  gear.addEventListener('click',configure);
  main.insertAdjacentElement('afterend',gear);
  const info=document.createElement('span');
  info.id='hhChatGptProjectStatus712';
  info.style.cssText='display:block;width:100%;font-size:11px;line-height:1.4;color:#b4d7ee;margin-top:3px;';
  info.textContent='Az eredeti ChatGPT-projekt nyílik meg. Nincs automatikus adatátadás.';
  main.parentElement.appendChild(info);
 }
 function refresh(){
  const connected=!!stored();
  for(const id of BUTTONS){
   const b=el(id);if(!b)continue;
   b.textContent=connected?'↗ ChatGPT · Léna projekt':'↗ ChatGPT-projekt beállítása';
   b.title=connected?'Az eredeti ChatGPT-projekt megnyitása':'Egyszeri projektcím-beállítás';
  }
  addSmallSettings();
 }
 function onClick(event){
  const target=event.target&&event.target.closest&&event.target.closest('button');
  if(!target||!BUTTONS.includes(target.id))return;
  const pane=el('hhLenaSmart299');
  if(!pane||!pane.contains(target))return;
  // Stop the old "copy prompt and redirect to general ChatGPT" only
  // for the two existing ChatGPT-opening buttons.
  event.preventDefault();
  event.stopImmediatePropagation();
  openProject();
 }
 function install(){
  if(installed)return;installed=true;
  document.addEventListener('click',onClick,true);
  root.addEventListener('healthhub:ask-lena-open',refresh);
  root.addEventListener('healthhub:profile-changed',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
 }
 root.HH_CHATGPT_PROJECT_SHORTCUT_V712={normalizeProjectUrl,save,stored,openProject,refresh};
 install();
})(window);
