/* HealthHub Admin · Premium Glass accessibility / navigation v748.
 * Presentation only: NO data deletions, auth changes, automatic installs,
 * duplicated Admin pages or re-creation of native registered devices.
 */
(function(w,d){
'use strict';
const ROOT='healthSubContent',ID='hhAdminQuickV748',STYLE='hhAdminQuickV748Style';
const CATEGORIES=[
 {id:'devices',title:'📱 Telefonok és APK',note:'Első helyen: Családi eszközregiszter, SH9 verziók és OTA'},
 {id:'cloud',title:'☁️ Cloud és AI',note:'Dropbox Vault, AI-kapcsolatok és szinkron'},
 {id:'data',title:'📥 Adatkezelés',note:'Import, export, diagnosztika és audit'},
 {id:'architecture',title:'📐 Rendszerterv',note:'Grand Design és Project Control'},
 {id:'recovery',title:'🛡️ Biztonság',note:'Mentések és helyreállítás'},
 {id:'other',title:'⚙️ Egyéb',note:'A meglévő további beállítások'}
];
let selected='devices',mountedRoot=null,lastTouchScroll=0;
const q=id=>d.getElementById(id);
function isAdmin(){return w.healthSectionKind==='more'&&!!q(ROOT)?.isConnected}
function el(tag,cls,txt){const n=d.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
function style(){
 if(q(STYLE))return;
 const css=[];
 css.push('html[data-hh-inline-admin="yes"] #'+ROOT+'{gap:13px!important}');
 css.push('#'+ID+'{order:0!important;min-width:0;display:block!important;border:1px solid #7495c594;border-radius:18px;padding:14px;background:linear-gradient(145deg,#071c37,#173d5b)!important;color:#eaf5ff!important;box-shadow:0 8px 25px #00122544}');
 css.push('#'+ID+' h3{font:800 18px/1.35 system-ui!important;color:#fff!important;margin:0 0 7px!important}');
 css.push('#'+ID+' .hhQuickHintV748{font:500 13px/1.5 system-ui!important;color:#cbdff0!important;margin:0 0 12px}');
 css.push('#'+ID+' .hhQuickNavV748{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}');
 css.push('#'+ID+' button{cursor:pointer;touch-action:manipulation;font:750 13px/1.4 system-ui;min-height:54px;min-width:0;padding:11px;border-radius:13px;white-space:normal;text-align:left;color:#f8fbff;background:#1a3551;border:1px solid #759fc688}');
 css.push('#'+ID+' button[data-group="devices"]{background:#4a2b4e;border-color:#e5a3dc}');
 css.push('#'+ID+' button[data-group="cloud"]{background:#18455a;border-color:#83c3d0}');
 css.push('#'+ID+' button[data-group="data"]{background:#39315e;border-color:#baabe4}');
 css.push('#'+ID+' button[data-group="architecture"]{background:#29496d;border-color:#9ebde5}');
 css.push('#'+ID+' button[data-group="recovery"]{background:#53422e;border-color:#d6bc88}');
 css.push('#'+ID+' button[data-group="other"]{background:#32455e;border-color:#a6b8cf}');
 css.push('#'+ID+' button[aria-pressed="true"]{outline:2px solid #f1e6fa;outline-offset:1px;box-shadow:0 0 0 4px #dc9fea30}');
 css.push('#'+ID+' .hhQuickDirectV748{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}');
 css.push('#'+ID+' .hhQuickDirectV748 button{flex:1;min-height:46px;border-color:#e6b6df;background:#252f50}');
 css.push('#'+ID+' .hhQuickHelpV748{color:#f3c5ed;margin:9px 0 0!important;font:650 13px/1.5 system-ui!important}');
 css.push('html[data-hh-inline-admin="yes"] #'+ROOT+' .hhAdminGroupLabelV745{margin:2px 0 0!important;padding:13px!important}');
 const colors={architecture:['#203b65','#33578a'],cloud:['#104254','#256b78'],data:['#3c305b','#655183'],recovery:['#4c402f','#7a633f'],other:['#2b3a4e','#52647c']};
 for(const group of CATEGORIES.filter(g=>g.id!=='devices')){
  const c=colors[group.id];
  css.push('#hhAdminGroup'+group.id+'V745{background:linear-gradient(125deg,'+c[0]+','+c[1]+')!important;border-color:'+c[1]+'!important}');
  css.push('html[data-hh-admin-focus="'+group.id+'"] #'+ROOT+' > *:not(#'+ID+'):not(#hhAdminGroup'+group.id+'V745):not([data-hh-admin-group="'+group.id+'"]){display:none!important}');
 }
 css.push('html[data-hh-admin-focus="devices"] #'+ROOT+' > *:not(#'+ID+'):not(#sh9VersionCenterV1):not(#hhAdminInlineToolsV745){display:none!important}');
 css.push('html[data-hh-admin-focus="devices"] #haBody > *:not(#hhDeviceRegistry401):not(#hhSyncOrchestrator305){display:none!important}');
 css.push('html[data-hh-admin-focus="devices"] #hhAdminInlineToolsV745 > h3{display:none!important}');
 css.push('html[data-hh-admin-focus="data"] #haBody > #hhDeviceRegistry401,html[data-hh-admin-focus="data"] #haBody > #hhSyncOrchestrator305{display:none!important}');
 css.push('html[data-hh-inline-admin="yes"] #'+ROOT+' #hhAdminInlineToolsV745{padding:12px!important;border-color:#b5a2d7!important;background:linear-gradient(145deg,#f8f4ff,#eaf2fb)!important}');
 css.push('html[data-hh-admin-focus="devices"] #hhAdminInlineToolsV745{border-color:#d1a4cf!important;background:linear-gradient(140deg,#fcf3fb,#eaf3fb)!important}');
 css.push('html[data-hh-inline-admin="yes"] #haBody .haGrid{grid-template-columns:repeat(2,minmax(0,1fr))}');
 css.push('html[data-hh-inline-admin="yes"] #haBody h3{font-size:16px!important;line-height:1.4!important}');
 css.push('html[data-hh-inline-admin="yes"] #haBody h4{font-size:14px!important;line-height:1.45!important}');
 css.push('html[data-hh-inline-admin="yes"] #haBody button,html[data-hh-inline-admin="yes"] #haBody select{min-height:44px!important;font-size:13px!important}');
 css.push('html[data-hh-inline-admin="yes"] #haBody small,html[data-hh-inline-admin="yes"] #haBody .hhRegNote401{font-size:12px!important;line-height:1.55!important}');
 css.push('html[data-hh-inline-admin="yes"] #haBody .hhRegRow401 b{font-size:14px!important}');
 css.push('html[data-hh-inline-admin="yes"] #sh9VersionCenterV1 .sh9vmLine,html[data-hh-inline-admin="yes"] #sh9VersionCenterV1 .sh9vmSub{font-size:12.5px!important;line-height:1.5!important}');
 css.push('html[data-hh-inline-admin="yes"] #sh9VersionCenterV1 button{font-size:13px!important;min-height:44px!important}');
 css.push('@media(max-width:520px){html[data-hh-inline-admin="yes"] #haBody .haGrid{grid-template-columns:1fr!important}#'+ID+' button{font-size:13px;min-height:56px}#'+ROOT+' .hhAdminGroupLabelV745 strong{font-size:15px!important}#'+ROOT+' .hhAdminGroupLabelV745 small{font-size:12px!important}}');
 const s=el('style');s.id=STYLE;s.textContent=css.join('\n');d.head.appendChild(s);
}
function help(s){const n=q(ID+'Help');if(n)n.textContent=s}
function apply(){
 d.documentElement.dataset.hhAdminFocus=selected;
 const menu=q(ID);
 if(!menu)return;
 for(const btn of menu.querySelectorAll('button[data-group]'))btn.setAttribute('aria-pressed',String(btn.dataset.group===selected));
 // Central settings shortcut, never read or expose Outlook credentials in Admin.
 const calendar=q('hhAdminMicrosoftCalendarV2');
 if(calendar)calendar.hidden=selected!=='cloud';
 help(CATEGORIES.find(x=>x.id===selected).note);
}
function select(group,scroll){
 if(!CATEGORIES.some(g=>g.id===group))return;
 selected=group;apply();
 if(scroll)q(ID)?.scrollIntoView?.({behavior:'instant',block:'start'});
 if(group==='devices')w.setTimeout(()=>{
   // Only reload the existing v401 registry. Never create phantom device IDs.
   w.hhDeviceRegistry401?.reload?.(true);
   w.SH9_VERSION_CENTER_V1?.refresh?.();
 },180);
}
function jump(id){
 select('devices',false);
 const target=q(id);
 if(target){target.scrollIntoView?.({behavior:'smooth',block:'start'});return}
 if(id==='hhDeviceRegistry401')w.hhDeviceRegistry401?.reload?.(true);
 help('Eszközlista még nem érhető el. Ha a Dropbox-kapcsolat hibás, először azt kell helyreállítani. A régi regisztrációkat ne töröld.');
}
const REPAIR_TARGETS=Object.freeze({
 devices:['hhDeviceRegistry401','hhSyncOrchestrator305','sh9VersionCenterV1'],
 cloud:['hhUnifiedCloudVaultCard'],
 data:['hhAiImprovement300'],
 architecture:[],recovery:[],other:[]
});
function openTarget(group,id){
 if(!isAdmin()||!Object.prototype.hasOwnProperty.call(REPAIR_TARGETS,group)||
    !REPAIR_TARGETS[group].includes(id))return false;
 select(group,false);
 // Reuse the real Admin widget; do not reset it or trigger a privileged command.
 // Some legacy cards arrive asynchronously after the page becomes visible.
 let attempts=0;
 function locate(){
  if(!isAdmin()||selected!==group)return;
  const dest=q(id);
  if(dest&&dest.isConnected){
   dest.scrollIntoView?.({behavior:'instant',block:'start'});
   try{dest.setAttribute('data-hh-repair-target','true')}catch(_){}
   help('Megnyitva: '+(group==='devices'?'telefonok és APK':
     group==='cloud'?'felhőkapcsolat':'rendszerdiagnosztika')+
     '. A tényleges javítás vagy engedélyezés csak külön jóváhagyással történik.');
   return;
  }
  if(++attempts<8){w.setTimeout(locate,170);return}
  q(ID)?.scrollIntoView?.({behavior:'instant',block:'start'});
  help('A kiválasztott javítópanel még nem töltődött be. Ellenőrizd a kapcsolódást, majd frissítsd az állapotot.');
 }
 // Device registry refresh may rebuild its DOM after a tap; scroll once it settles.
 w.setTimeout(locate,group==='devices'?310:80);
 return true;
}
function mount(){
 if(!isAdmin())return;
 const root=q(ROOT);if(!root)return;
 style();
 let panel=q(ID);
 if(panel&&panel.parentNode!==root)panel=null;
 if(!panel){
  panel=el('section');panel.id=ID;panel.style.order='0';panel.dataset.hhQuickMenu='v748';
  panel.setAttribute('aria-label','Admin kategóriák és gyorselérés');
  panel.appendChild(el('h3','', 'SH9 · Admin Control Center'));
  panel.appendChild(el('p','hhQuickHintV748','Kategóriánként egy átlátható csoport. Az összes korábbi funkció és adat megmarad.'));
  const nav=el('div','hhQuickNavV748');
  for(const item of CATEGORIES){
   const b=el('button','',item.title);b.type='button';b.dataset.group=item.id;
   b.setAttribute('aria-pressed',String(selected===item.id));
   b.addEventListener('click',()=>select(item.id,true));nav.appendChild(b);
  }
  panel.appendChild(nav);
  const actions=el('div','hhQuickDirectV748');
  for(const x of [['hhDeviceRegistry401','📱 Eszközregiszter megnyitása'],['sh9VersionCenterV1','📦 APK és OTA állapot']]){
   const b=el('button','',x[1]);b.type='button';b.addEventListener('click',()=>jump(x[0]));actions.appendChild(b);
  }
  const service=el('button','', '🛠️ Léna Service Portal');
  service.type='button';service.addEventListener('click',()=>{
    if(w.HH_SERVICE_PORTAL_V806&&typeof w.HH_SERVICE_PORTAL_V806.open==='function')
      w.HH_SERVICE_PORTAL_V806.open();
    else help('A Service Portal még nem töltődött be. Frissítsd az SH9 webes felületét.');
  });
  actions.appendChild(service);
  const cloudFix=el('button','', '☁️ Dropbox kapcsolat javítása');
  cloudFix.type='button';cloudFix.addEventListener('click',()=>openTarget('cloud','hhUnifiedCloudVaultCard'));
  actions.appendChild(cloudFix);
  // Keep the existing six category cards. One direct Calendar settings link
  // appears only in Cloud & AI; authentication stays in the first-party browser.
  const outlook=el('button','', '📅 Microsoft Calendar · beállítások');
  outlook.type='button';outlook.id='hhAdminMicrosoftCalendarV2';outlook.hidden=true;
  outlook.addEventListener('click',()=>{
   const page=new URL('../sh9/?sh9calendar=1',w.location.href);
   w.location.assign(page.href);
  });
  actions.appendChild(outlook);
  panel.appendChild(actions);
  const note=el('p','hhQuickHelpV748');note.id=ID+'Help';panel.appendChild(note);
  root.appendChild(panel);
 }
 mountedRoot=root;apply();
}
function tick(){if(!isAdmin())return;if(q(ROOT)!==mountedRoot||!q(ID))mount()}
const markScroll=()=>{lastTouchScroll=Date.now()};
w.hhAdminScrollActiveV748=()=>isAdmin()&&Date.now()-lastTouchScroll<2200;
w.addEventListener('scroll',markScroll,{passive:true,capture:true});
d.addEventListener('scroll',markScroll,{passive:true,capture:true});
w.addEventListener('focus',tick);
w.addEventListener('healthhub:device-registry-updated',tick);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
w.setInterval(tick,4500);
w.HH_ADMIN_MOBILE_V748={version:'748',openDevices:()=>select('devices',true),openTarget,category:()=>selected,tick};
})(window,document);
