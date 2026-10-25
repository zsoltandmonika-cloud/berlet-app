'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
const vault = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/DropboxVaultClient.kt');
const main = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const web = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const build = read('healthhub/android-bridge/app/build.gradle.kts');
const ota = JSON.parse(read('healthhub/data/bridge-ota.json'));

test('missing credential marker is adopted without wiping OAuth state',()=>{
  const migration = vault.split('fun ensureCredentialVersion(')[1].split('private fun requireCompatibleMarker(')[0];
  assert.match(migration,/marker\.isNullOrBlank\(\)/);
  assert.match(migration,/putString\(CLIENT_MARKER, APP_KEY\)/);
  assert.doesNotMatch(migration,/\.remove\("dropbox_(?:refresh_token|access_token|pkce_verifier|oauth_state)"/);
  assert.doesNotMatch(migration,/\.clear\(\)/);
  assert.doesNotMatch(migration,/error\(|throw |check\(/);
});
test('known different OAuth client is blocked before using saved access or refresh token',()=>{
  const guard=vault.split('private fun requireCompatibleMarker(')[1].split('fun hasRefreshToken(')[0];
  const access=vault.split('suspend fun accessToken(')[1].split('suspend fun ensureFolder(')[0];
  assert.match(guard,/check\(prefs\.getString\(CLIENT_MARKER, null\) == APP_KEY\)/);
  assert.match(access,/ensureCredentialVersion\(prefs\)\s*requireCompatibleMarker\(prefs\)/);
  assert.match(access,/tokenRefreshLock\.withLock/);
});
test('native access token refresh is single flight and rejects an outdated grant',()=>{
  const access=vault.split('suspend fun accessToken(')[1].split('suspend fun ensureFolder(')[0];
  assert.match(vault,/private val tokenRefreshLock = Mutex\(\)/);
  assert.match(access,/return tokenRefreshLock\.withLock/);
  assert.match(access,/val latest = prefs\.getString\("dropbox_access_token", null\)/);
  assert.match(access,/prefs\.getString\("dropbox_refresh_token", null\) == refresh/);
  assert.match(access,/munkamenet megváltozott/);
  assert.match(access,/requireCompatibleMarker\(prefs\)/);
  assert.doesNotMatch(access,/\.remove\("dropbox_refresh_token"\)/);
});
test('manual sync uses identical token refresh authority, no redundant network path',()=>{
  assert.match(main,/private suspend fun getAccessToken\(\): String = DropboxVaultClient\.accessToken\(prefs\)/);
  assert.doesNotMatch(main,/private fun refreshAccessToken\(/);
  assert.match(main,/DropboxVaultClient\.storeAuthorizedGrant\(prefs, refresh, access, expires\)/);
});
test('OAuth callback must stay on same state/verifier and authorized owner before committing',()=>{
  const callback=main.split('private fun handleDropboxCallback(')[1].split('private suspend fun getAccessToken(')[0];
  assert.match(callback,/prefs\.getString\("dropbox_oauth_state", null\) == state/);
  assert.match(callback,/prefs\.getString\("dropbox_pkce_verifier", null\) == verifier/);
  assert.match(callback,/val owner = bindOwnerIfNeeded\(profile\)/);
  assert.ok(callback.indexOf('val owner = bindOwnerIfNeeded(profile)') <
    callback.indexOf('DropboxVaultClient.storeAuthorizedGrant('));
  const grant=vault.split('suspend fun storeAuthorizedGrant(')[1].split('suspend fun accessToken(')[0];
  assert.match(grant,/tokenRefreshLock\.withLock/);
  assert.match(grant,/putString\(CLIENT_MARKER, APP_KEY\)/);
  assert.match(grant,/remove\("dropbox_oauth_state"\)/);
  assert.match(grant,/remove\("dropbox_pending_profile"\)/);
});
test('release and user sessions remain unmodified in this isolated fix',()=>{
  assert.match(build,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
  assert.match(build,/versionName = "0\.15\.7"/);
  assert.match(build,/versionCode = 34/);
  assert.equal(ota.version,'0.15.2');
  assert.equal(ota.versionCode,29);
  assert.match(web,/private const val HOME/);
});
