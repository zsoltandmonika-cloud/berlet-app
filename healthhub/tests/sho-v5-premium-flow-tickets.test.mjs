import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {
 providerForStep,ticketLinksForRoute,SH9_V5_PROVIDER_ASSETS
} from "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/smart-trip-v5-provider-links-v1.mjs";
const step=(line,agency,vehicle="BUS")=>({kind:"transit",
 line,agency,vehicle,from:"Budapest",to:"Kazincbarcika",
 departure:"2026-11-27T15:00:00Z",arrival:"2026-11-27T19:00:00Z"});
const walk=meters=>({kind:"walk",meters,seconds:5});
const base="sh9/smart-travel/public-transport/smart-trip/";
const ui=readFileSync(base+"v5/universal/smart-trip-v5-inline-v1.mjs","utf8");
const view=readFileSync(base+"v5/universal/smart-trip-v5-premium-render-v1.mjs","utf8");
const html=readFileSync(base+"index.html","utf8");
const style=readFileSync(base+"smart-trip-v5-premium-flow-v1.css","utf8");

test("Volán 1054, MÁV IC and BKK metro have correct logos and official sales",()=>{
 const bus=providerForStep(step("1054","MÁV Személyszállítás","BUS"));
 assert.equal(bus?.id,"volan");
 const railway=providerForStep(step("IC 508","MÁV Személyszállítás","HEAVY_RAIL"));
 assert.equal(railway?.id,"mav");
 const metro=providerForStep(step("M2","BKK","METRO_RAIL"));
 assert.equal(metro?.id,"bkk");
 for(const op of [bus,railway,metro]){
  assert.ok(existsSync("sh9/smart-travel/public-transport/"+op.asset.slice(3)),op.asset);
  assert.match(op.asset,/approved-card-v5\.webp$/);
  assert.ok(op.name);
 }
});
test("only official provider booking portals, not speculative journey-specific links",()=>{
 const route={steps:[walk(70),step("M2","BKK","METRO_RAIL"),
  walk(20),step("1054","Volánbusz","BUS"),walk(200)]};
 const tickets=ticketLinksForRoute(route);
 assert.equal(tickets.length,2);
 assert.deepEqual(tickets.map(x=>x.url),["https://bkk.hu/bpgoletoltes/","https://jegy.mav.hu/"]);
 for(const t of tickets){
  assert.equal(new URL(t.url).search,"");
  assert.equal(new URL(t.url).hash,"");
  assert.ok(t.note.includes("külön")||t.note.includes("alkalmazásban"));
 }
 assert.equal(ticketLinksForRoute({steps:[step("22","unknown","BUS")]}).length,0);
 assert.equal(providerForStep(walk(12)),null);
});
test("MÁV and Volán route links share one safe railway/bus checkout",()=>{
 const result=ticketLinksForRoute({steps:[
  step("IC 508","MÁV","HEAVY_RAIL"),
  step("1054","MÁV Személyszállítás","BUS")]});
 assert.equal(result.length,1);
 assert.equal(result[0].url,"https://jegy.mav.hu/");
 assert.deepEqual(result[0].providers,["MÁV","Volán"]);
});
test("Google Maps attribution and premium timeline remain map-free and non-live",()=>{
 assert.match(view,/summarizeGoogleWalks\(route\)/);
 assert.match(view,/Google Maps/);
 assert.match(view,/setAttribute\("translate","no"\)/);
 assert.match(view,/st22-v5-flow/);
 assert.match(view,/menetrendi idővonal/);
 assert.match(view,/nem élő/);
 assert.match(view,/ticketLinksForRoute/);
 assert.match(view,/target="_blank"/);
 assert.match(view,/noopener noreferrer/);
 assert.match(view,/My Trips mentés nincs/);
 assert.match(ui,/if\(map\)map\.hidden=isV5/);
 assert.match(html,/smart-trip-v5-premium-flow-v1\.css/);
 assert.match(html,/v=2-brands-ticket-timeline/);
 assert.match(style,/st22-v5-provider-art/);
 assert.doesNotMatch(view,/api\.openai\.com|googleapis\.com|mavplusz\.hu\/.*trip|localStorage|setInterval|\.upsert\(/);
});
