#!/usr/bin/env node
'use strict';
// Synthetic-only Sol preview checks. No patient data, credentials, or API calls.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const client=fs.readFileSync(path.join(root,'healthhub/live-v331.js'),'utf8');
const backend=fs.readFileSync(path.join(root,'supabase/functions/hh-sol-full-corpus-preview/index.ts'),'utf8');
const html=fs.readFileSync(path.join(root,'healthhub/index.html'),'utf8');
const start=client.indexOf('  var narrativeQAVersion=');
const end=client.indexOf('  var replyData=data,simplified=false;',start);
assert.ok(start>0&&end>start);
const block=client.slice(start,end);
function route(qs,consented=true,clinicalPilot=true){
 const data={originalDocumentsConsent:false,documentEvidence:[{text:'dummy'}]};
 const messages=[];
 const ctx={data,clinicalPilot,mkbSourceUsed:0,
  window:{location:{search:qs},confirm:()=>consented},
  URLSearchParams,print:s=>messages.push(s),
  turn:1,epoch:1,p:'monika',profile:()=> 'monika'};
 let result;
 try{result=vm.runInNewContext('(function(){'+block+
  '\nreturn {route:aiRoute,solPreviewMode,fullCorpusConsent:data.fullCorpusConsent,transmitted: data.documentEvidence.length};})()',ctx);}
 catch(e){return {error:e.message,data};}
 return result;
}
assert.equal(route('').route,'/functions/v1/smooth-endpoint-v395');
assert.equal(route('?hhSolQA=bogus').route,'/functions/v1/smooth-endpoint-v395');
assert.equal(route('?hhSolQA=v1',true).route,'/functions/v1/hh-sol-full-corpus-preview');
assert.equal(route('?hhSolQA=v1',true).fullCorpusConsent,true);
assert.equal(route('?hhSolQA=v1',true).transmitted,0,'client does not send outdated excerpts');
assert.match(route('?hhSolQA=v1',false).error,/hozzájárulást/);
assert.equal(route('?hhSolQA=v1',false).data.fullCorpusConsent,undefined);
assert.equal(route('?hhSolQA=v1',true,false).route,'/functions/v1/smooth-endpoint');
assert.ok(html.includes('solQA=705'),'JS cache-buster');
// A Sol completion has its own provenance evidence; legacy v395 audit must not be spoofed.
assert.match(client,/solAudit=solPreviewMode&&item\.evidenceAudit/);
assert.match(client,/mode==='sol-full-corpus-preview-v705'/);
assert.match(client,/clinicalPilot&&!simplified&&!solPreviewMode/);
assert.match(client,/if\(solPreviewMode&&\(!solAudit/);
assert.match(client,/solAudit\.sourceDocuments\+' eredeti dokumentum, '/);
assert.match(client,/if\(!simplified\)/);
assert.match(client,/orvosi tények NEM hitelesítve/);
assert.match(client,/if\(solPreviewMode\)\{\n     \/\/ Dedicated, factual Sol status/);
assert.match(client,/if\(!\(solPreviewRequested&&customized\.plan\.clinical&&!shot\)\)throw Error/);


for(const fragment of [
 'body?.fullCorpusConsent!==true','client.auth.getUser',
 'from("hh_profile_access")','from("hh_kb_documents")','from("hh_kb_pages")',
 '.eq("profile_key",profile)','text_integrity_status','is("duplicate_of",null)',
 'query.count!==docs.length','pages.length!==expected','corpus.length>MAX_CORPUS_CHARS',
 'store:false','gpt-6.1-sol','/v1/responses','MAX_OUTPUT_TOKENS',
 'MAX_OUTPUT_TOKENS=25000','UPSTREAM_TIMEOUT_MS=125000',
 'invalid_source_citations','citationIdsValidated:true'
]) assert.ok(backend.includes(fragment),'missing explicit control: '+fragment);
const idx=(x)=>backend.indexOf(x);
assert.ok(idx('body?.fullCorpusConsent!==true')<idx('client.auth.getUser'));
assert.ok(idx('client.auth.getUser')<idx('from("hh_profile_access")'));
assert.ok(idx('from("hh_profile_access")')<idx('gatherCorpus(admin,body.profile)'));
assert.ok(idx('gatherCorpus(admin,body.profile)')<idx('api.openai.com'));
// v705 source integrity: flags are not a substitute for recomputing SHA-256.
for(const required of [
 'crypto.subtle.digest("SHA-256",bytes)',
 '(await pageHash(p.page_text))!==p.text_sha256!.toLowerCase()',
 'page_sha256_mismatch',
 'new Set(parts.map(p=>p.page_no)).size!==d.total_pages',
 'visualReviewPages++',
 'unreadablePages++',
 'KÉPI TARTALOM ELLENŐRZENDŐ',
 'SZÖVEGESEN NEM OLVASHATÓ',
 'hashVerifiedPages:ids.size',
 'totalSourcePages:c.totalPages',
 'visualReviewPages:c.visualReviewPages',
 'unreadablePages:c.unreadablePages'
]) assert.ok(backend.includes(required),'missing full-source integrity or visual-review control: '+required);
assert.match(client,/solAudit\.hashVerifiedPages!==solAudit\.sourcePages/);
assert.match(client,/solAudit\.totalSourcePages!==solAudit\.sourcePages\+solAudit\.unreadablePages/);
assert.match(client,/oldal szövege nem olvasható/);
assert.ok(!backend.includes('console.log(body.question)'),'no raw user question logged');
console.log('PASS: Sol v705 separate opt-in, consent refusal, full corpus integrity, profile gates');
