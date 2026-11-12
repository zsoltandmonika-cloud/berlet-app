const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),core=require("../guardian/bkk-smart-delay-v1.js");
const validate=require("../guardian/bkk-live-v793.js").validate;
const now=Date.parse("2026-11-12T08:05:00Z"),at=new Date(now-1000).toISOString();
const pred=(delaySeconds,overrides={})=>({routeKey:"bus:260",stopId:"BKK_056124",
 scheduledMs:Date.parse("2026-11-12T07:07:00Z"),predictedMs:Date.parse("2026-11-12T07:07:00Z")+delaySeconds*1000,delaySeconds,asOf:at,...overrides});
test("exact 0 alone is perfect on-time green; early amber and delay red",()=>{
 assert.deepEqual(core.classify(0,at,now).status,"ontime");
 assert.deepEqual(core.classify(-120,at,now).status,"early");
 assert.equal(core.classify(-120,at,now).text,"+2p");
 assert.deepEqual(core.classify(240,at,now).status,"late");
 assert.equal(core.classify(240,at,now).text,"−4p");
 assert.equal(core.classify(10,at,now).text,"−1p");
 assert.equal(core.classify(-10,at,now).text,"+1p");
 assert.equal(core.classify(null,at,now).status,"unknown");
 assert.equal(core.classify(0,new Date(now-120000).toISOString(),now).status,"unknown");
 assert.equal(core.classify(0,new Date(now+60000).toISOString(),now).status,"unknown");
});
test("only exact same line+stop+planned time, no ambiguous trip",()=>{
 const p=pred(-120);
 assert.equal(core.matchStopPrediction([p],"bus:260","056124",p.scheduledMs,now),p);
 assert.equal(core.matchStopPrediction([p],"bus:260","F00570",p.scheduledMs,now),null);
 assert.equal(core.matchStopPrediction([p],"tram:19","056124",p.scheduledMs,now),null);
 assert.equal(core.matchStopPrediction([p],"bus:260","056124",p.scheduledMs+60000,now),null);
 assert.equal(core.matchStopPrediction([p,p],"bus:260","056124",p.scheduledMs,now),null);
 assert.equal(core.matchStopPrediction([pred(0,{asOf:"2020-01-01T00:00:00Z"})],"bus:260","056124",p.scheduledMs,now),null);
});
test("vehicle client preserves only fresh TripUpdates metadata",()=>{
 const base={schemaVersion:1,source:"BKK Zrt., CC BY 4.0",feedType:"GTFS-RT VehiclePositions",generatedAt:at};
 const vehicle={id:"v1",routeId:"260",routeKey:"bus:260",mode:"bus",lat:47.5,lng:19.01,timestamp:at};
 const good=validate({...base,vehicles:[{...vehicle,delaySeconds:-120,delayObservedAt:at,delayStopId:"056124"}]},now);
 assert.equal(good.ok,true);assert.equal(good.vehicles[0].delaySeconds,-120);
 const stale=validate({...base,vehicles:[{...vehicle,delaySeconds:0,delayObservedAt:"2020-01-01T00:00:00Z"}]},now);
 assert.equal(stale.ok,true);assert.equal(stale.vehicles[0].delaySeconds,undefined);
});
test("backend joins by tripId and never infers delay from vehicle GPS or a whole line",()=>{
 const backend=fs.readFileSync(path.join(root,"../supabase/functions/hh-bkk-live-v793-preview/index.ts"),"utf8");
 assert.match(backend,/TripUpdates\.pb/);
 assert.match(backend,/const update=updates\?\.trips\.get\(tripId\)/);
 assert.match(backend,/currentStopSequence/);
 assert.match(backend,/predictions/);
 assert.match(backend,/stopPredictions:predictions/);
 const html=fs.readFileSync(path.join(root,"guardian/smart-260-connect/index.html"),"utf8");
 assert.match(html,/smart-delay-client-v1\.mjs/);
 assert.match(html,/hhSmartDelayHeroV1/);
});


test("protobuf optional delay absent is NOT on-time, even when its prototype defaults to 0",()=>{
 const source=fs.readFileSync(path.join(root,"../supabase/functions/hh-bkk-live-v793-preview/index.ts"),"utf8");
 const match=source.match(/(const signedDelay=.+\n[\s\S]*?function explicitDelay\(event:any\):number\|null\{[\s\S]*?\n\})/);
 assert.ok(match,"Test the actual backend helper, not an independent reimplementation");
 const js=match[1].replace("(x:unknown)","(x)").replace("(event:any):number|null","(event)");
 const vm=require("node:vm");
 const explicit=vm.runInNewContext(js+"\nexplicitDelay");
 const inheritedZero=Object.create({delay:0}); // protobuf.js prototype default
 assert.equal(explicit(inheritedZero),null,"Inherited 0 must NEVER mean verified punctuality");
 assert.equal(explicit(Object.create(null)),null);
 assert.equal(explicit({time:1794480000}),null,"Absolute prediction time alone does not certify schedule difference");
 assert.equal(explicit({delay:0}),0,"Explicitly supplied 0 is on time");
 assert.equal(explicit({delay:-120}),-120);
 assert.equal(explicit({delay:240}),240);
 assert.equal(explicit({delay:null}),null);
 assert.equal(explicit({delay:9000}),null);
 assert.match(source,/dep=explicitDelay\(st\?\.departure\),arr=explicitDelay\(st\?\.arrival\)/);
 assert.match(source,/scheduleRelationship===1\|\|st\?\.scheduleRelationship===2/);
});


