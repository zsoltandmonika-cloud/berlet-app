import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateQuery,providerRequest,extractRoutes,rankRoutes,toTripPack}
 from '../../supabase/functions/hh-lena-native-search-preview/lena-native-core.mjs';
import * as pack from '../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const query=()=>({from:'Otthon',to:'Budapest-Nyugati',
 date:'2026-11-02',time:'12:00',mode:'depart',
 when:'2026-11-02T11:00:00Z',profile:'z',priority:'balanced',
 origin:{name:'Otthon',lat:47.57165,lng:19.00976},
 destination:null});
const route=()=>({routes:[{legs:[{steps:[
 {travelMode:'WALK',staticDuration:'600s',distanceMeters:550},
 {travelMode:'TRANSIT',transitDetails:{
   stopDetails:{departureStop:{name:'Teszt indulás'},arrivalStop:{name:'Teszt érkezés'},
    departureTime:'2026-11-02T11:20:00Z',arrivalTime:'2026-11-02T12:30:00Z'},
   transitLine:{nameShort:'TESZT 1',vehicle:{type:'RAIL'}}}},
 {travelMode:'WALK',staticDuration:'360s',distanceMeters:300}
]}]}]});
test('v1104 query validates explicit profile, origin and Budapest date',()=>{
 const q=validateQuery(query(),Date.parse('2026-11-01T11:00:00Z'));
 assert.equal(q.profile,'z');
 assert.equal(q.origin.lat,47.57165);
 assert.equal(q.destination,undefined);
 assert.equal(q.when,'2026-11-02T11:00:00Z');
 assert.equal(providerRequest(q).travelMode,'TRANSIT');
 assert.equal(providerRequest(q).departureTime,q.when);
 assert.throws(()=>validateQuery({...query(),profile:'admin'},Date.parse('2026-11-01T11:00:00Z')));
 assert.throws(()=>validateQuery({...query(),to:'Otthon'},Date.parse('2026-11-01T11:00:00Z')));
 assert.throws(()=>validateQuery({...query(),origin:{name:'Anyuka',lat:47,lng:19}},Date.parse('2026-11-01T11:00:00Z')));
});
test('strict provider-to-TripPack: 2 walks + one scheduled train, no invented transit leg',()=>{
 const q=validateQuery(query(),Date.parse('2026-11-01T11:00:00Z'));
 const candidates=extractRoutes(route(),q);
 assert.equal(candidates.length,1);
 const segments=candidates[0].segments;
 assert.deepEqual(segments.map(s=>s.mode),['walk','train','walk']);
 assert.equal(segments[0].status,'estimated');
 assert.equal(segments[1].status,'timetable');
 assert.equal(segments[1].line,'TESZT 1');
 const p=pack.normalize(toTripPack(q,candidates[0]));
 assert.equal(p.travelDate,'2026-11-02');
 assert.equal(p.from,'Otthon');
 assert.equal(p.to,'Budapest-Nyugati');
 assert.equal(p.segments.length,3);
 assert.equal(p.segments[1].departure,'12:20');
 assert.equal(p.segments[1].arrival,'13:30');
 assert.equal(p.segments[2].arrival,'13:36');
 assert.match(p.summary,/menetrend alapján/);
 assert.equal(p.sources[0].url.startsWith('https://www.google.com/maps/dir/?'),true);
 assert.equal(p.alerts.length,1);
});
test('malformed provider timetable cannot produce a saved TripPack',()=>{
 const q=validateQuery(query(),Date.parse('2026-11-01T11:00:00Z'));
 const broken=route();
 broken.routes[0].legs[0].steps[1].transitDetails.stopDetails.departureTime='INVALID';
 assert.equal(extractRoutes(broken,q).length,0);
 const missingWalk=route();
 missingWalk.routes[0].legs[0].steps[0].staticDuration='unknown';
 assert.equal(extractRoutes(missingWalk,q).length,0);
 const missingRide=route();
 missingRide.routes[0].legs[0].steps.splice(1,1);
 assert.equal(extractRoutes(missingRide,q).length,0);
});
test('deterministic ranking works without paid AI calls',()=>{
 const q=validateQuery(query(),Date.parse('2026-11-01T11:00:00Z'));
 const options=extractRoutes(route(),q);
 assert.equal(rankRoutes(options,'balanced').length,1);
 assert.equal(rankRoutes(options,'walk').length,1);
});
test('preview UI uses explicit opt-in mode; old ChatGPT default is intact',()=>{
 const html=read('sh9/smart-travel/public-transport/smart-trip/index.html');
 const js=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js');
 const client=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-lena-native-v1104.js');
 const server=read('supabase/functions/hh-lena-native-search-preview/index.ts');
 assert.match(html,/<option value="chatgpt">✨ Léna · ChatGPT/);
 assert.match(html,/<option value="lena_native">🧪 Léna Native AI · előnézet/);
 assert.match(html,/smart-trip-lena-native-v1104\.js/);
 assert.match(js,/if\(method==='lena_native'\)/);
 assert.match(js,/url\.searchParams\.set\('trip',result\.tripId\)/);
 assert.match(js,/url\.searchParams\.set\('details','1'\)/);
 assert.match(client,/sh9-smart-trip-pack-v1078-/);
 assert.match(server,/HH_LENA_NATIVE_ROUTING_APPROVED/);
 assert.match(server,/HH_LENA_NATIVE_BUDGET_ENFORCED/);
 assert.match(server,/if\(!canPaid\(\)\)return response\(req,200,\{status:"source_not_ready"/);
 assert.match(server,/client\.auth\.getUser\(token\)/);
 assert.match(server,/hh_profile_access/);
 assert.match(server,/select\("trip_id,trip_data"\)/);
 assert.match(server,/googleRoutes\(query\)/);
 assert.match(server,/optionalAiRanking\(query,verified\)/);
 assert.doesNotMatch(client,/OPENAI_API_KEY|HH_LENA_NATIVE_ROUTING_API_KEY/);
});
