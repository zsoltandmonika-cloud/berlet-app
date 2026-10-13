# HealthHub Connect v0.15.0: private Samsung SDK local compile probe.
# No install, no OTA, no upload, no vendor binary committed to GitHub.
param(
    [Parameter(Mandatory=$true)][string]$SdkPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$aarTarget = Join-Path $project 'app\libs\samsung-health-data-api.aar'
$debugApk = Join-Path $project 'app\build\outputs\apk\debug\app-debug.apk'
$tempDir = $null
$copiedSdk = $false
try {
    $sdk = (Resolve-Path -LiteralPath $SdkPath).Path
    if (Test-Path -LiteralPath $aarTarget) {
        throw "An SDK AAR is already present at $aarTarget. Remove or safeguard it manually before running this isolated test."
    }
    if ([IO.Path]::GetExtension($sdk).ToLowerInvariant() -eq '.zip') {
        $tempDir = Join-Path ([IO.Path]::GetTempPath()) ('hh-samsung-sdk-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        Expand-Archive -LiteralPath $sdk -DestinationPath $tempDir
        $candidates = @(Get-ChildItem -Path $tempDir -Recurse -File -Filter 'samsung-health-data-api.aar')
        if ($candidates.Count -ne 1) {
            throw "Expected exactly one samsung-health-data-api.aar in the private SDK ZIP; found $($candidates.Count)."
        }
        $sdk = $candidates[0].FullName
    }
    if ([IO.Path]::GetExtension($sdk).ToLowerInvariant() -ne '.aar') {
        throw "Provide an authorized Samsung Health Data SDK .aar or its official .zip package."
    }
    $aarSize = (Get-Item -LiteralPath $sdk).Length
    if ($aarSize -lt 100000) { throw "SDK AAR unexpectedly small; refusing to compile with it." }
    New-Item -ItemType Directory -Force -Path (Split-Path $aarTarget) | Out-Null
    Copy-Item -LiteralPath $sdk -Destination $aarTarget -ErrorAction Stop
    $copiedSdk = $true

    Push-Location $project
    try {
        if (-not (Get-Command gradle -ErrorAction SilentlyContinue)) {
            throw "Gradle not found on PATH. Install Gradle 8.13 and Android SDK API 36 before running."
        }
        & gradle :app:assembleDebug --no-daemon --stacktrace
        if ($LASTEXITCODE -ne 0) { throw "Gradle SDK-enabled debug build FAILED (exit $LASTEXITCODE)." }
        if (-not (Test-Path -LiteralPath $debugApk)) { throw "APK missing after successful Gradle invocation." }
        $sdkHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sdk).Hash
        $apkHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $debugApk).Hash
        Write-Host "SDK-enabled Android build: PASS" -ForegroundColor Green
        Write-Host "SDK SHA256 (local metadata only): $sdkHash"
        Write-Host "DEBUG APK SHA256: $apkHash"
        Write-Host "DEBUG APK location: $debugApk"
        Write-Host "NOT production-signed. Do not install over the existing HealthHub Connect."
        Write-Host "Next blockers: stable release signer matching v0.14, Samsung app-identity authorization, phone read and unattended tests."
    } finally {
        Pop-Location
    }
} finally {
    if ($copiedSdk -and (Test-Path -LiteralPath $aarTarget)) {
        Remove-Item -LiteralPath $aarTarget -Force
    }
    if ($tempDir -and (Test-Path -LiteralPath $tempDir)) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force
    }
}
