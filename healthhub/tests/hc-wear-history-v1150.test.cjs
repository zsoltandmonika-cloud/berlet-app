'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('../hc-wear-history-v1150.js');
const index=fs.readFileSync('healthhub/index.html','utf8');
const core=fs.readFileSync('healthhub/hc-wear-history-v1150.js','utf8');
const t=Date.parse('2026-11-03T09:00:00Z');
const stamp=x=>new Date(x).toISOString();
const records={
 heartRate:[{
  sourcePackage:'com.sec.android.app.shealth',
  samples:[
   {time:stamp(t-22*3600000),bpm:65},
   {time:stamp(t-3600000),bpm:72},
   {time:stamp(t+600000),bpm:190}, // never show a future measurement
   {time:stamp(t-7200000),bpm:0}
  ]
 }],
 oxygenSaturation:[
  {time:stamp(t-15*3600000),percent:97.3,sourcePackage:'com.sec.android.app.shealth'},
  {time:stamp(t-2*86400000),percent:93.0},
  {time:stamp(t-1000),percent:118} // must not win
 ],
 restingHeartRate:[{time:stamp(t-7200000),bpm:52,sourcePackage:'com.sec.android.app.shealth'}],
 vo2Max:[{time:stamp(t-15*86400000),mlKgMin:38.5}],
 bodyFat:[{time:stamp(t-3*86400000),percent:27.7}],
 sleepSessions:[
  {startTime:stamp(t-23*3600000),endTime:stamp(t-14*3600000)},
  {startTime:stamp(t-3*3600000),endTime:stamp(t-3600000)},
  {startTime:stamp(t-2*86400000),endTime:stamp(t-3*86400000)} // malformed
 ]
};
const pack={records,exportedAt:stamp(t-1200000),source:'Dropbox · Health Connect'};
const act=api.summarize(pack,'activity',t);
const night=api.summarize(pack,'sleep',t);
assert.equal(act.readings.heart.value,72);
assert.equal(act.readings.oxygen.value,97.3);
assert.equal(act.readings.resting.value,52);
assert.equal(act.readings.vo2.value,38.5);
assert.equal(act.readings.fat.value,27.7);
assert.deepEqual(night.night,[t-3*3600000,t-3600000]);
// Pulse at t-1h is precisely the end of latest sleep segment.
assert.equal(night.readings.nightHeart.value,72);
assert.equal(night.readings.nightOxygen,null);
assert.equal(api.latest([], 'bpm',20,250,t),null);
assert.equal(api.pulse([{samples:[{time:stamp(t),bpm:0}]}],t),null);
assert.equal(api.latestNight({sleepSessions:[{startTime:stamp(t),endTime:stamp(t-3600000)}]},t),null);
assert.equal(api.profile('m'),'monika');
assert.equal(api.profile('zsolt'),'zsolt');
assert.equal(api.profile('unknown'),null);
const empty=api.summarize({records:{},exportedAt:null},'sleep',t);
assert.equal(empty.readings.nightHeart,null);
// The canonical Sleep renderer still owns the original 6 cards. The overlay
// inserts exactly TWO native factor tiles into the SAME grid, never a separate
// premium section, and retires the old standalone oxygen ribbon.
const emptyCards=api.sleepCards(empty,t,'94%','Egyetlen mért perc');
assert.equal((emptyCards.match(/hhSleepFactor381 hhSleepRag382/g)||[]).length,2);
assert.match(emptyCards,/Véroxigén \(SpO₂\)/);
assert.match(emptyCards,/Nyugalmi pulzus/);
assert.equal((emptyCards.match(/Nincs mai mérés/g)||[]).length,2);
assert.equal((emptyCards.match(/hhSleepFactorValue381">—/g)||[]).length,2);
const todayResting=api.sleepCards(night,t,'94%','Egyetlen mért perc');
assert.equal((todayResting.match(/hhSleepFactor381 hhSleepRag382/g)||[]).length,2);
assert.match(todayResting,/52 \/perc/);
assert.match(todayResting,/Nincs mai mérés/); // The only valid SpO₂ in this fixture is from yesterday
assert.doesNotMatch(todayResting,/94%/); // Do not revive an older oxygen measurement
const currentOxygen={records:{
 oxygenSaturation:[{time:stamp(t-30*60000),percent:94}],
 restingHeartRate:[{time:stamp(t-10*60000),bpm:61}],
 sleepSessions:[{startTime:stamp(t-8*3600000),endTime:stamp(t-2*3600000)}]
}};
const current=api.summarize(currentOxygen,'sleep',t);
const eight=api.sleepCards(current,t,'94%','Egyetlen mért perc');
assert.match(eight,/94%/);
assert.match(eight,/61 \/perc/);
assert.equal((eight.match(/hhSleepFactor381 hhSleepRag382/g)||[]).length,2);
assert.match(eight,/Egyetlen mért perc/);
assert.match(eight,/hhWearHistory1150-sleep-resting/);
// Budapest date boundary, not the browser's UTC day: 00:30 local is "today".
assert.equal(api.budapestDay(Date.parse('2026-11-02T23:30:00Z')),
             api.budapestDay(Date.parse('2026-11-03T09:00:00Z')));
const boundary={t:Date.parse('2026-11-02T23:30:00Z'),value:95};
assert.equal(api.todayReading(boundary,t),boundary);
const yesterday={t:Date.parse('2026-11-02T22:30:00Z'),value:95};
assert.equal(api.todayReading(yesterday,t),null);
assert.match(core,/page\.querySelector\('\.hhSleepFactors381'\)/);
assert.match(core,/grid\.appendChild\(oxygenTile\)/);
assert.match(core,/grid\.appendChild\(restingTile\)/);
assert.match(core,/if\(original\)original\.remove\(\)/);
assert.match(core,/oxygenTile\.dataset\.owner=ownerCode/);
assert.doesNotMatch(core,/lena\.insertAdjacentElement\('beforebegin'/);
assert.doesNotMatch(core,/oxygen\.cloneNode\(/);
assert.doesNotMatch(core,/hhWH1152Pair/);
assert.match(api.markup(act,'activity','monika',t),/data-owner="monika"/);
assert.match(api.markup(act,'activity','monika',t),/Mérve:/);
assert.match(api.markup(act,'activity','monika',t),/Utolsó adatcsomag:/);
assert.match(api.markup(act,'activity','monika',t),/nem bizonyítja/);
assert.match(api.markup(act,'activity','monika',t),/nem élő órás adatok/);
const xss={records:{heartRate:[{sourcePackage:'<img src=x onerror=1>',samples:[{time:stamp(t-300000),bpm:71}]}]}};
assert.match(api.markup(api.summarize(xss,'activity',t),'activity','zsolt',t),/&lt;img/);
assert.doesNotMatch(api.markup(api.summarize(xss,'activity',t),'activity','zsolt',t),/<img src=x/);
assert.equal((index.match(/hc-wear-history-v1150\.js/g)||[]).length,1);
assert(index.indexOf('live-v170.js') < index.indexOf('hc-wear-history-v1150.js'));
assert(index.indexOf('live-v184.js') < index.indexOf('hc-wear-history-v1150.js'));
assert.match(core,/hhActivityPage/);
assert.match(core,/hhSleepPage/);
assert.match(core,/hhwearhistory/);
assert.match(core,/HH_WEAR_HISTORY_ENABLED/);
assert.match(core,/healthhub:health-cloud-synced/);
assert.match(core,/HH_DROPBOX_VAULT/);
assert.match(core,/healthhub-connect-v1/);
assert.doesNotMatch(core,/\.writeRecords\(|\.uploadJson\(|supabase\.from\(|WatchPairedProbeV1|BLUETOOTH_CONNECT|onStartCommand|requestPermissions\(/);

(async()=>{
 const cloud={
  HH_DROPBOX_VAULT:{
   connected:()=>true,
   downloadJson:async path=>{
    assert.equal(path,'/HealthHub/profiles/monika-health-connect.json');
    return {profile:'monika',records:records,exportedAt:stamp(t)}
   }
  }
 };
 const a=await api.read(cloud,'monika');
 assert.equal(a.source,'Dropbox · Health Connect');
 assert.strictEqual(a.records,records);
 // A wrong owner's Health Connect file must never appear under Mónika.
 const wrong={
  HH_DROPBOX_VAULT:{
   connected:()=>true,
   downloadJson:async()=>({profile:'zsolt',records})
  }
 };
 assert.equal(await api.read(wrong,'monika'),null);
 // If Cloud is absent, no invented values or source label.
 assert.equal(await api.read({},'zsolt'),null);
 console.log('PASS Watch History v1150: profile isolation, source provenance, timestamps, no fake live, UI load order, no watch APK');
})().catch(err=>{console.error(err);process.exitCode=1});
