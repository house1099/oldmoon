# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder 同步專案狀態用；每次模組完成或階段切換時應更新本文件。

# 目前開發階段

**Phase 1** — 專案初始化與規範建立（進行中）

<!-- Phase 2 / Phase 3 待 Phase 1 完成後更新 -->

# 已完成模組

- [x] 根目錄 `.cursorrules`（人格、五層架構、回報格式、SQL 🗄️ 標記）
- [x] 根目錄 `HANDOFF.md`（本交接文件）
- [x] 根目錄 `.env.example`（環境變數範本）

# 進行中任務

- Phase 1 其餘初始化（Next.js / Supabase 專案骨架、目錄對應五層架構等）— 待下一個小塊拼圖指令

# 待解決問題 (Known Issues)

- （尚無 — 專案剛初始化）

# 環境變數檢查清單

複製 `.env.example` 為 `.env.local`（或團隊約定之檔名）後逐項填寫並打勾：

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（僅伺服端／CI 使用，勿提交至前端）
- [ ] `NEXT_PUBLIC_APP_URL`（或專案約定的站點基底 URL，供 PWA／OAuth redirect 等）

---

*最後更新：初始化建立 HANDOFF 當日*
