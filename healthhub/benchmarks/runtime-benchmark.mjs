import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.HEALTHHUB_URL || 'http://127.0.0.1:8000/healthhub/';
const mode = process.env.BENCH_MODE || 'clean';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });

await context.addInitScript(() => {
  window.__hhBench = { longTasks: [], errors: [], warnings: [] };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__hhBench.longTasks.push({startTime:e.startTime,duration:e.duration,name:e.name});
      }
    }).observe({entryTypes:['longtask']});
  } catch {}
  window.addEventListener('error', e => window.__hhBench.errors.push(String(e.message || e.error || 'error')));
  window.addEventListener('unhandledrejection', e => window.__hhBench.errors.push('unhandledrejection: '+String(e.reason || 'unknown')));
  const ow=console.warn, oe=console.error;
  console.warn=(...a)=>{window.__hhBench.warnings.push(a.map(String).join(' ')); return ow.apply(console,a)};
  console.error=(...a)=>{window.__hhBench.errors.push(a.map(String).join(' ')); return oe.apply(console,a)};
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
await cdp.send('Profiler.enable');

const network = [];
const reqStart = new Map();
page.on('request', req => reqStart.set(req, Date.now()));
page.on('requestfinished', req => {
  const st=reqStart.get(req); if(st) network.push({url:req.url(),method:req.method(),ms:Date.now()-st,ok:true});
});
page.on('requestfailed', req => {
  const st=reqStart.get(req); network.push({url:req.url(),method:req.method(),ms:st?Date.now()-st:null,ok:false,failure:req.failure()?.errorText||''});
});
const consoleMessages=[];
page.on('console', msg => {
  if(['warning','error'].includes(msg.type())) consoleMessages.push({type:msg.type(),text:msg.text()});
});

function metricsMap(arr){return Object.fromEntries((arr.metrics||[]).map(m=>[m.name,m.value]))}
function delta(a,b,n){return (b[n]||0)-(a[n]||0)}
async function getMetrics(){return metricsMap(await cdp.send('Performance.getMetrics'))}

async function snap(label){
  return await page.evaluate((label)=>({
    label,
    t:performance.now(),
    nodes:document.getElementsByTagName('*').length,
    profile:localStorage.getItem('hh-profile'),
    build:document.querySelector('meta[name="healthhub-live-build"]')?.content||null,
    adminOpen:!!document.querySelector('#haOv.on'),
    scrollY:window.scrollY
  }),label);
}
async function longTaskCount(){return await page.evaluate(()=>window.__hhBench?.longTasks?.length||0)}
async function settle(ms=650){await page.waitForTimeout(ms)}
async function measureAction(name, fn, settleMs=700){
  const beforeM=await getMetrics(), beforeLT=await longTaskCount(), before=await snap(name+':before');
  const clickToPaint=await page.evaluate(async ({name})=>{
    const t=performance.now();
    const dispatch=window.__hhBenchDispatch?.[name];
    if(typeof dispatch!=='function') throw new Error('Missing benchmark dispatch '+name);
    await dispatch();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return performance.now()-t;
  },{name});
  await settle(settleMs);
  const afterM=await getMetrics(), afterLT=await longTaskCount(), after=await snap(name+':after');
  return {
    name,clickToPaintMs:+clickToPaint.toFixed(1),
    longTasks:afterLT-beforeLT,
    taskMs:+(delta(beforeM,afterM,'TaskDuration')*1000).toFixed(1),
    scriptMs:+(delta(beforeM,afterM,'ScriptDuration')*1000).toFixed(1),
    layoutMs:+(delta(beforeM,afterM,'LayoutDuration')*1000).toFixed(1),
    styleMs:+(delta(beforeM,afterM,'RecalcStyleDuration')*1000).toFixed(1),
    domNodesBefore:before.nodes,domNodesAfter:after.nodes,
    profileBefore:before.profile,profileAfter:after.profile
  };
}

await cdp.send('Profiler.start');
const navStart=Date.now();
await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForFunction(()=>document.body && document.body.innerText.includes('HealthHub'),null,{timeout:30000});
await settle(1800);

