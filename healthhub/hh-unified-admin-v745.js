/* HealthHub v745 · One unified Admin page from the existing "Továbbiak" taskbar.
 * Reorders only visible UI; does not delete clinical data, handlers or caches.
 * Obsolete duplicate Admin entry points are hidden; original controls are
 * mounted inline and preserve their existing action handlers.
 */
(function(w,d){
'use strict';
const ROOT='healthSubContent',ID='hhAdminInlineToolsV745';
const GROUPS=[
 {id:'architecture',label:'📐 Rendszerterv és projektirányítás',subtitle:'Grand Design · Project Control · helyreállítási dokumentáció',order:10},
 {id:'cloud',label:'☁️ Cloud Vault és ChatGPT Analytics',subtitle:'Dropbox · szinkron · forrásellenőrzés · AI-adatkapcsolat',order:20},
 {id:'data',label:'📥 Import, export és adatkezelés',subtitle:'A meglévő Admin Data Hub eszközei közvetlenül ezen az oldalon',order:30},
 {id:'recovery',label:'🛡️ Biztonság és helyreállítás',subtitle:'Mentések · visszaállítás · privát karton és előzmények',order:40},
 {id:'other',label:'⚙️ További rendszereszközök',subtitle:'Megőrzött beállítások és kiegészítők',order:90}
];
let pending=false,lastRoot=null,watcher=null,overlayRef=null,portalActive=false;
function stylesheet(){
 if(d.getElementById('hhUnifiedAdminV745Style'))return;
 const s=d.createElement('style');s.id='hhUnifiedAdminV745Style';
 s.textContent=[
 'html[data-hh-inline-admin="yes"] #healthSubContent{display:flex!important;flex-direction:column!important;gap:10px!important;padding-bottom:calc(100px + env(safe-area-inset-bottom))}',
 'html[data-hh-inline-admin="yes"] #healthSubContent > *{min-width:0;flex:none}',
 '#healthSubContent .hhAdminGroupLabelV745{border:1px solid #659bb6aa;padding:13px 15px 10px;border-radius:15px;margin-top:10px;background:linear-gradient(110deg,#0c304b,#173f60);color:#e9f6ff;box-shadow:0 5px 22px #08172f22}',
 '#healthSubContent .hhAdminGroupLabelV745 strong{display:block;font:800 13px/1.35 system-ui;color:#fff}',
 '#healthSubContent .hhAdminGroupLabelV745 small{display:block;font:500 10px/1.45 system-ui;color:#b4d0e6;margin-top:3px}',
 '#healthSubContent [data-hh-admin-group="cloud"]{border:1px solid #659ca56e!important;background:linear-gradient(135deg,#eefbfb,#e9f3fa)!important;border-radius:16px!important}',
 '#healthSubContent [data-hh-admin-group="recovery"]{border:1px solid #bc9c7c7d!important;background:linear-gradient(135deg,#fff7ef,#f5f0ec)!important;border-radius:16px!important}',
 '#healthSubContent [data-hh-admin-group="other"]{border:1px solid #a0a7ba4d!important;border-radius:16px!important;background:linear-gradient(135deg,#f7f9fd,#eef1f8)!important}',
 '#healthSubContent #hhAdminMenuCard,#healthSubContent #hhDropboxVaultCard,#healthSubContent #hhCloudVaultCard{display:none!important}',
 '#healthSubContent #hhAdminInlineToolsV745{padding:14px;border:1px solid #7e99c366;border-radius:17px;background:linear-gradient(135deg,#eef4ff,#eaf4fa);color:#173f62}',
 '#hhAdminInlineToolsV745 #haOv{position:static!important;inset:auto!important;z-index:auto!important;display:block!important;width:100%!important;background:transparent!important;overflow:visible!important;padding:0!important}',
 '#hhAdminInlineToolsV745 #haOv .haSheet{position:static!important;width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important;background:transparent!important}',
 '#hhAdminInlineToolsV745 #haOv .haTop,#hhAdminInlineToolsV745 #hhPcAdminCard{display:none!important}',
 '#hhAdminInlineToolsV745 #haBody{display:flex;flex-direction:column;gap:8px}',
 '#hhAdminInlineToolsV745 #haBody > *{flex:none;min-width:0}',
 '#hhAdminInlineToolsV745 #haBody > section,#hhAdminInlineToolsV745 #haBody > div:not(.haGrid){border-radius:13px}',
 '#hhAdminInlineToolsV745 h3{font-size:14px;margin:2px 0 10px;color:#1b4568}',
 '#haBody .haGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
 '#haBody .haGrid section,#haBody .haPrev,#haBody .haLog,#haBody .haSys{box-shadow:none;border:1px solid #cbdceb;background:#f9fcff;margin-top:7px;border-radius:13px}',
 '#haBody .haGrid button,#haBody .haGrid select,#haBody .haPrev button{font-size:11px;min-height:36px}',
 '#haBody .haGrid small,#haBody .haLog div,#haBody .haSys small{font-size:10px!important}',
 '#haBody .haLog{max-height:220px;overflow:auto}',
 '@media(max-width:520px){#haBody .haGrid{grid-template-columns:minmax(0,1fr)}}'
 ].join('');
 d.head.appendChild(s);
}
function goAdmin(){
 try{
  if(typeof w.show==='function'&&!d.getElementById('health')?.classList.contains('on'))w.show('health');
  if(typeof w.openHealthSection==='function'){w.openHealthSection('more');w.setTimeout(queue,100);return true}
 }catch(e){if(w.console)w.console.warn('Admin navigáció',e)}
 return false;
}
function nav(){
 for(const btn of d.querySelectorAll('#navHealthBar > button:last-child,#navHomeBar > button:last-child,#navDetailBar > button:last-child')){
  const raw=String(btn.textContent||'').trim();
  if(!/továbbiak|admin/i.test(raw))continue;
  if(btn.dataset.hhAdminNavV745==='1')continue;
  // Modify only the label, never the icon, destination identity or position.
  for(const node of btn.childNodes){
   if(node.nodeType===3&&/Továbbiak/.test(node.nodeValue))node.nodeValue=node.nodeValue.replace('Továbbiak','Admin');
   if(node.nodeType===1&&node.children.length===0&&node.textContent.trim()==='Továbbiak')node.textContent='Admin';
  }
  btn.setAttribute('aria-label','Admin megnyitása');btn.title='Admin';
  btn.dataset.hhAdminNavV745='1';btn.onclick=goAdmin;
 }
}
function label(root,g){
 let h=root.querySelector('#hhAdminGroup'+g.id+'V745');if(h)return h;
 h=d.createElement('div');h.id='hhAdminGroup'+g.id+'V745';h.className='hhAdminGroupLabelV745';
 h.dataset.hhAdminGroupHeading=g.id;h.style.order=String(g.order);
 const name=d.createElement('strong');name.textContent=g.label;
 const note=d.createElement('small');note.textContent=g.subtitle;
 h.append(name,note);root.append(h);return h;
}
function category(el){
 if(el.id==='hhArchitectureGrandDesign744')return 'architecture';
 if(['hhUnifiedCloudVaultCard','hhAnalytics732','hhTargetAuth739','hhSyncV742'].includes(el.id))return 'cloud';
 if(el.id===ID)return 'data';
 if(el.id==='hhDocsRecoveryCard'||el.classList.contains('hrSectionCard'))return 'recovery';
 return 'other';
}
function detach(){
 if(!overlayRef)return;
 if(portalActive||overlayRef.parentNode!==d.body){
  try{if(typeof w.haClose==='function')w.haClose();else overlayRef.classList.remove('on')}catch(_){}
  d.body.append(overlayRef);
  portalActive=false;
 }
}
function inlineTools(root){
 let box=d.getElementById(ID);
 if(!box){
  box=d.createElement('section');box.id=ID;box.dataset.hhAdminGroup='data';box.style.order='31';
  const title=d.createElement('h3');title.textContent='📥 Adatkezelés, diagnosztika és audit';
  const portal=d.createElement('div');portal.id='hhAdminLegacyPortalV745';
  box.append(title,portal);root.append(box);
 }
 const portal=box.querySelector('#hhAdminLegacyPortalV745');
 if(!portal)return box;
 const overlay=overlayRef||d.getElementById('haOv');
 if(overlay){
  overlayRef=overlay;
  if(overlay.parentNode!==portal){
   portal.append(overlay);portalActive=true;
   if(typeof w.haOpen==='function')w.haOpen();
   else overlay.classList.add('on');
  }
 }
 return box;
}
function hideObsoleteInfo(){
 const body=d.getElementById('haBody');
 if(!body||typeof body.querySelectorAll!=='function')return;
 // Informational-only legacy adapter card and the duplicate Project Control
 // popup launcher can be hidden because real controls remain available here.
 for(const item of body.querySelectorAll('.haGrid > section')){
  const heading=item.querySelector('h3');
  if(heading&&/adapterek/i.test(heading.textContent||''))
   item.hidden=!item.querySelector('button,input,select,a');
 }
 const extra=body.querySelector('#hhPcAdminCard');
 if(extra)extra.hidden=true;
}
function layout(){
 nav();
 const root=d.getElementById(ROOT);
 const enabled=w.healthSectionKind==='more'&&!!root&&root.isConnected;
 d.documentElement.dataset.hhInlineAdmin=enabled?'yes':'no';
 if(!enabled){detach();return;}
 stylesheet();inlineTools(root);hideObsoleteInfo();
 for(const group of GROUPS)label(root,group);
 const ids=new Set(GROUPS.map(g=>'hhAdminGroup'+g.id+'V745'));
 let unknownCount=0;
 for(const child of [...root.children]){
  if(ids.has(child.id))continue;
  const group=category(child),g=GROUPS.find(x=>x.id===group);
  // Hide only duplicate historical launcher/cards; never delete their data.
  if(['hhAdminMenuCard','hhDropboxVaultCard','hhCloudVaultCard'].includes(child.id)){child.hidden=true;continue}
  child.dataset.hhAdminGroup=group;
  const preferred=child.id==='hhArchitectureGrandDesign744'?11:
   child.id==='hhUnifiedCloudVaultCard'?21:child.id===ID?31:
   child.id==='hhDocsRecoveryCard'?41:g.order+2;
  if(child.style.order!==String(preferred))child.style.order=String(preferred);
  if(group==='other')unknownCount++;
 }
 for(const g of GROUPS){
  const h=d.getElementById('hhAdminGroup'+g.id+'V745');
  if(h)h.hidden=g.id==='other'&&unknownCount===0;
 }
 const title=d.getElementById('healthSubTitle');if(title)title.textContent='Admin';
}
function queue(){
 if(pending)return;pending=true;
 Promise.resolve().then(()=>{pending=false;layout()});
}
function observe(){
 const root=d.getElementById(ROOT);
 if(root===lastRoot)return;
 if(watcher)watcher.disconnect();lastRoot=root;watcher=null;
 if(!root)return;
 watcher=new MutationObserver(queue);watcher.observe(root,{childList:true});queue();
}
function start(){
 const original=w.renderHealthSection;
 if(typeof original==='function'&&!original.__hhAdminPortalV745){
  const safe=async function(){detach();try{return await original.apply(this,arguments)}finally{queue()}};
  safe.__hhAdminPortalV745=true;w.renderHealthSection=safe;
 }
 layout();observe();
 w.setInterval(()=>{observe();layout()},1600);
 w.addEventListener('focus',queue);d.addEventListener('visibilitychange',queue);
}
w.hhAdminGoInlineV745=goAdmin;
w.HH_UNIFIED_ADMIN_V745={version:'745',layout,goAdmin,category};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);