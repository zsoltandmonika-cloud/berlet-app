# Read-only v422 HC APK safety gate; no installation and no network action.
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apk = Join-Path $project 'app\build\outputs\apk\hcpilot\app-hcpilot.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw "hcPilot APK missing. Run :app:assembleHcpilot first." }
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$aapt = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory -ErrorAction Stop |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'aapt.exe' } |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $aapt) { throw "aapt.exe is missing from Android build tools." }
$badging = (& $aapt dump badging $apk | Out-String)
if ($LASTEXITCODE -ne 0) { throw "aapt badging failed." }
$pkg = [regex]::Match($badging, "package: name='([^']+)'").Groups[1].Value
if ($pkg -ne 'hu.zsoltmonika.healthhubbridge.hcpilot') {
    throw "Unsafe application ID: $pkg"
}
if ($badging -notmatch 'launchable-activity: name=.hu.zsoltmonika.healthhubbridge.HcPilotActivity.') {
    throw "Unexpected launcher. Must be HcPilotActivity."
}
$permissions = (& $aapt dump permissions $apk | Out-String)
if ($LASTEXITCODE -ne 0) { throw "aapt permissions failed." }
$forbidden = @(
    'android.permission.INTERNET',
    'android.permission.REQUEST_INSTALL_PACKAGES',
    'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.health.WRITE_'
)
foreach ($p in $forbidden) {
    if ($permissions.Contains($p)) { throw "Forbidden pilot permission: $p" }
}
$required = @('READ_SLEEP', 'READ_HEART_RATE', 'READ_RESTING_HEART_RATE',
              'READ_BLOOD_PRESSURE', 'READ_OXYGEN_SATURATION')
foreach ($p in $required) {
    if (-not $permissions.Contains("android.permission.health.$p")) {
        throw "Missing intended read permission: $p"
    }
}
$manifest = (& $aapt dump xmltree $apk AndroidManifest.xml | Out-String)
if ($LASTEXITCODE -ne 0) { throw "Cannot extract pilot manifest." }
if ($manifest -match 'healthhubconnect|MainActivity|FileProvider|android.intent.action.VIEW') {
    throw "Production deep link or entry point found in isolated pilot."
}
Write-Host "PASS: isolated Health Connect diagnostics package $pkg"
Write-Host "PASS: read-only intended permissions, no Internet, background access or production entry points"
Write-Host "APK size (MB): $([math]::Round((Get-Item $apk).Length / 1MB, 2))"
Write-Host "SHA-256: $((Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash)"
Write-Host "No APK installation performed. Leave HealthHub Connect and Samsung Beta installed."
