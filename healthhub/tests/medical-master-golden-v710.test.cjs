#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const caller=fs.readFileSync(path.join(root,'live-v331.js'),'utf8');
const client=fs.readFileSync(path.join(root,'ask-lena-medical-master-v710.js'),'utf8');
const edge=fs.readFileSync(path.join(root,'..','supabase','functions','hh-medical-master-golden-v710','index.ts'),'utf8');
const admin=fs.readFileSync(path.join(root,'hh-development-charter-admin-v658.js'),'utf8');
assert(html.indexOf('ask-lena-medical-master-v710.js')<html.indexOf('live-v331.js'),'pilot must load before Ask Lena');
assert(html.includes('masterQA=710'),'Ask Lena cache refreshed');
assert(caller.includes("get('hhMasterQA')==='v1'"));
assert(caller.indexOf("get('hhMasterQA')==='v1'")<caller.indexOf("get('hhSolQA')==='v1'"),'explicit pilot intercept before Sol');
assert(client.includes("'/HealthHub/master/medical-master.json'"));
assert(client.includes("if(!root.confirm(privacy))"));
assert(client.indexOf('root.confirm(privacy)')<client.indexOf("svc.stream('/functions/v1/hh-medical-master-golden-v710'"),'fresh consent before OpenAI API');
assert(!client.includes('uploadJson(')&&!client.includes("uploadFile("));
assert(!client.includes('api.openai.com'));
assert(edge.includes('getUser(auth.slice(7))')&&edge.includes('hh_profile_access'));
assert(edge.includes('body?.consent!==true')&&edge.includes('body.patient.profile!==body.profile'));
assert(edge.includes('store:false')&&edge.includes('MAX_BODY_CHARS')&&edge.includes('MAX_EVIDENCE_CHARS'));
assert(edge.includes('invalid_master_payload')&&edge.includes('unverified_source_citation'));
assert(!edge.includes('console.log(body)')&&!edge.includes('console.log(sources)'));
assert(admin.includes('Medical Master v710'));
const mainA={profile:'monika',
 documents:[{id:'m1',profile:'monika',originalName:'2024-06-18-lab.pdf'}],
 lenaExplanations:[{documentId:'m1',profile:'monika',imported:{summary:'synthetic TSH mock'}}],
 medicalProfile:[],medications:[],appointments:[]};
const mainB={profile:'zsolt',
 documents:[{id:'z1',profile:'zsolt',originalName:'synthetic Z record'}],
 lenaExplanations:[{documentId:'z1',profile:'zsolt',imported:{summary:'synthetic Z'}}],
 medicalProfile:[],medications:[],appointments:[]};
const master={schema:'healthhub.medical-master/1',sourceManifestVersion:'2026-10-20',
 audit:{monika:{documents:1,lenaExplanations:1},zsolt:{documents:1,lenaExplanations:1},
 unmatchedExplanations:0,unmatchedAppointments:0},
 patients:{monika:mainA,zsolt:mainB}};
const sb={window:{location:{search:'?hhMasterQA=v1'}},URLSearchParams};
vm.runInNewContext(client,sb,{timeout:2000});
const helper=sb.window.HH_MEDICAL_MASTER_GOLDEN_V710;
assert.equal(helper.path,'/HealthHub/master/medical-master.json');
const forM=helper.select(master,'monika');
const payload=JSON.stringify(forM);
assert(!payload.includes('z1')&&!payload.includes('synthetic Z record'),'other patient omitted');
assert(payload.includes('synthetic TSH mock'));
assert.equal(forM.auditForProfile.lenaExplanations,1);
assert.equal(helper.select(master,'zsolt').patient.profile,'zsolt');
const corrupted=JSON.parse(JSON.stringify(master));corrupted.patients.monika.lenaExplanations[0].profile='zsolt';
assert.throws(()=>helper.select(corrupted,'monika'),/Hibás Léna-magyarázat kapcsolat/);
const corruptId=JSON.parse(JSON.stringify(master));corruptId.patients.monika.documents[0].profile='zsolt';
assert.throws(()=>helper.select(corruptId,'monika'),/Sérült dokumentumindex/);
const badCount=JSON.parse(JSON.stringify(master));badCount.audit.monika.documents=2;
assert.throws(()=>helper.select(badCount,'monika'),/rekordellenőrzési hiba/);
const events=[];helper.parseSse('event: stage\ndata: {"message":"test"}', (e,x)=>events.push([e,x.message]));
assert.deepEqual(events,[['stage','test']]);
console.log('PASS v710: only selected profile, source integrity, explicit consent, authenticated Edge path, normal Ask Lena opt-in');
