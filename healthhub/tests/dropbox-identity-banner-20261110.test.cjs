'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../device-registry-v401.js'),'utf8');
test('family admin exposes the active browser Dropbox account above legacy diagnostics',()=>{
 const top=source.indexOf("var html='<div class=\"hhRegHead401\"");
 const identity=source.indexOf("hhRegAccountIdentity401\" role=\"status",top);
 const legacy=source.indexOf("html+='<details class=\"hhRegLegacyDetails",top);
 assert.ok(top>=0 && identity>top && legacy>identity,'account identity banner must be visible before collapsed diagnostics');
 assert.match(source,/api\(\)\.accountHint\(\)/);
 assert.match(source,/A HH ONE natív telefonok ettől eltérő Dropbox-fiókba írhatnak/);
 assert.match(source,/Egyezés hiányában ne indíts feltöltést vagy felhőegyesítést/);
});
