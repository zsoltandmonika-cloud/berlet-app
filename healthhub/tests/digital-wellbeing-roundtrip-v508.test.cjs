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
const liveScript=fs.readFileSync(path.join(root,'digital-health/digital-live-v507.js'),'utf8');
assert.match(liveScript,/családi alkalmazáslista külön megosztása még nincs engedélyezve/);
assert.match(liveScript,/részletes megosztás engedélyezett, de erre az időszakra/);
assert.match(liveScript,/showBars\(s,period\)/);

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
 constructor(){this.children=[];this.textContent='';this.dataset={};this.className='';this.title='';this.style={setProperty(){}};this.classList={add(){}};}
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
 calendarWeek(){
  const dates=['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18'];
  return dates.map((date,i)=>({date,foregroundMs:i===2?900000:null,future:i>2}));
 },
 summary(doc,days){
  const date=new Date(doc.collectedAtMs).toISOString().slice(0,10);
  return {observed:900000,chatgpt:180000,evening:120000,covered:4,
   dayHours:Array(24).fill(null),dayTotals:Array.from({length:days},()=>({date,foregroundMs:900000})),
   topApps:doc.appIds?doc.appIds.map(id=>[id,60000]):(doc.detail?[['com.openai.chatgpt',180000]]:[]),appDetailShared:!!doc.detail};
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
 assert.equal(el('weekly').children.length,7,'current calendar week always has seven days');
 assert.match(el('weekly').children[0].children[0].title,/^2026-10-12/,'Monday is the first weekly bar');
 assert.match(el('weekly').children[6].children[0].title,/^2026-10-18/,'Sunday is the final weekly bar');
 assert.match(el('weekly').children[3].children[0].title,/még nem következett el/,'future days are unknown, not zero');
 assert.match(el('weekRange').textContent,/10\.12–10\.18/,'weekly subtitle follows the calendar');

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
 const detailed=api.refresh('zsolt','day');
 pending.shift().resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}],detail:true});
 await detailed;
 assert.equal(el('apps').children.length,1,'consented application should populate its list');
 assert.equal(el('categories').children.length,1,'consented app should populate its category');
 assert.equal(el('ringTotal').textContent,'3 perc','consented app should populate the ring');
 assert.match(el('digitalAppDetails').textContent,/1 megjeleníthető alkalmazás/);
 const named=[
  ['com.samsung.android.forest','Samsung Digital Wellbeing','Digitális jóllét'],
  ['com.microsoft.emmx','Microsoft Edge','Böngészés'],
  ['com.sec.android.app.launcher','One UI kezdőképernyő','Rendszerfelület'],
  ['com.samsung.android.incallui','Samsung hívásképernyő','Telefonálás'],
  ['com.samsung.android.rubin.app','Samsung testreszabási szolgáltatás','Rendszerszolgáltatás'],
  ['hu.zsoltmonika.healthhubbridge','HH One Connect','Egészség / HealthHub'],
  ['com.facebook.orca','Messenger','Kommunikáció'],
  ['com.android.settings','Android Beállítások','Rendszerfelület']
 ];
 for(const [pkg,display,category] of named){
  assert.equal(api.resolveApp(pkg)[0],display,'correct human label: '+pkg);
  assert.equal(api.resolveApp(pkg)[2],category,'correct category: '+pkg);
 }
 assert.equal(api.resolveApp('example.unknown.application')[0],'example.unknown.application','unknown app retains original id');
 const friendly=api.refresh('zsolt','day');
 pending.shift().resolve({collectedAtMs:Date.now(),hours:[{hourStartMs:0}],detail:true,
  appIds:['com.microsoft.emmx','com.facebook.orca','com.samsung.android.forest']});
 await friendly;
 const labels=el('apps').children.map(app=>app.children[1].children[0].textContent);
 assert.equal(labels.join('|'),'Microsoft Edge|Messenger|Samsung Digital Wellbeing','actual app list uses friendly names');
 assert.match(el('apps').children[0].children[1].children[0].title,/com\.microsoft\.emmx/,'original package available in title');
 assert.equal(el('legend').children[0].textContent,'Microsoft Edge · 1 perc','chart legend uses friendly label');
 assert.match(el('categories').children.map(item=>item.children[0].children[1].textContent).join('|'),/Böngészés/,'categories derive from resolved apps');
 const categories=el('categories').children;
 assert.equal(categories.length,3,'three separately measured categories are rendered');
 for(const category of categories){
  assert.equal(category.className,'catrow','category must not inherit three-column app CSS');
  assert.equal(category.children[0].className,'catheading','name and time share one horizontal heading');
  assert.deepEqual(category.children[0].children.map(v=>v.className),['caticon','catname','catvalue'],
   'icon, category label and unbroken duration occupy one row');
  assert.match(category.children[0].children[2].textContent,/ perc$/,'time includes units');
  assert.equal(category.children[1].className,'catbar','breakdown bar follows the heading');
 }
 const unknownAggregates=api.summarizeCategories([['example.unknown.app',600000],['example.other.unknown',1020000]]);
 assert.equal(unknownAggregates.length,1,'unknown package names aggregate into one category');
 assert.equal(unknownAggregates[0].name,'Besorolatlan');
 assert.equal(unknownAggregates[0].ms,1620000,'27-minute uncategorized time is preserved');



 console.log('HH One v508: simulated Dropbox readback source check, revision fencing and two-profile DOM isolation PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
