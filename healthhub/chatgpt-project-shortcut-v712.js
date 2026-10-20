/* HealthHub v712 · Genuine ChatGPT Project shortcut, premium Glass launcher.
 * One browser-local project URL, one click, original ChatGPT experience.
 * No OpenAI API, Supabase AI research, Dropbox access or patient-data transfer.
 * Existing HealthHub medical data and research endpoints remain unchanged.
 */
(function(root){
 'use strict';
 const STORAGE='hh-chatgpt-project-shortcut-v712';
 const PANEL='hhChatGptDock712';
 const BUTTONS=['hhPlain299','askChat323'];
 const el=id=>document.getElementById(id);
 let installed=false;

 function normalizeProjectUrl(raw){
  if(typeof raw!=='string'||raw.length>2000)throw Error('Érvénytelen projekthivatkozás.');
  let u;
  try{u=new URL(raw.trim())}catch(_){throw Error('Teljes https://chatgpt.com/... címet adj meg.')}
  if(u.protocol!=='https:'||u.hostname!=='chatgpt.com'||u.username||u.password||u.port)
   throw Error('Kizárólag az eredeti chatgpt.com oldal projektcímét fogadjuk el.');
  // Accept an actual private Project link, never a shared-chat URL or other domain.
  const match=u.pathname.match(/^\/g\/(g-p-[a-z0-9-]+)(?:\/(?:project|c\/[a-z0-9-]+))?\/?$/i);
  if(!match)throw Error('Nyisd meg a ChatGPT-projektet, és a címsorból másold ki a projekt URL-jét. Ne a „Megosztás” linkjét.');
  return 'https://chatgpt.com/g/'+match[1]+'/project';
 }
 function saved(){
  try{
   const value=root.localStorage.getItem(STORAGE);
   return value?normalizeProjectUrl(value):null;
  }catch(_){return null;}
 }
 function status(message){
  const node=el('hhChatGptProjectStatus712');
  if(node)node.textContent=message;
 }
 function save(raw){
  const url=normalizeProjectUrl(raw);
  root.localStorage.setItem(STORAGE,url);
  refresh();
  return url;
 }
 function configure(){
  const text='LÉNA · HEALTHHUB CHATGPT-PROJEKT\n\nNyisd meg a saját ChatGPT-projektedet, majd másold ide a böngésző címsorából a https://chatgpt.com/g/g-p-… projektcímet.\n\nEgyetlen egyszer kell megadnod ebben a böngészőben. A cím nem kerül GitHubba vagy HealthHub-szerverre.';
  const answer=root.prompt(text,saved()||'');
  if(answer===null)return false;
  try{
   save(answer);
   status('✅ ChatGPT-projekt beállítva. Egy kattintással megnyitható.');
   return true;
  }catch(e){
   root.alert(e&&e.message||'Hibás ChatGPT-projektcím.');
   return false;
  }
 }
 function openProject(){
  if(!saved()&&!configure())return false;
  const url=saved();
  if(!url)return false;
  // Only called directly from a user click; new tab retains the HealthHub page.
  root.open(url,'_blank','noopener,noreferrer');
  status('↗ Az eredeti ChatGPT-projekt új lapon nyílik meg. Ha nem látod, ellenőrizd a felugróablak-blokkolást.');
  return true;
 }
 function make(tag,cls,value){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(value!==undefined)n.textContent=value;
  return n;
 }
 function css(){
  if(el('hhChatGptGlassCss712'))return;
  const st=make('style');st.id='hhChatGptGlassCss712';
  st.textContent=[
   // Hide only the archived research composer/cards on the Ask Léna page.
   '#hhLenaSmart299 .askWidth > .askCard:first-child > :not(#hhChatGptDock712){display:none!important}',
   '#hhLenaSmart299 .askWidth > .askCard:nth-child(n+2),#hhLenaSmart299 .askWidth > .askFooter{display:none!important}',
   '#hhChatGptDock712{--hhProjectGlow:rgba(52,150,255,.46);--hhProjectBorder:rgba(164,213,255,.34);width:100%;box-sizing:border-box;text-align:center;position:relative;overflow:hidden;isolation:isolate;padding:clamp(19px,4vw,29px);margin:4px 0 2px;border:1px solid var(--hhProjectBorder);border-radius:24px;background:linear-gradient(142deg,rgba(22,61,107,.94),rgba(7,24,55,.97) 75%);box-shadow:0 18px 45px rgba(3,10,29,.3),inset 0 1px 0 rgba(255,255,255,.14);color:#eff7ff}',
   '#hhLenaSmart299[data-profile="monika"] #hhChatGptDock712{--hhProjectGlow:rgba(245,120,201,.46);--hhProjectBorder:rgba(255,186,225,.39);background:linear-gradient(140deg,rgba(82,30,87,.93),rgba(26,22,63,.98) 78%)}',
   '#hhChatGptDock712:before{content:"";z-index:-1;pointer-events:none;position:absolute;inset:-80% -42% 18% 18%;border-radius:50%;background:radial-gradient(circle,var(--hhProjectGlow),transparent 66%);filter:blur(35px)}',
   '#hhChatGptDock712 .hhProjectOrb712{width:68px;height:68px;display:grid;place-items:center;margin:1px auto 12px;border:1px solid rgba(255,255,255,.26);border-radius:22px;background:rgba(222,240,255,.1);font-size:31px;box-shadow:inset 0 1px rgba(255,255,255,.16),0 8px 28px rgba(0,0,0,.24)}',
   '#hhChatGptDock712 .hhProjectTitle712{font-size:clamp(21px,4vw,26px);font-weight:800;letter-spacing:-.3px;line-height:1.22;margin:0 0 9px}',
   '#hhChatGptDock712 .hhProjectHint712{font-size:13px;line-height:1.55;color:#c7def4;max-width:400px;margin:0 auto 19px}',
   '#hhChatGptProjectLaunch712{display:block;width:100%;min-height:56px;border:1px solid rgba(255,255,255,.45);border-radius:17px;cursor:pointer;font:800 15px system-ui,sans-serif;letter-spacing:.1px;color:#082447;background:linear-gradient(180deg,#eef7ff,#acdafa);box-shadow:0 6px 18px rgba(0,0,0,.18),inset 0 1px white;transition:transform .13s ease,filter .13s ease}',
   '#hhChatGptProjectLaunch712:active{transform:scale(.985)}',
   '#hhLenaSmart299[data-profile="monika"] #hhChatGptProjectLaunch712{color:#4a1b4a;background:linear-gradient(180deg,#fff2f9,#f5bee3)}',
   '#hhChatGptProjectLaunch712:focus-visible,#hhChatGptProjectSettings712:focus-visible{outline:3px solid white;outline-offset:3px}',
   '#hhChatGptDock712 .hhProjectFooter712{margin-top:13px;display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap}',
   '#hhChatGptDock712 .hhProjectVoice712{font-size:11px;color:#c7dbef;line-height:1.5}',
   '#hhChatGptProjectSettings712{border:1px solid rgba(220,239,255,.35);background:rgba(215,235,255,.1);border-radius:10px;color:#e9f6ff;padding:7px 10px;font:600 11px system-ui;cursor:pointer}',
   '#hhChatGptProjectStatus712{margin:10px 0 0;color:#aee1fc;min-height:16px;font-size:11px;line-height:1.5}',
   '@media (prefers-reduced-motion:reduce){#hhChatGptProjectLaunch712{transition:none}}'
  ].join('\n');
  document.head.appendChild(st);
 }
 function mount(){
  const page=el('hhLenaSmart299');
  if(!page)return;
  const host=page.querySelector('.askWidth > .askCard:first-child');
  if(!host)return;
  css();
  if(!el(PANEL)){
   const dock=make('section');dock.id=PANEL;
   dock.setAttribute('aria-label','Léna ChatGPT-projekt megnyitása');
   dock.appendChild(make('div','hhProjectOrb712','✦'));
   dock.appendChild(make('h2','hhProjectTitle712','Léna · ChatGPT'));
   dock.appendChild(make('p','hhProjectHint712','Az eredeti ChatGPT, a személyes HealthHub-projekteddel. Egy kattintás, külön böngészőlapon.'));
   const launch=make('button',null,'Kérdezd Lénát');
   launch.type='button';launch.id='hhChatGptProjectLaunch712';
   launch.addEventListener('click',openProject);dock.appendChild(launch);
   const foot=make('div','hhProjectFooter712');
   foot.appendChild(make('span','hhProjectVoice712','🎙️ Hangmód az eredeti ChatGPT-ben'));
   const settings=make('button',null,'⚙ Projekt beállítása');
   settings.type='button';settings.id='hhChatGptProjectSettings712';
   settings.addEventListener('click',configure);foot.appendChild(settings);dock.appendChild(foot);
   const info=make('p');info.id='hhChatGptProjectStatus712';dock.appendChild(info);
   host.appendChild(dock);
  }
  refresh();
 }
 function refresh(){
  const hasLink=!!saved();
  const launch=el('hhChatGptProjectLaunch712');
  if(launch)launch.textContent=hasLink?'Kérdezd Lénát':'Kérdezd Lénát';
  for(const id of BUTTONS){
   const b=el(id);if(b)b.title='ChatGPT-projekt megnyitása';
  }
  if(el('hhChatGptProjectStatus712'))
   status(hasLink?'✅ Projektcím elmentve ezen a készüléken.':'Egyszeri projektcím-beállítás szükséges. A HealthHub nem küld át egészségügyi adatot.');
 }
 function intercept(event){
  const button=event.target&&event.target.closest&&event.target.closest('button');
  if(!button||!BUTTONS.includes(button.id))return;
  const page=el('hhLenaSmart299');
  if(!page||!page.contains(button))return;
  event.preventDefault();event.stopImmediatePropagation();
  openProject();
 }
 function install(){
  if(installed)return;installed=true;
  document.addEventListener('click',intercept,true);
  root.addEventListener('healthhub:ask-lena-open',mount);
  root.addEventListener('healthhub:profile-changed',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
 }
 root.HH_CHATGPT_PROJECT_SHORTCUT_V712={normalizeProjectUrl,save,saved,openProject,refresh,mount};
 install();
})(window);