if(mode==='localstate'||mode==='idbstress'){
  await page.evaluate(()=>{
    const now=Date.now(), iso=new Date().toISOString();
    const errors=Array.from({length:180},(_,i)=>({
      id:'bench-e-'+i,createdAt:new Date(now-i*60000).toISOString(),level:i%4===0?'warn':'error',
      source:'benchmark.synthetic',message:'Synthetic historical HealthHub diagnostic '+i,
      detail:'stack '+('x'.repeat(1800))
    }));
    localStorage.setItem('hh-error-log-v1',JSON.stringify(errors));
    const health=Array.from({length:60},(_,i)=>({
      at:new Date(now-i*3600000).toISOString(),score:55+(i%35),rag:{k:'amber',label:'AMBER',icon:'🟠'},
      errors:{errors24:53,warnings24:40},perf:{avgLoad:1900,longTasks:250,storage:{usage:90000000,quota:10800000000}}
    }));
    localStorage.setItem('hh-ai-health-history-v1',JSON.stringify(health));
    const wishes=Array.from({length:20},(_,i)=>({
      id:'WISH-'+String(i+1).padStart(3,'0'),title:'Synthetic benchmark wish '+(i+1),
      type:'Feature',impact:'High',complexity:'M',feasibility:'High',requestedBy:'Zsolt',
      status:i<8?'Approved':'Backlog',executionStatus:i<8?'Queued':'',description:'Benchmark wish '+('d'.repeat(240))
    }));
    localStorage.setItem('hh-ai-wishlist-v1',JSON.stringify(wishes));
    const jobs=Array.from({length:20},(_,i)=>({
      jobId:'JOB-BENCH-'+i,wishId:'WISH-'+String(i+1).padStart(3,'0'),title:'Benchmark job '+i,
      status:i<6?'Queued':'Done',phase:i<6?'Awaiting AI executor':'Verify',progress:i<6?8:100,
      createdAt:iso,updatedAt:iso,message:'Benchmark '+('m'.repeat(180)),
      steps:['Approve','Backup','Analyze','Patch','Test','Deploy','Verify'].map((n,j)=>({name:n,status:j<(i<6?1:7)?'Done':'Pending'}))
    }));
    localStorage.setItem('hh-ai-code-jobs-v1',JSON.stringify(jobs));
    const days={};
    for(let i=0;i<30;i++){
      const d=new Date(now-i*86400000).toISOString().slice(0,10);
      days[d]={sessions:3,loadCount:3,loadTotalMs:5800,longTaskCount:300,longTaskTotalMs:200000,healthChecks:10,healthCheckTotalMs:7};
    }
    localStorage.setItem('hh-ai-telemetry-v1',JSON.stringify({schema:'healthhub.ops-telemetry/1',days,lastStorage:{usage:90000000,quota:10800000000}}));
  });

  if(mode==='idbstress'){
    await page.evaluate(async()=>{
      if(!indexedDB.databases)return;
      const dbs=await indexedDB.databases();
      const now=Date.now();
      const payload='p'.repeat(640);
      for(const info of dbs){
        if(!info.name)continue;
        await new Promise(resolve=>{
          const req=indexedDB.open(info.name);
          req.onerror=()=>resolve();
          req.onsuccess=async()=>{
            const db=req.result;
            const targets=[];
            for(const name of Array.from(db.objectStoreNames)){
              const lower=name.toLowerCase();
              let count=0;
              if(lower.includes('measurement'))count=2500;
              else if(lower.includes('document')&&!lower.includes('blob'))count=700;
              else if(lower.includes('appointment'))count=600;
              else if(lower.includes('medication'))count=400;
              else if(lower.includes('sleep'))count=1200;
              else if(lower.includes('activity'))count=1200;
              if(count)targets.push({name,count});
            }
            for(const target of targets){
              try{
                const tx=db.transaction(target.name,'readwrite'),store=tx.objectStore(target.name);
                const kp=store.keyPath;
                let hasUnique=false;
                for(const iname of Array.from(store.indexNames)){
                  try{if(store.index(iname).unique){hasUnique=true;break}}catch{}
                }
                if(hasUnique||!kp||Array.isArray(kp))continue;
                for(let i=0;i<target.count;i++){
                  const t=new Date(now-i*60000).toISOString();
                  const rec={
                    profile:i%2?'zsolt':'monika', measuredAt:t, date:t.slice(0,10), appointmentDate:t,
                    createdAt:t, updatedAt:t, title:'Benchmark '+target.name+' '+i, name:'Benchmark '+i,
                    category:'benchmark', systolic:120+(i%8), diastolic:75+(i%6), pulse:65+(i%15),
                    weightKg:78+(i%20)/10, bloodGlucose:5.4, oxygenSaturation:97,
                    steps:5000+(i%5000), durationMinutes:420, notes:payload
                  };
                  rec[kp]='bench-'+target.name+'-'+i;
                  try{store.put(rec)}catch{}
                }
                await new Promise(r=>{tx.oncomplete=r;tx.onerror=r;tx.onabort=r});
              }catch{}
            }
            db.close();resolve();
          };
        });
      }
    });
  }
  await page.reload({waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>document.body && document.body.innerText.includes('HealthHub'),null,{timeout:30000});
  await settle(1800);
}
const loadWallMs=Date.now()-navStart;

await page.evaluate(()=>{
  window.__hhBenchDispatch={
    profileToggle: async()=>{ if(typeof window.hhToggleProfileOneClick==='function') window.hhToggleProfileOneClick(); else if(typeof window.setProfile==='function') window.setProfile(localStorage.getItem('hh-profile')==='m'?'z':'m'); },
    adminOpen: async()=>{ if(typeof window.haOpen!=='function') throw new Error('haOpen missing'); window.haOpen(); },
    workspaceOpen: async()=>{ if(typeof window.hhAiToggleWorkspace303!=='function') throw new Error('workspace toggle missing'); window.hhAiToggleWorkspace303(); },
    jobsOpen: async()=>{ if(typeof window.hhL3ToggleJobs303!=='function') throw new Error('jobs toggle missing'); window.hhL3ToggleJobs303(); },
    errorLogOpen: async()=>{ if(typeof window.hhErrorLogToggle303!=='function') throw new Error('error log toggle missing'); window.hhErrorLogToggle303(); },
    adminClose: async()=>{ if(typeof window.haClose==='function') window.haClose(); }
  };
});

const idbInventory=await page.evaluate(async()=>{
  const result=[];
  if(!indexedDB.databases)return result;
  for(const info of await indexedDB.databases()){
    if(!info.name)continue;
    try{
      const row=await new Promise(resolve=>{
        const req=indexedDB.open(info.name);
        req.onerror=()=>resolve({name:info.name,error:String(req.error||'open failed')});
        req.onsuccess=async()=>{
          const db=req.result,stores=[];
          for(const name of Array.from(db.objectStoreNames)){
            try{
              const tx=db.transaction(name,'readonly'),store=tx.objectStore(name);
              const count=await new Promise(r=>{const q=store.count();q.onsuccess=()=>r(q.result);q.onerror=()=>r(-1)});
              stores.push({name,count,keyPath:store.keyPath,autoIncrement:store.autoIncrement});
            }catch(e){stores.push({name,error:String(e)})}
          }
          db.close();resolve({name:info.name,version:info.version,stores});
        };
      });
      result.push(row);
    }catch(e){result.push({name:info.name,error:String(e)})}
  }
  return result;
});
const localState=await page.evaluate(()=>{
  let bytes=0,keys={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i),v=localStorage.getItem(k)||'';bytes+=(k.length+v.length)*2;
    if(/^hh-(error|ai|profile|health|dropbox)/.test(k))keys[k]=v.length;
  }
  return {entries:localStorage.length,approxBytes:bytes,selectedKeyLengths:keys};
});
const startMetrics=await getMetrics();
const startSnap=await snap('loaded');
const actions=[];
actions.push(await measureAction('profileToggle',null,900));
actions.push(await measureAction('profileToggle',null,900));
actions.push(await measureAction('adminOpen',null,900));

