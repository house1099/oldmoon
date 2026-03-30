# 傳奇公會（Old Moon）

Next.js App Router 專案。開發銜接、架構與資料庫約束以 **`HANDOFF.md`** 為主；資料庫／遷移／**Supabase RLS** 以 **`HANDOFF_DB.md`** 為主。

## 安全與 RLS（Supabase）

- **`public` 業務表預設應啟用 Row Level Security（RLS）**；敏感寫入（金流、派獎、經驗日誌、後台稽核等）應經 **`createAdminClient()`（service role）**，不受 RLS 阻擋。
- **政策設計、表分類、新表檢查清單、除錯原則（含：禁止用關閉 RLS 當修 bug）** → 見 **`HANDOFF_DB.md`** 章節 **「RLS 政策與維運規範」**。
- 封測曾套用之全表 RLS 強化遷移：`supabase/migrations/20260330190000_rls_lockdown_sensitive_tables.sql`（雲端執行紀錄以 Dashboard／MCP 為準）。

## 本機開發

```bash
npm install
npm run dev
```

瀏覽 [http://localhost:3000](http://localhost:3000)。

## 相關文件

| 檔案 | 用途 |
|------|------|
| `HANDOFF.md` | 階段目標、五層架構、檔案索引 |
| `HANDOFF_DB.md` | Schema、遷移、**RLS**、DDL 補丁 |
| `HANDOFF_FEATURES.md` | 功能完成度與產品待辦 |
| `.cursorrules` | Cursor／協作者機讀規範 |

---

以下為建立專案時的 Next.js 預設說明（可略）。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deploy on Vercel

The easiest way to deploy is the [Vercel Platform](https://vercel.com/new). See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
