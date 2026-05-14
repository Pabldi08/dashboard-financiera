param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if ((Test-Path ".env") -and -not $Force) {
    Write-Host ".env ya existe. Usa .\scripts\setup.ps1 -Force para regenerarlo."
    exit 0
}

function New-Secret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([BitConverter]::ToString($bytes) -replace "-", "").ToLowerInvariant()
}

function Read-Default {
    param(
        [string]$Prompt,
        [string]$Default
    )
    $value = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Default
    }
    return $value
}

function ConvertFrom-SecureInput {
    param([securestring]$SecureValue)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

$adminUser = Read-Default "Usuario admin" "admin"
$adminPassword = ConvertFrom-SecureInput (Read-Host "Password admin" -AsSecureString)
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    $adminPassword = New-Secret
    Write-Host "Password admin generado automaticamente."
}
$appPort = Read-Default "Puerto de la app" "8000"

$envContent = @"
APP_NAME=dashboard-financiera
APP_PORT=$appPort
APP_ADMIN_USER=$adminUser
APP_ADMIN_PASSWORD=$adminPassword
APP_SECRET_KEY=$(New-Secret)
INTEGRATION_API_KEY=$(New-Secret)
TELEGRAM_BOT_TOKEN=

DB_HOST=db
DB_PORT=3306
DB_NAME=finanzas
DB_USER=dashboard
DB_PASSWORD=$(New-Secret)
MARIADB_ROOT_PASSWORD=$(New-Secret)
"@

Set-Content -Path ".env" -Value $envContent -Encoding utf8

Write-Host ".env creado."
Write-Host "Arranca la app con: docker compose up -d --build"
