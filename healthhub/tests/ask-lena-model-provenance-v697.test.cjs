'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const assistant=fs.readFileSync(path.join(root,'live-v331.js'),'utf8');
const history=fs.readFileSync(path.join(root,'live-v364-history.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
function recorder(){
 const start=history.indexOf('function save(ev){'),end=history.indexOf("window.addEventListener('healthhub:ask-lena-complete',save);",start);
 assert.ok(start>=0&&end>start);
 let written=[],synced=0,rendered=0;
 const ctx=vm.createContext({versions:{},write(p,rows){written=rows},entries:()=>[],
   crypto:{randomUUID:()=> 'a8f4a68f-1221-497c-a37a-643d1958127e'},
   profile:()=> 'monika',render(){rendered++},sync(){synced++},
   Date,Math,String,Array,Promise});
 vm.runInContext(history.slice(start,end)+'\nthis.saveRecord=save;',ctx);
 return{save:(x)=>ctx.saveRecord({detail:x}),get records(){return written},
   get calls(){return{rendered,synced}}};
}
const event=(more={})=>({successful:true,profile:'monika',question:'Miért vagyok fáradt?',answer:'Szintetikus próbaválasz, nem orvosi adat.',
 generatedAt:'2026-10-19T12:05:00Z',model:'gpt-4.1-mini',...more});
test('v698 app preserves v697 historical model provenance while updating AI assets',()=>{
 assert.doesNotThrow(()=>new Function(assistant));
 assert.doesNotThrow(()=>new Function(history));
 assert.match(index,/v698-evidence-relevance-intelligence/);
 assert.match(index,/live-v331\.js\?v=698-question-bound-sources/);
 assert.match(index,/live-v364-history\.js\?v=697-completed-model-provenance/);
 assert.match(index,/var v='698-evidence-relevance-intelligence'/);
});
test('SSE done extracts only provider-specified model, dispatches it after full completion',()=>{
 assert.match(assistant,/if\(kind==='done'\)\{\s*\/\/ Record only the actual model/);
 assert.match(assistant,/completedModel=\/\^\[A-Za-z0-9\._:-\]\{3,60\}\$\/\.test\(serverModel\)\?serverModel:''/);
 assert.match(assistant,/if\(!complete\)throw Error\('Nem érkezett teljes AI-válasz/);
 assert.match(assistant,/model:completedModel,answerMode/);
 assert.doesNotMatch(assistant,/model:'gpt-4.1-mini',answerMode/);
});
test('real model attribution from successful response is retained in private future history',()=>{
 const a=recorder();a.save(event());
 assert.equal(a.records.length,1);
 assert.equal(a.records[0].model,'gpt-4.1-mini');
 assert.equal(a.records[0].synced,false);
 assert.deepEqual(a.calls,{rendered:1,synced:1});
});
test('unknown and invalid model identifiers stay unknown; never invent model for legacy events',()=>{
 for(const model of ['',undefined,'../../fake','bad model name','\u0000gpt','x'.repeat(100)]){
  const a=recorder();a.save(event({model}));
  assert.equal(a.records[0].model,'');
 }
});
test('uncompleted / cross-profile / malformed research is never saved as valid history',()=>{
 const a=recorder();
 a.save(event({successful:false}));
 a.save(event({profile:'another-patient'}));
 a.save(event({answer:null}));
 assert.equal(a.records.length,0);
 assert.deepEqual(a.calls,{rendered:0,synced:0});
});
test('history cloud sync transfers only validated model and existing RLS-scoped answer fields',()=>{
 assert.match(history,/data:\{id:x\.id,profile_key:p,question:x\.question,answer:x\.answer,generated_at:x\.generatedAt,model:/);
 assert.match(history,/model:\(typeof x\.model==='string'/);
 assert.doesNotMatch(history,/API_KEY|google_access_token|doctorNotes|sourceFileBlob/);
});
