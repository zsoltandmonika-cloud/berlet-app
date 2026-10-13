# Validate a locally built v417 pilot before any user considers installing it.
# Run from healthhub/android-bridge. No installation, upload or network actions.
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apk = Join-Path $project 'app\build\outputs\apk\pilot\app-pilot.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw "Pilot APK missing. Run Gradle :app:assemblePilot with private Samsung SDK AAR." }
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$aapt = Join-Path $sdk 'build-tools\35.0.0\aapt.exe'
if (-not (Test-Path $aapt)) { throw "Android build-tools 35.0.0 aapt.exe not found at $aapt" }
$badging = (& $aapt dump badging $apk | Out-String)
if ($LASTEXITCODE -ne 0) { throw "aapt badging failed" }
$pkg = [regex]::Match($badging, "package: name='([^']+)'").Groups[1].Value
if ($pkg -ne 'hu.zsoltmonika.healthhubbridge.thinpilot') { throw "Unsafe application ID: $pkg" }
if ($badging -notmatch 'launchable-activity: name=.hu.zsoltmonika.healthhubbridge.ThinPilotActivity.') {
    throw "Expected read-only ThinPilotActivity is not the launcher."
}
$permissions = (& $aapt dump permissions $apk | Out-String)
if ($LASTEXITCODE -ne 0) { throw "aapt permissions failed" }
if ($permissions -match 'android.permission.INTERNET|android.permission.REQUEST_INSTALL_PACKAGES|android.permission.health.READ') {
    throw "Unsafe network/install/Health Connect permission in pilot APK."
}
$manifest = (& $aapt dump xmltree $apk AndroidManifest.xml | Out-String)
if ($LASTEXITCODE -ne 0) { throw "aapt manifest extraction failed" }
if ($manifest -match 'healthhubconnect|OrchestratorWorker|MainActivity|PermissionsRationaleActivity|FileProvider') {
    throw "Production intent/entry point detected in pilot manifest."
}
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
$size = [math]::Round((Get-Item $apk).Length / 1MB, 2)
Write-Host "PASS: isolated package $pkg"
Write-Host "PASS: only pilot launcher; no network, install or HC read permission; no production manifest entry points"
Write-Host "APK size: $size MB"
Write-Host "SHA-256: $hash"
Write-Host "Local debug/pilot signing is NOT production signing. Samsung SDK authorization still must be tested on phone."
Write-Host "Do NOT install over existing Connect or uninstall Samsung Beta."
