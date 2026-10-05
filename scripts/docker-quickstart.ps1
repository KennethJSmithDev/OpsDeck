param(
  [ValidateSet('Up','Down','Reset','Status')]
  [string]$Action = 'Up'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$quickstart = Join-Path $repoRoot 'docker/quickstart'
$composeFile = Join-Path $quickstart 'compose.yaml'
$localDir = Join-Path $quickstart '.local'
$secretDir = Join-Path $quickstart '.secrets'
$archive = Join-Path $localDir 'opsdeck-1.0.0-rc.tgz'
$passwordFile = Join-Path $secretDir 'iris-password.txt'
$mergeFile = Join-Path $secretDir 'merge.cpf'
$container = 'opsdeck-iris-quickstart'
$volume = 'opsdeck-quickstart_iris-data'
$image = 'intersystemsdc/iris-community:2026.2-zpm'
$hashImage = 'containers.intersystems.com/intersystems/passwordhash:1.1@sha256:784ee9ad3b6daf54badc0a7f57a934de7633d27da0da38e6482c2306d3d898db'
$expectedSha256 = '178bf6ea3809b023ed76a39ea313cfaf33ff3f5e91a5afbfc2627cadf3faf798'
$archiveUrl = 'https://github.com/KennethJSmithDev/OpsDeck/releases/download/v1.0.0/opsdeck-1.0.0-rc.tgz'

function Invoke-Compose([string[]]$Arguments) {
  & docker compose -p opsdeck-quickstart -f $composeFile @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed ($LASTEXITCODE)." }
}

function Ensure-LocalPassword {
  if (-not (Test-Path -LiteralPath $passwordFile) -or -not (Test-Path -LiteralPath $mergeFile)) {
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $password = [Convert]::ToHexString($bytes)
    [IO.Directory]::CreateDirectory($secretDir) | Out-Null
    [IO.File]::WriteAllText($passwordFile, $password)
    $hashInput = $password + "`n" + $password + "`n"
    $hashLine = $hashInput | & docker run --rm -i $hashImage -algorithm SHA512 -workfactor 10000
    if ($LASTEXITCODE -ne 0 -or -not $hashLine) { throw 'The official PasswordHash utility failed.' }
    $cpfLines = @('[Startup]') + @($hashLine)
    [IO.File]::WriteAllLines($mergeFile, [string[]]$cpfLines)
    $password = $null
    $hashInput = $null
    $hashLine = $null
    [Array]::Clear($bytes, 0, $bytes.Length)
  }
}

function Test-IrisReady {
  $running = (& docker inspect --format '{{.State.Running}}' $container 2>$null)
  if ($LASTEXITCODE -ne 0 -or $running -ne 'true') { return $false }
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:52774/api/atelier/' -TimeoutSec 3 -SkipHttpErrorCheck
    return ([int]$response.StatusCode -in @(200, 401, 403))
  } catch { return $false }
}

function Invoke-IrisSession([string]$InputText) {
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = 'docker'
  $start.Arguments = "exec -i $container iris session IRIS -U%SYS"
  $start.UseShellExecute = $false
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $start
  if (-not $process.Start()) { throw 'Could not start the IRIS terminal session.' }
  $process.StandardInput.Write($InputText)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "IRIS terminal operation failed. $($stderr -replace '[\r\n]+',' ')"
  }
  return $stdout
}

function Invoke-AuthenticatedGet([string]$Path) {
  $password = [IO.File]::ReadAllText($passwordFile).Trim()
  $bytes = [Text.Encoding]::ASCII.GetBytes("_SYSTEM`:$password")
  $handler = [Net.Http.HttpClientHandler]::new()
  $client = [Net.Http.HttpClient]::new($handler)
  $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get, "http://127.0.0.1:52774$Path")
  $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Basic', [Convert]::ToBase64String($bytes))
  try {
    $response = $client.Send($request)
    $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{ Status = [int]$response.StatusCode; Content = $content }
  } finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
    $password = $null
    $request.Dispose()
    $client.Dispose()
    $handler.Dispose()
  }
}

if ($Action -eq 'Down') {
  Invoke-Compose @('down','--remove-orphans')
  exit 0
}
if ($Action -eq 'Reset') {
  Invoke-Compose @('down','--volumes','--remove-orphans')
  & docker volume rm $volume 2>$null | Out-Null
  if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile -Force }
  if (Test-Path -LiteralPath $mergeFile) { Remove-Item -LiteralPath $mergeFile -Force }
  $Action = 'Up'
}
if ($Action -eq 'Status') {
  Invoke-Compose @('ps')
  exit 0
}

