'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../android-bridge');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const dir='app/src/main/java/hu/zsoltmonika/healthhubbridge/';
test('Existing HH One package and signed-update identity are untouched',()=>{
 const gradle=read('app/build.gradle.kts');
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(gradle,/versionName = "0\.14\.6"/,'native Guardian is not silently published as OTA');
 assert.match(gradle,/System\.getenv\("HH_OTA_KEYSTORE_PATH"\)/);
});
test('Android service and boot access use explicit restricted components',()=>{
 const manifest=read('app/src/main/AndroidManifest.xml');
 for(const p of [
  'android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION','android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.RECEIVE_BOOT_COMPLETED'
 ])assert.ok(manifest.includes(p),p+' declared');
 assert.match(manifest,/<service[\s\S]*?android:name="\.GuardianLocationService"[\s\S]*?android:exported="false"[\s\S]*?android:foregroundServiceType="location"/);
 assert.match(manifest,/<receiver android:name="\.GuardianBootReceiver" android:exported="false"/);
 assert.match(manifest,/<activity android:name="\.GuardianSettingsActivity" android:exported="false"/);
});
test('No location collection without owner consent, and no transmission in this stage',()=>{
 const service=read(dir+'GuardianLocationService.kt');
 const vault=read(dir+'GuardianLocationVault.kt');
 const settings=read(dir+'GuardianSettingsActivity.kt');
 assert.match(service,/GuardianLocationVault\.consented\(this\)/);
 assert.match(service,/location\.isMock/,'API 31+ simulated location blocked');
 assert.match(service,/location\.isFromMockProvider/,'older Android mock fix blocked');
 assert.match(service,/SystemClock\.elapsedRealtimeNanos/,'rely on monotonic fix age');
 assert.match(service,/location\.accuracy\.isFinite\(\)/,'reject invalid GPS accuracy');
 assert.match(vault,/getString\("device_owner_profile", null\)/);
 assert.match(vault,/KEY_CONSENT/);
 assert.match(vault,/Cipher\.getInstance\("AES\/GCM\/NoPadding"\)/);
 assert.match(vault,/fun purge\(context: Context\)/);
 assert.match(settings,/AlertDialog\.Builder\(this\)/);
 assert.match(settings,/GuardianLocationService\.stop\(this@GuardianSettingsActivity\)/);
 for(const body of [service,vault,settings]){
  assert.doesNotMatch(body,/DropboxVaultClient|https:\/\/|SupabaseClient|HttpURLConnection|URL\(/);
 }
});
test('Reboot does not bypass always-on Android permission or opt-out',()=>{
 const boot=read(dir+'GuardianBootReceiver.kt');
 assert.match(boot,/Intent\.ACTION_BOOT_COMPLETED/);
 assert.match(boot,/GuardianLocationVault\.consented\(context\)/);
 assert.match(boot,/Manifest\.permission\.ACCESS_BACKGROUND_LOCATION/);
 assert.match(boot,/context\.checkSelfPermission/);
 assert.match(boot,/context\.startForegroundService\(start\)/);
 const main=read(dir+'MainActivity.kt');
 assert.match(main,/GuardianLocationService\.stop\(this@MainActivity\)/,'owner reset revokes prior tracking');
 assert.match(main,/GuardianSettingsActivity::class\.java/,'location controls visible in HH One');
});
