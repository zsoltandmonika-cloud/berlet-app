'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const guardian=file('healthhub/guardian/guardian-live-pilot-v793.js');
const backend=file('supabase/functions/hh-bkk-live-v793-preview/index.ts');
const client=file('healthhub/guardian/smart-260-connect/smart-delay-client-v1.mjs');
const app=file('healthhub/guardian/smart-260-connect/app.mjs');
const html=file('healthhub/guardian/smart-260-connect/index.html');
const css=file('healthhub/guardian/smart-260-connect/smart-delay-v1.css');
const core=require('../guardian/bkk-smart-delay-v1.js');
function setup(){
 const store=new Map(),localStorage={
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)
 };
 const w={localStorage,HH_BKK_SMART_DELAY_V1:core};
 const shareSource=guardian.slice(guardian.indexOf("const SMART_MATCH_FYI_KEY="),
  guardian.indexOf("// Live map visibility is a presentation toggle"));
 assert.ok(shareSource.includes('function shareSmartMatchPredictions('));
 const share=vm.runInNewContext(shareSource+'\nshareSmartMatchPredictions',{w,Date,Number,Map,Set,JSON});
 const document={getElementById(){return null},querySelectorAll(){return []},
  createElement(){return {dataset:{},setAttribute(k,v){this[k]=v}}}};
 const pure=client.replace(/^import .*\n/m,'').split('function boot(){')[0];
 const api=vm.runInNewContext(pure+'\n({snapshot,getMatch,chip})',
  {window:w,document,localStorage,Intl,Date,Number,JSON,Set,Object});
 return {share,api,store};
}
function data(delaySeconds=240,precision='minute'){
 const now=Date.now(),stamp=new Date(now-1000).toISOString();
 const planned=Math.ceil((now+60000)/60000)*60000;
 return {stamp,planned,item:{routeKey:'bus:260',stopId:'BKK_056124',
  scheduledMs:planned,predictedMs:planned+delaySeconds*1000,delaySeconds,
  asOf:stamp,...(precision?{delayPrecision:precision}:{})}};
}
test('SHO v937 reuses Family Guard response and does not request a second BKK API feed',()=>{
 assert.equal([...client.matchAll(/\bfetch\s*\(/g)].length,0);
 assert.doesNotMatch(client,/getSession\(|signInWithOAuth|setInterval\(\s*async/);
 assert.doesNotMatch(client,/compute\(|replan\(|fetchLive\(/);
 assert.match(guardian,/\+'&predictions=1&smartMatch=1'/);
 assert.equal([...guardian.matchAll(/await w\.fetch\(/g)].length,1);
 assert.match(backend,/const shareMatch=predictionMode&&query\.get\("smartMatch"\)==="1"/);
 assert.match(backend,/const departureKnown=dep!==null\|\|inferred\?\.kind==="departure"/);
 assert.match(backend,/n>=400/);
});
test('cross-page cache stores only validated official public BKK stop updates',()=>{
 const {share,store,api}=setup(),{stamp,planned,item}=data();
 share({delayGeneratedAt:stamp,stopPredictions:[
  item,{...item,routeKey:'bogus:41'},{...item,stopId:'<script>'}],
  access_token:'SECRET',lat:47.5,phoneId:'PRIVATE'});
 const raw=store.get('hh-bkk-smart-match-fyi-v937');
 assert.ok(raw);
 assert.doesNotMatch(raw,/SECRET|PRIVATE|<script>/);
 const parsed=JSON.parse(raw);
 assert.equal(Object.hasOwn(parsed,'lat'),false);
 assert.equal(Object.hasOwn(parsed,'phoneId'),false);
 assert.equal(parsed.rows.length,1);
 assert.equal(api.snapshot().length,1);
 assert.equal(api.getMatch(api.snapshot(),'bus:260','056124',planned).delaySeconds,240);
 assert.equal(api.getMatch(api.snapshot(),'bus:260','056124',planned+60000),null);
 assert.equal(api.getMatch(api.snapshot(),'tram:17','056124',planned),null);
});
test('estimated zero is never green; earlier/later and exact 0 remain distinct',()=>{
 const {share,api}=setup();
 for(const [seconds,precision,label,status] of [
  [0,'minute','🚌 260 ≈0p','estimated'],
  [-120,'minute','🚌 260 ≈+2p','early'],
  [240,'minute','🚌 260 ≈−4p','late'],
  [0,null,'🚌 260 0p','ontime']]){
  const {stamp,planned,item}=data(seconds,precision);
  share({delayGeneratedAt:stamp,stopPredictions:[item]});
  const match=api.getMatch(api.snapshot(),'bus:260','056124',planned);
  assert.ok(match);
  const chip=api.chip(match,'🚌 260',planned).node;
  assert.equal(chip.textContent,label);
  assert.equal(chip.dataset.delay,status);
 }
});
test('ambiguous, missing, stale or mismatched departures show no FYI',()=>{
 const {share,api}=setup(),{stamp,planned,item}=data();
 assert.equal(api.snapshot(),null);
 share({delayGeneratedAt:stamp,stopPredictions:[item,item]});
 assert.equal(api.getMatch(api.snapshot(),'bus:260','056124',planned),null);
 share({delayGeneratedAt:new Date(Date.now()-120000).toISOString(),stopPredictions:[item]});
 assert.equal(api.snapshot(),null);
});
test('Smart Match cards remain static GTFS and chips are compact FYI only',()=>{
 assert.match(app,/article\.dataset\.bkkStopId=row\.boardingId/);
 assert.match(app,/article\.dataset\.bkkRouteKey=row\.mode\+":"\+row\.line/);
 assert.match(app,/a\.dataset\.busDeparture=String\(bus\.departMs\)/);
 assert.match(client,/\.v34-260-row|querySelectorAll\("\.timeline-row"\)/);
 assert.match(html,/smart-delay-client-v1\.mjs\?v=937-fyi-cache/);
 assert.match(html,/hhSmartDelayHeroV1" class="smart-delay-hero-v1" hidden/);
 assert.match(css,/data-delay="estimated"/);
 assert.match(client,/menetrend változatlan/);
});