[IO.Directory]::CreateDirectory($localDir) | Out-Null
Ensure-LocalPassword
if (-not (Test-Path -LiteralPath $archive)) {
  Invoke-WebRequest -Uri $archiveUrl -OutFile $archive
}
$actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
if ($actualSha256 -ne $expectedSha256) { throw 'The local release archive SHA-256 does not match the qualified 1.0.0 artifact.' }

# A new named volume is root-owned. Prepare only the durable IRIS data path
# before the official entrypoint starts, matching the proven clean-volume path.
& docker volume create $volume | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not create the quick-start data volume.' }
& docker run --rm --user root --mount "type=volume,source=$volume,target=/durable" --entrypoint /bin/bash $image -lc 'mkdir -p /durable/iris && chown irisowner:irisowner /durable/iris'
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare durable IRIS data ownership.' }

Invoke-Compose @('up','-d','--build')
$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  if (Test-IrisReady) { $ready = $true; break }
  Start-Sleep -Seconds 5
}
if (-not $ready) { throw 'IRIS 2026.2 did not become ready. Inspect docker compose logs before retrying.' }

# The official entrypoint removes write bits on the installed tree during
# first boot. Re-establish only OpsDeck's two package-owned directories.
& docker exec --user root $container /bin/bash -lc 'mkdir -p /usr/irissys/ipm/opsdeck /usr/irissys/csp/opsdeck && chown irisowner:irisowner /usr/irissys/ipm/opsdeck /usr/irissys/csp/opsdeck && chmod 0700 /usr/irissys/ipm/opsdeck /usr/irissys/csp/opsdeck'
if ($LASTEXITCODE -ne 0) { throw 'Could not establish the package-owned IPM and CSP directories.' }

$inventory = Invoke-AuthenticatedGet '/opsdeck-api/packages'
if ($inventory.Status -ne 200) {
  $installOutput = Invoke-IrisSession "zpm `"load /opsdeck-artifact/opsdeck-1.0.0-rc.tgz`"`nhalt`n"
  if ($installOutput -notmatch 'Activate SUCCESS') {
    throw 'IPM did not report a successful exact-archive load. Inspect the IRIS output before retrying.'
  }
}

$page = Invoke-AuthenticatedGet '/opsdeck/index.html'
$identity = Invoke-AuthenticatedGet '/api/admin/info'
$inventory = Invoke-AuthenticatedGet '/opsdeck-api/packages'
if ($page.Status -ne 200) { throw "Native OpsDeck page returned HTTP $($page.Status)." }
if ($identity.Status -ne 200) { throw "Authenticated native identity read returned HTTP $($identity.Status)." }
if ($inventory.Status -ne 200) { throw "Authenticated IPM inventory returned HTTP $($inventory.Status)." }
$packageInventory = $inventory.Content | ConvertFrom-Json
$opsdeck = @($packageInventory.packages | Where-Object { $_.name -eq 'opsdeck' }) | Select-Object -First 1
if ($opsdeck.installedVersion -ne '1.0.0') { throw 'The native IPM inventory does not report opsdeck 1.0.0.' }

& docker restart $container | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'IRIS restart failed.' }
$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  if (Test-IrisReady) { $ready = $true; break }
  Start-Sleep -Seconds 5
}
if (-not $ready) { throw 'IRIS did not recover after restart. Inspect docker compose logs.' }
$page = Invoke-AuthenticatedGet '/opsdeck/index.html'
$identity = Invoke-AuthenticatedGet '/api/admin/info'
$inventory = Invoke-AuthenticatedGet '/opsdeck-api/packages'
if ($page.Status -ne 200 -or $identity.Status -ne 200 -or $inventory.Status -ne 200) {
  throw 'Authenticated native OpsDeck reads failed after restart.'
}
$packageInventory = $inventory.Content | ConvertFrom-Json
$opsdeck = @($packageInventory.packages | Where-Object { $_.name -eq 'opsdeck' }) | Select-Object -First 1
if ($opsdeck.installedVersion -ne '1.0.0') { throw 'OpsDeck package identity did not persist across restart.' }

Write-Output 'PASS: official IRIS 2026.2 container is ready.'
Write-Output 'PASS: exact qualified opsdeck 1.0.0 package is installed.'
Write-Output "PASS: /opsdeck/index.html returned HTTP $($page.Status)."
Write-Output 'PASS: authenticated /api/admin/info and /opsdeck-api/packages reads succeeded.'
Write-Output 'PASS: restart preserved OpsDeck 1.0.0 and authenticated native reads.'
Write-Output 'Open http://127.0.0.1:52774/opsdeck/index.html and sign in as _SYSTEM using the local password in docker/quickstart/.secrets/iris-password.txt.'
