(function(){
'use strict';

/* HealthHub v1.42 — S24 Ultra-first Project Control inside Admin. */
var DATA_URL='./project-control.json?v=142-20260930';
var LS_OV='hh-project-control-overrides-v1';
var LS_LOCAL='hh-project-control-local-actions-v1';
var data=null, tab='dashboard', filterStatus='Open', filterEpic='All', searchText='', detailId=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function readJson(k,fallback){try{return JSON.parse(localStorage.getItem(k)||'')||fallback}catch(e){return fallback}}
function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
function overrides(){return readJson(LS_OV,{})}
function locals(){return readJson(LS_LOCAL,[])}
function pct(v){return Math.max(0,Math.min(100,Math.round(Number(v||0)*100)))}
function fmtDate(v){if(!v)return '—';var d=new Date(v+'T12:00:00');return isNaN(d)?v:new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(d)}
function statusIcon(s){return ({Done:'✅',Testing:'🟡','In Progress':'🔵',Ready:'🟣',Backlog:'⚪',Paused:'⏸️',Idea:'💡'})[s]||'•'}
function statusClass(s){return 's-'+String(s||'').toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'')}
function priorityRank(p){return ({Critical:0,High:1,Medium:2,Low:3})[p]??9}
function openRank(s){return ({'In Progress':0,Testing:1,Ready:2,Backlog:3,Paused:4,Idea:5,Done:9})[s]??8}

function mergedActions(){
  if(!data)return[];
  var ov=overrides();
  var base=(data.actions||[]).map(function(x){return Object.assign({},x,ov[x.id]||{})});
  return base.concat(locals().map(function(x){return Object.assign({isLocal:true},x,ov[x.id]||{})}));
}
function one(id){return mergedActions().find(function(x){return x.id===id})||null}
function progressSummary(actions){
  var total=actions.reduce(function(a,x){return a+Number(x.storyPoints||0)},0);
  var earned=actions.reduce(function(a,x){return a+Number(x.storyPoints||0)*Number(x.progress||0)},0);
  return total?earned/total:0;
}
function activeCount(actions){return actions.filter(function(x){return ['In Progress','Testing','Ready'].includes(x.status)}).length}
function localChangeCount(){return Object.keys(overrides()).length+locals().length}
function epics(actions){
  var m={};actions.forEach(function(x){if(!m[x.epic])m[x.epic]=[];m[x.epic].push(x)});
  return Object.keys(m).map(function(k){return {name:k,actions:m[k],progress:progressSummary(m[k]),points:m[k].reduce(function(a,x){return a+Number(x.storyPoints||0)},0)}})
    .sort(function(a,b){return b.progress-a.progress});
}
function nextActions(actions){
  return actions.filter(function(x){return ['In Progress','Testing','Ready'].includes(x.status)})
    .sort(function(a,b){return openRank(a.status)-openRank(b.status)||priorityRank(a.priority)-priorityRank(b.priority)||String(a.targetDate||'9999').localeCompare(String(b.targetDate||'9999'))})
    .slice(0,6);
}
function blockers(){
  if(!data)return[];
  return (data.blockers||[]).map(function(b){var a=one(b.actionId);return Object.assign({},b,{action:a})});
}
async function load(){
  if(data)return data;
  var r=await fetch(DATA_URL,{cache:'no-store'});
  if(!r.ok)throw Error('A Project Control master nem tölthető be.');
  data=await r.json();return data;
}
function dl(obj,name){
  var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href)},5000);
}

