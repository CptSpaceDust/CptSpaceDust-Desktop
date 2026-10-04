param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$changelog = Get-Content "CHANGELOG.md" -Raw -Encoding utf8
$escapedVersion = [regex]::Escape($Version)
$pattern = "(?ms)^## \[$escapedVersion\][^\r\n]*\r?\n(?<body>.*?)(?=^## \[|\z)"
$match = [regex]::Match($changelog, $pattern)

if (-not $match.Success) {
  throw "CHANGELOG.md does not contain release notes for version $Version."
}

$notes = $match.Groups["body"].Value.Trim()
if ([string]::IsNullOrWhiteSpace($notes)) {
  throw "The changelog entry for version $Version is empty."
}

Set-Content -LiteralPath $OutputPath -Value $notes -Encoding utf8
