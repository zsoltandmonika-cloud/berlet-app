const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const router=require('../guardian/guardian-smart-hub-router-v804.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');
const place=(name,lat,lng)=>({id:name,name,lat,lng});

test('v805 ranks fewest transfers first even when walking distance is longer',()=>{
 const direct={transfer:0,walk:700,score:1200};
 const change={transfer:1,walk:50,score:400};
 assert.equal(router.rankCandidates([change,direct])[0],direct);
 assert.equal(router.rankCandidates([change,direct],'walking')[0],change);
 assert.deepEqual(router.rankCandidates([], 'transfers'),[]);
 assert.equal(router.setPreference('transfers'),true);
 assert.equal(router.preference,'transfers');
 assert.equal(router.setPreference('walking'),true);
 assert.equal(router.preference,'walking');
 assert.equal(router.setPreference('unsupported'),false);
 assert.equal(router.preference,'walking');
 router.setPreference('transfers');
});

test('v805 generates explicit walking, boarding, riding and alighting steps for a direct bus',()=>{
 const origin=place('Induló tér',47.55,19.01),destination=place('Bécsi Corner',47.53,19.038);
 const p={transfer:0,approach:280,finish:105,legs:[{
  line:{id:'260',headsign:'Óbudai rendelőintézet'},
  enter:place('Kocsis Sándor út',47.56,19.03),
  exit:place('Óbudai rendelőintézet',47.545,19.04),stopCount:5
 }]};
 const steps=router.itinerarySteps(p,origin,destination);
 assert.deepEqual(steps.map(x=>x.kind),['walk','board','ride','alight','walk']);
 assert.match(steps[0].note,/280 m légvonalban/);
 assert.match(steps[1].detail,/Irány: Óbudai rendelőintézet/);
 assert.match(steps[2].title,/5 megálló/);
 assert.match(steps[4].detail,/Bécsi Corner/);
 assert.match(steps[4].note,/105 m/);
 assert.match(steps[1].note,/indulási idő.*nem része/);
 assert.deepEqual(router.itinerarySteps(null,origin,destination),[]);
});

test('v805 details list includes independently marked transfer between two BKK legs',()=>{
 const origin=place('Indulás',47.56,19.03),destination=place('Cél',47.52,19.04);
 const p={transfer:1,approach:210,finish:80,changeWalk:115,legs:[
  {line:{id:'260',headsign:'Óbudai rendelőintézet'},enter:place('A',47.56,19.03),exit:place('B',47.55,19.02),stopCount:4},
  {line:{id:'17',headsign:'Savoya Park'},enter:place('C',47.55,19.021),exit:place('D',47.52,19.04),stopCount:7}
 ]};
 const steps=router.itinerarySteps(p,origin,destination);
 assert.deepEqual(steps.map(x=>x.kind),['walk','board','ride','alight','transfer','board','ride','alight','walk']);
 assert.match(steps[4].title,/Átszállás/);
 assert.match(steps[4].detail,/B → C/);
 assert.match(steps[4].note,/115 m légvonalban/);
 assert.match(steps[5].detail,/Savoya Park/);
});

test('v805 GO and Details are visible and wired to map and planned itinerary only',()=>{
 const html=read('index.html'),js=read('guardian-smart-hub-router-v804.js'),css=read('guardian-smart-hub-go-v805.css');
 for(const id of ['hhSmartHubPriorityTransfersV805','hhSmartHubPriorityWalkingV805',
  'hhSmartHubGuideV805','hhSmartHubGuideProgressV805','hhSmartHubGuideStepV805',
  'hhSmartHubGuideBackV805','hhSmartHubGuideNextV805','hhSmartHubGuideCloseV805'])
  assert.ok(html.includes(id),'Missing '+id);
 assert.ok(html.includes('guardian-smart-hub-router-v804.js?v=805-fewest-go-a'));
 assert.ok(html.includes('guardian-smart-hub-go-v805.css?v=805-fewest-go-a'));
 assert.match(js,/GO · Út indítása/);
 assert.match(js,/Részletek ▾/);
 assert.match(js,/rankCandidates/);
 assert.match(js,/setPreference\('transfers'\)/);
 assert.match(js,/setPreference\('walking'\)/);
 assert.match(js,/startGuide\(p\)/);
 assert.match(js,/guideNext/);
 assert.match(js,/guideBack/);
 assert.match(js,/closeGuide/);
 assert.match(js,/légvonalban/);
 assert.match(html,/nem élő GPS-navigáció/);
 assert.doesNotMatch(js,/geolocation\.getCurrentPosition/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
 assert.ok(html.includes('bkk-live-glass-v800.css'));
 assert.ok(html.includes('hhBkkCatalogV801'));
 assert.ok(css.includes('.hh-smart-trip-go-v805'));
});
