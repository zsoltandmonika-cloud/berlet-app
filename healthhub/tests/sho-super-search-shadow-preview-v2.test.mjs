import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const html=readFileSync("sh9/super-search/local-shadow-preview-v2.html","utf8");
const js=readFileSync("sh9/super-search/local-shadow-preview-v2.mjs","utf8");
const core=readFileSync("sh9/super-search/sho-super-search-core-v1.mjs","utf8");
const original=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
test("separate same-origin preview never installs itself on the live search page",()=>{
 assert.match(html,/<title>SHO AI Super Search/);
 assert.match(html,/script type="module" src="\.\/local-shadow-preview-v2\.mjs"/);
 assert.doesNotMatch(original,/local-shadow-preview-v2|sho-super-search-core-v1/);
 assert.doesNotMatch(html,/<iframe|<form[^>]+action=|<script[^>]+src="https?:/i);
 assert.doesNotMatch(html,/supabase\.co|openai\.com|chatgpt\.com/i);
});
test("CSP blocks outgoing fetch and unsolicited connections",()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/object-src 'none'/);
 assert.match(html,/script-src 'self'/);
});
test("user action and explicit local-data consent are mandatory",()=>{
 assert.match(html,/id="superConsent" required/);
 assert.match(js,/form\.addEventListener\("submit"/);
 assert.match(js,/!\$\("superConsent"\)\.checked/);
 assert.match(js,/if\(!source\)source=createLocalRailShadow\(\)/);
 assert.doesNotMatch(js,/DOMContentLoaded.*getExistingResults/s);
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/\.upload\(/);
 assert.doesNotMatch(js,/\.insert\(/);
});
test("measured local stage is not presented as GPT-6 or cloud time",()=>{
 assert.match(js,/fullSearchSeconds:null,gpt6Seconds:null,myTripsSaved:false/);
 assert.match(html,/nem teljes ajtótól ajtóig|ajtótól ajtóig/i);
 assert.match(js,/result\.status==="results"/);
 assert.match(js,/existing|eredeti Léna-keresés/i);
 assert.match(js,/source\?\.dispose\(\)/);
});
test("HTML and local preview have no access to health or Wallet information",()=>{
 for(const text of [html,js]){
  assert.doesNotMatch(text,/wallet-private-v7|hh_valet_identity_cards_v11|hh_kb_documents|hh_profile_access/i);
 }
 assert.match(core,/private_domain_not_connected/);
});
