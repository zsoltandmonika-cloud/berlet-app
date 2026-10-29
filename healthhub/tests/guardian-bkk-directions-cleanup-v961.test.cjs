'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'guardian-transit-v791.js'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-bkk-directions-cleanup-v961.css'),'utf8');
const guardian=fs.readFileSync(path.join(root,'guardian.js'),'utf8');

test('v961 removes all three user-marked visual clutter areas',()=>{
 assert.doesNotMatch(html,/<details class="hh-smart-hub-sources-v954">/);
 assert.doesNotMatch(html,/Adatok és pontosság/);
 assert.doesNotMatch(html,/<p class="hh-transit-credit">/);
 assert.match(html,/<label for="hhTransitProfileV791" hidden>Profil<\/label>/);
 assert.match(html,/<select id="hhTransitProfileV791" hidden /);
 assert.match(html,/<p id="hhTransitStatus"[^>]+aria-live="polite" hidden><\/p>/);
 assert.doesNotMatch(js,/title\.textContent='Irányok külön/);
 assert.match(css,/#hhTransitProfileV791\[hidden\]/);
 assert.match(css,/#hhTransitDirectionsV791 > p\{\s*display:none!important;/);
 assert.match(html,/guardian-bkk-directions-cleanup-v961\.css\?v=961/);
 assert.match(html,/guardian-transit-v791\.js\?v=961-clean-directions-status/);
});

test('v961 retains the route/stop checkboxes, the active-profile bridge and actionable warnings',()=>{
 for(const id of ['hhTransitProfileV791','hhTransitDirectionsV791','hhTransitStatus',
  'hhBkkWatchlistV814','hhBkkCatalogV801','hhSmartHubDestinationV802',
  'hhSmartHubFavoritesV806','hhTransitRoute260','hhTransitRoute17','hhTransitRoute19'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(js,/function setProfile\(p\)/);
 assert.match(js,/const field=\$\('hhTransitProfileV791'\);if\(field\)field\.value=profile/);
 assert.match(guardian,/HH_GUARDIAN_TRANSIT_V790\?\.setProfile\?\./);
 assert.match(js,/x\.hidden=!warning/);
 assert.match(js,/x\.textContent=warning\?String\(s\):''/);
 assert.match(js,/⚠️\|hiba\|nem érhet\|nem siker\|frissítésre vár/);
 assert.match(js,/r\.variants\.forEach/);
 assert.doesNotThrow(()=>new vm.Script(js));
});

test('v961 keeps source links available in BKK catalog, with no new requests',()=>{
 assert.match(html,/Forrás: <a href="https:\/\/opendata\.bkk\.hu\/data-sources"/);
 assert.match(html,/BKK Zrt\., CC BY 4\.0<\/a>/);
 assert.match(html,/<a href="https:\/\/www\.openstreetmap\.org\/copyright"/);
 assert.match(html,/© OpenStreetMap-közreműködők<\/a> · Photon \(komoot\)/);
 assert.match(css,/\.hh-bkk-catalog-note-v801 a:focus-visible/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|setInterval\(|watchPosition\(|getCurrentPosition\(|supabase\.co|new maplibregl/);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
 assert.equal((html.match(/<details\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
});
