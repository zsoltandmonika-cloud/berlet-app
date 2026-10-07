import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.HEALTHHUB_URL || 'http://127.0.0.1:8000/healthhub/';
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
await settle(2500);
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
  generatedAt:new Date().toISOString(),baseURL,loadWallMs,start:startSnap,final:finalSnap,
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
await fs.writeFile('benchmark-results/healthhub-runtime-benchmark.json',JSON.stringify(report,null,2));
const md=[
  '# HealthHub Runtime Benchmark',
  '',
  '- Build: '+(report.start.build||'unknown'),
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
await fs.writeFile('benchmark-results/healthhub-runtime-benchmark.md',md);

console.log(md);
await browser.close();
