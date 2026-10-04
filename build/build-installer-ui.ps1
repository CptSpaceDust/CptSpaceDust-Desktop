$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw 'Windows .NET Framework compiler is required to build the update animation.' }
$source = Join-Path $PSScriptRoot 'UpdateAnimation.cs'
$output = Join-Path $PSScriptRoot 'UpdateAnimation.exe'
$artwork = Join-Path (Split-Path $PSScriptRoot -Parent) 'src/renderer/assets/mayu/mayu-update-desk.png'
if (!(Test-Path -LiteralPath $artwork)) { throw 'Mayu updater artwork is missing.' }
& $compiler /nologo /target:winexe /optimize+ /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/resource:$artwork,MayuUpdateDesk.png" "/out:$output" $source
if ($LASTEXITCODE -ne 0) { throw 'Update animation compilation failed.' }
