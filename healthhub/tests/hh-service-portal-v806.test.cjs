'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Service Portal is present but never posts automatically or exposes upload API',()=>{
 const source=read('hh-service-portal-v806.js'),index=read('index.html');
 const admin=read('hh-admin-mobile-focus-v748.js');
 assert.match(index,/hh-service-portal-v806\.js\?v=806/);
 assert.match(admin,/Léna Service Portal/);
 assert.match(source,/if\(!w\.confirm\(/);
 assert.match(source,/const ROOT_ID='id:n7qchVNGAogAAAAAAAAABQ'/);
 assert.match(source,/verifyTargetFolder\(\)/);
 assert.match(source,/await check\.text\(\)!==payload/);
 assert.match(source,/Object\.freeze\(\{open,close,snapshot\}\)/);
});
test('Sanitized report contains failures but no raw user health, GPS coordinates, access tokens or Android ID',async()=>{
 const source=read('hh-service-portal-v806.js');
 const now=new Date().toISOString();
 const w={
  isSecureContext:true,healthSectionKind:'more',
  navigator:{onLine:true,userAgent:'Mozilla Android',permissions:{query:async()=>({state:'granted'})}},
  localStorage:{getItem:k=>k==='hh-profile'?'m':k==='hh-service-guardian-gps-v806'?JSON.stringify({at:now,state:'error',errorCode:3}):null},
  hhErrorLogRead:()=>[{at:now,level:'error',source:'console.error',message:'Dropbox 429 secret_token=do-not-copy',detail:'password: never copy'}],
  hhDeviceRegistry401:{registry:()=>({schema:'healthhub.device_registry/1',activePhones:{zsolt:'android-secret-Z',monika:'android-secret-M'},updatedAt:now})},
  HH_DROPBOX_VAULT:{connected:()=>true},
  hhOrchestratorDevices305:async()=>[{deviceId:'android-secret-M',deviceType:'android',activeProfile:'monika',name:'Secret User',lastSeenAt:now,buildCode:27,status:{state:'pending'},location:{lat:47.5,long:19}}],
  __hhServiceUiCountersV806:{cloudPaints:9,orchPaints:12}
 };
 const d={readyState:'loading',addEventListener:()=>{},getElementById:()=>null};
 vm.runInNewContext(source,{window:w,document:d,Date});
 const report=await w.HH_SERVICE_PORTAL_V806.snapshot();
 assert.equal(report.schema,'healthhub.service.diagnostics/1');
 assert.equal(report.profile,'monika');
 assert.equal(report.guardianGps.errorCode,3);
 assert.equal(report.devices.profiles.monika.reportCount,1);
 assert.equal(report.ui.counters.orchestratorCardPaints,12);
 const s=JSON.stringify(report);
 for(const forbidden of ['android-secret','do-not-copy','password:','Secret User','47.5','secret_token'])
  assert.equal(s.includes(forbidden),false,'Sensitive data leaked: '+forbidden);
 assert.equal(report.errors24h.types[0].type,'rate_limit');
});
test('Native GPS diagnostics record only status and error code, no latitude or longitude',()=>{
 const guardian=read('guardian/guardian.js');
 assert.match(guardian,/hh-service-guardian-gps-v806/);
 assert.match(guardian,/gpsDiagnostic\('error',code\)/);
 assert.match(guardian,/gpsDiagnostic\('paused',code\)/);
 assert.match(guardian,/if\(code===2\|\|code===3\)/);
 assert.match(guardian,/gpsDiagnostic\('fix'\)/);
 assert.doesNotMatch(guardian,/gpsDiagnostic\([^\n]*coord/);
});
test('Cloud and Orchestrator cards do not unconditionally tear down each polling cycle',()=>{
 const cloud=read('live-v205.js'),orch=read('live-v305.js');
 assert.match(cloud,/current\.innerHTML!==next/);
 assert.match(orch,/old\.querySelector\('\.hhOrchDevices305'\)/);
 assert.match(orch,/data-hh-orch-registry/);
 assert.doesNotMatch(orch,/var old=document\.getElementById\(ADMIN_ID\);if\(old\)old\.remove\(\)/);
 assert.match(orch,/hhInlineAdmin!=='yes'/);
});

test('Service Portal has direct Dropbox OAuth repair and Chrome-only browser session return',()=>{
 const src=read('hh-service-portal-v806.js');
 const cb=read('chatgpt-dropbox-callback-v739.html');
 const idx=read('index.html');
 assert.match(src,/ChatGPT cél Dropbox csatlakoztatása/);
 assert.match(src,/typeof auth\.authorize/);
 assert.match(src,/await auth\.authorize\(\)/);
 assert.match(src,/if\(inWebview\(\)\)/);
 assert.match(src,/clipboard\.writeText\(CHROME_URL\)/);
 assert.match(src,/hhservice/);
 assert.match(src,/felhasználói limitet jelez/);
 assert.match(cb,/index\.html\?hhservice=1/);
 assert.match(idx,/hh-service-portal-v806\.js\?v=806&oauth=1/);
});
