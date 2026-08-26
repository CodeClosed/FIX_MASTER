# FIX_MASTER: Database Backup & Recovery PowerShell Script
param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$FilePath
)

$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { "fix_master_db" }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$BackupDir = "database/backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

if ($Action -eq "backup") {
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputFile = "$BackupDir/fix_master_$Timestamp.dump"
    Write-Host "[INFO] Initiating backup for $DbName..." -ForegroundColor Cyan
    pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f $OutputFile
    Write-Host "[SUCCESS] Backup created at $OutputFile" -ForegroundColor Green
}
elseif ($Action -eq "restore") {
    if (!$FilePath -or !(Test-Path $FilePath)) {
        Write-Error "Please provide a valid backup dump file to restore."
        exit 1
    }
    Write-Host "[INFO] Restoring $DbName from $FilePath..." -ForegroundColor Cyan
    pg_restore -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists -v $FilePath
    Write-Host "[SUCCESS] Database restored successfully." -ForegroundColor Green
}
