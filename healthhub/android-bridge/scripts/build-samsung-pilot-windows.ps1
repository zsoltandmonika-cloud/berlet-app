# Samsung Health Data SDK local-only private pilot builder for Windows.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\build-samsung-pilot-windows.ps1 -SamsungSdk "C:\Downloads\samsung-health-data-sdk-1.1.0.zip"
# No Samsung binary is committed, uploaded or copied to GitHub Actions.
param(
    [Parameter(Mandatory=$true)][string]$SamsungSdk,
    [switch]$SkipBuild
)
$ErrorActionPreference = "Stop"
$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TargetDir = Join-Path $Project "app\private-samsung-sdk"
$TargetAar = Join-Path $TargetDir "samsung-health-data-api.aar"
$InputPath = (Resolve-Path $SamsungSdk).Path
$Temporary = $null
try {
    if ($InputPath.EndsWith(".zip",[System.StringComparison]::OrdinalIgnoreCase)) {
        $Temporary = Join-Path ([System.IO.Path]::GetTempPath()) ("hh-samsung-sdk-" + [Guid]::NewGuid().ToString("N"))
        Expand-Archive -LiteralPath $InputPath -DestinationPath $Temporary -Force
        $Files = @(Get-ChildItem -LiteralPath $Temporary -Recurse -File -Filter "*.aar" |
            Where-Object { $_.Name -match '^samsung-health-data-api(?:-[0-9.]+)?\.aar$' })
        if ($Files.Count -ne 1) { throw "Samsung SDK archive must contain exactly one samsung-health-data-api*.aar (found $($Files.Count))." }
        $Source = $Files[0].FullName
    } elseif ($InputPath.EndsWith(".aar",[System.StringComparison]::OrdinalIgnoreCase)) {
        $Source = $InputPath
    } else {
        throw "Expected the official Samsung Health Data SDK .zip or its .aar library."
    }
    if ((Get-Item -LiteralPath $Source).Length -lt 100KB) {
        throw "Unexpectedly small library. Check that this is the official Samsung Health Data SDK AAR."
    }
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    if ($Source -ne $TargetAar) { Copy-Item -LiteralPath $Source -Destination $TargetAar -Force }
    Write-Host "SDK AAR placed in an ignored private project folder (never GitHub)." -ForegroundColor Green
    if ($SkipBuild) {
        Write-Host "Preflight only: compile has NOT been attempted." -ForegroundColor Yellow
        exit 0
    }
    if (-not (Get-Command gradle -ErrorAction SilentlyContinue)) {
        throw "Gradle is missing. Install Android Studio + Gradle 8.13 and Android SDK 36, then rerun. The .aar is ready locally."
    }
    Push-Location $Project
    try {
        & gradle :app:assembleDebug "-PhhSamsungDirectPilot=true" --stacktrace
        if ($LASTEXITCODE -ne 0) { throw "Private Samsung pilot Gradle compilation failed (exit $LASTEXITCODE)." }
    } finally { Pop-Location }
    $Apk = Join-Path $Project "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path -LiteralPath $Apk)) { throw "Gradle completed without a debug APK." }
    Write-Host "PRIVATE TEST APK: $Apk" -ForegroundColor Green
    Write-Host "Pilot package: hu.zsoltmonika.healthhubbridge.samsungpilot"
    Write-Host "The production HH One app stays installed separately. This pilot is NOT a signed OTA."
} finally {
    if ($Temporary -and (Test-Path -LiteralPath $Temporary)) {
        Remove-Item -LiteralPath $Temporary -Force -Recurse
    }
}
