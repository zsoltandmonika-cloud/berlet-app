'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(root,'../supabase/functions/smooth-endpoint-v395/audit.mjs'),'utf8');
const ctx={console};vm.runInNewContext(original.replace(/\bexport\s+(?=function|const)/g,''),ctx);
const format=ctx.formatClinicalAnswer;
const page={id:'D1:p1',title:'Eredeti lelet',documentDate:'2026-04-01',page:1,
 text:'Mintavétel 2026.03.27. Vizelettenyésztésben Escherichia coli.'};
const fact={sourceId:'D1:p1',quote:'Vizelettenyésztésben Escherichia coli.',
 fact:'A lelet Escherichia coli baktériumot nevez meg.'};
const audited={sections:[{heading:'Előzmények',paragraphs:[
 {kind:'documented',text:'A lelet Escherichia coli baktériumot nevez meg.',sourceIds:['D1:p1']},
 {kind:'possible',text:'Ez lehetséges összefüggés lehet, de önmagában nem igazol fertőzést.',sourceIds:[]}
]}]};
test('Golden Standard default has stable story → original facts → interpretation order',()=>{
 const output=format(audited,[page],[],{facts:[fact]},{facts:[]});
 const headings=['## A leletek története','## Dokumentált tények','## Orvosi értelmezés'];
 assert.ok(headings.every(h=>output.includes(h)));
 assert.ok(output.indexOf(headings[0])<output.indexOf(headings[1]));
 assert.ok(output.indexOf(headings[1])<output.indexOf(headings[2]));
 assert.match(output,/Vizelettenyésztésben Escherichia coli/);
 assert.match(output,/1\. oldal/);
 assert.match(output,/dokumentum keltezése nem feltétlenül az esemény vagy mintavétel napja/i);
 assert.match(output,/önmagában nem igazol fertőzést/);
});
test('unsourced medical claims are not narrated as personal facts',()=>{
 const unknown={sections:[{heading:'Kétes',paragraphs:[
 {kind:'documented',text:'Biztosan háromféle aktív fertőzése van.',sourceIds:['D99:p99']},
 {kind:'general',text:'A lelet értelmezésekor a tünetek fontosak.',sourceIds:[]}
 ]}]};
 const output=format(unknown,[],[],{facts:[]},{facts:[]});
 assert.doesNotMatch(output,/Biztosan háromféle aktív fertőzése/);
 assert.match(output,/nem állítható össze megbízható/i);
 assert.match(output,/A lelet értelmezésekor a tünetek fontosak/);
});
test('original evidence inventory is literal, source linked, never uses prior summaries as PDF',()=>{
 const secondary={id:'S1',title:'Korábbi JSON-értelmezés',text:'Másodlagos idézet teljes szövege',documentDate:'2024'};
 const summary={facts:[{sourceId:'S1',quote:'Másodlagos idézet teljes szövege'}]};
 const out=format({sections:[{heading:'Szöveg',paragraphs:[
  {kind:'reported',text:'A másodlagos összefoglaló értelmezést rögzít.',sourceIds:['S1']}
 ]}]},[],[secondary],{facts:[]},summary);
 assert.match(out,/Egy korábbi leletmagyarázat beszámolója szerint/i);
 assert.match(out,/Másodlagos beszámoló \(nem eredeti PDF\)/);
 assert.match(out,/Korábbi JSON-értelmezés/);
 assert.doesNotMatch(out,/\*\*Eredeti PDF:\*\*/);
});
test('model generated unsupported paragraph never enters the narrative',()=>{
 const report={sections:[{heading:'A tény',paragraphs:[
  {kind:'documented',text:'Ezt nem támasztja alá hivatkozás.',sourceIds:[]},
  {kind:'documented',text:'Hamis pdf-re mutató állítás.',sourceIds:['D22:p5']},
  {kind:'documented',text:'A lelet Escherichia coli baktériumot nevez meg.',sourceIds:['D1:p1']}
 ]}]};
 const out=format(report,[page],[],{facts:[fact]},{facts:[]});
 assert.doesNotMatch(out,/Ezt nem támasztja alá/);
 assert.doesNotMatch(out,/Hamis pdf-re mutató/);
 assert.match(out,/A lelet Escherichia coli/);
});
test('source-prompt contract applies to both normal and advanced research',()=>{
 const server=fs.readFileSync(path.join(root,'../supabase/functions/smooth-endpoint-v395/index.ts'),'utf8');
 assert.match(server,/GOLDEN STANDARD: személyes leletkérdésnél/);
 assert.match(server,/GOLDEN STANDARD: minden személyes orvosi\/leletkérdésnél/);
 assert.match(server,/formatClinicalAnswer\(audited,originals,summaries,verified,summaryVerified\)/);
 assert.match(server,/formatClinicalAnswer\(second,originals,summaries,verified,summaryVerified\)/);
 const generic=fs.readFileSync(path.join(root,'server/smooth-endpoint/index.ts'),'utf8');
 assert.match(generic,/GOLDEN STANDARD:/);
});
