/* HealthHub Admin · Premium Glass accessibility / navigation v748.
 * Presentation only: NO data deletions, auth changes, automatic installs,
 * duplicated Admin pages or re-creation of native registered devices.
 */
(function(w,d){
'use strict';
const ROOT='healthSubContent',ID='hhAdminQuickV748',STYLE='hhAdminQuickV748Style';
const PAIR='hhPairModalV3',PAIR_BODY='hhPairModalBodyV3';
const CATEGORIES=[
 {id:'registry',title:'📱 Eszközregiszter · telefon kijelölése',note:'Zsolt és Mónika fizikai telefonjának kijelölése'},
 {id:'devices',title:'📦 Telefonok, APK és OTA',note:'Telepített verziók, OTA és távoli szinkron'},
 {id:'cloud',title:'☁️ Cloud és AI',note:'Dropbox Vault, AI-kapcsolatok és szinkron'},
 {id:'data',title:'📥 Adatkezelés',note:'Import, export, diagnosztika és audit'},
 {id:'architecture',title:'📐 Rendszerterv',note:'Grand Design és Project Control'},
 {id:'recovery',title:'🛡️ Biztonság',note:'Mentések és helyreállítás'},
 {id:'other',title:'⚙️ Egyéb',note:'A meglévő további beállítások'}
];
let selected='registry',mountedRoot=null,lastTouchScroll=0,lastRegistryLoad=0;
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
 css.push('#'+ID+' button[data-group="registry"]{grid-column:1/-1;background:#513458;border:2px solid #f0b2ed;min-height:62px;font-weight:850}');
  css.push('#'+ID+' button[data-group="devices"]{background:#4a2b4e;border-color:#e5a3dc}');
 css.push('#'+ID+' button[data-group="cloud"]{background:#18455a;border-color:#83c3d0}');
 css.push('#'+ID+' button[data-group="data"]{background:#39315e;border-color:#baabe4}');
 css.push('#'+ID+' button[data-group="architecture"]{background:#29496d;border-color:#9ebde5}');
 css.push('#'+ID+' button[data-group="recovery"]{background:#53422e;border-color:#d6bc88}');
 css.push('#'+ID+' button[data-group="other"]{background:#32455e;border-color:#a6b8cf}');
 css.push('#'+ID+' button[aria-pressed="true"]{outline:2px solid #f1e6fa;outline-offset:1px;box-shadow:0 0 0 4px #dc9fea30}');
 css.push('#'+ID+' .hhQuickDirectV748{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}');
 css.push('#'+ID+' .hhQuickDirectV748 button{flex:1;min-height:46px;border-color:#e6b6df;background:#252f50}');
 css.push('#'+ID+' #hhUsageOpenV870{display:block;width:100%;margin-top:12px;min-height:56px;padding:13px 16px;background:linear-gradient(115deg,#073452,#173656,#34265c);border:1px solid #43abed;box-shadow:inset 0 1px #ffffff22,0 6px 18px #082a4b66;color:#f5fbff;font-weight:850;font-size:14px}');
 css.push('#'+ID+' .hhQuickHelpV748{color:#f3c5ed;margin:9px 0 0!important;font:650 13px/1.5 system-ui!important}');
  css.push('#'+ID+' .hhRegistryActionV809{margin:11px 0;padding:11px;border-radius:12px;border:1px solid #e7a8db;background:#432a4b;color:#fff;display:flex;gap:9px;align-items:center;flex-wrap:wrap}');
  css.push('#'+ID+' .hhRegistryActionV809 span{flex:1;min-width:130px;font-size:12px;font-weight:700}');
  css.push('#'+ID+' .hhRegistryActionV809 button{background:#663c70;min-height:46px;color:#fff}');
  css.push('#'+ID+' .hhRegistryActionV809[hidden]{display:none!important}');
 css.push('html[data-hh-inline-admin="yes"] #'+ROOT+' .hhAdminGroupLabelV745{margin:2px 0 0!important;padding:13px!important}');
 const colors={architecture:['#203b65','#33578a'],cloud:['#104254','#256b78'],data:['#3c305b','#655183'],recovery:['#4c402f','#7a633f'],other:['#2b3a4e','#52647c']};
 for(const group of CATEGORIES.filter(g=>g.id!=='devices'&&g.id!=='registry')){
  const c=colors[group.id];
  css.push('#hhAdminGroup'+group.id+'V745{background:linear-gradient(125deg,'+c[0]+','+c[1]+')!important;border-color:'+c[1]+'!important}');
  css.push('html[data-hh-admin-focus="'+group.id+'"] #'+ROOT+' > *:not(#'+ID+'):not(#hhAdminGroup'+group.id+'V745):not([data-hh-admin-group="'+group.id+'"]){display:none!important}');
 }
 css.push('html[data-hh-admin-focus="registry"] #'+ROOT+' > *:not(#'+ID+'):not(#hhAdminInlineToolsV745){display:none!important}');
 css.push('html[data-hh-admin-focus="registry"] #haBody > *:not(#hhDeviceRegistry401){display:none!important}');
 css.push('html[data-hh-admin-focus="registry"] #hhAdminInlineToolsV745 > h3{display:none!important}');
 css.push('html[data-hh-admin-focus="devices"] #'+ROOT+' > *:not(#'+ID+'):not(#sh9VersionCenterV1):not(#hhAdminInlineToolsV745){display:none!important}');
 css.push('html[data-hh-admin-focus="devices"] #haBody > *:not(#hhSyncOrchestrator305){display:none!important}');
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
 
 css.push('#'+ID+' #hhCentralPairOpenV3{display:block;width:100%;margin:12px 0 0;min-height:60px;background:linear-gradient(110deg,#562c64,#273d75);border:2px solid #f0b1f4;font:850 15px/1.35 system-ui;color:#fff;text-align:center}');
 css.push('#'+PAIR+'{position:fixed;inset:0;z-index:2147483600;background:rgba(3,13,32,.93);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}');
 css.push('#'+PAIR+'[hidden]{display:none!important}');
 css.push('#'+PAIR+' .hhPairShellV3{width:min(520px,100%);max-height:90dvh;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;border-radius:18px;padding:15px;background:linear-gradient(140deg,#122a4b,#213857);border:1px solid #7da0cf;box-shadow:0 15px 45px #010715b3;color:#fff}');
 css.push('#'+PAIR+' .hhPairHeadV3{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;color:#fff;font-size:16px}');
 css.push('#'+PAIR+' button{min-height:45px;padding:9px 12px;border:1px solid #89b9df;border-radius:11px;background:#195176;color:#fff;font:750 13px system-ui;cursor:pointer}');
 css.push('#'+PAIR+' #'+PAIR_BODY+' .hhFcPanel{margin:0;background:linear-gradient(145deg,#edf7ff,#e1edf7);color:#193c60;border:1px solid #8eb8d5;padding:13px;border-radius:13px}');
 css.push('#'+PAIR+' .hhFcPanel h4{font-size:15px;margin:0 0 8px}#'+PAIR+' .hhFcPanel small{display:block;font-size:11px;color:#55718c}#'+PAIR+' .hhFcLine{background:white;border-radius:9px;padding:9px;margin:8px 0;font-size:12px}');
 css.push('#'+PAIR+' .hhFcPair{padding:12px;background:#fff;border:1px solid #b6cce1;border-radius:11px;margin-top:10px}#'+PAIR+' .hhFcPair>summary{font-size:14px;font-weight:800;color:#214b72;cursor:pointer}#'+PAIR+' .hhFcPair p{font-size:12px;line-height:1.5}#'+PAIR+' .hhFcPair label{display:block;margin:10px 0 5px;font-size:12px;font-weight:700}');
 css.push('#'+PAIR+' .hhFcPair input{display:block;width:100%;box-sizing:border-box;min-height:48px;padding:9px;background:#fff;border:1px solid #84a9c7;color:#173650;border-radius:10px;font-size:13px}#'+PAIR+' .hhFcPair button{margin-top:10px}');
 css.push('#'+PAIR+' .hhFcNote{color:#227354;font-size:12px}#'+PAIR+' .hhFcError{color:#a22d42;font-size:12px}');
 const s=el('style');s.id=STYLE;s.textContent=css.join('\n');d.head.appendChild(s);
}
function help(s){const n=q(ID+'Help');if(n)n.textContent=s}
function registryNotice(){
 const banner=q('hhAdminRegistryFastV809'),label=q('hhAdminRegistryTextV809');
 if(!banner||!label)return;
 const pair=q('hhCentralPairOpenV3');
 const centralApi=w.HH_FAMILY_DEVICE_CENTRAL_V1;
 const central=centralApi?.devices?.()||[];
 const paired=new Set(central.filter(x=>x&&x.verified_at&&x.device_id).map(x=>x.profile_key));
 if(pair)pair.textContent=paired.has('zsolt')&&paired.has('monika')?
  '✅ Mindkét telefon párosítva · központi állapot':
  '🔐 Központi telefonállapot és párosítás';
 if(centralApi){
  if(!central.length){
   banner.hidden=false;
   label.textContent='🔐 A központi telefonállapot ellenőrzésre vár. A Dropbox régi kijelölése nem párosítási hiba.';
   return;
  }
  const fresh=new Set(central.filter(x=>{
   const age=Date.now()-Date.parse(x.last_seen_at||'');
   return x.verified_at&&x.state==='online'&&age>=0&&age<=20*60000;
  }).map(x=>x.profile_key));
  const missingFresh=['zsolt','monika'].filter(p=>!fresh.has(p));
  banner.hidden=missingFresh.length===0;
  label.textContent=missingFresh.length?
   '🟠 Központi kapcsolat: '+missingFresh.map(p=>p==='zsolt'?'Zsolt':'Mónika').join(' és ')+
   ' nem adott friss igazolt jelentést. Ez nem automatikusan újrapárosítási igény.':
   '✅ Mindkét telefon központilag hitelesítve és online.';
  return;
 }
 banner.hidden=false;
 label.textContent='A hitelesített központi eszközregiszter még nem töltődött be. A Dropbox-alapú kijelölés külön ellenőrizhető.';
}
function apply(){
 d.documentElement.dataset.hhAdminFocus=selected;
 const menu=q(ID);
 if(!menu)return;
 for(const btn of menu.querySelectorAll('button[data-group]'))btn.setAttribute('aria-pressed',String(btn.dataset.group===selected));
 // Central settings shortcut, never read or expose Outlook credentials in Admin.
 const calendar=q('hhAdminMicrosoftCalendarV2');
 if(calendar)calendar.hidden=selected!=='cloud';
 help(CATEGORIES.find(x=>x.id===selected).note);
 registryNotice();
}
function select(group,scroll){
 if(!CATEGORIES.some(g=>g.id===group))return;
 const changed=selected!==group;selected=group;apply();
 // Category selection never jumps to the top of the long Admin page.
 if(changed&&group==='registry'&&Date.now()-lastRegistryLoad>12000){
  lastRegistryLoad=Date.now();w.setTimeout(()=>w.hhDeviceRegistry401?.reload?.(false),180);
 }
 if(changed&&group==='devices')w.setTimeout(()=>w.SH9_VERSION_CENTER_V1?.refresh?.(),180);
}
function jump(id){return openTarget(id==='hhDeviceRegistry401'?'registry':'devices',id)}
const REPAIR_TARGETS=Object.freeze({
 registry:['hhDeviceRegistry401'],
 devices:['hhDeviceRegistry401','hhSyncOrchestrator305','sh9VersionCenterV1'],
 cloud:['hhUnifiedCloudVaultCard'],
 data:['hhAiImprovement300'],
 architecture:[],recovery:[],other:[]
});
function openTarget(group,id){
 if(group==='devices'&&id==='hhDeviceRegistry401')group='registry';
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
 w.setTimeout(locate,group==='registry'?310:80);
 return true;
}
function renderPairModal(){
 const modal=q(PAIR),inner=q(PAIR_BODY);
 if(!modal||modal.hidden||!inner)return;
 const central=w.HH_FAMILY_DEVICE_CENTRAL_V1;
 if(!central?.render){
  inner.textContent='A központi párosítás modulja nem töltődött be. Frissítsd a HealthHub oldalt.';
  return;
 }
 const inputs=inner.querySelectorAll('#hhFcCodeV1,#hhFcCodeV1-monika');
 // Do not erase either phone's code during asynchronous refresh.
 if(Array.from(inputs).some(input=>input===d.activeElement||input.value))return;
 const html=central.render();
 if(inner.dataset.pairUiHtmlV3===html)return;
 const opened=new Map(Array.from(inner.querySelectorAll('.hhFcPair')).map(x=>[x.getAttribute('data-profile'),x.open]));
 inner.replaceChildren();
 inner.insertAdjacentHTML('afterbegin',html);
 inner.dataset.pairUiHtmlV3=html;
 for(const details of inner.querySelectorAll('.hhFcPair')){
  const p=details.getAttribute('data-profile');
  details.open=opened.has(p)?opened.get(p):true;
 }
}
function closePairModal(){const modal=q(PAIR);if(modal)modal.hidden=true;}
function openPairModal(){
 let modal=q(PAIR);
 if(!modal){
  modal=el('section');modal.id=PAIR;modal.hidden=true;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','Családi telefonok biztonságos párosítása');
  const shell=el('div','hhPairShellV3'),head=el('div','hhPairHeadV3');
  head.appendChild(el('strong','', '🔐 Családi telefon párosítása'));
  const close=el('button','', '✕ Bezárás');close.type='button';close.addEventListener('click',closePairModal);
  head.appendChild(close);shell.appendChild(head);
  const body=el('div');body.id=PAIR_BODY;shell.appendChild(body);
  modal.appendChild(shell);d.body.appendChild(modal);
  modal.addEventListener('click',e=>{
   const b=e.target.closest?.('button[data-hh-reg-action^="central-"]');
   if(!b||!modal.contains(b))return;
   const action=b.getAttribute('data-hh-reg-action');
   if(action==='central-login')closePairModal();
   void w.HH_FAMILY_DEVICE_CENTRAL_V1?.click?.(action);
  });
 }
 modal.hidden=false;renderPairModal();
 w.HH_FAMILY_DEVICE_CENTRAL_V1?.begin?.();
}
w.addEventListener('healthhub:central-device-registry-changed',renderPairModal);
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
  const pairButton=el('button','', '🔐 Családi telefon párosítása · 1 érintés');
  pairButton.type='button';pairButton.id='hhCentralPairOpenV3';
  pairButton.addEventListener('click',openPairModal);
  panel.appendChild(pairButton);
  // v870: one-tap full-screen Usage Control; no cloud connection or polling.
  const usage=el('button','', '📊 Usage Control · Fogyasztás és limitek');
  usage.type='button';usage.id='hhUsageOpenV870';
  usage.addEventListener('click',()=>w.location.assign(new URL('./usage-control/index.html',w.location.href).href));
  panel.appendChild(usage);
  const fast=el('div','hhRegistryActionV809');fast.id='hhAdminRegistryFastV809';
   const fastText=el('span');fastText.id='hhAdminRegistryTextV809';fast.appendChild(fastText);
   const fastBtn=el('button','', '📱 Telefon kijelölése · Eszközregiszter');
   fastBtn.type='button';fastBtn.addEventListener('click',()=>openTarget('registry','hhDeviceRegistry401'));
   fast.appendChild(fastBtn);panel.appendChild(fast);
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
  // One installed signed HH One APK: an explicit user tap opens the native
  // settings via Android. In the integrated SH9 WebView the native shell
  // handles it in-place. Never trigger automatically on Admin render.
  const native=el('button','', '📱 HH One Connect megnyitása');
  native.type='button';native.id='hhAdminOpenNativeOneV752';
  native.hidden=!/Android/i.test(w.navigator?.userAgent||'');
  native.addEventListener('click',()=>{
    if(!/Android/i.test(w.navigator?.userAgent||'')){
      help('A HH One Connect natív beállításai csak Android telefonon nyithatók meg.');
      return;
    }
    help('HH One Connect natív beállítások megnyitása. Ha nem történik semmi, a régi külön SH9 Lite APK helyett az új közös HH One APK szükséges.');
    w.location.assign('healthhubconnect://settings');
  });
  actions.appendChild(native);
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
function tick(){if(!isAdmin())return;if(q(ROOT)!==mountedRoot||!q(ID))mount();else registryNotice()}
const markScroll=()=>{lastTouchScroll=Date.now()};
w.hhAdminScrollActiveV748=()=>isAdmin()&&Date.now()-lastTouchScroll<2200;
w.addEventListener('scroll',markScroll,{passive:true,capture:true});
d.addEventListener('scroll',markScroll,{passive:true,capture:true});
w.addEventListener('focus',tick);
w.addEventListener('healthhub:device-registry-updated',tick);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
w.setInterval(tick,4500);
w.HH_ADMIN_MOBILE_V748={version:'809',openPair:openPairModal,openDevices:()=>select('devices',false),openRegistry:()=>openTarget('registry','hhDeviceRegistry401'),openTarget,category:()=>selected,tick};
})(window,document);