function ensureStyle(){
 if(document.getElementById('hh-v142-style'))return;
 var s=document.createElement('style');s.id='hh-v142-style';
 s.textContent=
 '.hhPcAdminCard{background:linear-gradient(145deg,#173f62,#245c83);color:#fff;border-radius:16px;padding:12px;margin:0 0 10px;box-shadow:0 8px 20px rgba(23,63,98,.18)}'+
 '.hhPcAdminCard .row{display:flex;gap:10px;align-items:center}.hhPcAdminCard .ico{width:38px;height:38px;border-radius:12px;background:#ffffff1c;display:grid;place-items:center;font-size:18px}.hhPcAdminCard b{display:block;font-size:11px}.hhPcAdminCard small{display:block;font-size:8px;opacity:.78;line-height:1.35;margin-top:2px}.hhPcAdminCard button{margin-left:auto;border:0;border-radius:11px;background:#fff;color:#173f62;padding:8px 10px;font-size:8px;font-weight:900}'+
 '.hhPcOv{position:fixed;inset:0;z-index:310;background:#0a2136aa;display:none;align-items:flex-end;justify-content:center}.hhPcOv.on{display:flex}.hhPcShell{width:min(100vw,760px);height:min(96vh,980px);background:#f4f8fb;border-radius:24px 24px 0 0;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 -12px 36px rgba(8,32,51,.22)}'+
 '.hhPcHead{background:#173f62;color:#fff;padding:13px 14px 10px;display:flex;align-items:flex-start;gap:10px}.hhPcHead .grow{flex:1;min-width:0}.hhPcHead small{display:block;font-size:7px;letter-spacing:.13em;opacity:.72;text-transform:uppercase}.hhPcHead h2{margin:3px 0 0;font-size:16px}.hhPcHead p{margin:4px 0 0;font-size:8px;opacity:.78}.hhPcClose{border:0;background:#ffffff1c;color:#fff;border-radius:50%;width:34px;height:34px;font-size:19px}'+
 '.hhPcTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#dfe8ef}.hhPcTabs button{border:0;background:#fff;color:#698095;padding:9px 4px;font-size:8px;font-weight:850}.hhPcTabs button.on{color:#173f62;background:#eef6fb;box-shadow:inset 0 -3px #317f77}'+
 '.hhPcBody{flex:1;overflow:auto;padding:10px 10px calc(18px + env(safe-area-inset-bottom))}.hhPcGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.hhPcKpi{background:#fff;border:1px solid #e4edf3;border-radius:14px;padding:10px}.hhPcKpi small{display:block;color:#7b8d9d;font-size:7px;text-transform:uppercase;font-weight:850;letter-spacing:.07em}.hhPcKpi b{display:block;color:#173f62;font-size:18px;margin-top:3px}.hhPcKpi em{display:block;font-style:normal;color:#8394a4;font-size:7px;margin-top:3px}'+
 '.hhPcSection{background:#fff;border:1px solid #e5edf3;border-radius:15px;padding:11px;margin-top:8px}.hhPcSection h3{margin:0 0 8px;font-size:10px;color:#173f62}.hhPcFocus{background:linear-gradient(145deg,#eaf8f4,#f8fcfb);border-color:#cbe9e1}.hhPcFocus b{font-size:11px;color:#1d5f58;line-height:1.4}.hhPcFocus small{display:block;color:#6f8986;font-size:7px;margin-top:5px}'+
 '.hhPcAction{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;border-top:1px solid #edf2f5;padding:9px 0;cursor:pointer}.hhPcAction:first-of-type{border-top:0}.hhPcAction .dot{font-size:12px}.hhPcAction b{display:block;color:#183c5d;font-size:9px;line-height:1.3}.hhPcAction small{display:block;color:#8294a3;font-size:7px;line-height:1.35;margin-top:2px}.hhPcTag{border-radius:9px;background:#edf4f8;color:#4c6a80;padding:4px 6px;font-size:6.8px;font-weight:850;white-space:nowrap}.hhPcTag.s-done{background:#e8f7f2;color:#237266}.hhPcTag.s-in-progress{background:#e8f1ff;color:#365f9c}.hhPcTag.s-testing{background:#fff6d9;color:#9a6a00}.hhPcTag.s-ready{background:#f0ecff;color:#6a54a4}'+
 '.hhPcBar{height:6px;background:#edf2f5;border-radius:999px;overflow:hidden;margin-top:6px}.hhPcBar i{display:block;height:100%;background:#317f77;border-radius:999px}.hhPcEpic{margin-top:9px}.hhPcEpicTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.hhPcEpicTop b{font-size:8.5px;color:#294d68}.hhPcEpicTop span{font-size:7px;color:#7d8f9e}'+
 '.hhPcFilter{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:7px}.hhPcFilter input,.hhPcFilter select{width:100%;box-sizing:border-box;border:1px solid #d9e5ed;background:#fff;border-radius:11px;padding:8px;font-size:8px;color:#31516a}.hhPcSearch{grid-column:1/-1}.hhPcToolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}.hhPcBtn{border:1px solid #d9e5ed;background:#fff;color:#31516a;border-radius:11px;padding:7px 9px;font-size:7.5px;font-weight:850}.hhPcBtn.primary{background:#173f62;color:#fff;border-color:#173f62}.hhPcBtn.danger{background:#fff1f2;color:#a43d50;border-color:#f1ccd3}'+
 '.hhPcDetail h2{margin:4px 0 4px;color:#173f62;font-size:14px}.hhPcMeta{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.hhPcMeta span{background:#eef4f8;border-radius:9px;padding:5px 7px;font-size:7px;color:#547087;font-weight:800}.hhPcForm{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.hhPcForm label{font-size:7px;color:#6d8293;font-weight:850}.hhPcForm input,.hhPcForm select,.hhPcForm textarea{width:100%;box-sizing:border-box;margin-top:4px;border:1px solid #d9e5ed;border-radius:10px;padding:8px;background:#fff;color:#294b65;font-size:8px}.hhPcForm .full{grid-column:1/-1}.hhPcForm textarea{min-height:82px;resize:vertical}.hhPcRange{display:flex;gap:7px;align-items:center}.hhPcRange input{padding:0}.hhPcRange b{min-width:34px;text-align:right;color:#173f62;font-size:9px}'+
 '.hhPcEmpty{text-align:center;color:#8294a3;padding:24px 10px;font-size:8px}.hhPcFootNote{font-size:7px;color:#8294a3;line-height:1.45;margin:8px 2px}.hhPcChange{display:inline-block;background:#fff3cd;color:#806000;border-radius:8px;padding:3px 6px;font-size:6.7px;font-weight:850;margin-top:4px}'+
 '@media(min-width:720px){.hhPcBody{padding:14px}.hhPcGrid{grid-template-columns:repeat(4,1fr)}.hhPcShell{border-radius:24px;margin-bottom:12px}.hhPcFilter{grid-template-columns:2fr 1fr 1fr}.hhPcSearch{grid-column:auto}}';
 document.head.appendChild(s);
}

