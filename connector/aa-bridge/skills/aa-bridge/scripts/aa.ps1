# aa-bridge 客户端脚本：自动从 aa-bridge.table 读取 token 调用 AA 外部桥
# 用法: aa.ps1 <status|tools|reply|stop|shutdown|call> [json] [-TimeoutSec 600]
# -TimeoutSec（默认 600）作用于所有 Invoke-RestMethod 调用：长工具（search_web/download_*/execute_code/load_skill 等）
# 可能跑几十秒，显式超时可避免 PowerShell 默认 100 秒掐断
param(
  [Parameter(Position=0)][string]$Cmd = "status",
  [Parameter(Position=1)][string]$Data = "",
  [int]$TimeoutSec = 600
)
$ErrorActionPreference = "Stop"
$table = Join-Path $env:LOCALAPPDATA "aardio\autos\aa-bridge.table"
if (-not (Test-Path $table)) { Write-Output '{"error":"aa-bridge.table 不存在：AA 副本未运行过或桥从未开启"}'; exit 1 }
$raw = Get-Content $table -Raw -ErrorAction SilentlyContinue
$token = [regex]::Match($raw, 'token\s*=\s*"([^"]+)"').Groups[1].Value
if (-not $token) { Write-Output '{"error":"token 解析失败"}'; exit 1 }
$base = "http://127.0.0.1:9123"
$headers = @{ "X-AA-Token" = $token }

function Invoke-Api([string]$method, [string]$path, [string]$json) {
  if ($json) {
    Invoke-RestMethod -Method $method -Uri ($base + $path) -Headers $headers -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
  } else {
    Invoke-RestMethod -Method $method -Uri ($base + $path) -Headers $headers -TimeoutSec $TimeoutSec
  }
}

try {
  switch -Regex ($Cmd) {
    "^status$"   { Invoke-Api Get "/api/status" | ConvertTo-Json -Depth 6 }
    "^tools$"    { Invoke-Api Get "/api/tools"  | ConvertTo-Json -Depth 8 }
    "^reply$"    { Invoke-Api Get "/api/reply"  | ConvertTo-Json -Depth 6 }
    "^stop$"     { Invoke-Api Post "/api/stop" "" | ConvertTo-Json -Depth 6 }
    "^shutdown$" { Invoke-Api Post "/api/shutdown" "" | ConvertTo-Json -Depth 6 }
    "^call$"     {
      if (-not $Data) { Write-Output '{"error":"call 需要 JSON 参数，如 {\"name\":\"aa_status\",\"arguments\":{}}"}'; exit 1 }
      Invoke-Api Post "/api/tools/call" $Data | ConvertTo-Json -Depth 8
    }
    "^prompt$"   { Write-Output '{"error":"/api/prompt 已于 2026-09-10 移除：zcode 直接 tools/call，不再注入消息"}'; exit 1 }
    default      { Write-Output ("{`"error`":`"未知子命令: " + $Cmd + "`"}"); exit 1 }
  }
}
catch {
  $msg = $_.Exception.Message
  if ($msg -match "401") { Write-Output '{"error":"401 token 不匹配（aa-bridge.table 与运行实例不一致？）"}' }
  elseif ($msg -match "403") { Write-Output '{"error":"403 桥已关闭（标准方式：运行 aacli.exe；或 AA 设置里勾选 外部桥）"}' }
  elseif ($msg -match "无法连接|refused|Unable to connect") { Write-Output '{"error":"连接拒绝：桥未开启（运行 aacli.exe，或 AA 副本 + 外部桥）"}' }
  else { Write-Output ("{`"error`":`"" + ($msg -replace '"','''') + "`"}") }
  exit 1
}
