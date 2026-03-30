# Cursor 連接 Supabase MCP（排除 `mcp.supabase.com` 連不上）

## 為什麼會 `ENOTFOUND mcp.supabase.com`？

Cursor 若使用 **遠端 URL** `https://mcp.supabase.com/mcp`，必須能解析並連上該網域。若本機 DNS、公司網路、VPN 或防火牆導致 **無法解析 `mcp.supabase.com`**，就會出現 `getaddrinfo ENOTFOUND`。

## 建議作法：改成本機 stdio MCP（已寫入 `~/.cursor/mcp.json`）

不依賴 `mcp.supabase.com` 的 HTTP 連線，改由 **Node `npx` 在本機啟動** `@supabase/mcp-server-supabase`，用 **Personal Access Token (PAT)** 呼叫 Supabase API。

### 1. 安裝 Node.js

本機需已安裝 **Node.js 18+**（含 `npx`）。終端機執行 `node -v`、`npx -v` 確認。

### 2. 建立 Supabase PAT（與 anon/service_role 不同）

1. 開啟：<https://supabase.com/dashboard/account/tokens>
2. 建立 **Personal access token**，複製保存（只顯示一次）。

### 3. 把 PAT 填進 Cursor MCP 設定

編輯：**`C:\Users\User\.cursor\mcp.json`**

在 `env.SUPABASE_ACCESS_TOKEN` 的 `""` 內貼上你的 PAT，例如：

```json
"SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxx..."
```

**不要**把 PAT 提交到 Git；`mcp.json` 在使用者目錄，通常不在專案內。

### 4. 確認 project ref

本專案 `NEXT_PUBLIC_SUPABASE_URL` 的 ref 為 **`zjaumgdypoitjhvllzen`**，已寫在 `args` 的 `--project-ref=`。若你換專案，請改成 Dashboard URL 裡 `https://xxxx.supabase.co` 的 `xxxx` 那段。

### 5. 重啟 Cursor

**完全關閉 Cursor 再開**，到 **Settings → Tools & MCP**，確認 **supabase** 綠燈。

### 6. 可選：僅讀資料庫

若希望 MCP 只跑唯讀 SQL，在 `args` 裡 `--project-ref=...` 後面加：

`--read-only`

---

## 若仍想用遠端 `https://mcp.supabase.com/mcp`

在本機 PowerShell 執行：

```powershell
nslookup mcp.supabase.com
```

若失敗：改 DNS 為 **1.1.1.1** 或 **8.8.8.8**、關 VPN 試、換網路；或改走上方 **stdio** 方式。

---

## 安全提醒（官方文件）

MCP 會讓 AI 能操作專案資源；請優先接 **開發用** 專案、必要時開 **read-only**，並在 Cursor 中 **審核每次工具呼叫**。
