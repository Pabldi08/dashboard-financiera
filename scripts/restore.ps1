param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    throw "No existe el archivo: $BackupFile"
}

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

$confirm = Read-Host "Esto reemplazara datos en la base '$dbName'. Escribe RESTAURAR para continuar"
if ($confirm -ne "RESTAURAR") {
    Write-Host "Restauracion cancelada."
    exit 0
}

Get-Content -Path $BackupFile |
    docker compose exec -T db mariadb -u $dbUser "-p$dbPassword" $dbName

if ($LASTEXITCODE -ne 0) {
    throw "No se pudo restaurar el backup."
}

Write-Host "Backup restaurado: $BackupFile"
