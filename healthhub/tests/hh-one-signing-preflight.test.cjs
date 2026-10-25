'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../..');
const yml=fs.readFileSync(path.join(base,'.github/workflows/hh-one-signing-preflight.yml'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'healthhub/data/bridge-ota.json'),'utf8'));
const release=fs.readFileSync(path.join(base,'.github/workflows/healthhub-connect-ota-release.yml'),'utf8');
const gradle=fs.readFileSync(path.join(base,'healthhub/android-bridge/app/build.gradle.kts'),'utf8');
assert.match(manifest.version,/^0\.[0-9]+\.[0-9]+$/,'signed OTA baseline must have a valid version');
assert.ok(Number.isSafeInteger(manifest.versionCode)&&manifest.versionCode>=21);
assert.equal(manifest.applicationId,'hu.zsoltmonika.healthhubbridge');
assert.ok(Array.isArray(manifest.rolloutProfiles) && manifest.rolloutProfiles.length > 0,
 'signed OTA must have at least one explicitly allowed pilot owner');
assert.equal(new Set(manifest.rolloutProfiles).size,manifest.rolloutProfiles.length,
 'OTA owners must be unique and explicitly approved');
// The baseline is always read from the CURRENT signed OTA manifest.
// Its SHA and certificate are compared against the actual immutable GitHub
// release asset in the preflight workflow. Never pin an old version's hash.
assert.ok(manifest.versionCode > 0,
 'signed OTA versionCode must stay positive; it is independent from SemVer patch digits');
assert.ok(manifest.rolloutProfiles.every(profile=>['zsolt','monika'].includes(profile)),
 'only known owner profiles may be enabled');
assert.match(manifest.sha256,/^[a-f0-9]{64}$/);
const nextPatch=manifest.version.split('.').map(Number);
nextPatch[2]++;
const nextMinor=manifest.version.split('.').map(Number);
nextMinor[1]++;
nextMinor[2]=0;
const allowedNextVersions=[nextPatch.join('.'),nextMinor.join('.')];
const isExistingRelease=gradle.includes('versionName = "'+manifest.version+'"')&&
 gradle.includes('versionCode = '+manifest.versionCode);
const isNextSignedRelease=allowedNextVersions.some(v=>gradle.includes('versionName = "'+v+'"'))&&
 gradle.includes('versionCode = '+(manifest.versionCode+1));
assert.ok(isExistingRelease||isNextSignedRelease,
 'preflight accepts current signed baseline, next patch or next minor with incremented versionCode');
assert.ok(yml.includes('stage_candidate'),'preflight must explicitly skip candidate creation for profile-only rollout');
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

/* STAGED_DROPBOX_PILOT_GATES_20261025
 * A signed pilot must retain native Health Connect exports locally before
 * attempting Dropbox; this preflight runs without unlocking rollout.
 */
const nativeRoot=path.join(base,'healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge');
const outbox=fs.readFileSync(path.join(nativeRoot,'NativeHealthOutbox.kt'),'utf8');
const nativeVault=fs.readFileSync(path.join(nativeRoot,'DropboxVaultClient.kt'),'utf8');
const nativeMain=fs.readFileSync(path.join(nativeRoot,'MainActivity.kt'),'utf8');
const nativeScheduled=fs.readFileSync(path.join(nativeRoot,'ScheduledSyncWorker.kt'),'utf8');
const nativeResilient=fs.readFileSync(path.join(nativeRoot,'ResilientHealthSync.kt'),'utf8');
const nativeOrchestrator=fs.readFileSync(path.join(nativeRoot,'OrchestratorWorker.kt'),'utf8');
assert.match(outbox,/context\.noBackupFilesDir/,'pending medical records must stay in app-private no-backup storage');
assert.match(outbox,/AtomicFile\(file\)/,'atomic pending export required');
assert.match(outbox,/persist\(context, owner, snapshot\)\s*\n\s*flushLocked/,'persist-before-network order required');
assert.match(outbox,/DropboxVaultClient\.uploadHealthConnectSnapshot\(prefs, owner, payload\)/);
assert.ok(outbox.indexOf('uploadHealthConnectSnapshot') < outbox.indexOf('check(file.delete())'),
 'do not remove pending export before Dropbox acknowledgment');
assert.match(nativeMain,/NativeHealthOutbox\.submit\(this@MainActivity, prefs, profile, json\)/);
assert.match(nativeScheduled,/NativeHealthOutbox\.submit\(applicationContext, prefs, profile, json\)/);
assert.match(nativeResilient,/NativeHealthOutbox\.submit\(applicationContext, prefs, owner, payload\)/);
assert.match(nativeOrchestrator,/NativeHealthOutbox\.submit\(applicationContext, prefs, owner, json\)/);
assert.match(nativeVault,/tokenRefreshLock\.withLock/,'central token refresh must be serialized');
console.log('Signed Dropbox pilot source gates: durable outbox and token refresh PASS');
