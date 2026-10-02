param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Prepare', 'Scan')]
  [string]$Stage
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-DefenderAvailable {
  $status = Get-MpComputerStatus
  if (-not $status.AMServiceEnabled -or -not $status.AntivirusEnabled) {
    throw 'Defender is unavailable or disabled. Diagnostic remains unverified.'
  }
  return $status
}

if ($Stage -eq 'Prepare') {
  $null = Assert-DefenderAvailable
  # Only on this disposable CI runner, before the artifact is downloaded.
  # Never upload samples; do not disable real-time protection or add exclusions.
  Set-MpPreference -SubmitSamplesConsent NeverSend
  if ([int](Get-MpPreference).SubmitSamplesConsent -ne 2) {
    throw 'Cannot enforce NeverSend. Stop before downloading the artifact.'
  }
  Update-MpSignature
  $status = Assert-DefenderAvailable
  $status | Select-Object AMEngineVersion, AntivirusSignatureVersion, AntivirusSignatureLastUpdated | Format-List
  if ($status.AntivirusSignatureLastUpdated -lt (Get-Date).AddDays(-2)) {
    throw 'Defender definitions are stale. Diagnostic remains unverified.'
  }
  exit 0
}

$null = Assert-DefenderAvailable
if ([int](Get-MpPreference).SubmitSamplesConsent -ne 2) {
  throw 'NeverSend is not enforced. Do not scan or submit the artifact.'
}

$artifactDirectory = Join-Path $env:RUNNER_TEMP 'original-windows-artifact'
$files = @(Get-ChildItem -LiteralPath $artifactDirectory -Recurse -Force -File)
if ($files.Count -ne 1 -or $files[0].Name -ne 'peritto-petatto_0.1.0_x64-setup.exe') {
  $files | Select-Object FullName, Length | Format-Table
  throw 'Unexpected contents or missing/quarantined installer. Diagnostic remains unverified.'
}
$installer = $files[0].FullName
$beforeHash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash
$signature = Get-AuthenticodeSignature -LiteralPath $installer
Write-Output "Installer: $($files[0].Name); bytes: $($files[0].Length); SHA256: $beforeHash"
Write-Output "Authenticode status: $($signature.Status); message: $($signature.StatusMessage)"
if ($null -ne $signature.SignerCertificate) {
  Write-Output "Signer: $($signature.SignerCertificate.Subject)"
}
if ($signature.Status -notin @('Valid', 'NotSigned')) {
  throw 'Unexpected signature status. Investigate before distribution.'
}

$platform = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
$candidates = @(Get-ChildItem -LiteralPath $platform -Directory | Sort-Object Name -Descending)
$scanner = $null
foreach ($candidate in $candidates) {
  $candidatePath = Join-Path $candidate.FullName 'MpCmdRun.exe'
  if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
    $scanner = $candidatePath
    break
  }
}
if ($null -eq $scanner) {
  throw 'MpCmdRun.exe is unavailable. Diagnostic remains unverified.'
}

# Execute only Microsoft's scanner, NEVER the inspected installer.
# Custom scan with DisableRemediation ignores file exclusions, examines
# archives and reports detections to stdout without modifying the sample.
& $scanner -Scan -ScanType 3 -File $installer -DisableRemediation
$scanExitCode = $LASTEXITCODE
Write-Output "Defender scan exit code: $scanExitCode"
if ($scanExitCode -ne 0) {
  throw "Defender detected a threat or could not complete the scan (exit $scanExitCode). Inspect scanner output."
}
if (-not (Test-Path -LiteralPath $installer -PathType Leaf) -or
    (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne $beforeHash) {
  throw 'Installer disappeared or changed during scanning. Diagnostic remains unverified.'
}

@(
  '## Windows artifact diagnostic'
  '- Source: run 37058099538, artifact 11249516824 (PR #19).'
  "- Installer SHA256: $beforeHash"
  "- Authenticode: $($signature.Status)"
  '- Microsoft Defender custom scan completed without detection.'
  '- The installer was not executed. No sample was submitted automatically.'
  '- This is not a guarantee of safety and does not resolve the Chrome warning.'
) | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