function ensureUi(){
 if(document.getElementById('hhPcOv'))return;
 ensureStyle();
 var ov=document.createElement('div');ov.id='hhPcOv';ov.className='hhPcOv';
 ov.innerHTML='<div class="hhPcShell"><div class="hhPcHead"><div class="grow"><small>HEALTHHUB · ADMIN</small><h2>📋 Project Control</h2><p id="hhPcSub">Betöltés…</p></div><button class="hhPcClose" onclick="hhPcClose()">×</button></div><div class="hhPcTabs"><button id="hhPcTab-dashboard" onclick="hhPcTab(\'dashboard\')">Dashboard</button><button id="hhPcTab-actions" onclick="hhPcTab(\'actions\')">Actions</button><button id="hhPcTab-blockers" onclick="hhPcTab(\'blockers\')">Blockers</button></div><div class="hhPcBody" id="hhPcBody"></div></div>';
 ov.onclick=function(e){if(e.target===ov)window.hhPcClose()};
 document.body.appendChild(ov);
}

function actionRow(x){
 return '<div class="hhPcAction" onclick="hhPcOpenAction(\''+esc(x.id)+'\')"><div class="dot">'+statusIcon(x.status)+'</div><div><b>'+esc(x.id)+' · '+esc(x.title)+'</b><small>'+esc(x.epic)+' · '+esc(x.priority)+' · cél: '+esc(fmtDate(x.targetDate))+'</small></div><span class="hhPcTag '+statusClass(x.status)+'">'+esc(x.status)+'</span></div>';
}

