'use strict';
// Simulated vault and DOM: verifies the UI does not leak values across profiles.
// Real phone / Dropbox acceptance is a separate release gate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const native=fs.readFileSync(path.join(root,'android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/dw/DigitalUsageCloudSync.kt'),'utf8');
const activity=fs.readFileSync(path.join(root,'android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt'),'utf8');
const prefs=fs.readFileSync(path.join(root,'android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/dw/PilotState.kt'),'utf8');
assert.match(native,/DropboxVaultClient\.uploadText\(main, path, payload\)/);
assert.match(native,/DropboxVaultClient\.downloadTextOrNull\(main, path\)/);
assert.match(native,/require\(readback == payload\)/);
assert.ok(native.indexOf('downloadTextOrNull(main, path)')<native.indexOf('LAST_CLOUD_SUCCESS'),'readback before success');
assert.match(native,/CLOUD_REVISION/);
assert.match(native,/CLOUD_ERASE_PENDING, false\) != erase/);
assert.match(prefs,/const val CLOUD_REVISION/);
assert.ok((activity.match(/putLong\(PilotState\.CLOUD_REVISION/g)||[]).length>=7,'all cloud consent transitions revision-stamped');

class Element {
 constructor(){this.children=[];this.textContent='';this.className='';this.title='';this.style={setProperty(){}};this.classList={add(){}};}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(){this.children=[];}
 setAttribute(){}
}
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const source=Array.from({length:7},()=>new Element());
const document={
 getElementById:el,
 querySelector(selector){return el(selector);},
 querySelectorAll(selector){return selector==='.source b'?source:[];},
 createElement(){return new Element();}
};
const pending=[];
const window={HH_DW_VAULT_V507:{
 read(profile){return new Promise(resolve=>pending.push({profile,resolve}));},
 summary(doc,days){
  const date=new Date(doc.collectedAtMs).toISOString().slice(0,10);
  return {observed:900000,chatgpt:180000,evening:120000,covered:4,
   dayHours:Array(24).fill(null),dayTotals:Array.from({length:days},()=>({date,foregroundMs:900000})),
   topApps:[],appDetailShared:false};
 }
}};
vm.runInNewContext(fs.readFileSync(path.join(root,'digital-health/digital-live-v507.js'),'utf8'),
 {window,document,Date,Intl,Map,Math,Number,String,Error,Set});
async function run(){
 const api=window.HH_DW_LIVE_V507;
 el('usage').textContent='A KORÁBBI PROFIL ADATA';
 const first=api.refresh('zsolt','day');
 assert.equal(el('usage').textContent,'—','old value is immediately cleared on refresh');
 const older=pending.shift();assert.equal(older.profile,'zsolt');
 // Newer profile must win, even if the previous request returns late.
 const second=api.refresh('monika','day');
 assert.equal(el('usage').textContent,'—','old value not visible under next owner');
 assert.equal(pending.length,1);
 const next=pending.shift();assert.equal(next.profile,'monika');
 next.resolve(null);await second;
 assert.equal(el('usage').textContent,'—');
 assert.match(el('analysisText').textContent,/nem becsül/i);
 // Late response from an older profile must not paint its values on Mónika's page.
 older.resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}]});await first;
 assert.equal(el('usage').textContent,'—','out-of-order owner response ignored');
 const third=api.refresh('zsolt','week');
 const latest=pending.shift();assert.equal(latest.profile,'zsolt');
 latest.resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}]});await third;
 assert.notEqual(el('usage').textContent,'—','valid current owner values displayed');
 assert.equal(el('timeline').children.length,7,'seven calendar days in seven-day rhythm');
 const fourth=api.refresh('monika','month');
 assert.equal(el('usage').textContent,'—','never retain previous profile metrics during network wait');
 assert.equal(el('timeline').children.length,0);
 assert.equal(el('weekly').children.length,0);
 const missing=pending.shift();missing.resolve(null);await fourth;
 assert.equal(el('usage').textContent,'—');
 assert.equal(el('ringTotal').textContent,'—');
 assert.match(el('periodLabel').textContent,/nem töltött fel/i);
 // Finally simulate failure, still no prior owner metrics.
 const fifth=api.refresh('monika','day');
 const fail=pending.shift();fail.resolve(Promise.reject(Error('offline')));await fifth;
 assert.equal(el('usage').textContent,'—');
 assert.match(el('analysisText').textContent,/nem érhetők el/i);
 const m=api.refresh('zsolt','month');pending.shift().resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}]});await m;
 assert.equal(el('timeline').children.length,30,'thirty calendar days');
 const d=api.refresh('zsolt','day');pending.shift().resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}]});await d;
 assert.equal(el('timeline').children.length,24,'twenty-four hourly slots');
 console.log('HH One v508: simulated Dropbox readback source check, revision fencing and two-profile DOM isolation PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
