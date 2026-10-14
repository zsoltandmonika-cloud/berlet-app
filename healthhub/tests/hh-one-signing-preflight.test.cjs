'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../..');
const yml=fs.readFileSync(path.join(base,'.github/workflows/hh-one-signing-preflight.yml'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'healthhub/data/bridge-ota.json'),'utf8'));
const release=fs.readFileSync(path.join(base,'.github/workflows/healthhub-connect-ota-release.yml'),'utf8');
const gradle=fs.readFileSync(path.join(base,'healthhub/android-bridge/app/build.gradle.kts'),'utf8');
assert.match(manifest.version,/^0\.14\.[0-9]+$/,'signed OTA baseline must have a valid version');
assert.ok(Number.isSafeInteger(manifest.versionCode)&&manifest.versionCode>=21);
assert.equal(manifest.applicationId,'hu.zsoltmonika.healthhubbridge');
assert.deepEqual(manifest.rolloutProfiles,['zsolt']);
assert.match(manifest.sha256,/^[a-f0-9]{64}$/);
const targetVersion=manifest.version.split('.').map(Number);
targetVersion[2]++;
const expectedVersion=targetVersion.join('.');
assert.ok(gradle.includes('versionName = "'+expectedVersion+'"'),'candidate version must be exactly one signed patch newer');
assert.ok(gradle.includes('versionCode = '+(manifest.versionCode+1)),'candidate versionCode must increment exactly once');
for(const needle of [
 'healthhub/data/bridge-ota.json','BASE_VERSION','BASE_CODE','NEW_CODE',
 'gh release download "$RELEASE"',
 'keytool -exportcert','apksigner" verify --print-certs',
 'BLOCKED: signing certificate mismatch','Device verification still needed',
 'CURRENT', 'EXPECTED_SHA', 'ACTUAL_SHA', 'KEY_CERT_SHA', 'APK_CERT_SHA'
].filter(x=>x!=='CURRENT')) {
 assert.ok(yml.includes(needle),'Missing signing gate: '+needle);
}
assert.ok(!yml.includes('RELEASE="healthhub-connect-ota-v0.14.0"'),'do not hardcode old baseline');
const portions=yml.split('  signed-pilot-candidate:');
assert.equal(portions.length,2,'staging job must be isolated');
assert.ok(!/gh release create|git push|gradle :app:assembleRelease|gh api -X POST/.test(portions[0]),'preflight remains read-only');
const candidate=portions[1];
for(const needle of ['needs: [compare-signed-release-to-existing-keystore]',
 'github.event.pull_request.head.repo.full_name == github.repository',
 'gradle :app:testDebugUnitTest :app:assembleRelease',
 'apksigner','APK_CERT','KEY_CERT',
 'actions/upload-artifact@v4','NOT-LIVE',
 'retention-days: 3']) assert.ok(candidate.includes(needle),'signed staged APK safety: '+needle);
assert.ok(!/gh release create|git push|bridge-ota\.json.*write/.test(candidate),'candidate must not publish OTA');
assert.ok(release.includes("if: steps.signing.outputs.ready == 'true'"));
console.log('HH One signing preflight: dynamic signed baseline, SHA and certificate check, read-only PASS');