function renderDashboard(){
 var a=mergedActions(),prog=progressSummary(a),done=a.filter(function(x){return x.status==='Done'}).length,active=activeCount(a),chg=localChangeCount();
 var nxt=nextActions(a),eps=epics(a),bl=blockers();
 return '<div class="hhPcGrid">'+
  '<div class="hhPcKpi"><small>Készültség</small><b>'+pct(prog)+'%</b><div class="hhPcBar"><i style="width:'+pct(prog)+'%"></i></div></div>'+
  '<div class="hhPcKpi"><small>Done</small><b>'+done+'</b><em>'+a.length+' actionből</em></div>'+
  '<div class="hhPcKpi"><small>Aktív</small><b>'+active+'</b><em>Ready / Testing / In Progress</em></div>'+
  '<div class="hhPcKpi"><small>Helyi változás</small><b>'+chg+'</b><em>'+esc(data.liveBuild||'')+' master</em></div></div>'+
  '<section class="hhPcSection hhPcFocus"><h3>🎯 Aktuális fókusz</h3><b>'+esc(data.currentFocus||'')+'</b><small>Következő fő fejlesztés: '+esc(data.nextDevelopment||'')+'</small></section>'+
  '<section class="hhPcSection"><h3>🚀 Következő actionök</h3>'+(nxt.length?nxt.map(actionRow).join(''):'<div class="hhPcEmpty">Nincs aktív action.</div>')+'</section>'+
  '<section class="hhPcSection"><h3>⚠️ Lezárási blockerek · '+bl.length+'</h3>'+bl.map(function(b){var x=b.action;return '<div class="hhPcAction" '+(x?'onclick="hhPcOpenAction(\''+esc(x.id)+'\')"':'')+'><div class="dot">⚠️</div><div><b>'+esc(b.label)+'</b><small>'+esc(b.detail)+'</small></div>'+(x?'<span class="hhPcTag '+statusClass(x.status)+'">'+esc(x.status)+'</span>':'')+'</div>'}).join('')+'</section>'+
  '<section class="hhPcSection"><h3>📊 Modul státusz</h3>'+eps.map(function(e){return '<div class="hhPcEpic"><div class="hhPcEpicTop"><b>'+esc(e.name)+'</b><span>'+pct(e.progress)+'% · '+e.points+' SP</span></div><div class="hhPcBar"><i style="width:'+pct(e.progress)+'%"></i></div></div>'}).join('')+'</section>'+
  '<p class="hhPcFootNote">Master: project-control.json · A telefonon végzett módosítások helyi override-ként tárolódnak ezen a készüléken. Exporttal bármikor kimenthetők.</p>';
}

function filteredActions(){
 var a=mergedActions();
 if(filterStatus==='Open')a=a.filter(function(x){return x.status!=='Done'});
 else if(filterStatus!=='All')a=a.filter(function(x){return x.status===filterStatus});
 if(filterEpic!=='All')a=a.filter(function(x){return x.epic===filterEpic});
 var q=searchText.trim().toLowerCase();if(q)a=a.filter(function(x){return [x.id,x.title,x.epic,x.feature,x.notes].join(' ').toLowerCase().includes(q)});
 return a.sort(function(x,y){return openRank(x.status)-openRank(y.status)||priorityRank(x.priority)-priorityRank(y.priority)||String(x.targetDate||'9999').localeCompare(String(y.targetDate||'9999'))});
}

