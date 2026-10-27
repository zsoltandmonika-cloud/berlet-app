'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'usage-control/index.html'),'utf8');
const admin=fs.readFileSync(path.join(root,'hh-admin-mobile-focus-v748.js'),'utf8');
test('Admin quick action opens dedicated responsive Usage Control',()=>{
 assert.match(admin,/id='hhUsageOpenV870'/);
 assert.match(admin,/usage-control\/index\.html/);
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
 assert.match(html,/@media\(max-width:600px\)/);
 assert.match(html,/\.kpis\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/\.services\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/@media\(max-width:360px\)/);
});
test('Tracked providers and report sections are discoverable',()=>{
 for(const p of ['GitHub','Dropbox','Google','Outter','Supabase','AI / OpenAI','Egyéb'])assert.ok(html.includes(p),'missing '+p);
 for(const s of ['Szolgáltatások','Legnagyobb fogyasztók','Használati trend','Javasolt intézkedések'])assert.ok(html.includes(s),'missing '+s);
 assert.match(html,/type="month"/);
 assert.match(html,/type="date"/);
});
test('No fabricated billed usage or unsafe browser-service credentials',()=>{
 assert.match(html,/used:null,limit:5,unit:'GB \/ hó'/);
 assert.match(html,/used:17777,limit:null,unit:'hívás \/ 24h'/);
 assert.match(html,/used:5467,limit:null,unit:'hívás \/ 24h'/);
 assert.doesNotMatch(html,/sk-proj-|service_role|sb_secret_|Bearer\s+\$\{/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/);
 assert.doesNotMatch(html,/setInterval\(/);
 assert.match(html,/Nincs teljes mérés/);
});
test('Data quality, serialization and controls protected',()=>{
 assert.match(html,/new Intl\.NumberFormat\('hu-HU'/);
 assert.match(html,/r\.unit===select\.value/);
 assert.match(html,/root\.replaceChildren\(\)/);
 assert.match(html,/textContent=String\(content\)/);
 assert.match(html,/function csvCell\(v\)/);
 assert.match(html,/confirm\('Törlöd csak ezen az eszközön/);
 assert.match(html,/localStorage\.setItem\(STORE/);
 assert.match(html,/Még csak/);
});
test('No new Supabase costs or sensitive health/GPS payload collection',()=>{
 assert.doesNotMatch(html,/supabase\.createClient|fetch\(['"]https:\/\/|getCurrentPosition\(|watchPosition\(/);
 assert.match(html,/Nincs szolgáltatói usage adat/);
 assert.match(html,/nem GB/);
});

test('v871 quota reads are opt-in with explicit OAuth and measured-only cards',()=>{
 assert.match(html,/hh-chatgpt-target-auth-v739\.js\?v=739-account-871/);
 assert.match(html,/id="dropboxUsageRead"/);
 assert.match(html,/id="dropboxUsageAuthorize"/);
 assert.match(html,/api\.getSpaceUsage\(\)/);
 assert.match(html,/api\.authorize\(\)/);
 assert.match(html,/OBSERVED='sh9-usage-center-observed-v871'/);
 assert.match(html,/provider:'dropbox'/);
 assert.match(html,/unit:'GB tárhely'/);
 assert.match(html,/source:'Dropbox \/users\/get_space_usage'/);
 assert.doesNotMatch(html,/setInterval\(/);
});
test('Production entry busts stale cached Admin JS for v870',()=>{
 const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(entry,/hh-admin-mobile-focus-v748\.js\?v=748[^"']*usage=870/);
});
