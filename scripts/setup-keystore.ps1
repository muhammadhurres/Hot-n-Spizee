# Hot n Spizee - Automated Release Keystore & GitHub Secrets Generator
$ErrorActionPreference = "Stop"

$keytool = "D:\Apps\Java Oracle\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
    $found = Get-Command keytool.exe -ErrorAction SilentlyContinue
    if ($found) {
        $keytool = $found.Source
    } else {
        Write-Error "keytool.exe not found. Please ensure Java JDK is installed."
        exit 1
    }
}

$keystoreDir = Join-Path $PSScriptRoot "..\android\app"
$keystorePath = Join-Path $keystoreDir "release.keystore"
$secretsFile = Join-Path $PSScriptRoot "..\keystore_secrets_DO_NOT_COMMIT.txt"

if (Test-Path $keystorePath) {
    Write-Host "Existing release.keystore found at $keystorePath." -ForegroundColor Yellow
} else {
    Write-Host "Generating a new release keystore..." -ForegroundColor Cyan
    $alias = "hotnspizee"
    # Generate a random 16-character password if not provided
    $password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 18 | ForEach-Object { [char]$_ })
    
    $dname = "CN=Hot n Spizee, OU=Mobile, O=Hot n Spizee, L=Islamabad, ST=Federal, C=PK"
    
    & $keytool -genkeypair -v `
        -keystore $keystorePath `
        -alias $alias `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $password `
        -keypass $password `
        -dname $dname

    Write-Host "Keystore created successfully!" -ForegroundColor Green
    
    # Store credentials for the secret file
    $env:TEMP_KS_PASS = $password
    $env:TEMP_KS_ALIAS = $alias
}

$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))

$content = @"
================================================================================
HOT N SPIZEE - GITHUB SECRETS SETUP
================================================================================
Add these 4 secrets in GitHub:
https://github.com/muhammadhurres/Hot-n-Spizee/settings/secrets/actions

1. Secret Name:  ANDROID_KEYSTORE_BASE64
   Secret Value: $base64

2. Secret Name:  ANDROID_KEYSTORE_PASSWORD
   Secret Value: $(if ($env:TEMP_KS_PASS) { $env:TEMP_KS_PASS } else { "<your-keystore-password>" })

3. Secret Name:  ANDROID_KEY_ALIAS
   Secret Value: $(if ($env:TEMP_KS_ALIAS) { $env:TEMP_KS_ALIAS } else { "hotnspizee" })

4. Secret Name:  ANDROID_KEY_PASSWORD
   Secret Value: $(if ($env:TEMP_KS_PASS) { $env:TEMP_KS_PASS } else { "<your-keystore-password>" })
================================================================================
KEEP THIS FILE PRIVATE! Do not share or commit this file.
"@

Set-Content -Path $secretsFile -Value $content -Encoding utf8
Write-Host "GitHub Secrets saved to: $secretsFile" -ForegroundColor Green
Write-Host "Opening repository secrets page in GitHub..." -ForegroundColor Cyan
Write-Host $content