function renderActions(){
 var a=mergedActions(),eps=Array.from(new Set(a.map(function(x){return x.epic}))).sort(),rows=filteredActions();
 return '<div class="hhPcToolbar"><button class="hhPcBtn primary" onclick="hhPcNewAction()">＋ Új action</button><button class="hhPcBtn" onclick="hhPcExport()">⇩ Export JSON</button></div>'+
  '<div class="hhPcFilter"><input class="hhPcSearch" id="hhPcSearch" placeholder="Keresés ID, action, epic…" value="'+esc(searchText)+'" oninput="hhPcSearch(this.value)"><select onchange="hhPcStatusFilter(this.value)">'+['Open','All','In Progress','Testing','Ready','Backlog','Done','Paused','Idea'].map(function(s){return '<option '+(s===filterStatus?'selected':'')+'>'+s+'</option>'}).join('')+'</select><select onchange="hhPcEpicFilter(this.value)"><option>All</option>'+eps.map(function(e){return '<option '+(e===filterEpic?'selected':'')+'>'+esc(e)+'</option>'}).join('')+'</select></div>'+
  '<section class="hhPcSection" style="margin-top:0"><h3>'+rows.length+' action</h3>'+(rows.length?rows.map(actionRow).join(''):'<div class="hhPcEmpty">Nincs találat.</div>')+'</section>';
}

function renderBlockers(){
 var bl=blockers();
 return '<section class="hhPcSection" style="margin-top:0"><h3>⚠️ Lezárási blockerek</h3>'+bl.map(function(b){var x=b.action;return '<div class="hhPcAction" '+(x?'onclick="hhPcOpenAction(\''+esc(x.id)+'\')"':'')+'><div class="dot">⚠️</div><div><b>'+esc(b.label)+'</b><small>'+esc(b.detail)+(x?' · '+esc(x.id):'')+'</small></div>'+(x?'<span class="hhPcTag '+statusClass(x.status)+'">'+esc(x.status)+'</span>':'')+'</div>'}).join('')+'</section>'+
 '<section class="hhPcSection"><h3>📐 Cutover szabály</h3><p class="hhPcFootNote" style="margin:0">A régi HealthRadar addig marad read-only biztonsági hálóként, amíg a lezárási blockerek nincsenek készre vagy tudatos architekturális eltérésre lezárva.</p></section>';
}

function actionDetail(x){
 if(!x)return '<div class="hhPcEmpty">Action nem található.</div>';
 var changed=!!overrides()[x.id]||!!x.isLocal;
 var statuses=['Idea','Backlog','Ready','In Progress','Testing','Paused','Done'];
 var priorities=['Critical','High','Medium','Low'];
 return '<div class="hhPcDetail"><button class="hhPcBtn" onclick="hhPcBack()">‹ Vissza</button><h2>'+esc(x.id)+' · '+esc(x.title)+'</h2>'+
  '<div class="hhPcMeta"><span>'+statusIcon(x.status)+' '+esc(x.status)+'</span><span>'+esc(x.priority)+'</span><span>'+esc(x.epic)+'</span><span>'+Number(x.storyPoints||0)+' SP</span></div>'+
  (changed?'<span class="hhPcChange">HELYI VÁLTOZÁS</span>':'')+
  '<section class="hhPcSection"><h3>Acceptance criteria</h3><p class="hhPcFootNote" style="margin:0">'+esc(x.acceptanceCriteria||'—')+'</p></section>'+
  '<div class="hhPcForm"><label>Státusz<select id="hhPcEditStatus">'+statuses.map(function(s){return '<option '+(s===x.status?'selected':'')+'>'+s+'</option>'}).join('')+'</select></label>'+
  '<label>Prioritás<select id="hhPcEditPriority">'+priorities.map(function(p){return '<option '+(p===x.priority?'selected':'')+'>'+p+'</option>'}).join('')+'</select></label>'+
  '<label class="full">Progress<div class="hhPcRange"><input id="hhPcEditProgress" type="range" min="0" max="100" step="5" value="'+pct(x.progress)+'" oninput="document.getElementById(\'hhPcPct\').textContent=this.value+\'%\'"><b id="hhPcPct">'+pct(x.progress)+'%</b></div></label>'+
  '<label>Target<input id="hhPcEditTarget" type="date" value="'+esc(x.targetDate||'')+'"></label><label>Owner<input id="hhPcEditOwner" value="'+esc(x.owner||'')+'"></label>'+
  '<label class="full">Jegyzet<textarea id="hhPcEditNotes">'+esc(x.notes||'')+'</textarea></label></div>'+
  '<div class="hhPcToolbar" style="margin-top:9px"><button class="hhPcBtn primary" onclick="hhPcSaveAction(\''+esc(x.id)+'\')">Mentés</button><button class="hhPcBtn" onclick="hhPcExport()">Export</button>'+(changed&&!x.isLocal?'<button class="hhPcBtn danger" onclick="hhPcResetAction(\''+esc(x.id)+'\')">Helyi módosítás visszaállítása</button>':'')+'</div>'+
  '<p class="hhPcFootNote">Dependency: '+esc(x.dependency||'—')+' · Milestone: '+esc(x.milestone||'—')+' · Feature: '+esc(x.feature||'—')+'</p></div>';
}

