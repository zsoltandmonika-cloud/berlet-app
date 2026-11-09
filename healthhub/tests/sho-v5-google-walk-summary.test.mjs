import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {summarizeGoogleWalks,walkSectionLabel} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/google-walk-summary-v1.mjs";

const walk=meters=>({kind:"walk",meters,seconds:10});
const transit=line=>({
 kind:"transit",from:"Induló megálló",to:"Érkező megálló",
 departure:"2026-11-27T15:00:00Z",arrival:"2026-11-27T15:10:00Z",line
});
const sample={
 durationSeconds:237*60,
 steps:[
  walk(67),walk(122),transit("H5"),
  walk(2),walk(6),walk(21),walk(59),transit("M2"),
  walk(62),walk(203),transit("1054"),
  walk(81),walk(103),walk(11),walk(124),walk(44),walk(82)
 ]
};

test("groups Google step fragments, never crossing a transit leg",()=>{
 const out=summarizeGoogleWalks(sample);
 assert.ok(out);
 assert.deepEqual(out.items.map(x=>x.kind),
  ["walk","transit","walk","transit","walk","transit","walk"]);
 assert.deepEqual(out.items.filter(x=>x.kind==="walk").map(x=>x.meters),
  [189,88,265,445]);
 assert.deepEqual(out.items.filter(x=>x.kind==="walk").map(x=>x.phase),
  ["before_first_ride","transfer","transfer","after_last_ride"]);
 assert.deepEqual(out.items.filter(x=>x.kind==="walk").map(x=>x.stepCount),
  [2,4,2,6]);
 assert.equal(out.totalWalkMeters,987);
 assert.equal(out.walkSections,4);
 assert.equal(out.transitCount,3);
 assert.equal(out.transfers,2);
});

test("original Google provider data is not mutated and original legs remain",()=>{
 const before=JSON.stringify(sample);
 const out=summarizeGoogleWalks(sample);
 assert.equal(JSON.stringify(sample),before);
 assert.deepEqual(out.items.filter(x=>x.kind==="transit").map(x=>x.step.line),
  ["H5","M2","1054"]);
 assert.equal(walkSectionLabel(out.items[0].phase),"Séta az első járatig");
 assert.equal(walkSectionLabel(out.items.at(-1).phase),"Séta a célig");
});

test("single walking step, adjacent transit, and no walks still work",()=>{
 const a=summarizeGoogleWalks({durationSeconds:450,steps:[walk(70),transit("260")]});
 assert.equal(a.totalWalkMeters,70);
 assert.equal(a.walkSections,1);
 assert.equal(a.transfers,0);
 const b=summarizeGoogleWalks({durationSeconds:450,steps:[transit("H5"),transit("M2")]});
 assert.equal(b.totalWalkMeters,0);
 assert.equal(b.walkSections,0);
 assert.equal(b.transfers,1);
});

test("malformed content fails closed; no missing steps silently dropped",()=>{
 assert.equal(summarizeGoogleWalks({durationSeconds:5,steps:[walk(4),{kind:"ferry"}]}),null);
 assert.equal(summarizeGoogleWalks({durationSeconds:5,steps:[walk(4)]}),null);
 assert.equal(summarizeGoogleWalks({durationSeconds:5,steps:[walk(-10),transit("H5")]}),null);
 assert.equal(summarizeGoogleWalks({durationSeconds:5,steps:[walk(1.5),transit("H5")]}),null);
 assert.equal(summarizeGoogleWalks({durationSeconds:5,steps:new Array(46).fill(walk(10))}),null);
 assert.equal(summarizeGoogleWalks(null),null);
});

test("V5 renderer uses compact walking presentation but does not pass Google data to Léna",()=>{
 const root="sh9/smart-travel/public-transport/smart-trip/";
 const html=readFileSync(root+"index.html","utf8");
 const js=readFileSync(root+"v5/universal/smart-trip-v5-api-ui.mjs","utf8");
 assert.match(html,/v=6-collapsed-walk-steps/);
 assert.match(js,/summarizeGoogleWalks\(r\)/);
 assert.match(js,/Összes becsült gyaloglás/);
 assert.match(js,/walkSectionLabel\(item\.phase\)/);
 assert.match(js,/Átszállások: /);
 assert.doesNotMatch(js,/🚶 Gyaloglás: "\+step\.meters/);
 assert.match(js,/evaluateIndependentBkk/);
 assert.match(js,/evaluateIndependentMav/);
 const render=js.slice(js.indexOf("function renderRoutes(data)"),js.indexOf("async function execute(mode)"));
 assert.doesNotMatch(render,/evaluateIndependent|api\.openai\.com|\.insert\(|localStorage\.setItem/);
});
