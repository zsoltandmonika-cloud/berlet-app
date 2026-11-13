'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('healthhub/guardian/smart-260-connect/app.mjs');
const guardian=read('healthhub/guardian/guardian-smart-match-pin-v1.mjs');
const html=read('healthhub/guardian/smart-260-connect/index.html');
const css=read('healthhub/guardian/smart-260-connect/style.css');
const guardianHtml=read('healthhub/guardian/index.html');

function config(stored,search=''){
 const start=app.indexOf('const storedProfile=');
 const end=app.indexOf('let selectedFeeders=');
 assert.ok(start>0&&end>start,'profile configuration must be standalone');
 const block=app.slice(start,end);
 const storage={getItem:k=>k==='hh-profile'?stored:null};
 return vm.runInNewContext(block+';({PROFILE,STORAGE,ACTIVE_PIN_KEY,DELETED_SAMPLES_KEY})',
  {localStorage:storage,location:{search},URLSearchParams});
}

test('Existing Mónika templates, active pin and deletion list keep exact original storage keys',()=>{
 const m=config('m');
 assert.equal(m.PROFILE,'monika');
 assert.equal(m.STORAGE,'sh9-smart-match-templates-v1-m');
 assert.equal(m.ACTIVE_PIN_KEY,'sh9-smart-match-active-pin-v1-m');
 assert.equal(m.DELETED_SAMPLES_KEY,'sh9-smart-match-deleted-samples-v940');
 assert.equal(config(null).PROFILE,'monika','legacy no-profile pages remain backward compatible');
});

test('Zsolt has independent route, pin and deleted-sample keys; direct Guardian link keeps identity',()=>{
 const z=config('z');
 assert.equal(z.PROFILE,'zsolt');
 assert.equal(z.STORAGE,'sh9-smart-match-templates-v1-z');
 assert.equal(z.ACTIVE_PIN_KEY,'sh9-smart-match-active-pin-v1-z');
 assert.equal(z.DELETED_SAMPLES_KEY,'sh9-smart-match-deleted-samples-v940-z');
 assert.equal(config('m','?profile=z&pinned=1&id=zsolt-home-to-david-anna').PROFILE,'zsolt');
 assert.equal(config('z','?profile=m&pinned=1&id=monika-260').PROFILE,'monika');
});

test('Zsolt gets his own reversible Otthon to Dávidék drafts with no invented three-leg times',async()=>{
 const {HOME,FAMILY_OUTBOUND,FAMILY_RETURN}=await import('../guardian/smart-260-connect/core.mjs');
 const start=app.indexOf('const clone=obj=>');
 const end=app.indexOf('const freshDate=');
 assert.ok(start>0&&end>start);
 const out=vm.runInNewContext(app.slice(start,end)+';ZS_SAMPLES',
  {HOME,FAMILY_OUTBOUND,FAMILY_RETURN,PROFILE:'zsolt'});
 assert.equal(out.length,3);
 assert.ok(out.every(x=>x.profile==='zsolt'));
 const outbound=out.find(x=>x.id==='zsolt-home-to-david-anna');
 const back=out.find(x=>x.id==='zsolt-david-anna-to-home');
 assert.equal(outbound.reverseId,back.id);
 assert.equal(back.reverseId,outbound.id);
 assert.equal(outbound.originLabel,'Otthon');
 assert.equal(back.destinationLabel,'Otthon');
 assert.equal(outbound.multiLegDraft,true);
 assert.equal(back.multiLegDraft,true);
 assert.equal(FAMILY_OUTBOUND.profile,'monika');
 assert.equal(FAMILY_RETURN.profile,'monika');
 assert.match(app,/const multiLeg=item\.multiLegDraft===true/);
 assert.match(app,/még nincs hitelesített indulási idő/);
});

test('Saved template operations and reminder name follow selected profile, with no cross-profile copying',()=>{
 assert.match(app,/x\.profile===PROFILE/);
 assert.match(app,/const PROFILE_SAMPLES=PROFILE==="monika"\?SAMPLES:ZS_SAMPLES/);
 assert.match(app,/profile:PROFILE/);
 assert.match(app,/localStorage\.setItem\(STORAGE,JSON\.stringify\(state\.items\)\)/);
 assert.match(app,/localStorage\.setItem\(ACTIVE_PIN_KEY,item\.id\)/);
 assert.match(app,/DELETED_SAMPLES_KEY=PROFILE==="monika"\?/);
 assert.match(app,/window\.addEventListener\("storage",e=>\{/);
 assert.match(app,/const msg=\(PROFILE==="monika"\?"Mónika":"Zsolt"\)/);
});

test('Family Guard uses profile-specific pinned route and does not fake a departure for Zsolt family draft',()=>{
 assert.match(guardian,/Z_STORAGE="sh9-smart-match-templates-v1-z"/);
 assert.match(guardian,/Z_ACTIVE="sh9-smart-match-active-pin-v1-z"/);
 assert.match(guardian,/x\.profile==="zsolt"/);
 assert.match(guardian,/FULL\+"\?profile=z&pinned=1&id="/);
 assert.match(guardian,/FULL\+"\?pinned=1&id="\+encodeURIComponent\(target\)\+"&profile=m"/);
 assert.match(guardian,/if\(state\.item\.multiLegDraft===true\)/);
 assert.match(guardian,/3 járatos útvonal · menetrendi párosítás még nincs/);
 assert.match(guardian,/b\.hidden=activeProfile\(\)!=="monika"/);
 assert.match(guardianHtml,/guardian-smart-match-pin-v1\.mjs\?v=944-dual-profile-zsolt-pin/);
});

test('Zsolt is blue, Mónika styling remains untouched, and app is cache-busted',()=>{
 assert.match(html,/id="smProfileBadgeV944"/);
 assert.match(html,/app\.mjs\?v=944-dual-profile-smart-match/);
 assert.match(html,/style\.css\?v=944-zsolt-blue-glass/);
 assert.match(css,/body\[data-smart-match-profile="z"\]\{--pink:#79bfff/);
 assert.doesNotMatch(css,/body\[data-smart-match-profile="m"\]/);
 assert.match(app,/document\.body\.dataset\.smartMatchProfile=PROFILE==="monika"\?"m":"z"/);
});