function newActionForm(){
 return '<div class="hhPcDetail"><button class="hhPcBtn" onclick="hhPcBack()">‹ Vissza</button><h2>Új helyi action</h2><div class="hhPcForm">'+
  '<label class="full">Action neve<input id="hhPcNewTitle" placeholder="Pl. Health Connect sync log"></label>'+
  '<label>Epic<input id="hhPcNewEpic" value="HealthHub Core"></label><label>Prioritás<select id="hhPcNewPriority"><option>Critical</option><option selected>High</option><option>Medium</option><option>Low</option></select></label>'+
  '<label>Státusz<select id="hhPcNewStatus"><option>Idea</option><option selected>Backlog</option><option>Ready</option><option>In Progress</option><option>Testing</option></select></label><label>Target<input id="hhPcNewTarget" type="date"></label>'+
  '<label class="full">Jegyzet<textarea id="hhPcNewNotes"></textarea></label></div><div class="hhPcToolbar" style="margin-top:9px"><button class="hhPcBtn primary" onclick="hhPcCreateAction()">Action létrehozása</button></div><p class="hhPcFootNote">Az új action ezen a készüléken helyben jön létre. Cloud/master sync a következő Project Control fejlesztési lépcső.</p></div>';
}

function render(){
 ensureUi();
 var b=document.getElementById('hhPcBody');if(!b)return;
 ['dashboard','actions','blockers'].forEach(function(t){document.getElementById('hhPcTab-'+t)?.classList.toggle('on',tab===t&&!detailId)});
 document.getElementById('hhPcSub').textContent=(data?.project||'HealthHub')+' · '+(data?.updatedAt||'')+' · '+localChangeCount()+' helyi változás';
 if(detailId==='__new__')b.innerHTML=newActionForm();
 else if(detailId)b.innerHTML=actionDetail(one(detailId));
 else if(tab==='actions')b.innerHTML=renderActions();
 else if(tab==='blockers')b.innerHTML=renderBlockers();
 else b.innerHTML=renderDashboard();
}

function injectAdmin(){
 var body=document.getElementById('haBody');if(!body||document.getElementById('hhPcAdminCard'))return false;
 var c=document.createElement('div');c.id='hhPcAdminCard';c.className='hhPcAdminCard';
 c.innerHTML='<div class="row"><div class="ico">📋</div><div style="min-width:0;flex:1"><b>Project Control</b><small>S24 Ultra dashboard · action tracking · blockerek · helyi szerkesztés</small></div><button onclick="hhPcOpen()">Megnyitás ›</button></div>';
 body.insertBefore(c,body.firstChild);return true;
}
function scheduleInject(){var n=0,t=setInterval(function(){n++;if(injectAdmin()||n>20)clearInterval(t)},60)}
function decorateMore(){
 if(window.healthSectionKind!=='more')return;
 var card=document.getElementById('hhAdminMenuCard');if(!card||card.querySelector('.hhPcQuick'))return;
 var q=document.createElement('button');q.className='hhImportBtn hhPcQuick';q.textContent='📋 Project Control';q.onclick=function(){window.hhPcOpen()};var links=card.querySelector('.hhImportAdapterLinks');if(links)links.appendChild(q);else card.appendChild(q);
}

