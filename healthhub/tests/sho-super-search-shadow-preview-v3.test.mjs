import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync("sh9/super-search/local-shadow-preview-v3.html","utf8");
const js=readFileSync("sh9/super-search/local-shadow-preview-v3.mjs","utf8");
const worker=readFileSync("sh9/super-search/local-gtfs-worker-v3.mjs","utf8");
const production=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
test("V3 is an opt-in isolated preview and cannot change the live Golden UI",()=>{
 assert.match(html,/local-shadow-preview-v3\.mjs/);
 assert.match(html,/worker-src 'self'/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(production,/local-shadow-preview-v3|sho-super-search-core-v1|local-gtfs-worker-v3/);
});
test("V3 runs routing in dedicated Worker, never as a synchronous main-thread fallback",()=>{
 assert.match(js,/createWorkerRailShadow/);
 assert.match(js,/if\(!source\)source=createWorkerRailShadow\(\)/);
 assert.doesNotMatch(js,/createLocalRailShadow|\.route\(/);
 assert.doesNotMatch(js,/import\(["']\.\.\/smart-travel/);
 assert.match(worker,/local-gtfs-shadow-v2\.mjs/);
 assert.match(worker,/rail-gtfs-core-fast-v1120\.js/);
});
test("no GTFS read on page load and explicit user consent is checked",()=>{
 assert.match(js,/form\.addEventListener\("submit"/);
 assert.match(js,/superConsent/);
 assert.match(html,/id="superConsent" required/);
 assert.doesNotMatch(js,/DOMContentLoaded[^\n]+getExistingResults/);
 assert.match(js,/source\?\.dispose\(\)/);
});
test("V3 status never pretends GPT-6 or My Trips saves are finished",()=>{
 assert.match(js,/fullSearchSeconds:null,gpt6Seconds:null,myTripsSaved:false/);
 assert.match(html,/nincs adatfeltöltés/);
 assert.doesNotMatch(worker,/\bfetch\s*\(|Supabase|openai\.com|chatgpt\.com/i);
});
