[CmdletBinding()]
param(
  [string]$ProjectRef = "rohvkyuxbnqzglaromms",
  [string]$Region = "ca-central-1",
  [string]$CredentialTarget = "PeacePadV2:Production:Database",
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\18\bin",
  [string]$WorkDirectoryRoot = "C:\PeacePadProductionRestore",
  [string]$EvidenceDirectory = "D:\FTC-HOLDING-cache\peacepad-v2-postgres",
  [int]$LocalPort = 55439
)

$ErrorActionPreference = "Stop"
$expectedEvidenceRoot = [IO.Path]::GetFullPath("D:\FTC-HOLDING-cache\peacepad-v2-postgres")
$resolvedEvidenceRoot = [IO.Path]::GetFullPath($EvidenceDirectory)
if ($resolvedEvidenceRoot -ne $expectedEvidenceRoot) {
  throw "EvidenceDirectory must remain the dedicated PeacePad D: cache path."
}
$expectedWorkRoot = [IO.Path]::GetFullPath("C:\PeacePadProductionRestore")
$resolvedWorkRoot = [IO.Path]::GetFullPath($WorkDirectoryRoot)
if ($resolvedWorkRoot -ne $expectedWorkRoot) {
  throw "WorkDirectoryRoot must remain the dedicated PeacePad temporary path."
}

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PeacePadCredentialReader {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Credential {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }

  [DllImport("advapi32", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern bool CredRead(string target, uint type, int flags, out IntPtr pointer);

  [DllImport("advapi32", SetLastError = true)]
  private static extern void CredFree(IntPtr pointer);

  public static string ReadPassword(string target, out string userName) {
    IntPtr pointer;
    if (!CredRead(target, 1, 0, out pointer)) {
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    }
    try {
      var credential = (Credential)Marshal.PtrToStructure(pointer, typeof(Credential));
      userName = credential.UserName;
      return credential.CredentialBlobSize == 0
        ? ""
        : Marshal.PtrToStringUni(credential.CredentialBlob, (int)credential.CredentialBlobSize / 2);
    } finally {
      CredFree(pointer);
    }
  }
}
'@

function Invoke-PgTool {
  param([string]$Tool, [string[]]$Arguments)
  & (Join-Path $PostgresBin $Tool) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Tool failed with exit code $LASTEXITCODE." }
}

function Get-Sha256Text {
  param([string]$Value)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$workDirectory = Join-Path $resolvedWorkRoot "production-restore-$stamp-$PID"
$dataDirectory = Join-Path $workDirectory "pgdata"
$dumpPath = Join-Path $workDirectory "peacepad-v2-production.dump"
$logPath = Join-Path $workDirectory "postgres.log"
$evidencePath = Join-Path $resolvedEvidenceRoot "production-logical-restoration-$stamp.json"
$productionHost = "db.$ProjectRef.supabase.co"
$started = $false
$productionUser = ""
$productionPassword = $null

New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null
try {
  $productionPassword = [PeacePadCredentialReader]::ReadPassword($CredentialTarget, [ref]$productionUser)
  if ([string]::IsNullOrWhiteSpace($productionPassword)) { throw "Stored credential has no password." }

  # This cluster is disposable verification infrastructure, not a durable data store.
  Invoke-PgTool "initdb.exe" @("-D", $dataDirectory, "--username=postgres", "--auth=trust", "--encoding=UTF8", "--no-locale", "--no-sync")
  Add-Content -LiteralPath (Join-Path $dataDirectory "postgresql.conf") -Value "listen_addresses = '127.0.0.1'`nport = $LocalPort`nfsync = off`nsynchronous_commit = off`nfull_page_writes = off`n"
  Invoke-PgTool "pg_ctl.exe" @("-D", $dataDirectory, "-l", $logPath, "-w", "start")
  $started = $true

  $env:PGPASSWORD = $productionPassword
  $tableQuery = "select table_name from information_schema.tables where table_schema='peacepad_v2' and table_type='BASE TABLE' order by table_name;"
  $sourceOutput = & (Join-Path $PostgresBin "psql.exe") -h $productionHost -p 5432 -U $productionUser -d postgres --no-password -v ON_ERROR_STOP=1 -Atc "begin read only; $tableQuery commit;"
  if ($LASTEXITCODE -ne 0) { throw "Production table inventory failed." }
  $sourceTables = @($sourceOutput | Where-Object { $_ -cmatch "^[a-z0-9_]+$" })
  if ($sourceTables.Count -lt 1) { throw "No PeacePad application tables were found." }

  Invoke-PgTool "pg_dump.exe" @(
    "-h", $productionHost, "-p", "5432", "-U", $productionUser, "-d", "postgres", "--no-password",
    "--format=custom", "--schema=peacepad_v2", "--no-owner", "--no-privileges", "--file", $dumpPath
  )
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $productionPassword = $null

  Invoke-PgTool "createdb.exe" @("-h", "127.0.0.1", "-p", "$LocalPort", "-U", "postgres", "peacepad_restore")
  Invoke-PgTool "pg_restore.exe" @(
    "-h", "127.0.0.1", "-p", "$LocalPort", "-U", "postgres", "-d", "peacepad_restore",
    "--no-owner", "--no-privileges", "--single-transaction", "--exit-on-error", $dumpPath
  )

  $restoredOutput = & (Join-Path $PostgresBin "psql.exe") -h 127.0.0.1 -p $LocalPort -U postgres -d peacepad_restore -Atc $tableQuery
  $restoredTables = @($restoredOutput | Where-Object { $_ -cmatch "^[a-z0-9_]+$" })
  if (($sourceTables -join ",") -ne ($restoredTables -join ",")) {
    throw "Restored table inventory mismatch. source=$($sourceTables -join ',') restored=$($restoredTables -join ',')"
  }

  $productionPassword = [PeacePadCredentialReader]::ReadPassword($CredentialTarget, [ref]$productionUser)
  $env:PGPASSWORD = $productionPassword
  $sourceLines = @()
  $restoredLines = @()
  [int64]$totalRows = 0
  $nonEmptyTables = 0
  foreach ($table in $sourceTables) {
    $fingerprintQuery = "select count(*)::text || ':' || md5(coalesce(string_agg(row_hash,'' order by row_hash),'')) from (select md5(row_to_json(row_value)::text) row_hash from peacepad_v2.`"$table`" row_value) rows;"
    $sourceValue = & (Join-Path $PostgresBin "psql.exe") -h $productionHost -p 5432 -U $productionUser -d postgres --no-password -Atc "set timezone='UTC'; begin read only; $fingerprintQuery commit;" |
      Where-Object { $_ -match "^[0-9]+:[a-f0-9]{32}$" } | Select-Object -First 1
    $restoredValue = & (Join-Path $PostgresBin "psql.exe") -h 127.0.0.1 -p $LocalPort -U postgres -d peacepad_restore -Atc "set timezone='UTC'; $fingerprintQuery" |
      Where-Object { $_ -match "^[0-9]+:[a-f0-9]{32}$" } | Select-Object -First 1
    if ($sourceValue -ne $restoredValue) { throw "Restored data fingerprint mismatch for $table." }
    $rowCount = [int64]($sourceValue.Split(":")[0])
    $totalRows += $rowCount
    if ($rowCount -gt 0) { $nonEmptyTables++ }
    $sourceLines += "${table}:$sourceValue"
    $restoredLines += "${table}:$restoredValue"
  }

  $sourceFingerprint = Get-Sha256Text ($sourceLines -join "`n")
  $restoredFingerprint = Get-Sha256Text ($restoredLines -join "`n")
  if ($sourceFingerprint -ne $restoredFingerprint) { throw "Aggregate restore fingerprint mismatch." }

  [ordered]@{
    result = "PRODUCTION_APPLICATION_SCHEMA_LOGICAL_RESTORATION_VERIFIED"
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    sourceProjectRef = $ProjectRef
    region = $Region
    schema = "peacepad_v2"
    tableCount = $sourceTables.Count
    totalRows = $totalRows
    nonEmptyTables = $nonEmptyTables
    dumpSha256 = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
    sourceFingerprint = $sourceFingerprint
    restoredFingerprint = $restoredFingerprint
    postgresVersion = (& (Join-Path $PostgresBin "psql.exe") --version)
    dataDisclosure = "aggregate-only"
    dumpRetained = $false
  } | ConvertTo-Json | Set-Content -LiteralPath $evidencePath -Encoding utf8
  Write-Host "PEACEPAD_V2_PRODUCTION_LOGICAL_RESTORATION_PASS evidence=$evidencePath"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $productionPassword = $null
  if ($started) {
    & (Join-Path $PostgresBin "pg_ctl.exe") -D $dataDirectory -m immediate -w stop 2>$null | Out-Null
  }
  if (Test-Path -LiteralPath $dumpPath) { Remove-Item -LiteralPath $dumpPath -Force }
  $resolvedWorkDirectory = [IO.Path]::GetFullPath($workDirectory)
  if ($resolvedWorkDirectory.StartsWith("$expectedWorkRoot\production-restore-", [StringComparison]::OrdinalIgnoreCase) -and
      (Test-Path -LiteralPath $resolvedWorkDirectory)) {
    Remove-Item -LiteralPath $resolvedWorkDirectory -Recurse -Force
  }
}
