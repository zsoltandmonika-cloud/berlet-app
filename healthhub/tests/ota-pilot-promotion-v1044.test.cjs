'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const workflow=read('.github/workflows/hh-one-ota-promote-family-v1044.yml');
const release=read('.github/workflows/healthhub-connect-ota-release.yml');
const m=JSON.parse(read('healthhub/data/bridge-ota.json'));
test('pilot promotion requires explicit owner approval and main, never runs on push',()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+push:/m);
 assert.match(workflow,/PROMOTE_TO_MONIKA/);
 assert.match(workflow,/test "\$GITHUB_REF_NAME" = "main"/);
 assert.match(workflow,/rolloutProfiles.*==\['zsolt'\]/);
});
test('safe promotion validates manifest, current native app identity and published immutable asset',()=>{
 assert.match(workflow,/healthhub\.connect\.ota\/1/);
 assert.match(workflow,/signed-release/);
 assert.match(workflow,/hu\.zsoltmonika\.healthhubbridge/);
 assert.match(workflow,/versionCode/);
 assert.match(workflow,/versionName/);
 assert.match(workflow,/sha256/);
 assert.match(workflow,/gh release download/);
 assert.match(workflow,/sha256sum --check --status/);
 assert.match(workflow,/rolloutProfiles'\]=\['zsolt','monika'\]/);
 assert.match(workflow,/git push origin HEAD:main/);
 assert.match(workflow,/group: healthhub-connect-ota-release/);
});
test('no re-sign/rebuild or unexpected app permission change in promotion',()=>{
 assert.doesNotMatch(workflow,/gradle :app:assemble|gh release create|gh release upload|apksigner sign|keytool|keystore|installPackage|PackageInstaller/);
 assert.match(release,/Hard stop unless new APK and current OTA baseline have same signing certificate/);
 assert.match(release,/::error::OTA signing not configured/);
 assert.match(release,/echo "ready=false" >> "\$GITHUB_OUTPUT"\n            exit 1/);
 assert.deepEqual(m.rolloutProfiles,['zsolt','monika']);
 assert.equal(m.version,'0.15.10');
});
