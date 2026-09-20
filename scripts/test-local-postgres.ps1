param(
  [string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin',
  [string]$ExistingCluster = '',
  [string]$ExpectedSystemIdentifier = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$clusterRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'test-results'))
$testCluster = if ($ExistingCluster) { [System.IO.Path]::GetFullPath($ExistingCluster) } else {
  Join-Path $clusterRoot ('pg-readiness-' + [guid]::NewGuid().ToString('N'))
}
if ([System.IO.Path]::GetDirectoryName($testCluster) -ne $clusterRoot -or
    [System.IO.Path]::GetFileName($testCluster) -notmatch '^pg-readiness-[a-f0-9]{32}$') {
  throw 'The cluster must be an isolated readiness directory inside this workspace'
}
$testLog = $testCluster + '.log'
if (Get-NetTCPConnection -LocalPort 55439 -State Listen -ErrorAction SilentlyContinue) { throw 'Isolated test port is occupied' }
# No .env loading, production connection strings or existing cluster changes.
if ($ExistingCluster) {
  if (!$ExpectedSystemIdentifier -or !(Test-Path -LiteralPath $testCluster)) { throw 'A known cluster identifier is required to resume tests' }
  if ((Get-Item -LiteralPath $testCluster).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Linked cluster directories are not allowed' }
} else {
  if (Test-Path -LiteralPath $testCluster) { throw 'Test cluster already exists' }
  & (Join-Path $PostgresBin 'initdb.exe') -D $testCluster -U showle_security -A trust --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'Isolated initdb failed' }
}
$control = & (Join-Path $PostgresBin 'pg_controldata.exe') -D $testCluster
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the isolated cluster' }
$identifierLine = $control | Select-String '^Database system identifier:\s+(\d+)$'
if (!$identifierLine) { throw 'Cannot identify the isolated cluster' }
$clusterIdentifier = $identifierLine.Matches[0].Groups[1].Value
if ($ExistingCluster -and $clusterIdentifier -ne $ExpectedSystemIdentifier) { throw 'The existing cluster identifier does not match' }

function Assert-TestClusterIdentity {
  $identity = & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p 55439 -U showle_security -d postgres -At -v ON_ERROR_STOP=1 -c "SELECT current_setting('data_directory'), current_setting('port'), current_user, system_identifier FROM pg_control_system()"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot verify the running isolated cluster' }
  $fields = $identity.Trim().Split('|')
  if ($fields.Length -ne 4 -or [System.IO.Path]::GetFullPath($fields[0]) -ne $testCluster -or
      $fields[1] -ne '55439' -or $fields[2] -ne 'showle_security' -or $fields[3] -ne $clusterIdentifier) {
    throw 'The running PostgreSQL instance does not match the owned test cluster'
  }
}
$started = $false
try {
  # Start-Process -Wait waits for descendant postgres processes too. Wait only for pg_ctl.
  $process = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList @(
    'start', '-D', ('"' + $testCluster + '"'), '-l', ('"' + $testLog + '"'),
    '-o', '"-h 127.0.0.1 -p 55439"', '-w'
  ) -WindowStyle Hidden -PassThru
  $null = $process.Handle
  if (!$process.WaitForExit(30000)) { throw 'Timed out waiting for isolated pg_ctl' }
  $process.Refresh()
  if ($process.ExitCode -ne 0) { throw 'Isolated PostgreSQL failed to start' }
  $started = $true
  Assert-TestClusterIdentity
  & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p 55439 -U showle_security showle_security_fix
  if ($LASTEXITCODE -ne 0) { throw 'Isolated test database creation failed' }
  $env:SHOWLE_SECURITY_PG_TEST = '1'
  $env:SHOWLE_SECURITY_PSQL = Join-Path $PostgresBin 'psql.exe'
  & node (Join-Path $projectRoot 'node_modules/vitest/vitest.mjs') run src/lib/__tests__/postgres-security.integration.test.ts src/lib/__tests__/shared-rate-limit.integration.test.ts
  $testResult = $LASTEXITCODE
} finally {
  # Stop only the newly created cluster. Keep its files for diagnostics.
  if ($started) {
    Assert-TestClusterIdentity
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $testCluster stop -m fast -w -t 20
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop the isolated test cluster' }
  }
}
exit $testResult
