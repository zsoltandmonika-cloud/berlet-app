'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-smart-hub-clean-space-v954.css'),'utf8');
const fields=fs.readFileSync(path.join(root,'guardian-smart-hub-fields-v806.js'),'utf8');
const router=fs.readFileSync(path.join(root,'guardian-smart-hub-router-v804.js'),'utf8');

test('v954 removes default onboarding chatter, not core controls or live status elements',()=>{
 for(const id of ['hhActiveTransitStatusV862','hhPlannerTimeStatusV939','hhSmartHubDestinationStatusV802','hhSmartHubTripStatusV804']){
  assert.match(html,new RegExp('id="'+id+'"[^>]*></p>'));
  assert.match(css,new RegExp('#'+id));
 }
 assert.doesNotMatch(html,/Egyetlen koppintással indulhatsz|Koppints egy mezőre, majd a találatra/);
 assert.doesNotMatch(html,/Indulás most · csak ellenőrzött GTFS/);
 assert.match(html,/id="hhActiveTransitCurrentV862"[^>]*>Nincs aktív utazás\.<\/p>/);
 for(const id of ['hhActiveTransitBoardV862','hhSmartHubFromV806','hhSmartHubToV806',
    'hhSmartHubPlanV806','hhSmartHubFavoritesV806','hhSmartHubPriorityTransfersV805',
    'hhSmartHubPriorityWalkingV805','hhSmartHubTripPlansV804','hhPlannerDepartV939',
    'hhPlannerArriveV939','hhPlannerNowV939'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/class="hh-smart-hub-auto-v806" hidden/);
 assert.match(css,/\.hh-smart-hub-auto-v806\[hidden\]\{\s*display:none!important/);
});

test('v954 important BKK attribution stays retrievable but long text is folded by default',()=>{
 assert.match(html,/<details class="hh-smart-hub-sources-v954">/);
 assert.match(html,/<summary>ⓘ Adatok és pontosság<\/summary>/);
 assert.match(html,/Forrás: © OpenStreetMap-közreműködők · Photon \(komoot\)/);
 assert.match(html,/A megállók és az útvonalak hivatalos BKK GTFS-adatok/);
 const block=html.match(/<details class="hh-smart-hub-sources-v954">([\s\S]*?)<\/details>/)?.[1];
 assert.ok(block&&block.includes('BKK GTFS')&&block.includes('OpenStreetMap'));
 assert.match(css,/#hhSmartHubDestinationV802 \.hh-smart-hub-sources-v954/);
});

test('v954 routine hints are silent, but GPS failures and verified-route feedback remain',()=>{
 assert.match(fields,/const routineHint=/);
 assert.match(fields,/status\.textContent=routineHint\.test\(text\)\?'':text/);
 assert.match(fields,/Helykeresési hiba/);
 assert.match(fields,/A helymeghatározás nincs engedélyezve/);
 assert.match(fields,/planWrapper\.hidden=planButton\.disabled/);
 assert.match(router,/if\(note\)note\.textContent='';/);
 assert.match(router,/note\.textContent='';return/);
 assert.match(router,/A hivatalos BKK megállóadatok nem érhetők el/);
 assert.match(html,/guardian-smart-hub-clean-space-v954\.css\?v=954/);
 assert.match(html,/guardian-smart-hub-fields-v806\.js\?v=954-clean-instructions/);
 assert.match(html,/guardian-smart-hub-router-v804\.js\?v=954-clean-space/);
 for(const source of [fields,router])assert.doesNotThrow(()=>new vm.Script(source));
});
