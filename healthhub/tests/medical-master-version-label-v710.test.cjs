#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const meta=html.match(/name="healthhub-live-build" content="([^"]+)"/)?.[1];
const boot=html.match(/var v='([^']+)'/)?.[1];
const runtime=html.match(/window\.HH_LIVE_BUILD='([^']+)'/)?.[1];
assert.equal(meta,'v710-medical-master-golden-qa');
assert.equal(boot,'710-medical-master-golden-qa');
assert.equal(runtime,meta);
assert.match(html,/ask-lena-medical-master-v710\.js\?v=710-golden-preview/);
assert.match(html,/live-v331\.js\?[^"]*masterQA=710/);
console.log('PASS: v710 build metadata, bootstrap and live runtime label agree; Ask Léna pilot included.');
