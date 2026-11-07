import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {endpointFromConfig,parseCoords,makePreflight,checkResponse,callPreflight,
  EXPECTED_ORIGIN,PREFLIGHT_TIMEOUT_MS} from
  "../../sh9/smart-travel/public-transport/smart-trip/v5/v5-preflight-core.mjs";

const root="sh9/smart-travel/public-transport/smart-trip/v5/";
const html=readFileSync(root+"index.html","utf8");
const ui=readFileSync(root+"v5-preflight-ui.mjs","utf8");
const live=readFileSync(root+"v5-live-pilot.mjs","utf8");
const config={enabled:true,supabaseUrl:EXPECTED_ORIGIN+"/",publishableKey:"sb_publishable_01234567890_public"};
const okEndpoint=endpointFromConfig(config);
const input={from:"47.52693,19.03802",to:"48.25657,20.62831",when:"2026-11-27T14:00:00.000Z"};
const body=makePreflight(input,"m");
const okPayload={status:"ready_for_review",mode:"route_preflight",request_valid:true,
  user_authorized:true,google_enabled:false,google_request:false,
  quota_consumed:0,source:"local_validation"};

test("Only pinned Supabase origin and existing Guardian auth are accepted",()=>{
  assert.equal(okEndpoint.url,EXPECTED_ORIGIN+"/functions/v1/hh-smart-trip-routes-v1");
  assert.equal(endpointFromConfig({...config,supabaseUrl:"https://attacker.example/"}),null);
  assert.equal(endpointFromConfig({...config,supabaseUrl:EXPECTED_ORIGIN+"/wrong"}),null);
  assert.equal(endpointFromConfig({...config,supabaseUrl:EXPECTED_ORIGIN+"/?other=1"}),null);
  assert.equal(endpointFromConfig({...config,enabled:false}),null);
  assert.match(ui,/hh-guardian-family-auth-v785/);
  assert.match(ui,/auth\.getSession\(\)/);
  assert.match(ui,/data\.session\.access_token/);
});
test("Coordinate validation rejects invalid locations",()=>{
  assert.deepEqual(parseCoords("47.52693, 19.03802"),{lat:47.52693,lng:19.03802});
  for(const v of ["Budapest","nan,19.03","91,19","47,200","0,0,0","",null])
    assert.equal(parseCoords(v),null);
  assert.throws(()=>makePreflight({...input,from:input.to},"m"),/két különböző/);
});
test("Preflight exact date, profile and coordinates, never route mode",()=>{
  assert.deepEqual(body,{mode:"route_preflight",profile:"m",
    origin:{lat:47.52693,lng:19.03802},
    destination:{lat:48.25657,lng:20.62831},
    departureTime:"2026-11-27T14:00:00.000Z"});
  assert.throws(()=>makePreflight(input,"admin"),/profil/);
  assert.throws(()=>makePreflight({...input,when:"2026-11-27T15:00:00"},"m"),/időzónája/);
});
test("One mocked authenticated POST hits only our preflight endpoint, with no extra modes",async()=>{
  let calls=0;
  const session={access_token:"fake_user_jwt_for_test_only",user:{id:"fake-id"}};
  const fakeFetch=async(url,options)=>{
    calls++;
    assert.equal(url,okEndpoint.url);
    assert.equal(options.method,"POST");
    assert.equal(options.credentials,"omit");
    assert.equal(options.cache,"no-store");
    assert.equal(options.headers.apikey,config.publishableKey);
    assert.equal(options.headers.Authorization,"Bearer "+session.access_token);
    assert.deepEqual(JSON.parse(options.body),body);
    return {status:200,text:async()=>JSON.stringify(okPayload)};
  };
  const r=await callPreflight(okEndpoint,session,body,fakeFetch,new AbortController().signal);
  assert.equal(calls,1);
  assert.equal(r.ok,true);
  assert.equal(PREFLIGHT_TIMEOUT_MS,12000);
});
test("No logged-in session and wrong target must not make a network request",async()=>{
  let calls=0;
  const fn=async()=>{calls++;throw Error("network should not run")};
  assert.equal((await callPreflight(okEndpoint,null,body,fn)).ok,false);
  assert.equal((await callPreflight({...okEndpoint,url:"https://evil.example/test"},
    {access_token:"token",user:{id:"id"}},body,fn)).ok,false);
  assert.equal(calls,0);
});
test("Unexpected backend responses fail closed",()=>{
  assert.equal(checkResponse(200,okPayload).ok,true);
  for(const res of [
    checkResponse(200,{...okPayload,google_request:true}),
    checkResponse(200,{...okPayload,quota_consumed:1}),
    checkResponse(200,{...okPayload,google_enabled:true}),
    checkResponse(200,{...okPayload,user_authorized:false}),
    checkResponse(503,{error:"provider_not_enabled"}),
    checkResponse(403,{error:"origin_denied"}),
    checkResponse(401,null),
    checkResponse(500,{status:"ready_for_review"}),
    checkResponse(200,null),
  ])assert.equal(res.ok,false);
});
test("Pilot UI is explicit-click only and does not retain or display JWT",()=>{
  assert.match(html,/id="preflight"/);
  assert.match(html,/id="preflightStatus"/);
  assert.match(html,/v5-preflight-ui\.mjs/);
  assert.match(html,/healthhub\/central-vault\/config\.js/);
  assert.match(html,/@supabase\/supabase-js@2\.57\.2/);
  assert.match(ui,/addEventListener\("click",run\)/);
  assert.match(ui,/getQuery\(\)/);
  assert.match(live,/export \{getQuery\}/);
  assert.doesNotMatch(ui,/HH_SMART_TRIP_GOOGLE_ROUTES_KEY|SUPABASE_SERVICE_ROLE_KEY|localStorage\.setItem|sessionStorage\.setItem|innerHTML/);
  assert.doesNotMatch(html,/Google API: BEKAPCSOLVA/);
});
