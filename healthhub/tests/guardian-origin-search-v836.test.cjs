const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../guardian');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const mod=require('../guardian/guardian-origin-search-v836.js');
const fields=require('../guardian/guardian-smart-hub-fields-v806.js');
test('v836 supports a verified origin, not made-up or other-profile addresses',()=>{
 assert.equal(mod.version,'1170');
 const g=fields,valid={name:'Bécsi út 10',lat:47.53,lng:19.037};
 assert.equal(mod.verified(valid,g,'m',false),true);
 assert.equal(mod.verified({...valid,lat:Infinity},g,'m',false),false);
 assert.equal(mod.verified({...valid,source:'favorite',profile:'z'},g,'m',false),false);
 assert.equal(mod.verified({...valid,source:'favorite',profile:'m'},g,'m',false),true);
 assert.equal(mod.verified({...valid,source:'shared'},g,'m',false),false);
 assert.equal(mod.verified({...valid,source:'shared'},g,'m',true),true);
 assert.equal(mod.displayName({displayName:'Munkahely',...valid}), 'Munkahely · Bécsi út 10');
});
test('v836 keeps the accepted v834/v835 layout and adds one compact fullscreen-only origin row',()=>{
 const html=read('index.html'),css=read('guardian-origin-search-v836.css');
 const js=read('guardian-origin-search-v836.js'),route=read('guardian-smart-hub-fields-v806.js');
 const block=html.slice(html.indexOf('<section class="map-card"'),html.indexOf('</section>',html.indexOf('<section class="map-card"')));
 for(const id of ['guardianMapOriginV836','guardianMapOriginInputV836',
    'guardianMapOriginGoV836','guardianMapOriginGpsV1165','guardianMapOriginGpsStatusV1165',
    'guardianMapOriginResultsV836','guardianMapOriginStatusV836'])
  assert.equal((block.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/guardian-origin-search-v836\.css\?v=1169-nearby-stops-map-first/);
 assert.match(html,/guardian-origin-search-v836\.js\?v=1170-stop-details-top/);
 assert.match(html,/guardian-attribution-dot-v834\.css/);
 assert.match(html,/guardian-zoom-center-v835\.css/);
 assert.match(html,/guardian-keyboard-guard-v832\.js/);
 assert.ok(html.indexOf('guardian-origin-search-v836.js')>html.indexOf('guardian-map-search-v819.js'));
 assert.match(css,/\.map-card\.hh-map-full-v819\.hh-map-has-destination-v836 #guardianMapOriginV836/);
 assert.match(css,/bottom:calc\(65px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/\.hh-origin-typing-v836 #guardianMapOriginV836/);
 assert.match(css,/#guardianMapOriginResultsV836\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(css,/maplibregl-ctrl|\.map-follow|\.map-3d|\.map-family/);
 assert.doesNotMatch(js,/navigator\.geolocation|getCurrentPosition|watchPosition|setItem\(|new (?:w\.)?maplibregl\.Map\(/);
 assert.doesNotMatch(html,/guardian-map-sources-v833/);
});
test('v836 verified From search reuses exact same favourite+Photon parsing and Smart Travel endpoints',()=>{
 const js=read('guardian-origin-search-v836.js');
 const search=read('guardian-map-search-v819.js');
 const fields=read('guardian-smart-hub-fields-v806.js');
 assert.match(js,/search\.matchSaved\(personal\.concat\(allowSharedEntries\(\)\),query\)/);
 assert.match(js,/search\.combineResults\(a,b\)/);
 assert.match(js,/fields\.searchUrl\(value\)/);
 assert.match(js,/fields\.normalizeResults\(await response\.json\(\)\)/);
 assert.match(js,/hh-guardian-map-origin-v836/);
 assert.match(fields,/hh-guardian-map-origin-v836/);
 assert.match(fields,/selectPlace\(e\.detail,'origin'\)/);
 assert.match(fields,/hh-guardian-map-origin-clear-v836/);
 assert.match(fields,/state\.origin=null/);
 assert.match(fields,/hh-guardian-map-route-state-v836/);
 assert.match(js,/hh-guardian-map-route-state-v836/);
 assert.match(search,/hh-guardian-map-destination-v819/);
 assert.match(fields,/selectPlace\(e\.detail,'destination'\)/);
 assert.match(fields,/router\.setJourney\(state\.origin,state\.destination\)/);
 assert.match(js,/map\.fitBounds/);
 assert.match(js,/go\.textContent=place\?'🧭':'⌕'/,'search becomes route action after confirmation');
 assert.match(js,/guardianMapSearchExitV819/,'route action exits immersive map');
 assert.match(js,/hhSmartHubTripPlansV804/,'route action opens existing real BKK plans');
 assert.match(js,/else search\(\)/,'search remains available before selection');
});


test('v1168 keeps the one-tap GPS affordance without disturbing search and BKK planner',()=>{
 const html=read('index.html'),css=read('guardian-origin-search-v836.css');
 const origin=read('guardian-origin-search-v836.js'),fields=read('guardian-smart-hub-fields-v806.js');
 assert.match(html,/id="guardianMapOriginGpsV1165"[^>]*aria-label=/);
 assert.match(html,/id="guardianMapOriginGpsStatusV1165"[^>]*role="status" aria-live="polite"/);
 assert.match(html,/guardian-smart-hub-fields-v806\.js\?v=1168-quiet-gps-errors/);
 assert.match(css,/#guardianMapOriginGpsV1165/);
 assert.match(css,/bottom:calc\(100% \+ 9px\)/);
 assert.match(css,/#guardianMapOriginGpsStatusV1165\[hidden\]/);
 assert.match(origin,/const original=\$\('hhSmartHubCurrentPositionV860'\)/);
 assert.match(origin,/original\.click\(\)/);
 assert.match(origin,/hh-guardian-origin-gps-status-v1165/);
 assert.match(origin,/gps\.disabled=kind==='loading'/);
 assert.match(fields,/function gpsNotice\(kind,text\)/);
 assert.match(fields,/selectPlace\(place,'origin'\)/);
 assert.match(fields,/currentPositionPlace\(position\)/);
 assert.match(fields,/getCurrentPosition\(position=>/);
 assert.doesNotMatch(origin,/navigator\.geolocation|getCurrentPosition|watchPosition/);
 assert.doesNotMatch(origin,/fetch\([^)]*gps|setItem\(|getOwnLocation/);
});
test('v1168 profile location is precise, fresh, explicitly named, permission-gated',()=>{
 const now=1762632000000;
 const z={profile:'zsolt',lat:47.528,lng:19.031,ts:now-2500,
          accuracy:20,source:'HH One Native GPS'};
 const selected=mod.profileOrigin(z,'z',true,now);
 assert.equal(selected.name,'Zsolt helye');
 assert.equal(selected.source,'selected-profile');
 assert.equal(selected.lat,z.lat);
 assert.equal(mod.profileOrigin(z,'m',true,now),null,'never confuse owners');
 assert.equal(mod.profileOrigin(z,'z',false,now),null,'permission gate');
 assert.equal(mod.profileOrigin({...z,accuracy:140},'z',true,now),null);
 assert.equal(mod.profileOrigin({...z,ts:now-76000},'z',true,now),null);
 assert.equal(mod.profileOrigin({...z,lat:Infinity},'z',true,now),null);
 assert.equal(mod.profileOrigin({...z,source:'Family Live',ts:now-21000},'z',true,now),null);
 assert.equal(mod.profileOrigin({...z,source:'Family Live',ts:now-5000},'z',true,now)?.name,'Zsolt helye');
 const m={...z,profile:'monika'};
 assert.equal(mod.profileOrigin(m,'m',true,now)?.name,'Mónika helye');
});
test('v1168 one tap uses verified named profile first, never a second confirmation dialog',()=>{
 const js=read('guardian-origin-search-v836.js'),css=read('guardian-origin-search-v836.css');
 assert.match(js,/const saved=namedProfileOrigin\(\)/);
 assert.match(js,/if\(saved\)\{/);
 assert.match(js,/if\(select\(saved,\{keepMapAtOrigin:true\}\)\)\{/);
 assert.match(js,/showRoute\(\)/);
 assert.match(js,/gps\.textContent=here\?'📍 '\+here\.name:'📍 Jelenlegi helyem'/);
 assert.match(js,/latestAuthorizedSelectedFix/);
 assert.match(js,/const allowed=!!\(live\?\.authenticated&&\(live\.familyAuthorized\|\|live\.boundProfile===owner\)\)/);
 assert.doesNotMatch(js,/\.hh-origin-profile-gps-v1167|gpsStatus\.append\(note,use\)|use\.addEventListener/);
 assert.doesNotMatch(css,/\.hh-origin-profile-gps-v1167/);
 assert.match(js,/function showRoute\(\)\{[\s\S]*?if\(origin\)showNearby\(origin\)/);
 assert.doesNotMatch(js,/function showRoute\(\)\{[\s\S]{0,240}scrollIntoView/);
 assert.match(js,/resultCount\|\|0/);
 assert.match(js,/guardianMapSearchExitV819/);
 assert.match(js,/hhSmartHubTripPlansV804/);
});
test('v1168 failed mobile GPS yields short user-readable message and exits loading',()=>{
 const js=read('guardian-origin-search-v836.js'),fields=read('guardian-smart-hub-fields-v806.js');
 assert.match(js,/gpsTimeout=w\.setTimeout\(\(\)=>\{/);
 assert.match(js,/16000\)/);
 assert.match(js,/clearGpsTimeout\(\)/);
 assert.match(js,/gpsStatus\.hidden=kind!=='error'/);
 assert.match(js,/Hely nem érhető el\. Válassz címet vagy megállót\./);
 assert.match(js,/pagehide',\(\)=>\{clearNearby\(\);clearGpsTimeout\(\)/);
 assert.doesNotMatch(js,/GPS-hiba|A böngésző 16 másodperc|nem feltétlenül a telefonod/);
 assert.doesNotMatch(fields,/GPS-hiba 1|GPS-hiba 3/);
});

test('v1169 nearest BKK stops are official points sorted by proximity, no 960/phantom routes',()=>{
 const at={lat:47.52,lng:19.04};
 const lines=[
  {id:'260',stops:[{id:'b',name:'Közeli megálló',lat:47.5205,lng:19.04},
                    {id:'c',name:'Távoli megálló',lat:47.54,lng:19.04}]},
  {id:'17',stops:[{id:'b2',name:'Közeli megálló',lat:47.5205,lng:19.04},
                  {id:'x',name:'Még közelebbi',lat:47.5201,lng:19.04}]},
  {id:'960',stops:[{id:'z',name:'Kizárt Telebusz',lat:47.52001,lng:19.04}]}];
 const hits=mod.nearestStops(lines,at,4,1400);
 assert.equal(hits[0].name,'Még közelebbi');
 assert.equal(hits[1].name,'Közeli megálló');
 assert.deepEqual([...hits[1].lines].sort(),['17','260']);
 assert.equal(hits.some(h=>h.name==='Távoli megálló'),false);
 assert.equal(hits.some(h=>h.name==='Kizárt Telebusz'),false);
 assert.equal(mod.nearestStops([],at).length,0);
 assert.equal(mod.nearestStops(lines,{lat:NaN,lng:19.04}).length,0);
 assert.ok(hits.every(h=>h.metres>=0&&Number.isFinite(h.metres)));
});
test('v1169 My Location keeps fullscreen map and offers 4 nearby stops before explicit routing',()=>{
 const js=read('guardian-origin-search-v836.js'),css=read('guardian-origin-search-v836.css');
 const router=read('guardian-smart-hub-router-v804.js');
 assert.match(js,/nearby.id='guardianMapNearbyStopsV1169'/);
 assert.match(js,/const matches=nearestStops\(lines,place,4,1400\)/);
 assert.match(js,/🚏 Közeli BKK-megállók/);
 assert.match(js,/Távolság légvonalban, nem menetrendi indulás/);
 assert.match(js,/map\.flyTo\(\{center:\[stop\.lng,stop\.lat\]/);
 assert.match(js,/function showRoute\(\)\{[\s\S]*?if\(origin\)showNearby\(origin\)/);
 assert.match(js,/if\(\(w\.HH_SMART_HUB_ROUTER_V804\?\.resultCount\|\|0\)===0\)\{showNearby\(origin\);return\}/);
 assert.match(js,/hh-transit-network-ready-v862/);
 assert.match(css,/#guardianMapNearbyStopsV1169/);
 assert.match(css,/#guardianMapNearbyStopsV1169\[hidden\]/);
 assert.match(router,/get resultCount\(\)\{return plans\.length\}/);
});

test('v1170 uses only exact, validated scheduled BKK stop departures',()=>{
 const now=Date.parse('2026-11-08T19:00:00Z');
 const minute=Math.ceil(now/60000);
 const timetable={generatedAt:new Date(now-60000).toISOString(),trips:[
  {line:'260',tripId:'gtfs-a',stops:[['A',minute+12,minute+12],['B',minute+20,minute+20]]},
  {line:'218',tripId:'gtfs-b',stops:[['A',minute+15,minute+15],['C',minute+28,minute+28]]},
  {line:'923',tripId:'other',stops:[['WRONG',minute+3,minute+3],['C',minute+26,minute+26]]}
 ]};
 const refs=[{line:'260',id:'A'},{line:'218',id:'A'}];
 const result=mod.scheduledStopDepartures(timetable,refs,now);
 assert.deepEqual(result.map(x=>x.line),['260','218']);
 assert.deepEqual(result.map(x=>x.time),[(minute+12)*60000,(minute+15)*60000]);
 assert.equal(mod.scheduledStopDepartures(timetable,[{line:'923',id:'A'}],now).length,0);
 assert.equal(mod.scheduledStopDepartures({...timetable,generatedAt:new Date(now-37*3600000).toISOString()},refs,now).length,0);
 assert.equal(mod.scheduledStopDepartures(null,refs,now).length,0);
});
test('v1170 nearest stop rows select and disclose planned departures and official live lookup',()=>{
 const html=read('index.html'),js=read('guardian-origin-search-v836.js');
 const css=read('guardian-trip-truth-v1170.css'),router=read('guardian-smart-hub-router-v804.js');
 assert.match(html,/guardian-trip-truth-v1170\.css\?v=1170-real-departures/);
 assert.match(js,/button\.addEventListener\('click',\(\)=>\{/);
 assert.match(js,/button\.setAttribute\('aria-pressed','true'\)/);
 assert.match(js,/showStopDetails\(stop\)/);
 assert.match(js,/nearby\.insertBefore\(detail,nearby\.children\[1\]\|\|null\)/);
 assert.match(js,/scheduledStopDepartures\(timetable,stop\.refs,Date\.now\(\),4\)/);
 assert.match(js,/https:\/\/go\.bkk\.hu\//);
 assert.match(js,/hh-transit-timetable-ready-v1170/);
 assert.match(router,/hh-transit-timetable-ready-v1170/);
 assert.match(css,/hh-near-stop-v1169\[aria-pressed="true"\]/);
});
