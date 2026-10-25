'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const activity = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const gradle = read('healthhub/android-bridge/app/build.gradle.kts');
const manifest = read('healthhub/android-bridge/app/src/main/AndroidManifest.xml');
const sh9 = read('sh9/index.html');
const ota = JSON.parse(read('healthhub/data/bridge-ota.json'));

test('session boundary stays first-party, HTTPS and confined to HealthHub paths',()=>{
  const section=activity.split('private fun browserSessionArea(')[1].split('private fun showSessionBoundary(')[0];
  assert.match(section,/trustedPage\(url\)/);
  assert.match(section,/path == "\/berlet-app\/healthhub"/);
  assert.match(section,/path\.startsWith\("\/berlet-app\/healthhub\/"\)/);
  assert.doesNotMatch(section,/\.contains\(|\.endsWith\(/);
  assert.match(activity,/url\?\.scheme == "https" && url\.host == HOST/);
});
test('only first-party main frame from SH9 into auth area requires choice',()=>{
  const client=activity.split('override fun shouldOverrideUrlLoading(')[1].split('override fun onWindowFocusChanged(')[0];
  assert.match(client,/request\.isForMainFrame && trustedPage\(source\) &&/);
  assert.match(client,/!browserSessionArea\(source\) && browserSessionArea\(u\)/);
  assert.match(client,/showSessionBoundary\(u\)/);
  assert.match(client,/return true/);
  assert.match(client,/if \(u\.scheme == "https" && u\.host == HOST/);
});
test('existing browser choice uses Custom Tabs cookie jar, without copying OAuth tokens',()=>{
  const session=activity.split('private fun showSessionBoundary(')[1].split('// The HTML Food Scanner')[0];
  assert.match(session,/setPositiveButton\("Meglévő böngészős kapcsolat"/);
  assert.match(session,/CustomTabsIntent\.Builder\(\)/);
  assert.match(session,/\.launchUrl\(this, target\)/);
  assert.match(session,/Intent\(Intent\.ACTION_VIEW, target\)/);
  assert.match(session,/setShareState\(CustomTabsIntent\.SHARE_STATE_OFF\)/);
  assert.doesNotMatch(session,/evaluateJavascript|addJavascriptInterface|CookieManager|DropboxVaultClient|putExtra\("token"/);
  assert.match(gradle,/androidx\.browser:browser:1\.8\.0/);
});
test('separate WebView session requires explicit choice, cancellation leaves current screen',()=>{
  const session=activity.split('private fun showSessionBoundary(')[1].split('// The HTML Food Scanner')[0];
  assert.match(session,/setNeutralButton\("Külön HH One nézet"/);
  assert.match(session,/if \(browserSessionArea\(target\)\) web\?\.loadUrl\(target\.toString\(\)\)/);
  assert.match(session,/setNegativeButton\("Mégsem", null\)/);
  assert.match(session,/sessionBoundaryDialog\?\.isShowing == true/);
  assert.match(activity,/sessionBoundaryDialog\?\.dismiss\(\)/);
});
test('legacy permission, camera, SMS-free consent and calendar routes remain intact',()=>{
  assert.match(activity,/onGeolocationPermissionsShowPrompt/);
  assert.match(activity,/onPermissionRequest\(request: PermissionRequest\)/);
  assert.match(activity,/onShowFileChooser/);
  assert.match(activity,/sh9external/);
  assert.match(activity,/u\.host == "settings"/);
  assert.match(sh9,/data-name="HealthHub"/);
  assert.match(sh9,/data-name="Family Guard"/);
  assert.match(manifest,/Sh9WebActivity/);
});
test('session router is not a release or OTA change',()=>{
  assert.match(gradle,/versionName = "0\.15\.7"/);
  assert.match(gradle,/versionCode = 34/);
  assert.equal(ota.version,'0.15.2');
  assert.equal(ota.versionCode,29);
  assert.equal(ota.channel,'signed-release');
  assert.doesNotMatch(activity,/deleteDatabase|clearCache\(true\)|clearHistory\(\)|removeAllCookies/);
});