const scrollBench = await page.evaluate(async()=>{
  const el=document.querySelector('#haOv .haSheet')||document.scrollingElement;
  if(!el) return {error:'no scroll container'};
  const frames=[],start=performance.now(); let last=start;
  const max=Math.max(0,el.scrollHeight-el.clientHeight);
  for(let i=0;i<=40;i++){
    const t=performance.now(); frames.push(t-last); last=t;
    el.scrollTop=max*(i/40);
    await new Promise(r=>requestAnimationFrame(r));
  }
  for(let i=40;i>=0;i--){
    const t=performance.now(); frames.push(t-last); last=t;
    el.scrollTop=max*(i/40);
    await new Promise(r=>requestAnimationFrame(r));
  }
  const gaps=frames.filter(x=>x>50);
  return {
    totalMs:+(performance.now()-start).toFixed(1),
    frames:frames.length,
    maxFrameGapMs:+Math.max(...frames).toFixed(1),
    over50ms:gaps.length,
    over100ms:frames.filter(x=>x>100).length,
    avgFrameMs:+(frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(1),
    scrollHeight:el.scrollHeight,clientHeight:el.clientHeight
  };
});
await settle(500);

actions.push(await measureAction('workspaceOpen',null,700));
actions.push(await measureAction('jobsOpen',null,700));
actions.push(await measureAction('errorLogOpen',null,700));
actions.push(await measureAction('adminClose',null,500));

const endMetrics=await getMetrics();
const finalSnap=await snap('final');
const benchState=await page.evaluate(()=>window.__hhBench);
const cpu=await cdp.send('Profiler.stop');

const nodeById=new Map(cpu.profile.nodes.map(n=>[n.id,n]));
const sampleTime=new Map();
if(cpu.profile.samples && cpu.profile.timeDeltas){
  for(let i=0;i<cpu.profile.samples.length;i++){
    const id=cpu.profile.samples[i],dt=cpu.profile.timeDeltas[i]||0;
    sampleTime.set(id,(sampleTime.get(id)||0)+dt);
  }
}
const hotspots=[...sampleTime.entries()].map(([id,us])=>{
  const n=nodeById.get(id)||{}; const cf=n.callFrame||{};
  return {function:cf.functionName||'(anonymous)',url:cf.url||'',line:(cf.lineNumber??-1)+1,ms:+(us/1000).toFixed(1)};
}).filter(x=>x.ms>0).sort((a,b)=>b.ms-a.ms).slice(0,40);

const report={
  generatedAt:new Date().toISOString(),baseURL,mode,loadWallMs,start:startSnap,final:finalSnap,idbInventory,localState,
  actions,scroll:scrollBench,
  totals:{
    taskMs:+(delta(startMetrics,endMetrics,'TaskDuration')*1000).toFixed(1),
    scriptMs:+(delta(startMetrics,endMetrics,'ScriptDuration')*1000).toFixed(1),
    layoutMs:+(delta(startMetrics,endMetrics,'LayoutDuration')*1000).toFixed(1),
    styleMs:+(delta(startMetrics,endMetrics,'RecalcStyleDuration')*1000).toFixed(1),
    jsHeapDeltaMB:+(delta(startMetrics,endMetrics,'JSHeapUsedSize')/1048576).toFixed(2),
    longTasks:benchState.longTasks.length,
    longTaskMs:+benchState.longTasks.reduce((s,x)=>s+x.duration,0).toFixed(1),
    consoleErrors:benchState.errors.length,
    consoleWarnings:benchState.warnings.length,
    networkRequests:network.length,
    slowNetworkRequests:network.filter(x=>x.ms!=null&&x.ms>300).length
  },
  hotspots,
  longTasks:benchState.longTasks.slice(0,100),
  errors:benchState.errors.slice(0,100),
  warnings:benchState.warnings.slice(0,100),
  consoleMessages:consoleMessages.slice(0,100),
  slowNetwork:network.filter(x=>x.ms!=null&&x.ms>300).sort((a,b)=>b.ms-a.ms).slice(0,50)
};

await fs.mkdir('benchmark-results',{recursive:true});
await fs.writeFile('benchmark-results/healthhub-runtime-benchmark-'+mode+'.json',JSON.stringify(report,null,2));
const md=[
  '# HealthHub Runtime Benchmark · '+mode.toUpperCase(),
  '',
  '- Mode: **'+mode+'**',
  '- Build: '+(report.start.build||'unknown'),
  '- localStorage: **'+Math.round(localState.approxBytes/1024)+' KB / '+localState.entries+' keys**',
  '- IndexedDB: '+idbInventory.map(db=>db.name+' ['+(db.stores||[]).map(s=>s.name+':'+s.count).join(', ')+']').join(' · '),
  '- Load wall time: **'+report.loadWallMs+' ms**',
  '- Total main-thread task time: **'+report.totals.taskMs+' ms**',
  '- Total script time: **'+report.totals.scriptMs+' ms**',
  '- Total layout time: **'+report.totals.layoutMs+' ms**',
  '- Long tasks: **'+report.totals.longTasks+' / '+report.totals.longTaskMs+' ms**',
  '- DOM nodes loaded: **'+report.start.nodes+'** → final **'+report.final.nodes+'**',
  '',
  '## Actions',
  '',
  '| Action | Click→paint | Task | Script | Layout | Long tasks | DOM nodes |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...actions.map(a=>'| '+a.name+' | '+a.clickToPaintMs+' ms | '+a.taskMs+' ms | '+a.scriptMs+' ms | '+a.layoutMs+' ms | '+a.longTasks+' | '+a.domNodesAfter+' |'),
  '',
  '## Admin scroll',
  '',
  '- Total: **'+scrollBench.totalMs+' ms**',
  '- Average frame gap: **'+scrollBench.avgFrameMs+' ms**',
  '- Max frame gap: **'+scrollBench.maxFrameGapMs+' ms**',
  '- >50 ms frames: **'+scrollBench.over50ms+'**',
  '- >100 ms frames: **'+scrollBench.over100ms+'**',
  '',
  '## Top CPU hotspots',
  '',
  '| ms | Function | Source |',
  '|---:|---|---|',
  ...hotspots.slice(0,20).map(h=>'| '+h.ms+' | '+String(h.function).replaceAll('|','\\|')+' | '+String(h.url).replace(baseURL,'./')+':'+h.line+' |')
].join('\n');
await fs.writeFile('benchmark-results/healthhub-runtime-benchmark-'+mode+'.md',md);

console.log(md);
await browser.close();
