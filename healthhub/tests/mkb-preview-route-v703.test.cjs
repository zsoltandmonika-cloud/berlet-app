#!/usr/bin/env node
'use strict';
/* MKB QA routing: synthetic-only. No patient data, tokens, HTTP or AI calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','live-v331.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=src.indexOf('  var narrativeQAVersion=');
const end=src.indexOf('  var replyData=data,simplified=false;',start);
assert.ok(start>0&&end>start,'route block must be identifiable');
const block=src.slice(start,end);
function route(qs,consent=true,clinicalPilot=true){
  const output=[];
  const values={clinicalPilot, data:{originalDocumentsConsent:consent},
    window:{location:{search:qs}}, URLSearchParams,print:s=>output.push(s)};
  return vm.runInNewContext('(function(){'+block+
    '\nreturn {route:aiRoute,mkbQAMode,mkbQARequested,narrativeQAMode};})()',values);
}
assert.equal(route('?hhMkbQA=v1').route,'/functions/v1/hh-mkb-search-preview');
assert.equal(route('?hhMkbQA=v1',false).route,'/functions/v1/smooth-endpoint-v395');
assert.equal(route('?hhMkbQA=v1',true,false).route,'/functions/v1/smooth-endpoint');
assert.equal(route('').route,'/functions/v1/smooth-endpoint-v395');
assert.equal(route('?hhMkbQA=anything-else').route,'/functions/v1/smooth-endpoint-v395');
assert.equal(route('?hhNarrativeQA=v406').route,'/functions/v1/smooth-endpoint-v406-preview');
assert.equal(route('?hhNarrativeQA=v405').route,'/functions/v1/smooth-endpoint-v405-preview');
assert.equal(route('?hhMkbQA=v1&hhNarrativeQA=v406').route,'/functions/v1/hh-mkb-search-preview');
assert.equal(route('?hhMkbQA=%2Ffunctions%2Fv1%2Fmalicious').route,'/functions/v1/smooth-endpoint-v395');
assert.ok(html.includes('live-v331.js?v=699-oneclick-evidence&mkbQA=703'),'new script cache buster');
console.log('PASS: MKB QA explicit-opt-in routing and legacy route regression');
