/* SH9 v872 · public GitHub Actions visibility, read-only & on-demand.
 * NOT billing: a workflow run is not a billable Linux minute.
 * One GitHub REST GET / explicit user tap, then 6h session-local cache.
 * No token, private identities, hidden polling, backend writes or health data. */
(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
else {
 root.SH9_GITHUB_ACTIONS_V872=api;
 const boot=()=>api.mount(root.document,root);
 if(root.document.readyState==='loading')
  root.document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
}
})(typeof window==='object'?window:globalThis,function(){
'use strict';
const BASE='https://api.github.com/repos/zsoltandmonika-cloud/berlet-app';
const REPORT='https://github.com/settings/billing';
const KEY='sh9-public-github-actions-v872';
const TTL=6*60*60*1000;
const MAX=100;
function monthRange(month){
 if(!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Érvénytelen hónap.');
 const y=Number(month.slice(0,4)),m=Number(month.slice(5));
 if(y<2020||y>2100)throw Error('Érvénytelen év.');
 const last=new Date(Date.UTC(y,m,0)).getUTCDate();
 return month+'-01..'+month+'-'+String(last).padStart(2,'0');
}
function endpoint(month){
 const u=new URL(BASE+'/actions/runs');
 u.searchParams.set('per_page',String(MAX));
 u.searchParams.set('page','1');
 u.searchParams.set('created',monthRange(month));
 return u.toString();
}
function cleanRun(x){
 if(!x||!Number.isSafeInteger(x.id)||x.id<1)return null;
 const stamp=Date.parse(x.created_at||'');
 if(!Number.isFinite(stamp))return null;
 const name=String(x.name||'Ismeretlen workflow').slice(0,110);
 const conclusion=['success','failure','cancelled','skipped','timed_out','neutral','action_required','stale'].includes(x.conclusion)?x.conclusion:null;
 const status=['completed','in_progress','queued','requested','waiting','pending'].includes(x.status)?x.status:'unknown';
 return {id:x.id,name,created_at:new Date(stamp).toISOString(),conclusion,status};
}
async function fetchRuns(month,fetcher){
 if(typeof fetcher!=='function')throw Error('A hálózat nem érhető el.');
 const response=await fetcher(endpoint(month),{method:'GET',
  headers:{Accept:'application/vnd.github+json'},
  cache:'no-store'});
 if(!response||!response.ok){
  const status=response&&Number.isInteger(response.status)?response.status:0;
  throw Error(status===403||status===429?
   'GitHub API limit / tiltás (HTTP '+status+'). Nincs újrapróbálkozás; használd a mentett eredményt.':
   'GitHub API nem elérhető (HTTP '+status+').');
 }
 const obj=await response.json();
 if(!obj||!Array.isArray(obj.workflow_runs))throw Error('Érvénytelen GitHub API válasz.');
 const rows=obj.workflow_runs.slice(0,MAX).map(cleanRun).filter(Boolean)
  .filter(x=>x.created_at.slice(0,7)===month);
 const unique=new Map(rows.map(r=>[r.id,r]));
 const total=Number.isSafeInteger(obj.total_count)&&obj.total_count>=0?obj.total_count:null;
 return {schema:'sh9.github.actions/1',month,repo:'zsoltandmonika-cloud/berlet-app',
  fetchedAt:new Date().toISOString(),reportedTotal:total,
  rows:[...unique.values()],source:BASE+'/actions/runs',isComplete:total!==null&&total<=unique.size&&rows.length===total};
}
function summarize(data){
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const map=new Map();
 for(const r of rows){
  const name=String(r.name||'Ismeretlen workflow').slice(0,110);
  const c=map.get(name)||{name,count:0,failed:0,succeeded:0,pending:0};
  c.count++;
  if(r.conclusion==='failure'||r.conclusion==='timed_out')c.failed++;
  else if(r.conclusion==='success')c.succeeded++;
  else if(r.status!=='completed')c.pending++;
  map.set(name,c);
 }
 return [...map.values()].sort((a,b)=>b.count-a.count||b.failed-a.failed||a.name.localeCompare(b.name)).slice(0,10);
}
function safeCached(obj,month,now){
 if(!obj||obj.schema!=='sh9.github.actions/1'||obj.month!==month||!Array.isArray(obj.rows)||
  obj.rows.length>MAX||obj.rows.some(r=>!cleanRun(r)))return null;
 const stamp=Date.parse(obj.fetchedAt||'');
 if(!Number.isFinite(stamp)||stamp>now+60000||now-stamp>=TTL)return null;
 return obj;
}
function runUrl(id){
 if(!Number.isSafeInteger(id)||id<1)return BASE+'/actions';
 return 'https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/'+id;
}
function load(store,month,now){
 try{return safeCached(JSON.parse(store.getItem(KEY+'-'+month)||'null'),month,now)}catch(_){return null}
}
function save(store,data){
 try{store.setItem(KEY+'-'+data.month,JSON.stringify(data));return true}catch(_){return false}
}
function mount(doc,w){
 const button=doc.getElementById('githubActionsLoadV872'),root=doc.getElementById('githubActionsRowsV872');
 if(!button||!root)return;
 const status=doc.getElementById('githubActionsStatusV872');
 const month=doc.getElementById('month');
 const browser=()=>w.localStorage;
 let busy=false,active=null;
 const mk=(tag,cls,value)=>{
  const n=doc.createElement(tag);if(cls)n.className=cls;
  if(value!==undefined)n.textContent=String(value);
  return n;
 };
 function show(data,source){
  active=data;root.replaceChildren();
  const rows=data.rows,known=data.reportedTotal,full=data.isComplete;
  const note=mk('p','small','Minta: '+rows.length+
   (known!==null?' / '+known+' havi futás':' futás')+
   ' · '+(full?'teljes a GitHub API szerint':'részleges minta, nem teljes havi audit')+
   ' · lekérve: '+new Date(data.fetchedAt).toLocaleString('hu-HU')+
   (source==='cache'?' · 6 órás helyi cache':' · GitHub REST API'));
  root.append(note);
  if(!rows.length){root.append(mk('div','empty','Nincs GitHub Actions futás a kiválasztott hónapban.'));return}
  const k=mk('div','github-live-kpis');
  k.append(mk('span','pill','Látott futások: '+rows.length),
   mk('span','pill','Hibás: '+rows.filter(r=>r.conclusion==='failure'||r.conclusion==='timed_out').length));
  root.append(k);
  const max=Math.max(...summarize(data).map(x=>x.count),1);
  for(const rec of summarize(data)){
   const entry=mk('div','github-live-row');
   const label=mk('span','github-live-label',rec.name);
   const track=mk('div','track'),fill=mk('div','fill '+(rec.failed?'warn':'good'));
   fill.style.width=(100*rec.count/max).toFixed(2)+'%';track.append(fill);
   entry.append(label,track,mk('strong','',rec.count+' futás'+(rec.failed?' · '+rec.failed+' hiba':'')));
   root.append(entry);
  }
  const latest=rows[0];
  const link=mk('a','github-live-link','Utolsó futtatás megnyitása a GitHubon');
  link.href=runUrl(latest.id);link.target='_blank';link.rel='noopener noreferrer';
  root.append(link,mk('p','tiny muted','A futások darabszáma és eredménye NEM a számlázott Linux-perc vagy USD. Azokhoz külön Billing hozzáférés kell.'));
 }
 function showLocal(){
  if(busy)return;
  const data=load(browser(),month.value,Date.now());
  if(data){show(data,'cache');status.textContent='✓ Helyi, 6 órán belüli GitHub-mérés.'}
  else {active=null;root.replaceChildren(mk('div','empty','Még nincs lekért GitHub-minta ehhez a hónaphoz. A frissítés csak kattintásra indul.'));status.textContent='Nincs helyi minta.'}
 }
 button.addEventListener('click',async()=>{
  if(busy)return;
  const m=month.value,cached=load(browser(),m,Date.now());
  if(cached){show(cached,'cache');status.textContent='✓ Cache használatban, nincs új GitHub API-hívás.';return}
  busy=true;button.disabled=true;status.textContent='GitHub Actions futtatások lekérdezése…';
  try{
   const d=await fetchRuns(m,(url,opts)=>w.fetch(url,opts));
   if(month.value!==m){status.textContent='A hónap időközben változott. Válaszd újra a lekérést.';return}
   save(browser(),d);show(d,'network');
   status.textContent='✓ GitHub REST API · '+d.rows.length+' mintavételezett futás.';
  }catch(e){status.textContent='⚠ '+String(e&&e.message||e);if(active)show(active,'cache')}
  finally{busy=false;button.disabled=false}
 });
 month.addEventListener('change',showLocal);
 showLocal();
}
return Object.freeze({monthRange,endpoint,cleanRun,fetchRuns,summarize,safeCached,runUrl,load,save,mount,BASE,REPORT,TTL,MAX});
});
