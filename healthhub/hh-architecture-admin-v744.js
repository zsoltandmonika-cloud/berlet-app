/* HealthHub v744/745 · Inline Architecture Grand Design and Project Control navigation.
 * Documentation is public, technical-only. No Dropbox, auth or clinical read/write.
 * Remounts after Admin DOM rerenders, without changing the existing tracker data.
 */
(function(w,d){
 'use strict';
 const ID='hhArchitectureGrandDesign744',CSS='hhArchitectureGrandDesign744Style';
 let observing=null,queued=false;
 const url='./architecture-grand-design.html';
 function css(){
  if(d.getElementById(CSS))return;
  const s=d.createElement('style');s.id=CSS;
  s.textContent='#'+ID+'{margin:10px 0 15px;border:1px solid rgba(137,194,228,.34);'+
   'background:linear-gradient(145deg,#102b47,#1c3956);border-radius:18px;padding:15px;'+
   'box-shadow:0 12px 30px rgba(6,19,35,.25);color:#e9f6ff;font-family:system-ui}'+
   '#'+ID+' h3{font-size:15px;font-weight:800;margin:0 0 5px;color:#fff}'+
   '#'+ID+' p{margin:4px 0 11px;color:#b8d5e9;font-size:11px;line-height:1.5}'+
   '#'+ID+' .hhArchButtons{display:flex;flex-wrap:wrap;gap:8px}'+
   '#'+ID+' a,#'+ID+' button{border:1px solid #83b4d2;border-radius:11px;'+
   'background:#245c80;color:#eafaff;padding:10px 12px;text-decoration:none;'+
   'font:750 11px system-ui;cursor:pointer;min-height:36px}'+
   '#'+ID+' a:hover,#'+ID+' button:hover{background:#327b9c}'+
   '#'+ID+' small{display:block;font-size:10px;color:#91b4cc;margin-top:9px}';
  d.head.appendChild(s);
 }
 function openProject(){
  if(typeof w.hhPcOpen==='function'){w.hhPcOpen();return}
  w.open('https://github.com/zsoltandmonika-cloud/berlet-app/blob/main/healthhub/project-control.json',
    '_blank','noopener');
 }
 function mount(){
  const body=d.getElementById('healthSubContent');
  if(w.healthSectionKind!=='more'||!body||!body.isConnected)return false;
  if(d.getElementById(ID))return true;
  css();
  const panel=d.createElement('section');panel.id=ID;
  panel.setAttribute('aria-label','HealthHub Architecture Grand Design és Project Control');
  const heading=d.createElement('h3');heading.textContent='🏛️ Architecture Grand Design · Project Control';
  const lead=d.createElement('p');
  lead.textContent='Living Blueprint, teljes fejlesztési dokumentáció, hibakeresési runbook és a központi projektterv. A dokumentumok publikus műszaki leírások, nem tartalmaznak személyes egészségügyi adatokat.';
  const buttons=d.createElement('div');buttons.className='hhArchButtons';
  function link(title,href){
   const a=d.createElement('a');a.href=href;a.textContent=title;
   a.target='_blank';a.rel='noopener noreferrer';buttons.append(a);return a;
  }
  link('📐 Grand Design',url+'?doc=architecture');
  link('🛠️ Recovery Runbook',url+'?doc=runbook');
  const pc=d.createElement('button');pc.type='button';pc.textContent='📋 Project Control · Megnyitás';
  pc.addEventListener('click',openProject);buttons.append(pc);
  const foot=d.createElement('small');
  foot.textContent='Verziózott forrás: GitHub healthhub/docs/ · Project Control master: healthhub/project-control.json · v744';
  panel.append(heading,lead,buttons,foot);body.insertBefore(panel,body.firstChild);
  return true;
 }
 function schedule(){
  if(queued)return;queued=true;
  Promise.resolve().then(()=>{queued=false;mount()});
 }
 function observe(){
  const body=d.getElementById('healthSubContent');
  if(!body||observing?.target===body)return;
  if(observing){observing.obs.disconnect();observing=null}
  const obs=new MutationObserver(schedule);
  obs.observe(body,{childList:true});
  observing={target:body,obs};schedule();
 }
 function init(){observe();mount();
  w.setInterval(()=>{observe();mount()},2600);
  d.addEventListener('visibilitychange',schedule);
  w.addEventListener('focus',schedule);
 }
 w.HH_ARCHITECTURE_ADMIN_V744={version:'744',mount,openProject,documentUrl:url};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window,document);