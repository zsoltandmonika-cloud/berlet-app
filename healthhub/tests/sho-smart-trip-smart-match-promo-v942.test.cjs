'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/smart-trip');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'smart-trip-smart-match-promo-v942.css'),'utf8');
const target='/berlet-app/healthhub/guardian/smart-260-connect/';

test('Smart Match promotional card uses the premium scoped visual and approved mobile copy',()=>{
 assert.match(html,/smart-trip-smart-match-promo-v942\.css\?v=942-launch-glass/);
 assert.match(html,/<section class="st22-match-promo" aria-label="Smart Match · menthető csatlakozási sablonok">/);
 assert.match(html,/<h2>Kitűzhető indulási timeline<\/h2>/);
 assert.match(html,/Saját Smart Match séma, ráhordó járatokkal és kitűzhető indulási nézettel\./);
 assert.match(html,/class="st22-match-promo__new">ÚJ<\/span>/);
 assert.match(html,/class="st22-match-promo__art" aria-hidden="true"/);
 assert.doesNotMatch(html,/Első minták: Mónika munkahely/);
});

test('Existing functional link, planner controls and bottom navigation are preserved',()=>{
 assert.equal(html.split('href="'+target+'"').length-1,1);
 assert.match(html,/class="st22-match-promo__cta" href="\/berlet-app\/healthhub\/guardian\/smart-260-connect\/"/);
 assert.match(html,/✨ Smart Match megnyitása/);
 for(const id of ['st22TripPackImport','st22TripPackSaved','st22Results','st22JourneyList']){
  assert.ok(html.includes('id="'+id+'"'),id+' missing');
 }
 assert.match(html,/<nav class="st22-nav"/);
 assert.match(html,/id="st22Shell"/);
});

test('Premium visuals remain self-contained, accessible, responsive and reduced-motion friendly',()=>{
 assert.match(css,/\.st22-match-promo\{/);
 assert.match(css,/\.st22-match-promo__cta:focus-visible/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/@media\(max-width:345px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.st22-match-promo__node--three/);
 assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|html|\.st22-nav|\.st22-card|\.st22-header)\s*\{/);
});
