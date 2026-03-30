# 將 Supabase Personal Access Token 寫入 Cursor 全域 MCP（不會印出 token）
# 取得 PAT：https://supabase.com/dashboard/account/tokens
# 使用：在 PowerShell 執行
#   cd D:\oldmoon
#   .\scripts\set-cursor-supabase-mcp-token.ps1

$ErrorActionPreference = "Stop"
$mcpPath = Join-Path $env:USERPROFILE ".cursor\mcp.json"
if (-not (Test-Path $mcpPath)) {
  Write-Error "找不到 $mcpPath ，請先建立 Cursor MCP 設定。"
}
$secure = Read-Host "貼上 Supabase PAT (sbp_開頭)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $pat = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
} finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}
if ([string]::IsNullOrWhiteSpace($pat)) {
  Write-Error "未輸入 token。"
}
$raw = Get-Content -Path $mcpPath -Raw -Encoding UTF8
$json = $raw | ConvertFrom-Json
if (-not $json.mcpServers.supabase.env) {
  $json.mcpServers.supabase | Add-Member -NotePropertyName env -NotePropertyValue (@{}) -Force
}
$json.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN = $pat
$json | ConvertTo-Json -Depth 10 | Set-Content -Path $mcpPath -Encoding UTF8
Write-Host "已更新 $mcpPath 。請完全關閉 Cursor 後再開啟，並到 Settings > Tools & MCP 確認 supabase 綠燈。"