test("official GTFS-RT TripUpdate.delay restores favorites only when explicitly transmitted",()=>{
 const backend=fs.readFileSync(path.join(root,"../supabase/functions/hh-bkk-live-v793-preview/index.ts"),"utf8");
 assert.match(backend,/const tripDelaySeconds=explicitDelay\(tu\)/);
 assert.match(backend,/if\(rows\.length\|\|tripDelaySeconds!==null\)trips\.set/);
 assert.match(backend,/else if\(update\.tripDelaySeconds!==null\)/);
 assert.match(backend,/entry\.delaySeconds=update\.tripDelaySeconds/);
 assert.match(backend,/if\(next\)\{[\s\S]*?entry\.delaySeconds=next\.delaySeconds;[\s\S]*?\}else if\(update\.tripDelaySeconds!==null\)/);
 assert.match(backend,/relation!==undefined&&relation!==0/);
 assert.match(backend,/delayCoverage:\{feedAvailable:!!updates/);
 assert.match(backend,/withDelay:vehicles\.filter/);
 const helper=backend.match(/const signedDelay=.+\n[\s\S]*?function explicitDelay\(event:any\):number\|null\{[\s\S]*?\n\}/);
 assert.ok(helper,"the backend's actual protobuf helper must be found");
 const vm=require("node:vm");
 const js=helper[0].replace("(x:unknown)","(x)").replace("(event:any):number|null","(event)");
 const explicit=vm.runInNewContext(js+"\nexplicitDelay");
 assert.equal(explicit(Object.create({delay:0})),null,
  "a protobuf defaulted zero is NOT explicit on-time");
 assert.equal(explicit({time:1794480000}),null,
  "a time-only ETA is not a proven schedule deviation");
 assert.equal(explicit({delay:0}),0);
 assert.equal(explicit({delay:-120}),-120);
 assert.equal(explicit({delay:180}),180);
 const stamp=new Date(now).toISOString();
 const coverage=validate({
  schemaVersion:1,source:"BKK Zrt., CC BY 4.0",feedType:"GTFS-RT VehiclePositions",
  generatedAt:stamp,vehicles:[],
  delayCoverage:{feedAvailable:true,shown:0,withDelay:0,tripLevel:12,stopLevel:0}
 },now);
 assert.equal(coverage.ok,true);
 assert.equal(coverage.delayCoverage.tripLevel,12);
 assert.equal(coverage.delayCoverage.withDelay,0);
});


test("GTFS-RT optional timestamp/time/route_id cannot discard a source-backed trip delay",()=>{
 const src=fs.readFileSync(path.join(root,"../supabase/functions/hh-bkk-live-v793-preview/index.ts"),"utf8");
 // Official TripDescriptor.route_id is optional when trip_id uniquely identifies
 // the trip. The companion verified vehicle's route still must match.
 assert.match(src,/const hasRoute=!!descriptor&&Object\.prototype\.hasOwnProperty\.call\(descriptor,"routeId"\)/);
 assert.match(src,/if\(!id\|\|id\.length>160\|\|\(hasRoute&&!mapped\)\)continue/);
 assert.match(src,/routeKey:mapped\?\.routeKey\|\|null/);
 assert.match(src,/update\.routeKey===null\|\|update\.routeKey===route\.routeKey/);
 assert.match(src,/const tripId=typeof v\?\.trip\?\.tripId==="string"\?v\.trip\.tripId:""/);
 assert.match(src,/const update=updates\?\.trips\.get\(tripId\)/);
 assert.match(src,/Object\.prototype\.hasOwnProperty\.call\(tu,"timestamp"\)/);
 assert.match(src,/Object\.prototype\.hasOwnProperty\.call\(st\.departure,"time"\)/);
 assert.match(src,/Object\.prototype\.hasOwnProperty\.call\(st\.arrival,"time"\)/);
 // Protobuf.js defaults are inherited; absence is different from actual zero.
 const absent=Object.create({timestamp:0,routeId:"",delay:0});
 assert.equal(Object.prototype.hasOwnProperty.call(absent,"timestamp"),false);
 assert.equal(Object.prototype.hasOwnProperty.call(absent,"routeId"),false);
 assert.equal(Object.prototype.hasOwnProperty.call(absent,"delay"),false);
 const actual={timestamp:Date.parse("2026-11-12T08:00:00Z")/1000,
               routeId:"2600",delay:-120};
 assert.equal(Object.prototype.hasOwnProperty.call(actual,"timestamp"),true);
 assert.equal(Object.prototype.hasOwnProperty.call(actual,"routeId"),true);
 assert.equal(Object.prototype.hasOwnProperty.call(actual,"delay"),true);
});
