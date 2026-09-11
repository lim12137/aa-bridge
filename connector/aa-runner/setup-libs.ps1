# setup-libs.ps1 - copy the runtime dynamically-loaded aardio libs next to aacli.exe
# (static deps are embedded at publish; these are resolved at runtime from .\lib)
# usage: powershell -NoProfile -ExecutionPolicy Bypass -File setup-libs.ps1 -AardioLib "I:\1Tools\aardio\lib"
param([string]$AardioLib = "I:\1Tools\aardio\lib")
$ErrorActionPreference = "Stop"
$dist = Join-Path $PSScriptRoot "dist"
$dest = Join-Path $dist "lib"
if (-not (Test-Path $AardioLib)) { Write-Output "ERR: aardio lib dir not found: $AardioLib"; exit 1 }

function Copy-LibDir([string]$name) {
  $src = Join-Path $AardioLib $name
  if (-not (Test-Path $src)) { Write-Output "WARN: missing $src"; return }
  $dst = Join-Path $dest $name
  if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
  Copy-Item $src $dst -Recurse -Force
  Write-Output "OK  dir  $name"
}
function Copy-LibFile([string]$rel) {
  $src = Join-Path $AardioLib $rel
  if (-not (Test-Path $src)) { Write-Output "WARN: missing $src"; return }
  $dst = Join-Path $dest $rel
  New-Item (Split-Path $dst) -ItemType Directory -Force | Out-Null
  Copy-Item $src $dst -Force
  Write-Output "OK  file $rel"
}

# ide_* tools + aifix chain (also needs: thread, process\mutex, fsys, util, sys, key, crypt)
Copy-LibDir "ide"
Copy-LibDir "winex"
Copy-LibDir "thread"
Copy-LibDir "fsys"
Copy-LibDir "util"
Copy-LibDir "sys"
Copy-LibDir "key"
Copy-LibDir "crypt"
Copy-LibDir "wsock"
Copy-LibDir "inet"
Copy-LibDir "sessionHandler"
New-Item (Join-Path $dest "process") -ItemType Directory -Force | Out-Null
Copy-LibFile "process\mutex.aardio"
# simpleHttpServer chain (thread.works -> win.guid)
New-Item (Join-Path $dest "win") -ItemType Directory -Force | Out-Null
Copy-LibFile "win\guid.aardio"
Copy-LibFile "string\fencedCodeBlock.aardio"
# autos lib itself: skills are loaded dynamically via load_skill
Copy-LibDir "autos"

# tray icon must sit next to the exe
Copy-Item (Join-Path $PSScriptRoot "autos.ico") (Join-Path $dist "autos.ico") -Force
Write-Output "DONE: $dest"
