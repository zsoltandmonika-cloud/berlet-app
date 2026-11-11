'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=file('supabase/functions/hh-interfood-outlook-bridge-v1179/parser.ts');
const parser=new Function(source.replace(/^export /gm,'')+
 ';return {parseConfirmedMail,graphBodyText,matchOfficial,validImage};')();
const edge=file('supabase/functions/hh-interfood-outlook-bridge-v1179/index.ts');
const app=file('healthhub/nutrition/hh-interfood-outlook-bridge-v1179.js');
const html=file('healthhub/nutrition/index.html');
const ddl=file('supabase/migrations/20261112001000_interfood_outlook_bridge_v1179.sql');
const message=[
 'Feladó: Interfood <info@interfood.hu>',
 'Ételrendelés (46. hét)',
 '2026-11-09 Hétfő',
 'I 1 adag Sárgabarackos gombóc*: 860 FT',
 '(179kcal, 37.9g szénh., 3.5g fehérje, 1.4g zsír)',
 '2026-11-11 Szerda',
 'F2K 1 adag Sárgaborsó főzelék, sült oldalas: 1240 FT',
 '(858kcal, 57.3g szénh., 30g fehérje, 57g zsír)',
 '2026-11-12 Csütörtök',
 'E2K 1 adag Húsos, juhtúrós rakott karfiol: 1420 FT',
 '(378kcal, 15.3g szénh., 29.4g fehérje, 21.9g zsír)',
 '2026-11-13 Péntek',
 'E4K 1 adag Currys pulyka sárgabarackkal, mazsolás jázmin rizs: 1475 FT',
 '(1475 FT)',
 '(495kcal, 90.9g szénh., 24.9g fehérje, 5.4g zsír)',
].join('\n');
const photos=[
 'https://ia.interfood.hu/api/v1/i?menu_item_id=40242&width=425&height=425',
 'https://ia.interfood.hu/api/v1/i?menu_item_id=40097&width=425&height=425',
 'https://ia.interfood.hu/api/v1/i?menu_item_id=40002&width=425&height=425',
 'https://ia.interfood.hu/api/v1/i?menu_item_id=40023&width=425&height=425'
];
test('four forwarded Interfood order lines become only food snapshots',()=>{
 const parsed=parser.parseConfirmedMail({contentType:'text',content:message});
 assert.equal(parsed.length,4);
 assert.deepEqual(parsed.map(x=>x.code),['I','F2K','E2K','E4K']);
 assert.equal(parsed[1].nutrients.kcal,858);
 assert.equal(parsed[3].nutrients.carbs,90.9);
 assert.doesNotMatch(JSON.stringify(parsed),/info@interfood|Feladó|Ételrendelés/i);
});
test('source HTML is converted to safe structured text, missing macros are never invented',()=>{
 const html=message.replace(/\n/g,'<br>');
 assert.equal(parser.parseConfirmedMail({contentType:'html',content:html}).length,4);
 assert.equal(parser.parseConfirmedMail({contentType:'text',
  content:'2026-11-11 Szerda\nF2K 1 adag Sárgaborsó főzelék, sült oldalas: 1240 Ft'}).length,0);
});
test('official photo requires exact vendor endpoint and exact date/code/macros',()=>{
 const rows=parser.parseConfirmedMail({contentType:'text',content:message});
 const feed={items:rows.map((o,i)=>({...o,imageUrl:photos[i],weightGrams:i===2?300:null}))};
 for(let i=0;i<4;i++){
  assert.equal(parser.validImage(photos[i]),photos[i]);
  assert.equal(parser.matchOfficial(rows[i],feed).imageUrl,photos[i]);
 }
 assert.equal(parser.matchOfficial({...rows[1],code:'F1K'},feed).imageUrl,null);
 assert.equal(parser.matchOfficial({...rows[1],nutrients:{...rows[1].nutrients,kcal:999}},feed).imageUrl,null);
 assert.equal(parser.matchOfficial({...rows[1],menuDate:'2026-11-12'},feed).imageUrl,null);
 assert.equal(parser.validImage('https://evil.example/api/v1/i?menu_item_id=40242&width=425&height=425'),null);
});
test('delegated Microsoft access is explicit and mailbox tokens encrypted server-side',()=>{
 assert.match(edge,/offline_access User.Read Mail.Read/);
 assert.match(edge,/Deno\.serve/);
 assert.match(edge,/await member\(req\)/);
 assert.match(edge,/oauth_pending_v1/);
 assert.match(edge,/await seal\(grant\.refresh_token,owner\)/);
 assert.match(edge,/await cronAuthorized\(req\)/);
 assert.match(edge,/FOLDER="Interfood Rendelések"/);
 assert.match(edge,/sender!=="info@interfood.hu"/);
 assert.match(edge,/aesKey|AES-GCM/);
 assert.doesNotMatch(edge,/console\.log\(|console\.error\(/);
});
test('database is service-role-only with RLS, no raw message content stored',()=>{
 for(const table of ['hh_interfood_graph_oauth_pending_v1',
  'hh_interfood_graph_connections_v1','hh_interfood_confirmed_orders_v1',
  'hh_interfood_bridge_config_v1']){
  assert.match(ddl,new RegExp(table.replace(/_/g,'_')+' enable row level security'));
  assert.match(ddl,new RegExp('revoke all on public\\.'+table+' from anon,authenticated'));
 }
 assert.doesNotMatch(ddl,/mail_body|message_body|postal_address|telephone/i);
 assert.match(edge,/profile_key:"monika",code:meal\.code,name:meal\.name/);
});
test('one premium tile, safe Vault receiver; no browser-side Outlook credentials',()=>{
 assert.match(html,/hh-interfood-outlook-bridge-v1179\.js/);
 assert.match(html,/central-vault\/daily-health-sync\.js/);
 assert.match(html,/hh-interfood-smart-lunch-v1178\.js/);
 assert.match(app,/v\.stream\(ENDPOINT,\{action\}\)/);
 assert.match(app,/importConfirmedInterfoodOrder\(\{expectedProfile:profile,order:meal\}\)/);
 assert.match(app,/cloud\(\)\?\.connected\(\)/);
 assert.doesNotMatch(app,/client_secret|refresh_token|localStorage\.setItem/);
 new vm.Script(app);
});