window.hhPcOpen=async function(){
 ensureUi();document.getElementById('hhPcOv').classList.add('on');
 try{await load();render()}catch(e){document.getElementById('hhPcBody').innerHTML='<div class="hhPcEmpty">'+esc(e.message||e)+'</div>'}
};
window.hhPcClose=function(){document.getElementById('hhPcOv')?.classList.remove('on');detailId=null};
window.hhPcTab=function(t){tab=t;detailId=null;render()};
window.hhPcOpenAction=function(id){detailId=id;render()};
window.hhPcBack=function(){detailId=null;render()};
window.hhPcStatusFilter=function(v){filterStatus=v;render()};
window.hhPcEpicFilter=function(v){filterEpic=v;render()};
window.hhPcSearch=function(v){searchText=v;render()};
window.hhPcNewAction=function(){detailId='__new__';render()};
window.hhPcSaveAction=function(id){
 var ov=overrides(),x=one(id);if(!x)return;
 ov[id]=Object.assign({},ov[id]||{},{
   status:document.getElementById('hhPcEditStatus').value,
   priority:document.getElementById('hhPcEditPriority').value,
   progress:Number(document.getElementById('hhPcEditProgress').value)/100,
   targetDate:document.getElementById('hhPcEditTarget').value||null,
   owner:document.getElementById('hhPcEditOwner').value.trim(),
   notes:document.getElementById('hhPcEditNotes').value.trim(),
   localUpdatedAt:new Date().toISOString()
 });
 writeJson(LS_OV,ov);toast('Project action elmentve');render();
};
window.hhPcResetAction=function(id){if(!confirm('Visszaállítod ezt az actiont a master állapotra?'))return;var ov=overrides();delete ov[id];writeJson(LS_OV,ov);toast('Master állapot visszaállítva');render()};
window.hhPcCreateAction=function(){
 var title=document.getElementById('hhPcNewTitle').value.trim();if(!title)return toast('Az action neve szükséges.');
 var l=locals(),id='HH-LOCAL-'+String(Date.now()).slice(-7);
 l.push({id:id,epic:document.getElementById('hhPcNewEpic').value.trim()||'HealthHub Core',feature:'Local Action',title:title,acceptanceCriteria:'Helyi Project Control action',priority:document.getElementById('hhPcNewPriority').value,sprint:'Backlog',milestone:'Local',status:document.getElementById('hhPcNewStatus').value,progress:0,storyPoints:1,owner:'Zsolt + Léna',dependency:'',targetDate:document.getElementById('hhPcNewTarget').value||null,actualDone:null,notes:document.getElementById('hhPcNewNotes').value.trim(),createdAt:new Date().toISOString()});
 writeJson(LS_LOCAL,l);detailId=id;toast('Új action létrehozva');render();
};
window.hhPcExport=function(){
 var payload={exportedAt:new Date().toISOString(),masterUpdatedAt:data?.updatedAt||null,overrides:overrides(),localActions:locals(),mergedActions:mergedActions()};
 dl(payload,'HealthHub_Project_Control_'+new Date().toISOString().slice(0,10)+'.json');
};

var prevHaOpen=window.haOpen;
if(typeof prevHaOpen==='function')window.haOpen=function(){var r=prevHaOpen.apply(this,arguments);scheduleInject();return r};
var prevRender=window.renderHealthSection;
if(typeof prevRender==='function')window.renderHealthSection=async function(){var r=await prevRender.apply(this,arguments);decorateMore();return r};

ensureUi();setTimeout(function(){decorateMore();if(document.getElementById('haOv')?.classList.contains('on'))scheduleInject()},180);
document.documentElement.dataset.healthhubProjectControl='1.42';
window.HH_LIVE_BUILD='v1.42-project-control';
})();