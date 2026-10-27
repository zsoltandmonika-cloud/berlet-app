'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const api=require(path.join(root,'usage-control/github-live-v872.js'));
const html=fs.readFileSync(path.join(root,'usage-control/index.html'),'utf8');
const mk=(id,at,name,conclusion='success')=>({id,name,created_at:at,status:'completed',conclusion});
test('GitHub REST URL includes public repository, selected month and one bounded page',()=>{
 const u=new URL(api.endpoint('2026-10'));
 assert.equal(u.origin,'https://api.github.com');
 assert.equal(u.pathname,'/repos/zsoltandmonika-cloud/berlet-app/actions/runs');
 assert.equal(u.searchParams.get('per_page'),'100');
 assert.equal(u.searchParams.get('page'),'1');
 assert.equal(u.searchParams.get('created'),'2026-10-01..2026-10-31');
 assert.equal(api.monthRange('2026-02'),'2026-02-01..2026-02-28');
 assert.equal(api.monthRange('2028-02'),'2028-02-01..2028-02-29');
 assert.throws(()=>api.monthRange('2026-13'));
 assert.throws(()=>api.monthRange('bad'));
});
test('Read-only fetch retains only validated, relevant, non-sensitive run fields',async()=>{
 let calls=0;
 const fake=async(url,options)=>{
  calls++;
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Accept,'application/vnd.github+json');
  assert.doesNotMatch(JSON.stringify(options),/Authorization|Bearer|token|sk-proj/i);
  assert.match(url,/actions\/runs/);
  return {ok:true,status:200,async json(){return{total_count:4,workflow_runs:[
   mk(1,'2026-10-22T00:00:00Z','Deploy','success'),
   mk(2,'2026-10-22T01:00:00Z','Guard','failure'),
   mk(3,'2026-10-22T02:00:00Z','Guard','success'),
   mk(4,'2026-09-30T23:59:00Z','Exclude','success'),
   mk(-1,'2026-10-23T04:00:00Z','Invalid','failure')
  ]}}};
 };
 const data=await api.fetchRuns('2026-10',fake);
 assert.equal(calls,1);
 assert.equal(data.rows.length,3);
 assert.equal(data.reportedTotal,4);
 assert.equal(data.isComplete,false);
 assert.deepEqual(Object.keys(data.rows[0]),['id','name','created_at','conclusion','status']);
 const sum=api.summarize(data);
 assert.equal(sum[0].name,'Guard');
 assert.equal(sum[0].count,2);
 assert.equal(sum[0].failed,1);
 assert.equal(sum[1].name,'Deploy');
});
test('429 and malformed server responses fail closed, no retry storm',async()=>{
 let calls=0;
 await assert.rejects(api.fetchRuns('2026-10',async()=>{calls++;return{ok:false,status:429}}),/limit/);
 assert.equal(calls,1);
 await assert.rejects(api.fetchRuns('2026-10',async()=>({ok:true,json:async()=>({broken:1})})),/Érvénytelen/);
});
test('6-hour local cache scopes by month and rejects expired data',()=>{
 const db=new Map(),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
 const x={schema:'sh9.github.actions/1',month:'2026-10',fetchedAt:'2026-10-27T07:00:00Z',
  reportedTotal:1,rows:[api.cleanRun(mk(88,'2026-10-26T07:00:00Z','Docs'))]};
 assert.equal(api.save(storage,x),true);
 assert.equal(api.load(storage,'2026-10',Date.parse('2026-10-27T08:00:00Z')).rows[0].id,88);
 assert.equal(api.load(storage,'2026-11',Date.parse('2026-10-27T08:00:00Z')),null);
 assert.equal(api.load(storage,'2026-10',Date.parse('2026-10-27T13:00:00Z')),null);
 assert.equal(api.runUrl(88),'https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/88');
});
test('S24 dashboard presents explicit action and separates Billing from run stats',()=>{
 assert.match(html,/id="githubActionsLoadV872"/);
 assert.match(html,/id="githubActionsRowsV872"/);
 assert.match(html,/github-live-v872.js\?v=872-public-actions/);
 assert.match(html,/@media\(max-width:600px\)/);
 assert.match(html,/GitHub Usage & Billing/);
 assert.match(html,/nem azonosak a Billing/);
 assert.doesNotMatch(html,/setInterval\(/);
 const src=fs.readFileSync(path.join(root,'usage-control/github-live-v872.js'),'utf8');
 assert.match(src,/button\.addEventListener\('click'/);
 assert.doesNotMatch(src,/setInterval\(|setTimeout\(|service_role|ghp_[A-Za-z0-9]{20,}/);
 assert.match(src,/const TTL=6\*60\*60\*1000/);
 assert.match(src,/const MAX=100/);
});
