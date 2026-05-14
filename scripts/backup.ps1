$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    throw "No existe .env. Ejecuta primero .\scripts\setup.ps1 o crea .env."
}

function Get-DotenvValue {
    param([string]$Name)
    $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$Name=" } | Select-Object -First 1
    if (-not $line) {
        throw "Falta $Name en .env"
    }
    return (($line -split "=", 2)[1]).Trim()
}

$dbName = Get-DotenvValue "DB_NAME"
$dbUser = Get-DotenvValue "DB_USER"
$dbPassword = Get-DotenvValue "DB_PASSWORD"
$backupDir = "backups"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "finanzas-$timestamp.sql"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

docker compose exec -T db mariadb-dump --single-transaction -u $dbUser "-p$dbPassword" $dbName |
    Set-Content -Path $backupFile -Encoding utf8

if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear el backup."
}

Write-Host "Backup creado: $backupFile"
