const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../guardian');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const mod=require('../guardian/guardian-origin-search-v836.js');
const fields=require('../guardian/guardian-smart-hub-fields-v806.js');
test('v836 supports a verified origin, not made-up or other-profile addresses',()=>{
 assert.equal(mod.version,'1168');
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
 assert.match(html,/guardian-origin-search-v836\.css\?v=1168-simple-my-location/);
 assert.match(html,/guardian-origin-search-v836\.js\?v=1168-one-tap-profile-location/);
 assert.match(html,/guardian-attribution-dot-v834\.css/);
 assert.match(html,/guardian-zoom-center-v835\.css/);
 assert.match(html,/guardian-keyboard-guard-v832\.js/);
 assert.ok(html.indexOf('guardian-origin-search-v836.js')>html.indexOf('guardian-map-search-v819.js'));
 assert.match(css,/\.map-card\.hh-map-full-v819\.hh-map-has-destination-v836 #guardianMapOriginV836/);
 assert.match(css,/bottom:calc\(65px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/\.hh-origin-typing-v836 #guardianMapOriginV836/);
 assert.match(css,/#guardianMapOriginResultsV836\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(css,/maplibregl-ctrl|\.map-follow|\.map-3d|\.map-family/);
 assert.doesNotMatch(js,/navigator\.geolocation|getCurrentPosition|watchPosition|setItem\(|new .*Map\(/);
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
 assert.match(js,/if\(select\(saved\)\)\{/);
 assert.match(js,/showRoute\(\)/);
 assert.match(js,/gps\.textContent=here\?'📍 '\+here\.name:'📍 Jelenlegi helyem'/);
 assert.match(js,/latestAuthorizedSelectedFix/);
 assert.match(js,/const allowed=!!\(live\?\.authenticated&&\(live\.familyAuthorized\|\|live\.boundProfile===owner\)\)/);
 assert.doesNotMatch(js,/\.hh-origin-profile-gps-v1167|gpsStatus\.append\(note,use\)|use\.addEventListener/);
 assert.doesNotMatch(css,/\.hh-origin-profile-gps-v1167/);
 assert.match(js,/const plan=\$\('hhSmartHubPlanV806'\)/);
 assert.match(js,/if\(!plan\|\|plan\.disabled\)return/);
 assert.match(js,/plan\.click\(\)/);
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
 assert.match(js,/pagehide',\(\)=>\{clearGpsTimeout\(\)/);
 assert.doesNotMatch(js,/GPS-hiba|A böngésző 16 másodperc|nem feltétlenül a telefonod/);
 assert.doesNotMatch(fields,/GPS-hiba 1|GPS-hiba 3/);
});
