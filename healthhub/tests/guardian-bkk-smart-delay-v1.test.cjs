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
