# HANDOFF_HISTORY — 歷史任務歸檔

舊版主檔內之逐日／逐任務紀錄與長篇 Wave 敘事已遷移至此。**平時不必讀**；需追溯決策或實作細節時再開。

### 2026-04-03 — 釣魚倒數 ceil／樂觀可收竿、釣竿 SKU 限購、月老收入魚獲／放生

1. **目標**：收竿／冷卻顯示與 **`fishing-cast.repository`** **`Math.ceil`** 一致；本地已過 **`pendingHarvestReadyAtIso`** 時先顯示可收竿；阻擋多把同款釣竿繞過冷卻；月老收成改 **收入魚獲**（通知對方）／**放生**（不通知、魚獲標記）。
2. **UI**：**`fishing-panel.tsx`** — **`formatRemainHms`** **`Math.ceil`**；**`PendingHarvestCountdown`／`CooldownTimer`** 剩餘秒 ceil；**`harvestReadyByServerOrLocal`**、**`lakeUiPhase`**／**`rodChipStatus`** 樂觀 ready；**`onElapsed`** 於 **`Date.now() >= targetMs`** 觸發。
3. **商城**：**`rewards.repository.ts`** **`userHasFishingRodForShopItem`**；**`shop.action.ts`** — **`fishing_rod`** 僅能買 **quantity 1**、已有同 **`shop_item_id`** 則 **`fishing_rod_already_owned`**；**`PurchaseItemOptions.giftRecipientUserId`** 贈送時改查受贈者；**`shop/page.tsx`** **`ERROR_LABELS`**。
4. **月老**：**`fishing.action.ts`** — **`mergeMatchmakerReleasedIntoFishItem`**；**`applyHarvestPreviewPayload`** 第四參 **`matchmakerOutcome`**；**`confirmHarvestFishAction`** **`matchmakerOutcome`** **`collect`／`release`**；放生寫入 **`fish_item.matchmakerReleased`**、不 **`notifyMatchmakerPeerCaught`**（獎勵與 collect 相同）。
5. **Layer 5**：**`fishing-reward-modal.tsx`** — **收入魚獲**／**放生**（**`AlertDialog`**）、**`onConfirmSuccess`**；**`catch-panel.tsx`** **已放生** 膠囊。
6. **資料庫**：無 DDL；可選 **`(user_id, shop_item_id)`** partial unique **`WHERE reward_type = 'fishing_rod'`** 待資料乾淨後再加。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。

### 2026-04-03 — 三餌營運對照＋章魚小數容差＋AppShell flex 魚池捲動

1. **目標**：蝦仁豬心＝月老（heart）、蟲蟲餌＝普通魚（normal）、章魚餌＝三欄機率（小數可至 0.01% 級）；移除魚池頂／底黑帶與雙層捲動。
2. **DB**（Supabase `execute_sql`）：**蝦仁豬心餌** `bait_profile: heart`＋`bait_matchmaker_rate: 100`；**蟲蟲餌** `normal`＋`bait_common_rate: 100`；**章魚餌** 維持 `octopus`＋三欄。
3. **`fishing-shop-metadata.ts`**：匯出 **`BAIT_OCTOPUS_RATE_SUM_EPSILON`**（`0.0001`），**`validateBaitMetadata`**／**`parseBaitFishWeightsForHarvest`** 章魚加總驗證共用。
4. **`shop-admin-client.tsx`**：魚餌說明補營運對照；章魚「目前合計」用 **`BAIT_OCTOPUS_RATE_SUM_EPSILON`**、**`toFixed(4)`**。
5. **`app-shell-motion.tsx`**：外層 **`flex flex-col`**，內層改 **`flex flex-1 flex-col min-h-0`**（移除內層 **`min-h-[100dvh]`**），子路由可 **`flex-1`** 吃滿高度。
6. **`matchmaking/page.tsx`**：根 **`min-h-0 flex-1 flex-col`**（移除 **`h-[calc(100dvh-…)]`**）。
7. **文件**：**`HANDOFF.md`** 補章魚容差與三商品對照；**`HANDOFF.md`**「最近完成」更新。
8. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過；**`git push`**。

### 2026-04-03 — 魚餌 bait_profile DB 修正＋魚池捲動單層化

1. **目標**：(a) 修正換餌不換目標魚種（所有餌偵測為 octopus）；(b) 魚池 TAB 頁雙層捲動＋上下黑帶；(c) 釣竿橫向列干擾直向捲動。
2. **DB 修正**（Supabase `execute_sql`）：四筆 `fishing_bait` shop_items 全部補寫 `bait_profile`——普通釣餌 `"normal"`＋`bait_common_rate:100`；蝦仁豬心餌／蟲蟲餌 `"octopus"`（保留原 rate）；章魚餌已由管理員修正。
3. **`detectBaitType`**（`fishing-shop-metadata.ts`）：fallback 新增 matchmakerRate 優先規則——`matchmakerRate > octopus 三欄合計` → `"heart"`，避免同時有兩組欄位時誤判。
4. **商城後台**（`shop-admin-client.tsx`）：新增 `baitProfileMissing` 狀態，編輯餌時若 metadata 無 `bait_profile` 顯示黃色警示，提示管理員確認類型後儲存。
5. **魚池捲動**（`matchmaking/page.tsx`）：根容器高度從 `h-[100dvh]` 改為 `h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-5.25rem-env(safe-area-inset-bottom,0px))]`，扣除 `AppShellMotion` 上下 padding；移除重複的 `pb-[max(5rem,...)]`。單層捲動，無黑帶。
6. **釣竿橫向列**（`fishing-panel.tsx` `FishingRodStrip`）：`touch-pan-x` → `touch-manipulation`，讓瀏覽器自動鎖定方向，橫滑不再干擾直向捲動。
7. **驗證**：`npx tsc --noEmit`、`npm run build` 通過。

### 2026-04-03 — 釣魚 UX／metadata／機率 SSOT

1. **目標**：月老餌不因舊章魚欄位誤判；收竿倒數每秒更新；商城釣竿顯示解析後冷卻來源；文件化兩層機率（餌權重 vs `fishing_rewards`）。
2. **餌**：**`fishing-shop-metadata.ts`** — **`detectBaitType`** 優先 **`bait_profile`**／**`bait_kind`**；**`stripFishingBaitKeys`** 含 profile；**`shop-admin-client`** 存檔寫入 **`bait_profile`**（與 **`bait_kind`** 表單一致）。
3. **收竿倒數**：**`fishing-cast.repository`** **`getRodCastSnapshot`** 回傳 **`pendingHarvestReadyAtIso`**；**`fishing.action`** **`FishingStatusDto`** 補欄；**`fishing-panel`** **`PendingHarvestCountdown`**（本地 tick + ISO）；文案改為「依拋竿時鎖定的可收竿時間」。
4. **商城釣竿**：新增 **`resolveRodCooldownResolution`**（與 **`parseRodFishingRules`** 一致）；**`getFishingAdminSettingsAction`** 拉全站 tier 分鐘；表單即時顯示「解析後拋竿冷卻」與來源說明。
5. **文件**：**`HANDOFF.md`** — 新節「釣魚機率（兩層）」＋營運 SQL 範例。
6. **資料庫**：無 DDL；既有餌建議重新儲存一次以寫入 **`bait_profile`**。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **架構**：Layer 3 組 DTO；UI 僅依 action；餌／竿規則集中 **`fishing-shop-metadata`**。

### 2026-04-03 — 月老魚性向篩選、綁定與 IG 強制顯示

1. **目標**：修正月老魚性向硬鎖（DB 存英文 slug，舊邏輯比對中文導致異性戀男男誤配）；月老配對成功後通知被釣者、開獎卡與魚獲詳情強制顯示 IG（不改 `ig_public`）。
2. **根因**：**`checkGenderOrientation`** 比對「異性戀」等中文 label，**`users.orientation`** 實際為 **`heterosexual`／`homosexual`／`pansexual`**（見 **`adventurer-questionnaire.ts`**），落到錯誤後備條件。
3. **修正**：**`src/lib/utils/matchmaker-locks.ts`** — `normalizeOrientationForMatch`（legacy slug＋極少數中文）、**`isOrientationMatch`**（**`matching.ts`**）；任一方性向空白則不擋。
4. **Layer 2**：**`user.repository.ts`** — **`MatchmakerPoolCandidateRow`** 與 **`findMatchmakerPoolCandidates`** `.select` 補 **`instagram_handle`／`interests`／`bio_village`**。
5. **Layer 3**：**`fishing.action.ts`** — 匯出 **`MatchmakerCollectPeer`**；**`HarvestPreviewPayload`** 補 **`peerRegion`／`peerInterests`／`peerBioVillage`／`peerInstagramHandle`**（預覽回放）；**`matchmakerUserFromPick`**；**`applyHarvestPreviewPayload`** 在 **`tryInsertMatchmakerLog`**（有緣人）後 **`notifyUserMailboxSilent`**（`type: system`，`from_user_id`＝釣魚者）；**`prepareHarvestFishAction`** 從預覽還原 **`matchmakerUser`** 新欄位。（實際寫入日誌與發獎僅在確認收成路徑。）
6. **Layer 5**：**`fishing-reward-modal.tsx`** — 月老卡顯示地區／興趣／自介／IG（**`instagramProfileUrlFromHandle`**）；**`UserDetailModal.tsx`** — **`forceShowIg`**；**`catch-panel.tsx`** — 有緣人列 **「❤️ 月老」** 標記、開啟詳情 **`forceShowIg`**。
7. **資料庫**：無 DDL 變更。
8. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
9. **架構**：通知經 Layer 3 `notifyUserMailboxSilent` → Repository；UI 不直連 DB。

### 2026-04-03 — 全站動態設定系統（useAppSettings、合併 fishing_age_max、替換硬編碼）

1. **目標**：建立 `getPublicAppSettingsAction` + `useAppSettings` hook，讓後台修改 `system_settings` 後前台自動同步；合併 `fishing_age_max` → `matchmaker_age_max`；替換全站前台硬編碼為動態讀取。
2. **DB**（Supabase MCP `execute_sql`）：`UPDATE matchmaker_age_max` from `fishing_age_max` value → `DELETE fishing_age_max`；`INSERT` 6 新 keys：`broadcast_message_max_length`(50)、`chat_message_max_length`(500)、`inventory_max_slots`(48)、`bag_expansion_slots_per_use`(4)、`nickname_max_length`(32)、`bio_field_max_length`(200)；`NOTIFY pgrst`。
3. **L3 新增**：**`src/services/public-settings.action.ts`** — `PublicAppSettings` interface（17 keys）、`DEFAULT_SETTINGS` const、`getPublicAppSettingsAction`（`unstable_cache` 60s，tag `system_settings`），逐 key 查 `findSystemSettingByKey` 後 fallback。
4. **L4 新增**：**`src/hooks/useAppSettings.ts`** — SWR fetcher + `fallbackData: DEFAULT_SETTINGS` + `dedupingInterval: 60_000`。**`src/lib/swr/keys.ts`** 補 `publicAppSettings`。
5. **合併 `fishing_age_max` → `matchmaker_age_max`**：**`admin.action.ts`** `FishingAdminSettingsPayload` 欄位名、`getFishingAdminSettingsAction` 讀取 key、`updateFishingSettingsAction` 寫入 key；**`fishing/page.tsx`** fallback；**`fishing-admin-client.tsx`** state 與 action 呼叫。
6. **前台硬編碼替換**：**`matchmaker-settings-tab.tsx`** — 移除 `ageMax` state＋`getMatchmakerAgeMaxAction` fetch，改用 `appSettings.matchmaker_age_max`；身高 fallback 改用 `appSettings`；三觀標題加 `最大差距 ${matchmaker_v_max_diff}`。**`FloatingToolbar.tsx`** — `TOTAL_INVENTORY_SLOTS` → `appSettings.inventory_max_slots`；暱稱 32 → `appSettings.nickname_max_length`；`BROADCAST_MESSAGE_MAX_LENGTH` → `appSettings.broadcast_message_max_length`；背包擴充文案動態化。**`ChatModal.tsx`** — `maxLength={500}` → `appSettings.chat_message_max_length`。**`guild-profile-home.tsx`** — 自介 200 → `appSettings.bio_field_max_length`；暱稱 32 → `appSettings.nickname_max_length`；廣播同步動態化。**`MarketSheet.tsx`** — 上架 Dialog 說明加入 `market_max_listings_per_user` 與 `market_listing_days`。
7. **後台**：**`settings-client.tsx`** 新增「📱 前台顯示設定」section — 6 欄位（廣播字數 1-200、私訊字數 1-1000、背包格數 16-200、擴充格數 1-20、自介字數 50-500、暱稱字數 2-50），含範圍驗證與 `revalidateTag('system_settings')`。
8. **驗證**：`src/` 無殘留 `fishing_age_max`；**`npx tsc --noEmit`** 通過；**`npm run build`** 通過。

### 2026-04-02 — 身高配對完整實作（pref_height、硬鎖、門檻、月老 UI、商城說明）

1. **目標**：**`users.pref_height`**（月老身高偏好 slug）、**`system_settings`** 女生／男生門檻（**`matchmaker_height_tall_threshold`／`matchmaker_height_short_threshold`**，預設 175／163）、**`matchmaker-locks`** 身高硬鎖、**`fishing.action`** 候選池篩選、月老設定 Tab 📏 表單、後台釣魚頁門檻輸入、愛心餌說明補充。
2. **資料庫** 🗄️：**`supabase/migrations/20260405300000_users_pref_height.sql`** — **`ALTER users`** **`pref_height`**、**`INSERT`** 兩門檻鍵、**`NOTIFY pgrst`**。雲端 **`apply_migration`** **`users_pref_height`**。
3. **型別**：**`database.types.ts`** — **`users`** Row／Insert／Update **`pref_height`**。
4. **utils**：**`matchmaker-locks.ts`** — **`MatchmakerProfile`** 補 **`height_cm`／`pref_height`**；**`MatchmakerLockSettings`** 補 **`lock_height`、門檻數值**；**`checkHeightLock`／`checkOneSideHeight`**；**`checkAllMatchmakerLocks`** 於性別×性向後檢查身高。
5. **Layer 2／3**：**`user.repository.ts`** **`MatchmakerPoolCandidateRow`** 與 **`select`** 補 **`height_cm`／`pref_height`**；**`fishing.action.ts`** **`Promise.all`** 讀 **`matchmaker_lock_height`** 與兩門檻鍵、建構 **`lockSettings`**、**`fisherMP`／`candMP`** 帶身高欄位；**`profile-update.action.ts`** **`pref_height`** 允許值驗證（**`invalid_pref_height`**）；**`system-settings.action.ts`** **`getMatchmakerHeightThresholdsAction`**（玩家端讀門檻，無需管理員權限）；**`admin.action.ts`** **`FishingAdminSettingsPayload`** 與 **get／update** 兩門檻。
6. **Layer 5**：**`matchmaker-settings-tab.tsx`** — **`useSWR`**＋門檻 action、**`female`／`male`** 分支顯示 **`tall_threshold`／`short_threshold`** 選項；**`fishing-admin-client.tsx`** 身高開關下方門檻輸入＋**`handleSaveThreshold`**（100–250）、**`router.refresh()`**；**`fishing/page.tsx`** fallback 補門檻預設；**`shop-admin-client.tsx`** 愛心餌說明一句。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **Git**：**`feat(height-lock): pref_height field, height hard lock, admin threshold, settings UI`**。

### 2026-04-02 — 身高、註冊 Step2、基本資料申請／審核、月老 Banner、後台身高開關

1. **目標**：**`users.height_cm`**（100–250）、註冊必填、申請修改與審核通過後導向 **`/register/profile?edit=true`**、**`ProfileBanner`** 依 **`banner_check_matchmaker_fields`** 檢查月老欄位缺漏（優先於既有 profile 橫幅）、**`system_settings`** **`matchmaker_lock_height`**＋**/admin/fishing** 開關（配對引擎接線另議）。
2. **資料庫** 🗄️：**`supabase/migrations/20260405200000_users_height_banner.sql`** — **`ALTER users`** **`height_cm`**、**`profile_change_requests`** **`new_height_cm`**、**`INSERT`** **`banner_check_matchmaker_fields`**、**`matchmaker_lock_height`**；雲端 **`apply_migration`** **`users_height_banner`**。
3. **型別**：**`database.types.ts`** — **`users`**、**`profile_change_requests`**、**`ProfileChangeRequestInsert`**。
4. **Layer 3**：**`adventurer-profile.action.ts`** **`height_cm`** 驗證與 **`createProfile`**；**`profile-update.action.ts`** **`height_cm`** 與基本資料欄位（**`region`／`gender`／`birth_year`／`orientation`／`offlineIntent`**）供編輯模式；**`profile-change.action.ts`** **`newHeightCm`**、**`validateSubmittedFields`**、審核通過通知 **`type: profile_change_approved`**；**`getProfileBannerSettingsAction`** 回傳 **`checkMatchmakerFields`**。
5. **Layer 2**：**`profile-change.repository.ts`** **`createRequest`／`approveRequest`** 含 **`new_height_cm`→`height_cm`**；**`USER_EMBED`** 含 **`height_cm`**。
6. **Layer 5**：**`profile-form.tsx`** Step2 身高、**`isEditMode`** 單頁 **`updateMyProfile`**；**`register/profile/page.tsx`** **`searchParams.edit`**；**`guild-profile-home.tsx`** 申請 Modal 身高；**`guild/page.tsx`** **`MailBox`**「前往編輯」；**`ProfileBanner.tsx`** 月老橫幅（琥珀色）／**`matchmaking/page.tsx`** **`?tab=settings`**；**`fishing-admin-client.tsx`**／**`admin.action.ts`** **`matchmaker_lock_height`**；**`fishing/page.tsx`** fallback；**`profile-changes-client.tsx`** 身高差異列。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **Git**：**`feat(height+banner): height field, registration, profile change, matchmaker banner`**。

---

### 2026-04-02 — 月老魚 V500 硬鎖配對邏輯＋玩家配對條件表單

**目標**：月老魚配對邏輯階段二 — 支援進階欄位更新、V500 硬鎖邏輯、候選池過濾、玩家填寫 UI。

**Part 1 — `profile-update.action.ts` 擴充**
- `updateMyProfile` 新增 15 個可選字串欄位（`diet_type`、`smoking_habit`、`accept_smoking`、`my_pets`、`accept_pets`、`has_children`、`accept_single_parent`、`fertility_self`、`fertility_pref`、`marriage_view`、`zodiac`、`exclude_zodiac`）+ 3 個數值欄位（`v1_money`／`v3_clingy`／`v4_conflict`，1-5 整數驗證）。
- 「nothing to update」guard 與 patch 均已擴充。

**Part 2 — 新增 `src/lib/utils/matchmaker-locks.ts`**
- 完整移植 V500 硬鎖判斷：`MatchmakerProfile`、`MatchmakerLockSettings` 介面。
- `checkAllMatchmakerLocks(fisher, candidate, settings)` — 主函式串連 10 項硬鎖。
- 各硬鎖函式：`checkGenderOrientation`（永遠生效）、`checkDietLock`、`checkSmokingLock`、`checkPetLock`、`checkSingleParentLock`、`checkFertilityLock`、`checkMarriageLock`、`checkZodiacLock`、三觀 V 分差（`Math.abs(a-b) > v_max_diff`）。
- 每項硬鎖以 `settings.lock_*` 控制，disabled 時直接 pass。

**Part 3 — `fishing.action.ts` 月老魚配對池整合**
- `user.repository.ts`：`MatchmakerPoolCandidateRow` 補 `gender`、`orientation` + 15 個配對欄位；`.select()` 同步擴充。
- `runFishingHarvestCore`：`Promise.all` 批次讀取 `findMatchmakerPoolCandidates` + 11 個 `system_settings` 鍵（`matchmaker_lock_*`、`matchmaker_v_max_diff`），建構 `MatchmakerLockSettings`。
- 候選池 for-loop 既有地區／年齡判斷後加 `checkAllMatchmakerLocks(fisherMP, candMP, lockSettings)` 過濾。

**Part 4 — `matchmaker-settings-tab.tsx` 玩家配對條件表單**
- 取代原「更多篩選條件即將推出」文字，新增折疊區塊「💘 配對條件設定（選填）」（預設收合）。
- 飲食（下拉）、抽菸（膠囊）、寵物（多選膠囊）、單親（單選膠囊）、生育（下拉）、婚姻（膠囊）、星座（下拉 + 排除多選膠囊）、三觀（1-5 膠囊按鈕）。
- 各欄位 onChange 即時 `updateMyProfile` → `toast.success` / `toast.error` + `mutateProfile()`。

**驗證**：`npx tsc --noEmit` 通過、`npm run build` 通過。

---

### 2026-04-02 — 月老魚配對邏輯地基（users 欄位、system_settings、後台開關）

1. **目標**：為月老魚配對預備 **DB 使用者欄位**、**全服硬鎖開關**（`system_settings`）、型別與 **`/admin/fishing` 系統設定 Tab** 之 **💘 月老配對條件開關**（基礎說明／進階硬鎖七項／三觀三項＋**最大允許差距** `matchmaker_v_max_diff`）。
2. **資料庫** 🗄️：**`supabase/migrations/20260405100000_users_matchmaker_profile.sql`** — **`users`**：`diet_type`、`smoking_habit`、`accept_smoking`、`my_pets`、`accept_pets`、`has_children`、`accept_single_parent`、`fertility_self`、`fertility_pref`、`marriage_view`、`zodiac`、`exclude_zodiac`、`v1_money`／`v3_clingy`／`v4_conflict`（1–5 CHECK）；**`system_settings`**：`matchmaker_lock_diet` … `matchmaker_lock_v4`、`matchmaker_v_max_diff`（預設 `2`）；**`NOTIFY pgrst`**。雲端已 **`apply_migration`**（**`users_matchmaker_profile`**）。
3. **型別**：**`database.types.ts`** — **`users` Row／Insert／Update** 補齊上述欄位。
4. **Layer 3**：**`admin.action.ts`** — **`FishingAdminSettingsPayload`**；**`getFishingAdminSettingsAction`** 讀取 11 個 matchmaker 鍵；**`updateFishingSettingsAction`** 可寫入布林與 **`matchmaker_v_max_diff`**（**`revalidatePath('/admin/fishing')`**）。
5. **Layer 5**：**`fishing-admin-client.tsx`**（年齡差距區塊後）— 三組 UI、**Switch** **`data-checked:bg-violet-600 data-unchecked:bg-gray-200`**；任一三觀開啟時顯示 **1–4** 文字輸入（**blur** 儲存）；**`page.tsx`** 失敗後備預設含 matchmaker 欄位。
6. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
7. **文件**：**`HANDOFF.md`** 最近完成、DB SSOT 補充。
8. **Git**：**`feat(matchmaker): DB fields, admin lock switches for matchmaker conditions`**。

### 2026-04-02 — 釣魚與商城九項（封存、餌堆疊、兩段收成、tier 冷卻、中魚通知）

1. **目標**：商城 **封存**（**`is_archived`**）；釣魚管理 **Switch** 可讀；**魚餌** **`user_rewards.quantity`** 堆疊；章魚／愛心餌 **metadata** 防呆與種子修正；收成 **預覽 → 確認** 才寫 **`fishing_logs`**；釣竿 **圖示快選** 與 **tier** 冷卻（**`system_settings`** 三鍵 **`fishing_rod_cooldown_{basic,mid,high}_minutes`**，**`rod_tier`** 未覆寫 **`rod_cooldown_minutes`** 時套用）；**`pending_harvest_ready_at`** 隨機可收竿、**`bite_notified_at`** 中魚信＋ **Web Push**（不影響拋竿冷卻）。
2. **資料庫** 🗄️：**`20260415120000_shop_items_is_archived.sql`**、**`20260415120100_user_rewards_quantity.sql`**、**`20260415120200_fishing_bait_metadata_heart_shrimp.sql`**、**`20260415120300_fishing_cast_ready_preview.sql`**、**`20260415120400_fishing_rod_tier_cooldown_settings.sql`**。
3. **Layer 2／3**：**`shop.repository`** **`findActiveShopItems`**；**`rewards.repository`** **`upsertFishingBaitStack`**、**`findMyRewards`** 含 **`quantity`**；**`fishing-cast.repository`** **`getRodCastSnapshot`**（**`pending_harvest_ready_at`**）、**`markBiteNotified`**；**`fishing.action`** **`prepareHarvestFishAction`／`confirmHarvestFishAction`／`applyHarvestPreviewPayload`**、**`getRodTierCooldownDefaults`**、**`maybeNotifyFishingHarvestReady`**；**`parseRodFishingRules`** 第二參數 **tier** 預設；**`admin.action`** 釣魚設定擴充三冷卻分鐘。
4. **Layer 5**：**`fishing-panel`**（**`prepare`／`confirm`**、釣竿圖示列）；**`fishing-admin-client`** 系統設定三欄＋封存／Switch 等（與先前 PR 合併）。
5. **驗證**：**`npm run build`** 通過。
6. **Git**：見主線提交訊息（本波釣魚／商城）。

- **2026-03-23 — 2026-03-27**：以下「逐日 `###` 任務日誌」為主。
- **2026-03-28 起**：開頭區塊為舊主檔前半（約第 29—212 行）之 Wave／修復長文；其餘詳見 `HANDOFF.md`／`HANDOFF_FEATURES.md`／`HANDOFF_DB.md` 摘要。

### 2026-04-02 — 商城／public 商品圖「去背」規範（文件與 Cursor 規則）

1. **內容**：**`.cursorrules`** 新增「商城與靜態商品圖」— 預設 **`public/items/`**、**`public/shop/`**、**`public/frames/`** 點陣圖須去背，除非使用者明確指示保留底色；**`npm run process-shop-png-bg`**、**`scripts/remove-shop-png-white-bg.mjs`**；排除 **`public/icons/`** 等非商城路徑。**`HANDOFF.md`** 摘要區「商城靜態圖」。**`.cursor/rules/shop-image-transparency.mdc`**（**`alwaysApply: true`**）。
2. **資料庫**：無。
3. **需要注意**：無。

### 2026-04-02 — 釣魚後台獎品設定 UI 重構（tier 優先、簡化 Dialog）

1. **目標**：**`/admin/fishing`** 獎品 Tab 改為 **魚種 → 各 tier 獎品池** 流程；tier 卡片含 **出現機率請至系統設定** 與 **前往設定 ›**（`setTab('settings')`）；列表 **單一獎品不顯示權重／佔比**，**兩筆以上** 顯示 **權重 N ≈ X%**；**新增／編輯 Dialog** 依進入的 tier 固定（**唯讀 tier**、移除下拉）、**權重** 僅在該 tier 已有其他獎品（新增）或至少兩筆（編輯）時顯示，否則送 **預設 1.00%** 或沿用既有 **weight**；**深海巨獸** 單一「限量大獎」區塊、新增標題 **新增限量大獎 — 深海巨獸**、庫存區 **⚠️ 建議** 文案；**月老魚** 維持說明頁。僅 **Layer 5**（**`fishing-admin-client.tsx`**），不改 **Layer 2／3**。
2. **Layer 5**：**`src/app/(admin)/admin/fishing/fishing-admin-client.tsx`** — **`RewardTierCard`**／**`FishingRewardRow`**；**`showWeightInDialog`**／**`tierCountForWeightHint`**；**`submitReward`** 依是否顯示權重決定 **bp**；**`DialogDescription`** 編輯副標；**`rewardTypeBadgeLabel`** **`shop_item` →「商城道具」**。
3. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
4. **文件**：**`HANDOFF.md`** 最近完成。
5. **Git**：**`refactor(fishing-admin): rewards UI redesign, tier-first flow, simplified dialog`**。

### 2026-04-02 — 釣魚拋竿冷卻、三種魚餌 metadata、前台

1. **目標**：冷卻改為**拋竿當下**起算（**`last_cast_at`**＋**`rod_cooldown_minutes`**）；**`casts_used`** 於拋竿 +1；收成僅清 **pending**；魚餌驗證改**普通／章魚／愛心**三型；商城種子三餌；前台冷卻倒數、**toast** 錯誤碼、餌標籤。
2. **資料庫** 🗄️：**`supabase/migrations/20260402180000_fishing_bait_seed_and_cast_comment.sql`** — **`shop_items.sku` unique index**、**`last_cast_at` COMMENT**、三筆 **`fishing_bait`** **`ON CONFLICT (sku) DO NOTHING`**。
3. **Layer 2**：**`fishing-cast.repository.ts`** — **`setPendingCast`** 寫入 **`last_cast_at`／`casts_used`／pending**；**`recordHarvestSuccess`** 僅清 pending；**`peekCanStartCast`** **`cooldownAfterCastMinutes`**；**`getRodCastSnapshot`** 回傳 **`cooldownInfo`**；**`computeRodCooldownInfo`**。**`rewards.repository.ts`** **`listFishingRodsAndBaits`** 取 **`shop_items.metadata`**（餌）。
4. **Layer 3**：**`fishing.action.ts`** — **`CastFishResult`** **`remainMinutes`／`nextCastAt`**；**`castFishAction`** **`cooldown_not_ready`／`daily_limit_reached`／`need_birth_year`／`pending_harvest`**；愛心餌 **`detectBaitType === 'heart'`** 檢 **`birth_year`＋`relationship_status === 'single'`**；**`FishingStatusDto`** **`rods[].cooldownInfo`**、**`baits[].metadata`**。
5. **工具**：**`fishing-shop-metadata.ts`** — **`BaitType`／`detectBaitType`／`validateBaitMetadata`**；**`parseRodFishingRules`** 預設 **1／1／480**；**`validateFishingBaitMetadata`** 委派新驗證。
6. **Layer 5**：**`shop-admin-client.tsx`** 魚餌／釣竿 metadata 說明；**`fishing-panel.tsx`** **`CooldownTimer`／`BaitFishTags`／sonner**。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **Git**：**`feat(fishing): cooldown from cast, 3 bait types, metadata validation, seed data`**。

### 2026-04-01 — 釣魚 tier／獎品機率（%）與缺額語意

1. **目標**：**Stage 2a** 小／中／大獎 **tier** 由後台 **`fishing_tier_settings`** 設定（basis points、`interval_miss` 缺額為 miss 或 **`normalize`**）；**同 tier 內獎品** 以 **`fishing_rewards.weight`** 存「百分點的百分之一」（舊整數權重 ×100 遷移），**相對分配**；**`/admin/fishing`** 獎品 Dialog 改 **機率（%）**＋**`DecimalPercentInput`** 自訂數字鍵盤；系統設定新增 **每魚種 tier %** 編輯器。
2. **資料庫** 🗄️：**`supabase/migrations/20260403140000_fishing_tier_settings_weight_bp.sql`** — **`fishing_tier_settings`**、**`fishing_rewards.weight` → bigint**、**`NOTIFY pgrst`**。
3. **Layer 2**：**`fishing-tier-settings.repository.ts`**；**`fishing.repository.ts`** **`weightedPickRewards`** 支援 **bigint**；**`fishing-tier-pick.ts`**、**`fishing-reward-percent.ts`**。
4. **Layer 3**：**`fishing.action.ts`** **`pickTierForFishType`**；**`admin.action.ts`** **`getFishingTierSettingsAction`／`upsertFishingTierSettingAction`**。
5. **Layer 5**：**`fishing-admin-client.tsx`**、**`decimal-percent-input.tsx`**；**`SWR_KEYS.fishingTierSettings`**。
6. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
7. **Git**：**`feat(fishing): tier settings from DB, reward weight as percent bp, decimal keypad`**。

### 2026-04-01 — 釣魚後台獎品設定 UX

1. **目標**：**`/admin/fishing`** 獎品設定 Tab — **Dialog／AlertDialog** 於本頁覆寫淺色系（**`bg-white text-gray-900`**、表單 **`border-gray-300`**、**`focus:ring-violet-500`**、確認／取消鈕樣式）；**月老魚**不顯示三 tier 獎品卡，改粉紅說明區（**`setTab('settings')`**）；**深海巨獸**僅一級「限量大獎」＋**`LeviathanStockAlert`**（**`large`** 限量剩餘 ≤5）；**`RewardTierCard`** 抽出；**`TIER_LABELS`** 中文 tier；新增／編輯權重即時 **%** 與同 tier 其他獎品列；**月老／深海**隱藏 tier 下拉、**`reward_tier`** 固定 **`large`**；**`createFishingRewardAction`** 使用 **`effectiveTier`**。
2. **Layer 5**：**`src/app/(admin)/admin/fishing/fishing-admin-client.tsx`**。
3. **建置**：**`FloatingToolbar.tsx`** 刪除未使用 **`stackMenuMaxQty`／`pickUnequippedRowIds`**（**`@typescript-eslint/no-unused-vars`**）。
4. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
5. **文件**：**`HANDOFF.md`** 最近完成。
6. **Git**：**`fix(fishing-admin): dialog white bg, matchmaker info panel, leviathan single tier, weight % preview`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 釣魚後台 `/admin/fishing`

1. **目標**：後台路由 **`/admin/fishing`**（**master**／**moderator**）：統計看板（**`getFishingStatsAction`**＋**`SWR_KEYS.fishingStats`**）、釣魚日誌（**`getFishingLogsAdminAction`**，篩選暱稱／魚種，分頁 20）、月老配對紀錄（**`getMatchmakerLogsAction`**）、獎品 CRUD（**`getFishingRewardsAction`**＋**`SWR_KEYS.fishingRewards`**，五魚種膠囊／三 tier，**`getShopItemsAdminAction`** 道具下拉）、系統設定（**`getFishingAdminSettingsAction`**＋**`updateFishingSettingsAction`**，釣魚開關／年齡上限，魚餌 metadata 說明與商城連結）。儀表板 **`getDashboardStats`** 增 **`todayFishingCount`**（台北日 **`taipeiCalendarDateKey`** + **`fishing_logs`**）與 **`leviathanStockAlert`**（**`leviathan`** **`large`** 限量剩餘 ≤5）；側欄 **Fish**、**`middleware.ts`** **`/admin/fishing`**。
2. **Layer 2**：**`admin.repository.ts`** **`DashboardStats`** 擴充；**`fishing.repository.ts`** **`ADMIN_LOG_PAGE`** **20**。
3. **Layer 3**：**`admin.action.ts`** — **`getFishingAdminSettingsAction`**；**`getFishingRewardsAction`／`createFishingRewardAction`／`updateFishingRewardAction`／`deleteFishingRewardAction`／`updateFishingSettingsAction`／`getShopItemsAdminAction`** **`requireRole(['master','moderator'])`**。
4. **Layer 5**：**`src/app/(admin)/admin/fishing/page.tsx`**、**`fishing-admin-client.tsx`**；**`admin/page.tsx`** 今日釣魚卡＋橘色警示卡；**`admin-shell.tsx`**。
5. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
6. **Git**：**`feat(fishing-admin): /admin/fishing stats, logs, matchmaker records, reward CRUD, system settings`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 釣魚獎品系統 Phase 1（`fishing_rewards`／維護開關）

1. **目標**：釣魚獎品表與 **`fish_type`** enum（含 **`leviathan`**）；**`fishing_logs.fish_type`** 與 DB 對齊；月老魚 **`collectFishAction`** 改由 **`fishing_rewards`** 加權抽獎（tier：small 60%／medium 30%／large 10%，降級 medium→small）；無設定列時預設 **10 免費幣 + 5 EXP**；**`coin_transactions.source`** **`fishing`**；**`system_settings`** **`fishing_enabled`／`fishing_age_max`**；**`getFishingStatusAction`** 回傳 **`FishingStatusResult`**（關閉時 **`fishing_disabled`**）；**`fishing-panel`** 維護文案；後台 **`admin.action.ts`** 統計／CRUD／日誌／設定；限量庫存以 **`consume_fishing_reward_stock`** RPC 原子扣減。
2. **資料庫** 🗄️：**`supabase/migrations/20260401700000_fishing_rewards.sql`** — **`CREATE TYPE fish_type`**；**`fishing_logs`** 欄位改型；**`fishing_reward_tier`／`fishing_reward_type`**；**`fishing_rewards`**；**`consume_fishing_reward_stock`**（**`REVOKE PUBLIC`／`GRANT service_role`**）；**`coin_transactions_source_check`** 補 **`fishing`**；**`system_settings`** INSERT；**`NOTIFY pgrst`**。雲端需 **`apply_migration`**。
3. **型別**：**`database.types.ts`** — **`FishType`／`FishingRewardTier`／`FishingRewardType`**、**`fishing_rewards`** 表、**`coin_transactions.source`**、**`Functions.consume_fishing_reward_stock`**。
4. **Layer 2**：**`fishing.repository.ts`** — **`findActiveRewards`／`pickReward`／`consumeRewardStock`／`findAllRewardsForAdmin`／`createReward`／`updateReward`／`deleteReward`／`getFishingStats`／`findFishingLogsForAdmin`／`findMatchmakerLogsForAdmin`**。
5. **Layer 3**：**`fishing.action.ts`** — **`resolveMatchmakerRewards`**、**`findSystemSettingByKey('fishing_enabled')`**；**`admin.action.ts`** — **`getFishingStatsAction`／`getFishingRewardsAction`／`createFishingRewardAction`／`updateFishingRewardAction`／`deleteFishingRewardAction`／`updateFishingSettingsAction`／`getFishingLogsAdminAction`／`getMatchmakerLogsAction`**（權限：**master** 或 **master+moderator** 依函式）。
6. **Layer 4／5**：**`fishing-panel.tsx`**；**`shop/page.tsx`** **`SOURCE_LABEL.fishing`**；**`coins-admin-client.tsx`** **`fishing`→consume**；**`coin.repository.ts`** **`sourcesForLedgerCategory`**。
7. **未接線（下一階段）**：五魚種拋竿機率、非 matchmaker 分支、**`/admin/fishing`** UI。
8. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。

### 2026-04-01 — `/matchmaking` 全頁重構（魚池／魚獲／設定）

1. **目標**：底部導航 **魚池**；**`/matchmaking`** 三大 Tab **魚池／魚獲／設定**；**魚獲** 子 Tab **月老魚／釣獲物**；釣魚日誌改 **SWR + `getFishingLogsAction`**；**`fishing_logs`** 持久化；**FishingPanel** 湖景／Lottie 佔位／拋竿→等待→收竿→開魚覆蓋層；**`globals.css`** **`rod-sway`／`animate-fish-fly-in`**；設定 Tab 獨立卡片與 **`MatchmakerSettingsPanel`** 別名；此頁移除緣分列表 Tab。
2. **資料庫** 🗄️：**`supabase/migrations/20260401600000_fishing_logs.sql`** — **`fishing_logs`**（**`fish_type` CHECK**、**`fish_user_id`**、快照欄位、**INDEX**）；**RLS** **SELECT／INSERT** **本人**；**`NOTIFY pgrst`**。
3. **型別**：**`database.types.ts`** — **`fishing_logs`** 表。
4. **Layer 2**：**`fishing.repository.ts`** — **`insertFishingLog`／`findFishingLogsForUser`／`findFirstFishingRodDisplayName`／`findFirstFishingBaitDisplayName`**；**`like.repository.ts`** — **`findMutualLikeFlags`**（批次互有緣分）。
5. **Layer 3**：**`fishing.action.ts`** — **`FishingStatusDto`** 增 **`todayRemainingCasts`／`equippedRodName`／`defaultBaitName`**；**`getFishingLogsAction`**；**`collectFishAction`** 成功路徑 **`tryInsertMatchmakerLog`**（**`findProfileById`** 快照）。
6. **Layer 4**：**`SWR_KEYS.fishingLogs`**。
7. **Layer 5**：**`Navbar.tsx`** **魚池**；**`matchmaking/page.tsx`**；**`catch-panel.tsx`**；**`fishing-panel.tsx`**；**`matchmaker-settings-tab.tsx`**。
8. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
9. **Git**：**`feat(matchmaking): full page redesign, catch panel, lottie placeholder, navbar fishing label`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 月老年齡三欄位與月老頁重構

1. **目標**：**`users`** 年齡偏好改三欄（**`matchmaker_age_mode`／older／younger**）；**`system_settings.matchmaker_age_max`**；**`isAgeMatch`** 雙向篩選；**`collectFishAction`** 月老魚（無候選 **`noMatchFound`**、不降級稀有魚）；**`/matchmaking`** 三 Tab（魚池／緣分列表／配對設定）；帳號設定月老區改導向月老頁；**`FloatingToolbar`** 釣竿／釣餌導向 **`/matchmaking`**；**`Navbar`** 月老圖示 **Fish**。
2. **資料庫** 🗄️：**`supabase/migrations/20260401500000_matchmaker_age_mode.sql`** — **`ALTER TABLE users`** 三欄 **CHECK**；**`UPDATE`** 自 **`matchmaker_age_range`** 遷移；**`INSERT system_settings`** **`matchmaker_age_max`**；**`NOTIFY pgrst`**。雲端 **Supabase MCP `apply_migration`**。
3. **型別**：**`database.types.ts`** — **`users`** 補三欄。
4. **工具**：**`matchmaker-region.ts`** — **`AGE_MODE_LABELS`／`isAgeMatch`／`checkFisherCondition`**。
5. **Layer 3**：**`profile-update.action.ts`** — **`matchmaker_age_mode`／older／younger`**，數值 **1…`getMatchmakerAgeMaxAction()`**；**`system-settings.action.ts`** **`getMatchmakerAgeMaxAction`**。**`fishing.action.ts`** — **`getFishingStatusAction`**、**`collectFishAction`**（**`findSystemSettingByKey('matchmaker_age_max')`** **`min`** 與玩家設定、**`isAgeMatch`**、**`isRegionMatch`**、封鎖 **`findUserIdsInBlockRelation`**、消耗釣餌 **`deleteUserRewardForOwner`**、獎勵 **`creditCoins`(`loot_box`)**＋**`insertExpLog`** **`matchmaker_fish`**）。**`social.action.ts`** **`getMyLikesListsAction`**。
6. **Layer 2**：**`user.repository.ts`** **`findMatchmakerPoolCandidates`**；**`like.repository.ts`** **`findLikesSentWithPeers`／`findLikesReceivedWithPeers`**；**`chat.repository.ts`** **`findUserIdsInBlockRelation`**；**`rewards.repository.ts`** **`findFirstUserRewardIdOfType`／`countUserRewardsByType`**。
7. **Layer 5**：**`matchmaking/page.tsx`** **`Tabs`**；**`fishing-panel.tsx`**（**`useSWR` `SWR_KEYS.fishingStatus`** **10s**、**`<details>`** 釣魚日誌）；**`likes-list-panel.tsx`**；**`matchmaker-settings-tab.tsx`**（膠囊年齡模式／確認、地區 **Dialog**）。**`guild-profile-home.tsx`** 改為按鈕連結 **`/matchmaking`**，移除月老 **Dialog／AlertDialog**。
8. **SWR**：**`keys.ts`** **`fishingStatus`**。
9. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
10. **Git**：**`feat(matchmaking): age mode 3-field, matchmaking page 3-tab, remove fishing toolbar btn`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 基本資料變更申請 UI／Banner／後台審核

1. **目標**：基本資料變更申請 **Layer 5** — 首頁帳號設定 **月老配對池**（**`matchmaker_opt_in`**）、待審核／申請 Modal／撤回；**`ProfileBanner`** 全站提示（**`getProfileBannerSettingsAction`**、**`localStorage` `profile_banner_dismissed_v1`** 對齊標題）；**`/admin/profile-changes`** 待審核與所有申請（篩選／分頁）；後台側欄角標與儀表板 **`pendingProfileChangeCount`**；**`/admin/settings`** Banner 管理區塊。
2. **Layer 4／5**：**`src/lib/swr/keys.ts`** — **`myProfileChangeRequest`／`profileBannerSettings`**。**`guild-profile-home.tsx`** — **`useSWR` `getMyPendingChangeRequestAction`**；申請／撤回；**`/?accountSettings=profileChange`** **`useSearchParams`** 開啟帳號設定並 **`scrollIntoView`** **`#profile-change-request-section`**；**`home-page-client.tsx`** **`Suspense`** 包住 **`GuildProfileHome`**。**`ProfileBanner.tsx`** — 條件顯示、底欄 **`z-[48]`** 於 Navbar 之上、**「前往填寫」** 導向首頁 query。**`(app)/layout.tsx`** 掛載 **`ProfileBanner`**。
3. **後台**：**`src/app/(admin)/admin/profile-changes/page.tsx`**＋**`profile-changes-client.tsx`** — 通過／拒絕（原因）；**`admin-shell.tsx`** **`getPendingProfileChangeCountAction`** 角標；**`middleware.ts`** **`/admin/profile-changes`**。**`admin.repository.ts`** **`getDashboardStats`** 補 **`profile_change_requests` pending count**。**`admin/page.tsx`** 統計卡。**`settings-client.tsx`** — **`Switch`**＋**`updateProfileBannerSettingsAction`**。
4. **Layer 2**：**`profile-change.repository.ts`** — **`ADMIN_SELECT`** 增 **`reviewer:users!profile_change_requests_reviewed_by_fkey(nickname)`** → **`reviewer_nickname`**。
5. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
6. **文件**：**`HANDOFF.md`** 最近完成、關鍵檔案索引。
7. **Git**：**`feat(profile-change): UI banner, apply modal, admin review page, dashboard`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 基本資料變更申請系統地基

1. **目標**：**`public.users`** 新增 **`matchmaker_opt_in`**（預設 **true**）；**`profile_change_requests`** 表與 **`profile_change_status`** enum；**`system_settings`** 三鍵 **`profile_banner_enabled`／`profile_banner_title`／`profile_banner_force`**；Layer 2／3 申請與後台審核；**`updateMyProfile`** 可切換配對池開關（無審核）。
2. **資料庫** 🗄️：**`supabase/migrations/20260401400000_profile_change_requests.sql`** — **`ALTER TABLE users ADD matchmaker_opt_in`**；**`CREATE TYPE profile_change_status`**；**`profile_change_requests`**（**`new_region`／`new_orientation`／`new_birth_year`／`note`／審核欄**）、**partial unique index**（**每用戶一筆 pending**）、**RLS**（**authenticated** **SELECT** 本人）、**`set_updated_at` trigger**（**`EXECUTE FUNCTION`**）；**`system_settings` INSERT** **`ON CONFLICT DO NOTHING`**；**`NOTIFY pgrst`**。雲端以 **Supabase MCP `execute_sql`** 同步。
3. **型別**：**`src/types/database.types.ts`** — **`users`** 補 **`matchmaker_opt_in`**；**`profile_change_requests`** 表；**`ProfileChangeStatus`／`ProfileChangeRequestRow`／`ProfileChangeRequestInsert`**。
4. **Layer 2** **`profile-change.repository.ts`**：**`findPendingRequestByUser`／`createRequest`／`cancelRequest`（DELETE pending）／`findPendingRequestsForAdmin`／`findAllRequestsForAdmin`（暱稱子查詢 **users.id**、分頁）／`approveRequest`（合併 **`users.update`** 與申請 **approved**）／`rejectRequest`／`countPendingRequests`／`findMasterUserIds`**；**`ProfileChangeRequestWithUser`** embed **`users`**。
5. **Layer 3** **`profile-change.action.ts`**：**`submitProfileChangeRequestAction`**（驗證縣市／**`海外・`**／性向／出生年、**`no_fields`／`already_pending`**、**`notifyUserMailboxSilent`** 給所有 **master**）；**審核** **`requireRole(['master','moderator'])`**、通過後 **`profileCacheTag` revalidate**；**`getProfileBannerSettingsAction`** — **`unstable_cache` 60**、**`tags: ['system_settings']`**；**`updateProfileBannerSettingsAction`** — **`requireRole(['master'])`**、**`updateSystemSetting`**、**`revalidateTag('system_settings')`**。
6. **Layer 3** **`profile-update.action.ts`**：**`updateMyProfile`** 支援 **`matchmaker_opt_in`**。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **文件**：**`HANDOFF.md`** 最近完成、表清單、Profile 索引。
9. **Git**：**`feat(profile-change): DB, Layer2/3 profile change request system`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 釣魚系統地基（月老偏好）

1. **目標**：**`public.users`** 新增月老釣魚用四欄（不公開顯示於個人卡片）；註冊名冊收集 **出生年**、**感情狀態**；帳號設定可編 **感情狀態**、**可接受年齡差距**、**地區偏好**（複選縣市或全台）；共用 **`matchmaker-region.ts`** 解析／摘要／配對輔助。
2. **資料庫** 🗄️：**`supabase/migrations/20260401200000_users_fishing_fields.sql`** — **`relationship_status`**（**`single`／`not_single`**）、**`birth_year`**（**1940–2006**）、**`matchmaker_age_range`**（**1–50**，預設 **10**）、**`matchmaker_region_pref`**（**text**，預設 **`'["all"]'`**）、**`COMMENT`**、**`NOTIFY pgrst`**。雲端以 **Supabase MCP `execute_sql`** 同步。
3. **型別**：**`src/types/database.types.ts`** — **`users` Row／Insert／Update** 補齊四欄。
4. **Layer 3**：**`adventurer-profile.action.ts`** — **`completeAdventurerProfile`** 必填 **`birth_year`**、**`relationship_status`**，伺服端範圍／枚舉驗證；**`createProfile`** 寫入兩欄。**`profile-update.action.ts`** — **`updateMyProfile`** 可選 **`relationship_status`**、**`matchmaker_age_range`**、**`matchmaker_region_pref`**（**`JSON.parse`** 須為 **字串陣列**）。
5. **Layer 5**：**`profile-form.tsx`** — Step2「線下意願」後 **出生年份** **`<select>`**（**2006→1940**）、**感情狀態**兩膠囊；**`goNext`／`onSubmit`** 驗證與 **`completeAdventurerProfile`** 傳參。**`guild-profile-home.tsx`** — 帳號設定捲動區 **IG** 區塊後 **「🎣 月老釣魚偏好」**；感情狀態 **AlertDialog** 確認後 **`updateMyProfile`**；年齡 **確認** 膠囊；地區 **Dialog**（**全台不限**、分組縣市膠囊、**確認儲存**）。
6. **工具**：**`src/lib/utils/matchmaker-region.ts`** — **`TAIWAN_REGIONS`**、**`ALL_TAIWAN_CITIES`**、**`parseRegionPref`**、**`isRegionMatch`**、**`formatRegionPrefSummary`**。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **文件**：**`HANDOFF.md`** 最近完成、**DB SSOT** 補月老欄位、索引 **`matchmaker-region.ts`**。
9. **Git**：**`feat(fishing): DB fields, registration birth_year/relationship, matchmaker region multi-select UI`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 自由市場橘點已讀與後台按鈕對比

1. **背景**：自由市場 **Store** 圖示橘點原僅依「24h 內成交」判斷，使用者開過市集後仍長期顯示；後台 **`/admin/market`** 等頁在 **`dark` 根**下 **`Button variant="outline"`** 呈深底灰字，分頁「上一頁／下一頁」難辨識。
2. **`FloatingToolbar.tsx`**：**`hasMarketNotification`** 追加條件 **`sold_at` 時間戳 > `lastMarketSheetClosedAt`**；**`MarketSheet` `onOpenChange`** 於 **`open===false`** 時 **`Date.now()`** 寫入 state 與 **`sessionStorage`** 鍵 **`ft_market_sheet_closed_at`**；**`useEffect`** mount 讀回 session；快捷列標籤膠囊改 **`text-white`／`font-medium`／`bg-zinc-800/95`／`border-zinc-600/70`**。
3. **`components/ui/button.tsx`**：新增 **`outlineLight`** variant（**白底、灰邊、深字**，**`dark:`** 同樣維持淺色以利後台）。
4. **後台**：**`market-admin-client.tsx`** 全部原 **`outline`** 改 **`outlineLight`**；**`shop-admin-client.tsx`**、**`prizes-client.tsx`** 對話框取消鈕同步。
5. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
6. **Git**：**`fix(ui): market sold dot acknowledge, admin outlineLight buttons`**；**`git push`** **`origin/main`**。

### 2026-04-01 — 玩家自由市場 RLS／封號下架／後台市場

1. **目標**：補齊 **`market_listings` RLS**（防禦縱深）、**封號**時自動 **cancel** 該用戶 **active** 上架、**`/admin/market`** 後台（監控／上架／成交／異常／設定）、**`market_enabled`** 總開關與前台 **create/buy** 攔截。
2. **資料庫** 🗄️：**`supabase/migrations/20260401100000_market_listings_rls.sql`** — **`ENABLE ROW LEVEL SECURITY`**；**Policy** **`anyone can view active listings`**（**`authenticated`**、**`status=active` AND `expires_at>now()`**）；**`seller can view own listings`**（**`seller_id=auth.uid()`**）；無 **INSERT／UPDATE／DELETE** policy（寫入走 **service_role**／RPC）；**`NOTIFY pgrst`**。**`20260401100500_market_enabled_setting.sql`** — **`system_settings`** **`market_enabled`** **`'true'`** **`ON CONFLICT DO NOTHING`**。雲端以 **Supabase MCP `execute_sql`** 套用 RLS 與 **`market_enabled`** 種子。
3. **Layer 2** **`market-listing.repository.ts`**：**`ACTIVE_LISTING_SELECT`** 增 **`buyer:users!market_listings_buyer_id_fkey`**；**`mapRawToDetail`** **`buyer`**；**`cancelAllActiveListingsByUser`**；**`getMarketStats`**（**上架中**、**台北曆日** **今日成交**、**已售出**加總 **free/premium**、**異常筆數**）；**`findAllListingsForAdmin`／`findSoldListingsForAdmin`**（暱稱／道具名 **ilike** 子查詢 **id**、分頁 **20**）；**`adminCancelListing`**（**`active`→`cancelled`**、**`.select` 驗證列數**）；**`findSuspiciousListings`**（**`price<=1 OR >99999`**、**`active|sold`**、**LIMIT 50**）。
4. **Layer 3** **`admin.action.ts`**：**`export requireRole`**；**`banUserAction`** 於 **`updateUserStatus(…,banned)`** 後 **`try/catch`** **`cancelAllActiveListingsByUser`**。**`market-listing.action.ts`**：**`findSystemSettingByKey('market_enabled')`** 於 **`createListingAction`／`buyListingAction`**（**`=== 'false'`** → **`market_disabled`**）；**`getMarketStatsAction`／`getAllListingsForAdminAction`／`getSoldListingsForAdminAction`／`adminCancelListingAction`／`getSuspiciousListingsAction`／`getMarketSettingsSnapshotAction`**（**master|moderator**）；**`updateMarketSettingsAction`**（**master**、**`repoUpdateSystemSetting`**、範圍驗證、**`revalidateTag('system_settings')`**）；**`adminCancelListingAction`** 成功 **`revalidateTag('market_sold')`**、**`revalidatePath('/')`**。
5. **Layer 5**：**`src/app/(admin)/admin/market/page.tsx`**（**`getAuthStatus`**、**master／moderator**）；**`market-admin-client.tsx`** — 五 **Tab**（統計卡、**拍賣場**開關 **AlertDialog**、異常條、上架表／強制下架、成交唯讀、異常表、系統設定 **master** 儲存／**snapshot** 現值）；**`admin-shell.tsx`** **Store「市場管理」**；**`middleware.ts`** **`moderatorAllowedPrefixes`** **`/admin/market`**；**`MarketSheet.tsx`／`FloatingToolbar.tsx`** **`market_disabled`** **toast**。
6. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
7. **Git**：**`feat(market): RLS policy, ban auto-delist, admin market page`**；**`git push`** **`origin/main`**。

### 2026-03-31 — 自由市場 UI 補齊

1. **目標**：補齊玩家自由市場 UI（工具列子鈕排版、**「自由市場」** 產品用語、**`MarketSheet`** 標題列與返回、Tab **拍賣市集**、最近成交行情跑馬燈、列表道具預覽與價格樣式、**`MarketSheet`** 內 **＋ 上架** Dialog）；L2／L3 提供 **`getRecentSoldListingsAction`**；購買成功後使行情快取失效。
2. **Layer 2** 🗄️ **`src/lib/repositories/server/market-listing.repository.ts`**：**`RecentSoldItem`** 型別；**`findRecentSoldListings`** — **`status=sold`**、**`sold_at` not null**、**`ORDER BY sold_at DESC LIMIT 20`**、JOIN **`shop_items(name, item_type)`** 映射 **`itemLabel`／`itemType`／`price`／`currencyType`／`soldAt`**。
3. **Layer 3** **`src/services/market-listing.action.ts`**：**`getRecentSoldListingsAction`**（未登入回 `[]`；**`unstable_cache`** **`['market-recent-sold']`**、**`revalidate: 60`**、**`tags: ['market_sold']`**）；**`buyListingAction`** 於 RPC 成功並完成賣家通知後 **`revalidateTag('market_sold')`**；**`export type RecentSoldItem`**。
4. **Layer 4** **`src/lib/swr/keys.ts`**：**`marketRecentSold`**。
5. **Layer 5 — `MarketSheet.tsx`**：頂列 **`flex items-center justify-between px-4 pt-4 pb-2`**（**`X` 關閉**、**🏪 自由市場**、**＋ 上架**）；**`Tabs`** 受控 **`hall`／`mine`**；**拍賣市集** 內行情列（**`h-8`、📊 行情、雙份內容 + `animate-market-ticker`**）；**`useSWR(SWR_KEYS.marketRecentSold, …, refreshInterval: 60000)`** 僅 **`open && mainTab==='hall'`**；購買成功 **`globalMutate(marketRecentSold)`**；列表 **40×40** **`next/image`／`rewardEffectClassName(effect_key)`／emoji**（型別對照規格）；**`by @暱稱`**；價格 **amber-400／violet-400**；**Dialog** 選道具（**`getMyRewardsAction`**、**`allow_player_trade===true`**、排除 **`myListings` active `user_reward_id`**）→ 定價 → **`createListingAction`**。
6. **`src/app/globals.css`**：**`@keyframes market-ticker`**、**`.animate-market-ticker`**。
7. **`FloatingToolbar.tsx`**：展開區 **`flex flex-col items-end gap-3`**；每列 **`w-[min(100vw-2rem,220px)] justify-end gap-2`**；子鈕文案 **自由市場**；上架成功 toast **已上架至自由市場**。
8. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
9. **Git**：**`23175e6`** — **`feat(market): ticker bar, item preview, list UI, upload dialog, toolbar fix`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 玩家自由市場 L2／L3／L5

1. **目標**：玩家市集應用層與 UI（Layer 2 Repository、Layer 3 Server Actions、Layer 5 **`FloatingToolbar`**／**`MarketSheet`**），UI 不直連 Supabase；RPC **`buy_market_item`／`cancel_market_listing`** 僅經 L2；**`coin_transactions.coin_type`** 語意維持 **`free`／`premium`**（由 RPC 寫入）；上架 **`currency_type`** 為 **`free_coins`／`premium_coins`**。
2. **Layer 2** 🗄️ **`src/lib/repositories/server/market-listing.repository.ts`**（**`createAdminClient`**）：**`MarketListingWithDetail`／`BuyMarketItemResult`**；**`createListing`**；**`findActiveListings`**（**`status=active`**、**`expires_at > now()`**、JOIN **`shop_items`** 取 **`name, image_url, item_type, effect_key`** 映射為展示 **`label`**、**`users`** 賣家 **`nickname, avatar_url`**；幣種／排序；**`findMyListings`／`findListingById`**；**`executeBuyMarketItem`／`executeCancelListing`**（**`rpc`** JSON 窄化）；**`expireMyStaleListings`**；**`findActiveListingByRewardId`**；**`countActiveListingsBySeller`**。
3. **Layer 3** **`src/services/market-listing.action.ts`**（**`use server`**）：**`getActiveListingsAction`**（未登入回空陣列）；**`getMyListingsAction`**（**`expireMyStaleListings`** 後 **`findMyListings`**）；**`createListingAction`** — **`findSystemSettingByKey`** 上限／天數、**`countActiveListingsBySeller`**、**`findUserRewardById`**、**`findShopItemById`** 驗 **`allow_player_trade`**、**`findActiveListingByRewardId`**、裝備中則 **`unequipReward`**（L2）、**`createListing`**；**`buyListingAction`** — 買家懶惰過期、RPC 成功後賣家 **`notifyUserMailboxSilent`** 與 **`sendPushToUser`**（推播 **try** 靜默）；**`cancelListingAction`** 成功 **`revalidatePath('/')`**。
4. **Layer 5**：**`src/components/market/MarketSheet.tsx`** — Tabs **市場大廳**（幣種／排序膠囊、列表、購買 **AlertDialog**、**`buyListingAction`**）、**我的上架**（狀態 badge、下架、**`cancelListingAction`**）；**`src/components/layout/FloatingToolbar.tsx`** — 子鈕 **Lucide `Store`「玩家市集」**（**`delayMs: 150`**）、**`useSWR(SWR_KEYS.myMarketListings, getMyListingsAction)`** 組 **`activeListingRewardIds`**、**24h 內售出且 `seller_received > 0` 橘點**；長按選單 **「上架至市集」**（條件 **`shop_item_id`、 `allow_player_trade !== false`、未使用、無 active listing**）→ 上架 **Dialog** → **`createListingAction`**；**`src/lib/swr/keys.ts`** **`myMarketListings`**。
5. **`rewards.repository.ts`**：**`UserRewardWithEffect`** 新增 **`allow_player_trade`**（與 **`shop_allow_player_trade`** 同源）。
6. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
7. **Git**：**`388a8a1`** — **`feat(market): Layer2/3/5 market listing, FloatingToolbar Store btn, MarketSheet UI`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 玩家自由市場 DB 地基

1. **目標**：雲端與 repo 建立玩家自由市場 schema、幣流水來源、設定鍵與交易 RPC。
2. **Supabase MCP**：查詢 **`coin_transactions`** CHECK；**`execute_sql`** 擴充 **`source`**（保留既有 **`shop_purchase`／`topup`／`admin_*` 等**，新增 **`market_trade_buy`／`market_trade_sell`**）；**`system_settings`** 三鍵 **`ON CONFLICT DO NOTHING`**；**`apply_migration`**（**`market_listings`**）套用與 repo 遷移檔一致之 DDL／RPC。
3. **遷移** 🗄️ **`supabase/migrations/20260401000000_market_listings.sql`**：**`market_listing_status`** enum、**`market_listings`** 表與索引（**`user_reward_id`** 單一 **active**）、**`set_updated_at`** trigger、**`buy_market_item`／`cancel_market_listing`**（**`SECURITY DEFINER`**、**`SET search_path = public`**）；買賣流水寫入 **`coin_transactions`** 時 **`coin_type`** 為 **`free`／`premium`**（與 **`users.free_coins`／`premium_coins`** 欄位語意區隔）、必填 **`balance_after`**、**`reference_id`**；**`GRANT EXECUTE`** 予 **`authenticated`／`service_role`**。
4. **與規格稿差異**：未採用僅含 **`purchase`** 之 **`source`** 白名單（會與現有 **`shop_purchase`** 等衝突）；上架幣別維持 **`free_coins`／`premium_coins`**，流水表維持 **`free`／`premium`**。
5. **TypeScript**：**`database.types.ts`** — **`MarketListingStatus`／`MarketListingRow`／`MarketListingInsert`**、**`market_listings`** 表、**`coin_transactions.source`**、**Functions**；**`market_listings`** 之 **`Row`／`Insert`** 採內聯定義（**`Row: MarketListingRow`** 會導致 Supabase Client 推斷 **`never`**，故避免）。
6. **其餘**：**`shop/page.tsx`** **`SOURCE_LABEL`**；**`coin.repository.ts`** **`sourcesForLedgerCategory`**（**`purchase`** 含 **`shop_resell`** 與市場來源）；**`coins-admin-client.tsx`** **`sourceToCategory`**。
7. **驗證**：**`npx tsc --noEmit`**、**`npm run build`** 通過。
8. **架構**：僅型別與標籤／篩選對齊；無 UI 跨層直連 DB。
9. **`HANDOFF.md`**：表清單、最近完成、下一步待辦（市場 RLS／UI）。

### 2026-03-31 — Usercard 間距、背包擴充道具化、自白換行

1. **背景**：資料卡英雄區頭像與暱稱等文字過近；**`bio_village`／`bio_market`** 在 **`UserDetailModal`** 以一般段落顯示，換行被折疊；商城 **`bag_expansion`** 僅 **`updateProfile(inventory_slots)`**，滿 **48** 格時仍扣款且無 **`user_rewards`** 列，**`newRewardIds`** 為空導致「購買並贈送」流程異常。
2. **`src/components/modals/UserDetailModal.tsx`**：頭像列 **`gap-5` → `gap-6`**；右欄 **`pl-0.5` → `pl-2`**；興趣／技能自白 **`whitespace-pre-wrap break-words`**。
3. **`src/services/shop.action.ts`**：**`dispatchItemToUser`** 之 **`bag_expansion`** 改 **`insertUserReward`**（**`reward_type: "bag_expansion"`**、**`shop_item_id`**、**`label`**）；移除 **`findProfileById`／`updateProfile`** 於此 case（**`updateProfile`** import 已刪）。
4. **`src/services/rewards.action.ts`**：新增 **`consumeBagExpansionAction(rewardId)`** — 驗證擁有者與類型、**`used_at`**、未裝備；**`inventory_slots >= 48`** 回錯（提示可贈送）；否則 **`inventory_slots + 4`**（上限 **48**）、**`markUserRewardConsumed`**；標記失敗時嘗試還原格數。
5. **`src/components/layout/FloatingToolbar.tsx`**：**`rewardAccent`／`stackActionHint`** 納入 **`bag_expansion`**；**`handleStackEquip`** 開 **AlertDialog**；確認後呼叫 **`consumeBagExpansionAction`** 並刷新背包／profile。
6. **資料庫**：無遷移；**`user_rewards.reward_type`** 沿用文字欄位。
7. **驗證**：**`npm run build`** 通過（必要時清除 **`.next`** 避免 Windows rename 競態）。
8. **`HANDOFF.md`**：**「最近完成」** 置頂本項並刪去最舊一則（維持 **5** 則）；索引 **商城**、**`rewards.action`**、**`UserDetailModal`** 補述。

### 2026-03-31 — UserDetailModal 頭像框裁切修正與前台商城種類篩選

1. **背景**：他人開啟 **`UserDetailModal`** 時，**商城頭像框**（**`MasterAvatarShell`** 框圖大於錨點）左側常被 **modal `overflow-hidden`** 與包住整段的 **`overflow-y-auto`** 捲動層裁切。前台 **`/shop`** 需依 **`item_type`** 快速篩商品（純前端）。
2. **`src/components/modals/UserDetailModal.tsx`**  
   - **`DialogContent`**：**`overflow-hidden` → `overflow-visible`**，使裝飾可畫至圓角外（外層為暗色 **overlay**）。  
   - **`ShopCardFrameOverlay`** 下新增 **`relative z-[2] flex min-h-0 flex-1 flex-col`**：**上段**（關閉鈕、預覽說明、頭像列、今日心情）**`flex-shrink-0 overflow-visible`**；**下段** **`data-modal-scroll-container`** **`min-h-0 flex-1 overflow-y-auto`** 僅捲動自白／標籤／IG／信譽。  
   - Header 橫向留白 **`px-5` → `px-7`**。  
   - 底部互動列仍 **`flex-shrink-0`**，與中層兄弟。
3. **`src/app/(app)/shop/page.tsx`**  
   - **`ITEM_TYPE_LABELS`**（與後台 **`ITEM_TYPE_LABELS`** 對齊）、**`SHOP_CATEGORY_KEYS`**（**`ITEM_TYPE_EMOJI`** 鍵序）。  
   - **`shopCategoryFilter`**（**`all`／`item_type`**）、**`displayItems`**（**`useMemo`**）。  
   - 幣別 Tab 下 **`<select>`**（深色圓角邊框）；**`switchTab`** 時 **`setShopCategoryFilter("all")`**。  
   - **`items.length > 0` 且 `displayItems.length === 0`**：**「此分類暫無商品」**。  
   - **`useMemo`** 由 **`react`** 匯入。
4. **資料庫／後端**：無。
5. **驗證**：**`npm run build`** 通過。
6. **`HANDOFF.md`**：**「最近完成」** 置頂本項；刪去最舊一則（維持 5 則）；索引 **商城**、**`UserDetailModal`** 補述。
7. **Git**：**`84fa018`** — **`fix(ui): UserDetailModal avatar frame overflow; shop category filter`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 首頁他人視角預覽與商城管理分頁／類型篩選

1. **背景**：使用者需在首頁確認 **裝備／資料卡** 與他人點開 **`UserDetailModal`** 時一致；商城後台 **`/admin/shop`** 上架與下架商品混在同一列表，難以瀏覽，且需依 **商品類型**（與表單一致）篩選。
2. **`src/components/modals/UserDetailModal.tsx`**  
   - 新增可選 **`publicPreview?: boolean`**（預設 **`false`**）。  
   - **`publicPreview === true`**：**不呼叫** **`getModalSocialStatusAction`**（**`useEffect`** 早退、**`socialLoading`** 視為結束）；**`isCurrentUserMaster`** 強制為 false，故不顯示 **信譽分**、**領袖工具**；血盟區僅在非預覽且 **`isMutualLike`** 時建置；底部 **聊聊／緣分** 整塊不渲染。  
   - 頂部加淡色說明：**「以下為其他冒險者看到的內容」**。  
   - 資料仍經 **`getMemberProfileByIdAction`**（與他人開卡相同 **`MemberProfileView`／`findEquippedRewardLabels`**）。
3. **`src/components/profile/guild-profile-home.tsx`**  
   - 大頭貼外層改 **`relative` 120×120**；內層 **`absolute inset-0`** 維持換頭像點擊區。  
   - 右下角 **`Eye`** 圓鈕（**`z-[25]`**、邊框／**`bg-zinc-800/90`**／琥珀色圖示，對齊 **`FloatingToolbar`** 子鈕風格）；**`stopPropagation`**；上傳／裁切中 **disabled**。  
   - **`UserDetailModal`**：**`user={profile}`**、**`publicPreview`**、**`open`／`onOpenChange`** 由本地 state 控制。
4. **`src/app/(admin)/admin/shop/shop-admin-client.tsx`**  
   - 狀態：**`listTab`** **`'listed' | 'delisted'`**（**`is_active`**）；**`typeFilter`** **`'all'`** 或 **`item_type`**。  
   - **`useMemo`**：**`tabItems`** → **`filteredItems`**；桌機 **`<table>`** 與手機卡片皆 **`filteredItems.map`**。  
   - 空狀態：**尚無商品**、**此分頁尚無上架中／下架商品**、**此類型下沒有商品**。  
   - **後端**：無變更；仍 **`getShopItemsAdminAction`** 全量、**`findAllShopItems`** **`sort_order` 升序**。
5. **驗證**：**`npm run build`**（Next **14.2.35**）通過；既有 **`no-img-element`** 警告與本次無關。
6. **`HANDOFF.md`**：**「最近完成」** 置頂本項並刪去最舊一則（維持 5 則）；索引 **首頁**、**`UserDetailModal`**、**`shop-admin-client`** 補述。
7. **Git**：**`30e0f8c`** — **`feat(home,admin): public profile preview; shop listed/delisted tabs and type filter`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 獎池權重輸入與私訊日期

1. **背景**：後台獎項「權重」欄 **`onChange`** 將空字串或 **`parseInt` 失敗** 立即寫回 **`1`**（新增表單另有 **`|| "1"`**），導致無法先清空再輸入兩位數以上，體感像數字被鎖在 **1** 開頭。私訊 **`ChatModal`** 氣泡僅 **`toLocaleTimeString`**，跨日對話看不出日期。
2. **`src/app/(admin)/admin/prizes/prizes-client.tsx`**  
   - **`DraftItem`** 新增 **`weightStr`**；**`loadItems`** 初始化 **`weightStr: String(it.weight)`**。  
   - 權重輸入 **`value={d.weightStr}`**，**`onChange`** 只更新數字過濾後字串（**允許空**）。  
   - **`resolvedPrizeItemWeight`**／**`parsePrizeWeightForSave`**：加總與列上機率用前者（空或非法暫以伺服器 **`it.weight`**）；儲存前後者為 **null** 則 **toast** 並中止。  
   - **`saveAllWeights`**：迴圈驗證後再 **`updatePrizeItemAction`** 傳解析後整數。  
   - **新增獎項**：權重 **`onChange`** 允許空；**`submitCreateItem`** 開頭驗證 **≥1**，否則 **toast** 並 **return**（不再靜默 **1**）。
3. **`src/components/chat/ChatModal.tsx`**  
   - 匯入 **`taipeiCalendarDateKey`**、**`taipeiCalendarDaysBetween`**（**`src/lib/utils/date.ts`**）。  
   - **`formatPrivateChatDayDivider`**：**今天**／**昨天**／其餘 **`Intl`**（**`Asia/Taipei`**；同年省略 **年**）。  
   - **`messages.map`**：與前一則曆日不同則在該則上方顯示置中分隔列；氣泡內仍僅時間。
4. **資料庫**：無（後端 **`validatePrizeItemRewardFields`** 仍要求權重 **≥1**）。
5. **架構**：僅 Layer 5 與既有 Action；無跨層違規。
6. **`HANDOFF.md`**：**「最近完成」** 置頂本項並刪去最舊一則（維持 5 則）。

### 2026-03-31 — 贈禮單則通知與共用信件文案

1. **背景**：同一批次贈送多件時，收件者應只收到 **一則** 站內信與 **一次** Web Push（**`notifyUserMailboxSilent`**）；背包贈一般玩家與血盟批次須與商城批次對齊。
2. **`src/services/gift.action.ts`**  
   - 新增並匯出 **`formatGiftBatchMailboxMessage(senderNickname, itemLabels[])`**（同標籤合併、多標籤 **「n 件道具」**）。  
   - **`confirmGiftsToUserBatchAction`** 改以此函式組 **`message`**（行為與先前字串邏輯一致）。
3. **`src/components/layout/FloatingToolbar.tsx`**  
   - **`giftPlayerRewardId` → `giftPlayerRewardIds`**；**`beginGiftToPlayerFromMenu`** 使用 **`pickUnequippedRowIds(stackMenuTarget, stackMenuQty)`**（與堆疊數量一致）。  
   - 確認送出改 **`confirmGiftsToUserBatchAction(ids, recipientId)`**；搜尋仍以第一筆 **`giftItemToUserAction`** 驗證。
4. **`src/services/rewards.action.ts`**：**`giftUserRewardsToAlliancePartnerBatchAction`** 驗證迴圈收集 **`giftLabels`**，轉移成功後 **`notifyUserMailboxSilent`**（**`from_user_id`**、**`formatGiftBatchMailboxMessage`**）。
5. **資料庫**：無。  
6. **`HANDOFF.md`**：索引 **贈禮／`FloatingToolbar`**／**`rewards.action`** 補述；**「最近完成」** 新增本項。  
7. **活躍度補述**（同次對話釐清，無程式變更）：探索列表 **`findVillageUsers`／`findMarketUsers`** 排除 **`activity_status = hidden`**；**`UserCard`** **`active`** 綠點、否則灰點、**`resting`** 顯示 **「休息中」**；**7／15 天** 轉 **`resting`／`hidden`** 以 **`HANDOFF_DB.md`**／雲端排程（**`last_checkin_at`**）為準；簽到 **`restoreActivityOnCheckin`** 設回 **`active`**。**`last_seen_at`** 與簽到語意不同，若採用需節流寫入。  
8. **Git**：**`9558f63`** — **`feat(gifts,tavern): batch gift single notify; inline @ mentions; handoff`**（程式＋**`HANDOFF.md`**／**`HANDOFF_HISTORY.md`** 首兩則條目）；已 **`git push`** **`origin/main`**（與下則酒館 @ 同提交）。

### 2026-03-31 — 酒館 @ 提及輸入觸發與篩選

1. **背景**：酒館 **`@`** 原依左側鈕 toggle 展開橫向 chip，點擊後 **`@暱稱 `** 接在字尾；改為類社群 **輸入 `@` 即出現名單、可接字篩選**。  
2. **`src/lib/utils/tavern-mentions.ts`**：**`getTavernInlineMentionState(text, caret)`**（**`atIndex`／`query`**；**`@`** 左側須行首或空白；**`@`～游標** 不可含空白或第二個 **`@`**）。  
3. **`src/components/tavern/TavernModal.tsx`**  
   - **`inputRef`、`caretPos`**（**`onChange`／`onSelect`／`onClick`／`onKeyUp`**）；移除 **`mentionOpen`** toggle。  
   - **`mentionPickerOpen`**：inline 狀態存在、未 **Esc** 暫時關閉（**`mentionEscapedFor`**）、且 **貼圖列未開**。  
   - **`mentionFiltered`**：**`query`** 不分大小寫 **`includes`**；直向列表、**Lv.**；**`↑`／`↓`／`Enter` 選取**（不送出）、**`Escape`** 關閉名單。  
   - 左側 **`@`**：**`insertAtCaret("@")`** 並聚焦。  
   - 選人：**`applyMentionPick`** 自 **`@` 至游標** 替換為 **`@暱稱 `**，遵守 **`maxLength`**。  
4. **資料庫／後端**：無；**`tavern.action`** 仍以訊息串暱稱解析 **`@`**。  
5. **`HANDOFF.md`**：索引 **酒館** 更新。  
6. **Git**：與「贈禮單則通知」同提交 **`9558f63`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 探索 UserCard 底列稱號縮小（`card` ≈ sm×1.1）

1. **背景**：底列稱號曾用 **`size="xl"`**，與興趣／技能標籤並排時**過大、擠壓左側標籤**；改為約**原列表 `sm` 的 1.1 倍**。  
2. **`src/components/ui/title-badge-row.tsx`**  
   - 新增 **`size="card"`**：胸章 **`h-[1.1rem] w-[1.1rem]`**（**16px×1.1**）、**`gap-1`**。  
   - 膠囊：**`text-[11px]`**、**`font-medium`**、**`leading-snug`／`tracking-tight`**、**`px-2 py-0.5`**；**`max-w-[min(7.5rem,calc(100vw-8rem))]`**＋**`truncate`**（完整字 **`title` tooltip**）。  
   - **`lg`／`xl`** 仍保留供其他版面。  
3. **`src/components/ui/UserCard.tsx`**：村莊／市集底列 **TitleBadgeRow** **`xl` → `card`**。  
4. **`HANDOFF.md`**：索引 **`title-badge-row`** 補 **`card`**；**「最近完成」** 新增本項。  
5. **Git**：**`b2d4a01`** — **`style(explore): UserCard title badge card size (~sm x1.1) to avoid crowding tags`**（程式）；**HANDOFF**／**HISTORY** 補登與 LUFFY 條目校正 — 見 **`origin/main`** 上 **`docs(handoff): UserCard card title row`** 起之連續提交（含 **`27e398d`**）；皆已 **`git push`** **`origin/main`**。

### 2026-03-31 — 探索 UserCard 稱號底列與 LUFFY 胸章

1. **背景**：稱號自卡片頂緣改為 **興趣／技能列右下**（與標籤 **垂直置中**）；提供 **LUFFY** 範例胸章（白底圖 **去背**、略放大）。  
2. **`src/components/ui/UserCard.tsx`**  
   - 移除頂緣 **absolute** **`TitleBadgeRow`**；**`pt-6` → `pt-5`**。  
   - **村莊**：**`flex items-center justify-between`**，左 **興趣標籤**、右 **稱號**（**`self-center`**）。  
   - **市集**：左欄 **能教／想學**、右側同 **稱號**（**`self-center`**）。  
3. **`src/components/ui/title-badge-row.tsx`**：底列初版曾用 **`size="xl"`**（胸章 **1.65rem**、字 **sm**）；後續改 **`card`**（見上則「底列稱號縮小」）。  
4. **資產**：**`public/items/source-luffy-72.png`**（原圖）；**`public/items/title-luffy.png`**（邊緣 **flood-fill** 去近白像素＋**LANCZOS 1.3×** 至約 **94×94**）；**`scripts/process-title-luffy-png.py`** 可重跑。  
5. **`public/items/README.md`**：**LUFFY** 後台填 **`/items/title-luffy.png`**。  
6. **HANDOFF**：**`HANDOFF.md`** 索引與 **「最近完成」** 更新。  
7. **Git**：**`ffe4103`** — **`feat(explore): UserCard title on interests row, LUFFY badge asset with transparency`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 探索 UserCard 稱號放大與排版（Apple-like）

1. **背景**：探索列表個人卡頂緣 **TitleBadgeRow** 視覺偏小；目標整體約 **1.3×**，並調整位置、字級、留白與層次（精簡 UI：髮線邊、柔影、可讀字重）。
2. **`src/components/ui/title-badge-row.tsx`**  
   - 新增 **`size="lg"`**：胸章圖 **1.3rem**（約 **1.3×** 原 **16px**）、**`gap-1.5`**。  
   - 膠囊：**`text-[13px]`**、**`font-medium`**、**`tracking-tight`**、**`leading-snug`**、**`px-3 py-1.5`**；**`max-w-[min(11rem,calc(100vw-4rem))]`** 搭配 **`truncate`**，**`lg`** 不再 **8 字硬切**（完整字串在 **`title` tooltip**）。  
   - **`sm`／`md`** 維持既有行為與 **8 字**省略。
3. **`src/components/ui/UserCard.tsx`**  
   - **TitleBadgeRow**：**`size="lg"`**；外層陰影略加深（**`drop-shadow`**）。  
   - 定位：**`-translate-y-1/2` → `-translate-y-[42%]`**（光學平衡較大標籤）。  
   - 卡片內容區：**`pt-5` → `pt-6`**，避免與放大後稱號擠壓。  
   - **`pillClassName`**：**`border-white/[0.14]`**、**`from-violet-500/[0.22] to-violet-950/[0.92]`** 微漸層、**`inset` 頂部高光**、**`ring-violet-400/20`**。
4. **資料庫**：無。  
5. **HANDOFF**：**`HANDOFF.md`** 索引 **`title-badge-row`** 補 **`lg`**；**「最近完成」** 新增本項。  
6. **Git**：**`f3906f9`** — **`style(explore): UserCard title badge lg (~1.3x), Apple-like pill layout`**；已 **`git push`** **`origin/main`**。

### 2026-03-31 — 探索列表稱號遺漏：村莊 SWR 重拉、`village-v7`、卡片頂緣標籤

1. **原因**：**`ExploreClient`** 村莊 **`useSWR`** 原 **`revalidateOnMount: false`**，易長期只吃 **`fallbackData`／舊 `unstable_cache`**；稱號與暱稱同列 flex 時 **`TitleBadgeRow`** 設 **`shrink`** 可能被壓成不可見。
2. **`ExploreClient.tsx`**：村莊改 **`revalidateOnMount: true`**、**`revalidateIfStale: true`**、**`keepPreviousData: true`**（與市集行為對齊，進 **`/explore`** 即拉最新稱號欄位）。
3. **`village.service.ts`**：**`unstable_cache`** 鍵 **`village-v6` → `village-v7`**，強制失效舊快取。
4. **`UserCard.tsx`**：**`TitleBadgeRow`** 自暱稱列移除，改 **absolute** 置於卡片 **`rounded-2xl`** **上緣中央**（**`-translate-y-1/2`**、陰影＋邊框，像外框標籤）；內容區 **`pt-5`** 避裁切。
5. **資料庫**：無。
6. **Git**：**`aa262f8`** — `fix(explore): 村莊列表稱號—SWR 重拉、village-v7、UserCard 頂緣標籤`

### 2026-03-31 — 稱號胸章全站顯示與後台

**背景**：稱號僅文字膠囊；需可選 **`shop_items`／`prize_items` 之 `image_url`** 作胸章（**16–20px**、`object-contain`、文字左側）。列表需與頭像框相同批次附掛；裝備後首頁 **`rewardsData`** 須與 **`FloatingToolbar`** 同步。

1. **Layer 2 `src/lib/repositories/server/rewards.repository.ts`**  
   - **`findEquippedRewardLabels`**：補 **`equippedTitleImageUrl`**（**`title`** 列之 **`image_url`**）；迴圈內 **`rt === "title"`** 時寫入。  
   - **`findEquippedTitlesByUserIds`**：**`user_rewards`** **`reward_type = title`**、**`is_equipped`**，**JOIN** **`prize_items`／`shop_items`**，每人一筆 **`EquippedTitleForList`**。

2. **Layer 3**  
   - **`village.service.ts`**（快取鍵歷經 **`village-v6` → `village-v7`**，見上則探索修復）、**`market.service.ts`**（**`market-v4`**）、**`chat.action.ts`**、**`alliance.action.ts`**、**`tavern.repository.ts`**：併 **`findEquippedTitlesByUserIds`**，型別加 **`equippedTitle`／`equippedTitleImageUrl`**。  
   - **`profile.action.ts`**：**`MemberProfileView.equippedTitleImageUrl`**。

3. **Layer 5**  
   - **`title-badge-row.tsx`**：**`TitleBadgeRow`**。  
   - **`UserCard.tsx`／`UserDetailModal.tsx`／`guild-profile-home.tsx`／`ExploreClient.tsx`**（村莊＋市集預載胸章）、**`ChatModal.tsx`／`guild/page.tsx`／`TavernModal.tsx`**。  
   - **`src/types/database.types.ts`**：**`TavernMessageDto.user`** 加稱號欄位。  
   - **`page.tsx`**：**`preloadImageUrls`** 納入 **`equippedTitleImageUrl`**。

4. **裝備同步**  
   - **`FloatingToolbar.tsx`**：裝卸 **`title`／`avatar_frame`／`card_frame`** 成功後 **`window.dispatchEvent(new CustomEvent('guild-rewards-invalidate'))`**。  
   - **`guild-profile-home.tsx`**：監聽後 **`loadRewards()`**。

5. **後台**  
   - **`shop-admin-client.tsx`**：**`item_type === title`** 時本機下拉 **`<optgroup label="items/（稱號胸章建議）">`**；說明與 **44px** 槽位 **`object-contain`** 小預覽。  
   - **`local-frame-image-picker.tsx`**：**`LocalFrameImageBuckets.items`**、**`rewardType: 'title'`**、**`fetchLocalFrameBuckets`** 帶 **`items`**。  
   - **`prizes-client.tsx`**：**`title`** 編輯／新增與框類同級（商城帶入、選圖、胸章預覽）。  
   - **`admin.action.ts`**：**`createPrizeItemAction`／`updatePrizeItemAction`**：**`title`** 保留 **`effect_key`／`image_url`**。

6. **資料庫**  
   - 無 DDL。

7. **建置／Git**  
   - **`npm run build`** 通過；**`git push`** **`origin/main`**：**`feat: title badge images site-wide, admin pickers, equip sync`**（**`ce8a370`**）。

### 2026-03-31 — 後台獎項：框架類連動商城選圖

**背景**：獎池 **`prize_items`** 之 **`avatar_frame`／`card_frame`** 原僅能手打 **`effect_key`** 與 **`image_url`**；後台希望與 **商城** 相同，可自 **`public/frames`** 掃描清單下拉選圖，並可自 **`shop_items`** 一鍵帶入欄位。

1. **`src/components/admin/local-frame-image-picker.tsx`**（client）  
   - **`fetchLocalFrameBuckets()`**：呼叫既有 **`getShopLocalImageOptionsAction`**（**`admin.action.ts`**），回傳 **`framesRoot`／`framesAvatars`／`framesCards`**。  
   - **`LocalFrameImagePicker`**：**`<select>`** **`optgroup`** 與 **`shop-admin-client`** 一致（頭像框 **avatars + root**；卡框 **cards + root**）；**`value`** 僅在路徑屬掃描清單時綁定，否則空字串（**Cloudinary** 等用手動輸入）；**重新掃描** 更新 buckets；**`aria-label`**／**`sr-only`** 手動欄標籤。

2. **`src/app/(admin)/admin/prizes/prizes-client.tsx`**  
   - **「獎項設定」** tab：**`useEffect`** 載入 **`fetchLocalFrameBuckets`** 與 **`getShopItemsAdminAction`**（失敗 toast）。  
   - 編輯列與 **新增獎項** Dialog：**「從商城商品帶入」** **`select`**（**`item_type`** 與當前 **`reward_type`** 一致），**`onChange`** 寫入 **`label`／`effect_key`／`image_url`**；**`key`／nonce** 選後重置下拉。  
   - 類型說明改述 **public/frames/avatars**、**frames/cards**；註明商城卡框 **metadata**（背景／角圖等）**不寫入** **`prize_items`**。

3. **資料庫**  
   - 無 DDL；**`prize_items`** 欄位不變。

4. **架構**  
   - 僅 L5；重用 L3 既有 **master** actions，無新 **`admin.action`** API。

5. **建置／Git**  
   - **`npm run build`** 通過；已 **`git push`** **`origin/main`**；訊息 **`feat(admin): prize frame picker from public frames and shop templates, handoff docs`**（hash 以 **`git log -1`** 為準）。

### 2026-03-31 — PWA 首頁安裝引導

**背景**：提升黏著度，引導已審核通過使用者將公會安裝至主畫面；須避免已安裝（standalone）仍看到條、避免一進站就蓋台，並與 Chrome **`beforeinstallprompt`** 整合。

1. **`src/hooks/usePwaInstall.ts`**（client）  
   - 監聽 **`beforeinstallprompt`**：**`preventDefault`**，保存事件（**`ref` + `hasDeferredPrompt` state**）。  
   - **`handleInstallClick`**：**`prompt()`**、**`await userChoice`**，用完清除。  
   - **`appinstalled`**：清除 deferred，避免殘留。

2. **`src/lib/pwa-install-prompt.ts`**  
   - **`pwa_prompt_dismissed`**：**`localStorage`** 存 **`Date.now()`** 字串。  
   - **`isPwaPromptInCooldown()`**／**`dismissPwaPrompt()`**：**3 日**內不顯示。

3. **`src/lib/pwa-install-engagement.ts`**  
   - **`sessionStorage`** 鍵 **`pwa_install_engaged`**；**`markPwaInstallEngaged()`**、**`hasPwaInstallEngaged()`**、**`subscribePwaInstallEngaged()`**（**`CustomEvent`** **`pwa-install-engaged`**，首頁 overlay 可即時顯示）。

4. **`src/components/shared/PwaInstallOverlay.tsx`**  
   - **隱藏**：**`matchMedia('(display-mode: standalone)')`** 或 **`fullscreen`**；**`navigator.standalone === true`**（iOS）；**iOS UA** 另含 **iPadOS（MacIntel + touch）** 補強。  
   - **顯示條件**：已 engaged、非冷卻、非 standalone；**iOS** 顯示「分享 → 加入主畫面」+ **`Share2`／`ChevronDown`** **`animate-pulse`**；**非 iOS** 僅在 **`hasDeferredPrompt`** 時顯示 Android 文案與「立即安裝」。  
   - **UI**：底部 **Bottom Sheet**（**`bg-zinc-950/90 backdrop-blur-xl border-t border-violet-500/30`**、**`z-50`**）、約 **1.7s** 延遲後滑入；「下次再說」呼叫 **`dismissPwaPrompt`**。

5. **`src/app/(app)/home-page-client.tsx`**  
   - 主內容末端掛 **`<PwaInstallOverlay />`**（僅首頁客端；**`page.tsx`** 已擋未完成註冊／待審核）。

6. **`src/components/profile/guild-profile-home.tsx`**  
   - **`useEffect`**：**`checkinDone`** 為真時 **`markPwaInstallEngaged()`**（含今日已簽）。

7. **`src/app/(app)/guild/page.tsx`**  
   - **`useEffect`** mount：**`markPwaInstallEngaged()`**（私訊入口 **`/inbox` → `/guild`** 已 redirect，無需改 inbox）。

8. **資料庫**  
   - 無。

9. **架構**  
   - 純 L5 + client hook + 小工具模組；無 Layer 2／3 變更。

10. **建置／Git**  
    - **`npm run build`** 通過；已 **`git push`** **`origin/main`**；commit 訊息 **`feat(pwa): home install overlay, engagement gate, handoff docs`**（hash 以 **`git log -1`** 為準）。

### 2026-03-31 — 公會盲盒：商城與簽到一致、Lottie 開箱與獎項展示

**背景**：商城 **`loot_box`** 與第 7 天簽到皆呼叫 **`drawFromPool('loot_box')`**；使用者易誤以為獎勵應進背包。另需以 Lottie 寶箱動畫取代 CSS 翻面，並在開箱後於中央展示獎項。

1. **`src/services/shop.action.ts`**  
   - **`dispatchItemToUser`** 改回傳 **`{ newRewardIds, lootDraws }`**；**`loot_box`** 每 quantity 呼叫 **`drawFromPool`** 並 **`lootDraws.push`**。  
   - **`PurchaseResult`** 成功分支含 **`lootDraws: DrawResult[]`**（非盲盒為空陣列）。  
   - **`formatLootDrawSummaryLine`**；**`notifyUserMailboxSilent`**：盲盒改寫「開出內容」（單次一句／多次多行），其餘商品維持「已存入背包」。

2. **`src/app/(app)/shop/page.tsx`**  
   - 購買成功若有 **`lootDraws`**：**`shopLootPlaybackKey`** 遞增、開 Modal；**`GuildLootBoxReveal`** 取代原 CSS 翻面與多抽純列表。  
   - **公會盲盒**：隱藏商品卡 **🎁 贈送**、**`handlePurchase`／`executeShopGiftCheckout`** 擋贈送並 toast（避免扣款後 **`newRewardIds` 為空**無法轉贈）。  
   - Toast 文案改為引導觀看動畫。

3. **`src/services/daily-checkin.action.ts`**  
   - **`claimDailyCheckin`** 內 **`drawFromPool('loot_box')`** 之 **`catch`**：除 **`console.error`** 外 **`notifyUserMailboxSilent`** 發系統信（獎池異常提示）；通知失敗另 log。

4. **`src/app/(admin)/admin/shop/shop-admin-client.tsx`**  
   - 商品類型選 **盲盒** 時顯示說明：須 **`item_type = loot_box`** 才走獎池 **`loot_box`**（與七日簽到相同）；商品圖非必要。

5. **動畫資產與常數**  
   - **`public/animations/guild-loot-box-treasure.json`**（由使用者提供之 **3D Treasure Box** Lottie 複製入庫；內嵌 base64，檔案較大）。  
   - **`src/lib/constants/guild-loot-box-lottie.ts`**：**`GUILD_LOOT_BOX_LOTTIE_PATH`**。

6. **`src/components/loot-box/guild-loot-box-reveal.tsx`**（client）  
   - **`open` 由父層 Modal 控制**；依 **`playbackKey`** 重置並 **`fetch`** Lottie JSON。  
   - **`lottie-react`**：**`loop={false}`**、**`onComplete`** → 顯示獎項層；寶箱層半透明；獎項卡 **`animate-[guildLootPrize_…]`**。  
   - **多抽**：Lottie **只播一次**，獎項 **stagger**（**`visiblePrizeCount` + interval**）。  
   - **載入失敗**：提示並仍顯示獎項；**~4.2s fallback** 避免 **`onComplete` 未觸發**卡死。

7. **`src/app/globals.css`**  
   - 新增 **`@keyframes guildLootPrize`**（中央彈出感）。

8. **`src/components/profile/guild-profile-home.tsx`**  
   - 簽到成功 Modal 內盲盒區改 **`GuildLootBoxReveal`**；**`checkinLootPlaybackKey`** 於有 **`result.lootBox`** 時遞增；移除 **`lootBoxRevealed`** 翻面狀態。

9. **資料庫**  
   - 無 DDL；獎池仍 **`prize_pools.pool_type = 'loot_box'`**。

10. **架構**  
    - 僅 L5 動畫與 L3 信件／回傳欄位擴充；盲盒抽獎仍 **`prize-engine.drawFromPool`**。

11. **建置／Git**  
    - **`npm run build`** 通過；**`git push`**：**`d46e859`** **`feat(loot-box): Lottie chest reveal, shop parity lootDraws, handoff docs`**。

### 2026-03-31 — Service Worker 推播角標、`unreadCount` payload、登出清除角標與 SWR

1. **`public/sw.js`**：**`push`** 解析 JSON 之 **`unreadCount`**（數值且非 NaN 才處理）；**`event.waitUntil(Promise.all([showNotification, syncBadge]))`**；**`navigator.setAppBadge`／`clearAppBadge`**（**0** 清除、**1–99** 設數，與 **`app-badge.ts`** 一致）；僅 **`setAppBadge` 存在**時才嘗試；**無 `unreadCount` 欄位**的舊 payload **不**改角標，避免誤清。
2. **`src/lib/push/send-push.ts`**：**`WebPushPayload`** 可選 **`unreadCount`**（由本函式合併）；發送前對**接收者** **`userId`** 呼叫 L2 **`countConversationsWithUnreadFromOthers(userId)`**（與 **`getUnreadChatConversationsCountAction`** 對該使用者之語意同源；**未**用該 action，因其綁定**當前 HTTP session**，無法代表推播接收者）。合併 **`unreadCount` 0–99** 後 **`JSON.stringify`**。**`chat`／`notification`／`tavern`** 既有 **`sendPushToUser`** 呼叫無需改參數。
3. **`src/services/push.action.ts`**：**`savePushSubscriptionAction`** JSDoc 補充推播 JSON 欄位與 **`send-push.ts`** 指標。
4. **`src/lib/utils/app-badge.ts`**：新增 **`clearPwaAppBadge()`**（**`navigator.clearAppBadge`**，不支援則略過）。
5. **登出**：**`guild-profile-home.tsx`**、**`register/pending/page.tsx`** 於 **`signOut` 後** **`clearPwaAppBadge()`** 並 **`useSWRConfig().mutate(() => true, undefined, { revalidate: false })`** 清空 SWR 快取，再導向 **`/login`**。
6. **建置／Git**：**`npm run build`** 通過；已 **`git push`**：**`270dc30`** **`feat(push): SW app badge from unreadCount, server payload, logout clear`**。

### 2026-03-31 — `.cursorrules`：任務收尾 HANDOFF／HISTORY／Git（重點紀錄）

1. **完成項目**  
   - 於 **`.cursorrules`** 新增 **「重點紀錄 — 任務收尾」**：每次實作任務完成前必做 — **(1)** 更新 **`HANDOFF.md`**「最近完成」精簡摘要（筆數與主檔標題一致，目前 **5** 則；超出則刪最舊摘要）；**(2)** 於 **`HANDOFF_HISTORY.md`** 開頭日誌區**置頂**新增 **`### YYYY-MM-DD — …` 完整紀錄**（禁止刪舊文）；**(3)** **`git add`／`commit`／`push`**，且推送前 **`npm run build`** 通過（與檔內「Git 自動推送規則」一致）。  
   - 合併原「HANDOFF 雙檔更新規範」為讀取／維護補充；**廢止**「HISTORY 僅能檔案最下方追加」之描述，改與本檔**新日誌置頂**慣例一致。  
   - 明定 **勿**將整份 **`HANDOFF.md`** 複製進 HISTORY。  
   - 同步更新 **`HANDOFF.md`**「最近完成」第一則為本流程；為維持 5 則上限，精簡列表中暫不再重複「探索村莊／市集／註冊興趣」單獨一則（該次任務仍保留於本檔下方歷史 `###`）。

2. **資料庫異動**  
   - 無。

3. **需要注意**  
   - 使用者明確說「不要 commit／不要 push／僅本地」時，依 **`.cursorrules`** 例外不推送。  
   - AI 對話若僅諮詢未改檔，無需空 commit。

4. **架構合規**  
   - 僅文件與流程規範，無跨層程式變更。

5. **Git**  
   - 已推 **`origin/main`**；訊息 **`chore: .cursorrules 重點—任務完成必更新 HANDOFF/HISTORY 並 push`**（確切 hash 以 **`git log -1 --oneline`** 為準）。

### 2026-03-31 — Web Push（VAPID）與 PWA 圖示角標（未讀私訊對話數）

1. **環境變數**（**`.env.example`**）：**`NEXT_PUBLIC_VAPID_PUBLIC_KEY`**、**`VAPID_PRIVATE_KEY`**、**`VAPID_SUBJECT`**（例 **`mailto:…`**）。**`src/lib/push/send-push.ts`** 之 **`ensureVapidConfigured()`** 三項皆必填才 **`webpush.setVapidDetails`**；缺任一則 **`sendPushToUser` 靜默 return**（無 throw）。
2. **Service Worker**：**`public/sw.js`** — **`push`**（JSON **`title`／`body`／`url`** → **`showNotification`**）、**`notificationclick`**（focus 或 **`openWindow`**）。**`src/components/shared/service-worker-register.tsx`** 於 **`providers.tsx`** 註冊 **`/sw.js`**（**`scope: '/'`**）。**`middleware.ts`** **`isApiOrStatic`** 含 **`pathname === '/sw.js'`**。
3. **訂閱 UI**：**`PushNotifyGuildRow.tsx`**（**`guild-profile-home.tsx`** 帳號設定 **Dialog** 捲動區頂）。**`usePushSubscription.ts`** — **`getVapidPublicKey()`**；掛載時 **`pushManager.getSubscription()`** 同步 **`subscribed`**、**`Notification.permission === 'denied'`** → **`denied`**；**`subscribe`** 內 **`Promise.race` 逾時（35s）** 回 **`idle`** 並 toast；**`clearLocalSubscription()`** 取消本機訂閱供重試；無公開金鑰時顯示**引導框**（production 說明／development 本機步驟）。
4. **Layer 3／2**：**`push.action.ts`** **`savePushSubscriptionAction`**；**`push.repository.ts`**；遷移 **`supabase/migrations/*_push_subscriptions.sql`**（**`push_subscriptions`** 表）。
5. **觸發發送**：**`sendPushToUser`** 由 **`chat.action.ts`**、**`notification.action.ts`**、**`tavern.action.ts`** 等 **fire-and-forget** 呼叫。
6. **PWA 角標**：**`lib/utils/app-badge.ts`** **`setPwaAppBadgeFromUnreadChatCount`**（**`navigator.setAppBadge`／`clearAppBadge`**，數字 **1–99**，不支援則略過）。**`AppBadgeUnreadChatSync`** 用 **`useUnreadChatCount()`**（與 **`getUnreadChatConversationsCountAction`**／公會「聊天」未讀**對話數**同源），掛 **`(app)/layout.tsx`**（**`SWRProvider`** 內）；**unmount 清除角標**（離開 app shell／登出等）。
7. **維運**：Vercel **三變數**齊備後 **Redeploy**；本機 **`.env.local`** 變更 **`NEXT_PUBLIC_*`** 後須**重啟 `npm run dev`**。iOS 主畫面 Web App 對 Badging／Web Push 支援因版本而異，需實機驗證。

### 2026-03-30 — 興趣村莊聯絡：`master`／`moderator` 略過性向；市集卡命定師徒版面

1. **`village.service.ts` — `getVillageUsersAction`**：**`role === 'master'` 或 `'moderator'`** 時**不**套用 **`isOrientationMatch`**（仍限 L2 同縣市、`active`、非 `hidden`、排除自己）；其餘使用者維持雙向性向篩選。排序仍 **`master` → `moderator` → 興趣分 → `level`**。**`unstable_cache`** 鍵改 **`village-v4-${userId}-${region}`**（舊 **`village-v3`** 行為不同，避免 TTL 內混用）。**技能市集**不依 **`role` 置頂**（未改）。
2. **`UserCard.tsx`（`variant="market"`）**：**「⚔️ 命定師徒」**自 flex 第三欄移入**暱稱列**，與 **`LevelBadge`** 同列 **`flex-wrap`／`items-center`**，避免擠壓中欄；**地區／性別／僅線上／可面交**改 **`flex flex-wrap gap-1.5`** 取代固定三欄 grid。
3. **建置**：**`npm run build`** 通過。

### 2026-03-30 — 探索 `/explore`：村莊／市集 Layer 2–3 與註冊興趣必填（建置通過、已併版）

1. **Layer 2 — `user.repository.ts`**  
   - **`findMarketUsers`**：**`skills_offer` 或 `skills_want` 至少一邊**為非 NULL 且 **`neq {}`**（PostgREST **`.or(and(...),and(...))`**）；**`select` 補 `total_exp`** 供排序。  
   - **`findVillageUsers`**：維持同縣市、**`active`**、排除 **`hidden`**、排除自己（性向於 L3 篩選）。

2. **Layer 3 — `market.service.ts`**  
   - **`getMarketUsersAction`**：**`calcSkillScore`** 之 **`complementScore`**；**`isPerfectMatch`＝`complementScore >= 2`**（命定師徒／師徒關係）；排序：**互補 ≥2 優先** → **`level` 高→低** → **`total_exp` 高→低**（不再以互補／同好分作次要排序；市集無 **`role` 置頂**）。  
   - **`unstable_cache`** 列表鍵 **`market-v3-${userId}`**（**`revalidate: 300`**），避免舊快取缺 **`total_exp`**。關鍵字篩選仍於快取回傳後執行。

3. **Layer 3 — `village.service.ts`**  
   - **`getVillageUsersAction`**：**`isOrientationMatch`** 雙向 **`.filter`**；排序 **`roleTier`**：**`master` → `moderator` → 其他**，再 **`calcInterestScore`**，再 **`level`**。  
   - 快取鍵 **`village-v3-${userId}-${region}`**（**`revalidate: 300`**）。

4. **Layer 4 — `ExploreClient.tsx`**：未改本任務（村莊 SWR／市集 SWR 既有）。

5. **Layer 5 — `MarketContent.tsx`**：副標改為 **「雙向互補技能合計 ≥ 2 項」**；**`UserCard`** 仍依 **`perfectMatch` prop**（由 service 計算）。

6. **Layer 4 工具 — `matching.ts`**：新增 **`countComplementarySkills`**（內部呼叫 **`calcSkillScore`** 取 **`complementScore`**）。

7. **註冊／興趣必填（與探索分開產品線但同併版）**  
   - **`profile-form.tsx`**：建檔成功後 **`router.push('/register/interests')`**（不再直接進 **`/register/pending`**）。  
   - **`middleware.ts`**：**`pending`** 使用者除 **`/register/pending`** 外，允許 **`/register/interests`**、**`/register/skills`**、舊 skills 路徑、**`/register/matchmaking`**，以便審核中仍補標籤。  
   - **`register.action.ts`**：**`completeRegistration`** 正規化興趣、**至少 1 個**、**`getTagLimitsAction`** 上限。  
   - **`skills-client.tsx`**：完成／跳過技能前若 session 無興趣，導回興趣頁。  
   - **`profile-update.action.ts`**：更新 **`interests`** 時不可清空至 0、不可超上限。  
   - **`adventurer-profile.action.ts`**：註解說明興趣於後續步驟寫入。

8. **建置**：**`npm run build`** 通過（既有 **`no-img-element`** 警告不阻斷）。

### 2026-03-30 — 裝回 PostLoginEntrance（保留開場／進度條，禁止純黑全螢幕閃屏）

1. **還原**：**`PostLoginEntrance.tsx`**、**`auth-bootstrap.action.ts`**；**`(app)/layout.tsx`** 再包 **`PostLoginEntrance`**；**`login-form`** **`markPostLoginEntrance()`**；**`auth/callback`** **`withGuildEntranceFlag`**（**`guild_entrance=1`**）。
2. **明確不做**：全螢幕 **`bg-black`／#000 閃屏遮罩**（先前易造成「黑畫面關不掉」觀感）。
3. **改為**：預載簾與門片底板 **`bg-zinc-950`**；開場層最外 **`fixed inset-0` 無底色**；邊緣漸層改 **zinc 色階**（**`rgba(24,24,27,…)`**）取代純黑漸層。
4. **其餘行為**：**`revealMain`** 隱主內容、**`splash.png`** 上下門、**進度條**、**`finally` → `releaseMain()`**、成功後寫 **`guild_app_splash_done_v1`**（與刪除前邏輯一致，僅去掉黑幕）。

### 2026-03-30 — 裝備背包格尺寸、酒館 @ 提及、登入大門過場

1. **`FloatingToolbar.tsx`（裝備背包）**：道具格 **`button`** 補 **`width:100%`／`minWidth:0`／`boxSizing`** 與 **`w-full min-w-0`**；空格／鎖格／loading 骨架改 **`aspect-square w-full min-w-0`**（移除 **`h-16`**）；**`grid`** 加 **`[&>*]:min-w-0`**，避免最後一格因 **`min-width:auto`** 視覺上較寬。背包長按選單：早前已改 **`stackSupportsLongPress`** 為 **`firstManageableRewardRow != null`**（本次若已併版一併存在）。
2. **酒館 @**：**`TavernModal.tsx`** — **`@` 按鈕**展開目前訊息串中他人暱稱 chip，插入 **`@暱稱 `**；**`tavern-message-content.tsx`** — **`buildTavernNicknameToUserId`**、**`renderTavernMessageText`** 解析 **`@xxx`**，對應到訊息串暱稱者可點開 **`UserDetailModal`**（**`stopPropagation`**）；**`type === 'emoji'`** 不解析。無 DB 變更，內容仍為純文字。
3. **登入後過場**：**`PostLoginEntrance.tsx`** 包於 **`(app)/layout.tsx`**；**`postLoginBootstrapAction`**（**`auth-bootstrap.action.ts`**）**`getUser` + `findProfileById`**；**Email 登入** **`login-form.tsx`** **`markPostLoginEntrance()`** + **`router.push`**；**OAuth** **`auth/callback/route.ts`** **`withGuildEntranceFlag(next)`** 帶 **`guild_entrance=1`**，進頁 **`replaceState` 去參**。進度：**`router.refresh()`** 後 **`waitUntilVisualReady`**（**`window` `load` 若尚未 `complete`（逾時 12s）**、**`document.fonts.ready`**、**雙重 `requestAnimationFrame`**），再 **100%**、短暫停留後以 **上下門** CSS 開啟（`translateY`）。
4. **建置**：**`npm run build`** 通過（Tailwind 對 **`duration-[850ms]`**／**`ease-[cubic-bezier(...)]`** 有 ambiguous 警告，不阻斷）。
5. **文件**：**`docs/MCP_SUPABASE_CURSOR.md`** 工作區刪除（若需請自版本庫外備份）。
6. **`PostLoginEntrance.tsx`（再修）**：取消獨立 **全黑 blocking 層**（避免黑幕未卸除）；改 **`revealMain`**（**`null`／`false`／`true`**）控制主內容 **`invisible` + `opacity-0`** 至開場結束；**`revealMain !== true` 且未進 `splashOn`** 時 **`zinc-950` 預載簾**（與主題底近）；門片底板改 **`zinc-950`**、最外層不再 **`bg-black`**；序列 **`finally`** 在 **`!isCancelled()`** 時必 **`releaseMain()`**；**`guild_app_splash_done_v1`** 僅成功跑完門動畫後寫入（失敗不寫，下次仍播）。

### 2026-03-30 — 設計修復計劃（探索 WiFi 列跳動、商城／贈送 Bottom Sheet）

1. **`user.repository.ts`**：**`findVillageUsers`**／**`findMarketUsers`** 的 **`.select`** 補 **`offline_ok`**（**`activity_status`／`last_seen_at`** 既有）；列表首次載入即含線上活動列所需欄位，避免二次補資料造成版面跳動。
2. **廣播券贈送（Bug 2）**：**`shop.action.ts`** **`dispatchItemToUser`** 之 **`broadcast`** 已帶 **`shop_item_id: item.id`**；**`findUserRewardGiftMeta`** 之 **`allowGift`** 已為「有 **`shop_item_id`** → **`shop?.allow_gift !== false`**；無則 **`true`**」— 與計劃一致，**本次未改程式**。**DB** 無需新增欄位（**`offline_ok`／`user_rewards.shop_item_id`** 已存在型別與實作）。
3. **`(app)/shop/page.tsx`**：**WalletBar**、**Tab 膠囊（`#7c3aed`）**、**雙欄商品卡**（玻璃底、特賣紫邊＋角標、價格琥珀／紫、大「購買」＋ **32×32** **🎁**）；**贈送選人**／**購買數量**改 **Bottom Sheet**（頂部把手、道具摘要、搜尋列、候選列選中＋勾、底部「下一步 →」；數量 **±**、**×1／×3／×5／×10**、合計、**更換** 收禮者）；**`AlertDialog`** 最終確認改 **`#1c1c1e`** 與雙鈕列。**`shopRecipientSearchKey`** 區分「尚未搜尋」與「搜尋無結果」提示。

### 2026-03-30 — UserDetailModal 視窗置中（覆蓋錨點定位）與商城贈送流程重排

1. **`UserDetailModal.tsx`**：**`DialogContent`** **`contentStyle`** 補 **`position: fixed`、`left/top: 50%`、`transform: translate(-50%, -50%)`、`width: min(100vw - 2rem, 24rem)`、`maxHeight: min(88vh, 100dvh - 2rem)`**，避免無觸發器時 **`DialogPopup`** 跟隨參考點出現在視窗外側下方。
2. **`gift.action.ts`**：新增 **`searchGiftRecipientCandidatesAction(nickname)`**（僅 **`findUsersByNickname`**，購買前尚無 **`rewardId`** 時選收禮者）。
3. **`(app)/shop/page.tsx`**：商品列 **價格左**、**🎁 送給朋友**（小）在左、**購買**（大）在右同一列；贈送為 **先開選人 Dialog → 再開數量／小計 Dialog → `AlertDialog` 確認金額與對象 → `purchaseItemAction` + 逐筆 `confirmGiftAction`**（對方通知沿用 **`confirmGiftAction` 內 `notifyUserMailboxSilent`**）；移除「購買後再問是否贈送」的中間 Dialog。

### 2026-03-30 — UserDetailModal 捲軸：關閉開啟時自動 focus

1. **`dialog.tsx`**：**`DialogContent`** 自 props 解構 **`initialFocus`**（**`Omit<Popup.Props, 'initialFocus'> & { initialFocus?: Popup initialFocus | -1 }`**），**`-1` → `false`** 再傳入 **`DialogPrimitive.Popup`**（Base UI **`initialFocus === false`** 為 **`ignoreInitialFocus`**，不將焦點移到第一個 tabbable，避免內層 **`overflow-y-auto`** 被捲到底）。
2. **`UserDetailModal.tsx`**：**`DialogContent`** **`initialFocus={-1}`**；移除 **`onScroll`／`useEffect`** 診斷 **`console.log`**；保留 **`data-modal-scroll-container`** 之 **`key`** 與 **`overscrollBehavior: 'contain'`**。

### 2026-03-30 — 贈送規則對齊、商城購後贈禮、捲軸診斷 log

1. **`rewards.repository.ts`**：**`findUserRewardGiftMeta`** 之 **`allowGift`**：有 **`shop_item_id`** 時 **`shop?.allow_gift !== false`**（後台明確關閉才擋）；無 **`shop_item_id`** 時 **`true`**（獎池等來源）。
2. **`prize.repository.ts`**：**`insertUserReward`** 改為 **`.insert().select('id').single()`** 回傳 **`string`**（既有呼叫端可忽略回傳值）。
3. **`shop.action.ts`**：**`dispatchItemToUser`** 收集每次 **`insertUserReward`** 的 id；**`purchaseItemAction`** 成功時回傳 **`newRewardIds`**（盲盒／背包擴充／EXP／幣包等無 **`user_rewards`** 列者為空陣列）。
4. **`gift.action.ts`**：**`assertGiftEligibility`** 僅 **`used_at`** 與商城 **「此道具不開放贈送」**；**`confirmGiftAction`**：**`is_equipped`** 時 **`unequipReward`** → **`markUserRewardConsumed`** → **`insertUserReward`**（收禮者）；插入失敗 **`clearUserRewardUsedAt`**；通知與 **`insertAdminAction`** 仍於轉移成功後。
5. **`rewards.action.ts`**：**`assertRewardGiftable`**（血盟批次贈送）與上對齊：不擋裝備中；無 **`shop_item_id`** 不擋類型。
6. **`(app)/shop/page.tsx`**：商品 **`allow_gift !== false` 且已登入** 顯示 **「🎁 送給朋友」**；意圖為贈禮時購買成功後 **Dialog**：「放入我的背包」／「直接送給玩家」→ **`giftItemToUserAction` + `confirmGiftAction`**（與 **`FloatingToolbar`** 相同互動）；**`createBrowserSupabase` + `onAuthStateChange`** 追蹤登入。
7. **`UserDetailModal.tsx`**：可捲動區 **`onScroll` → `console.log('[scroll]', scrollTop)`**；**`useEffect(open)`** 延遲 **200ms** 列出 **`[data-modal-scroll-container]`** 之 **`scrollTop`／`scrollHeight`** 與 **`[modal open] user id`**，供釐清捲動容器與初始捲動位置（未在此任務改捲軸行為）。

### 2026-03-30 — UserDetailModal 捲動結構、框圖預載與 eager 載入

1. **`UserDetailModal.tsx`**：**`DialogContent`** **`contentStyle`** **`display:flex`／`flexDirection:column`**，**`overflow-hidden`**；**單一** **`data-modal-scroll-container`** 包住**頭像標題區＋自白標籤**（**`flex-1 min-h-0 overflow-y-auto`**），底部按鈕列 **`flex-shrink-0`** 固定。**`setTimeout(150)`** 後 **`scrollTo` top**；**`scrollContainerRef`** 為 null 時備援 **`document.querySelector('[data-modal-scroll-container]')`**。
2. **首頁框圖**：**`findEquippedRewardLabels(profile.id)`** 取 **`equippedAvatarFrameImageUrl`／`equippedCardFrameImageUrl`**；RSC **`HomeFramePreloadLinks`** 輸出 **`<link rel="preload" as="image">`**；**`preloadImageUrls`** 傳 **HomePageClient → GuildProfileHome**，**mount** 時 **`new Image().src`** 再補一輪。
3. **`ExploreClient`**：村莊列表 **`useEffect`** 對 **`equippedAvatarFrameImageUrl`**、**`cardDecoration.cardFrameImageUrl`／`equippedCardFrameImageUrl`** 預載。
4. **`Avatar.tsx`**（僅框圖 **`<img>`**）、**`MasterAvatarShell`**（商城框）、**`ShopCardFrameOverlay`**：**`loading="eager"`**、**`fetchPriority="high"`**；Cloudinary 臉圖仍 **`loading="lazy"`**。
5. **`village.service.ts`**：**`VillageUserWithScore`** 型別補齊框／**`cardDecoration`** 欄位（與執行期資料一致）。

### 2026-03-30 — UserDetailModal 延遲捲動、首頁 SSR 預載與 SWR

1. **`UserDetailModal.tsx`**（**`src/components/modals/`**）：Base UI **`DialogContent`** 無 Radix **`onOpenAutoFocus`**；開啟動畫期間立即 **`scrollTo`** 會被蓋掉。後續改為 **150ms**、**單一捲動區含頭像**、**`data-modal-scroll-container`** 備援（見上則「捲動結構、框圖預載」）。
2. **`(app)/page.tsx`**：**async RSC**；**`Promise.all`**：**`getAuthStatus`**、**`getMyStreakAction`**、**`getStreakRewardSettingsAction`**、**`getMessageLimitsAction`**；非 **`authenticated`** 時 **`redirect`** 與 **`profile/edit-tags`** 一致（**`unauthenticated`→`/login`**、**`needs_profile`→`/register/profile`**、**`banned`→`/login?error=banned`**、**`pending`→`/register/pending`**）。
3. **`home-page-client.tsx`**：接收 **`initialProfile`／`initialStreak`／`initialStreakSettings`**；**`useMyProfile({ fallbackData: initialProfile, revalidateOnMount: false, revalidateIfStale: false, revalidateOnFocus: false })`**；**`HomePageSkeleton`** 僅 **`!initialProfile`**（正常登入首屏不閃骨架）。
4. **`useMyProfile.ts`**：可選 **`UseMyProfileOptions`**（**`fallbackData`**、三項 **revalidate**），預設行為不變。
5. **`SWR_KEYS`**：新增 **`myStreak`**、**`streakRewardSettings`**。
6. **`GuildProfileHome`**：**`useSWR`** 綁 **`getMyStreakAction`**／**`getStreakRewardSettingsAction`**；**fallbackData** 接 SSR；連簽：**`revalidateOnMount: false`**、**`revalidateIfStale: true`**、**`revalidateOnFocus: true`**；獎勵設定：**三項 false**；簽到成功 **`mutateStreak()`**；**`checkinDone`** 仍只依 **`profile.last_checkin_at`** 與 **`taipeiCalendarDateKey()`**。

### 2026-03-30 — Bug：市集 SWR 首次載入／UserDetailModal 捲軸（早期）

1. **`ExploreClient.tsx`**：技能市集無 **`fallbackData`**，**`revalidateOnMount: false`** 會讓 SWR 在無快取時不請求；改回 **`revalidateOnMount: true`**，並保留 **`keepPreviousData`**、**`revalidateIfStale: false`**。村莊有 SSR **`initialVillageUsers`** 仍可 **`revalidateOnMount: false`**。
2. **`UserDetailModal`** 捲動重置後續改為 **50ms 延遲**（見上則「延遲捲動、首頁 SSR」）。

### 2026-03-30 — 探索頁 DB JOIN、SWR、粒子與 CardDecorationSystem

1. **Layer 2 `rewards.repository.ts`**  
   - **`findEquippedAvatarFramesByUserIds`**、**`findEquippedCardFramesByUserIds`**：改為單一 PostgREST 查詢 **`.from('user_rewards').select('*, prize_items(effect_key, image_url), shop_items(metadata, effect_key, image_url)')`**，以 **`embeddedSingle()`** 正規化內嵌一對一關聯（物件或單元素陣列）。  
   - **`findEquippedCardFramesByUserIds`** 回傳 **`Map<string, CardDecorationConfig>`**（取代 **`EquippedCardFrameForList`**）；**`cardDecorationFromJoinedEquippedRow`** 合併獎池／商城欄位與 **`parseCardDecorationFromMetadata`**。  
   - **`findEquippedRewardLabels`**：新增 **`decorationByShopItemId`**（**`parseCardDecorationFromMetadata`**），回傳 **`equippedCardDecoration: CardDecorationConfig`**（與既有 **`equippedCardFrame*`** 並存）。

2. **Layer 3 `village.service.ts`／`market.service.ts`**：**`unstable_cache` `revalidate`** 由 **30／60** 改 **300**（5 分鐘）；列表仍 **`Promise.all`** 併查頭像框與卡框兩張圖（各僅 1 次 DB）；每位使用者附加 **`cardDecoration`** 與扁平 **`equippedCardFrame*`**（由 **`cardFrame*`** 對應）。

3. **Layer 4 SWR**：**`src/lib/swr/provider.tsx`** — **`dedupingInterval: 300000`**、**`keepPreviousData: true`**。**`ExploreClient.tsx`** — 村莊／市集 **`revalidateIfStale: false`**；市集 **`revalidateOnMount: false`**（與全域 **`keepPreviousData`** 搭配，返回探索頁時先顯示快取資料）。

4. **`LevelCardEffect.tsx`**：根節點 **`ref` + `IntersectionObserver`（`threshold: 0.1`）**；**`ParticleEffect`** 僅在 **`isVisible`** 時掛載；邊框 **`effectClass.border`** 始終渲染（**breathe／flow／rainbow** 等不受影響）。**`ShopCardFrameOverlay`** 自本元件移除，改由 **`CardDecorationWrapper`** 負責。

5. **CardDecoration 架構**  
   - **`src/lib/utils/card-decoration.ts`**：**`CardDecorationConfig`**、**`parseCardDecorationFromMetadata`**、**`mergeCardDecoration`**；**`metadata`** 鍵：**`cardBgImageUrl`／`cardCornerImageUrl`／`cardMascotImageUrl`／`cardEffectKey`**（與既有 **`frame_layout`** 並存）。  
   - **`CardDecorationWrapper.tsx`**：圖層順序 — 背景紋理 → **`children`** → **`ShopCardFrameOverlay`（卡框）** → 角落 → 角色；無值者不渲染（背景／角／角色）。  
   - **`UserCard.tsx`**：可選 **`user.cardDecoration`**，否則由 **`equippedCardFrame*`** 組出 **`CardDecorationConfig`**。

6. **消費端對齊 `CardDecorationConfig`**：**`tavern.repository.ts`**、**`chat.action.ts`**、**`alliance.action.ts`** 以 **`cf?.cardFrameEffectKey`／`cardFrameImageUrl`／`cardFrameLayout`** 填入 DTO。**`profile.action.ts`** **`MemberProfileView`** 增加 **`equippedCardDecoration`**。

7. **後台 `shop-admin-client.tsx`**（**`card_frame`**）：**`<details>`** 折疊區「未來裝飾層」— 四欄位寫入 **`metadata`**；**`stripReservedCardDecorationKeys`** 避免與 JSON 文字區重複；卡框預覽區顯示各層圖或灰色虛線「未設定」占位。

## 歸檔：舊主檔前半 — Wave／修復長文（2026-03-26 — 2026-03-29 等）

以下段落自拆分前 `HANDOFF.md` 約第 29—212 行遷移，與下方「逐日 `###` 任務日誌」互補。

---

### 商城系統 Wave 1 — 核心架構（2026-03-28）

1. **🗄️ 三張表**：**`shop_items`**（商品主表：SKU 唯一代號、item_type、currency_type `free_coins`/`premium_coins`、price、限時特賣窗口、每日限購、metadata jsonb）、**`shop_orders`**（購買紀錄）、**`shop_daily_limits`**（每日限購追蹤，UNIQUE `user_id, item_id, date_key`）。種子商品 6 筆。
2. **商城分兩軌**：**free_coins**（探險幣）／**premium_coins**（純金），前台 **`/shop`** 同頁 Tab（Pill 膠囊）切換，商品列表 `grid-cols-2`；商品卡含類型 emoji、特賣倒數、劃線原價、每日限購提示、餘額不足按鈕 disabled。
3. **`purchaseItemAction`**（Layer 3 `shop.action.ts`）完整購買流程：`auth.getUser()` → 商品存在＋上架＋未過期 → 每日限購 → 餘額檢查 → 扣款（`creditCoins`）→ 發放道具（`dispatchItemToUser`：依 `item_type` 分派至 `insertUserReward`／`updateProfile` 背包擴充／`drawFromPool` 盲盒／`insertExpLog` EXP加成／`creditCoins` 幣包）→ 寫 `shop_orders` → 更新每日限購 → `revalidateTag('shop_items')` → 信件通知。**扣款與發放在同一 try/catch 內**。
4. **後台 `/admin/shop`**（**master only**）：商品 CRUD 表格（桌面 table＋手機 card），新增／編輯 Dialog（SKU 正則過濾、售價與排序 `type="text"` 正則數字輸入、metadata JSON textarea、item_type 下拉中文對照、幣種下拉、effect_key 僅裝備類顯示、datetime-local 特賣時段、Switch 上架）。刪除前檢查 `shop_orders`，有紀錄只能停用。
5. **所有商品有唯一 SKU 代號**（`UNIQUE` 約束，後台建立時以 `[A-Z0-9_]` 正則驗證）。
6. **改名卡功能接線**：購買 `rename_card` 商品後寫入 `user_rewards`（`reward_type: 'rename_card'`）；**帳號設定頁**（`guild-profile-home.tsx`）偵測有可用改名卡時顯示「✏️ 使用改名卡」按鈕，點擊開 Dialog 輸入新暱稱（`adventurerNicknameSchema` 驗證），確認後 `consumeRenameCardAction`（`rewards.action.ts`）消耗改名卡並更新 `users.nickname`。
7. **釣魚系統預留**：`fishing_bait`／`fishing_rod` 道具類型已建立於 `shop_items.item_type`，購買後存入 `user_rewards`，前端暫無使用邏輯。
8. **商城商品特殊規則**：限時特賣（`sale_start_at`/`sale_end_at`，前台倒數計時顯示）、每日限購（`daily_limit`，以 `shop_daily_limits` + `taipeiCalendarDateKey` 追蹤）、庫存（`stock`，目前保留未強制檢查）。
9. **Sidebar**：`admin-shell.tsx` **🛍️ 商城管理** 位於獎池管理之後（`show: isMaster`）。**Middleware** `/admin/shop` 已設 master only。
10. **Layer 2**：`shop.repository.ts`（`findActiveShopItems`、`findShopItemById`、`findShopItemBySku`、`findAllShopItems`、`insertShopItem`、`updateShopItem`、`deleteShopItem`、`hasShopOrders`、`insertShopOrder`、`getDailyPurchaseCount`、`upsertDailyLimit`、`findMyOrders`）。
11. **`database.types.ts`**：已補 `shop_items`、`shop_orders`、`shop_daily_limits` Row/Insert/Update 型別。
12. **前台 `/shop`**：保留原有錢包（探險幣兌換純金、金幣紀錄）功能，上方新增商城 Tab 切換與商品 grid。

### 商城 Bug 修復與補強（2026-03-29）

1. **財務管理頁恢復**：**`/admin/coins`** 不再 **redirect** 至 **`/admin/shop`**；**`coins-admin-client.tsx`** 顯示 **全站總探險幣／總純金**（**`getAdminCoinStatsAction`**）、暱稱搜尋分頁列表（**`getAdminUsersWithCoinsAction`**）、**master** 手動調整用戶 **純金**（**`adminAdjustCoinsAction`**，別名 **`adjustCoinsAction`**）。**`admin-shell.tsx`** 獨立 **財務管理**（**`/admin/coins`**，**`Coins` icon**）與 **商城管理** 並列。
2. **改名卡／廣播券**：**`getMyRewardsAction`** 回傳 **`renameCardUnusedCount`**；**`consumeRenameCardAction(newNickname)`** 由伺服端取 **最早一張** **`rename_card` 且 `used_at IS NULL`**，**`nicknameSchema`** 驗證後 **`updateProfile` + `markUserRewardConsumed`**；帳號設定內按鈕 **「✏️ 使用改名卡（剩餘 N 張）」**。**`useBroadcastAction`**：**`markUserRewardConsumed`**（僅 **`used_at IS NULL`** 才更新）→ **`insertBroadcast`**（預設 **24h `expires_at`**）；若寫入廣播失敗則 **`clearUserRewardUsedAt`** 還原券。
3. **公會盲盒購買**：**`findPoolByType`** 改為 **`is_active` + `limit(1)`**，避免 **`.maybeSingle()`** 多列錯誤；**`purchaseItemAction`** 發放失敗時 **自動退款**（**`creditCoins` `source: refund`**）並回傳錯誤訊息。雲端若缺 **`loot_box` 獎池** 需補種子（見 **`20260329130000_shop_image_marquee_loot_box.sql`**／MCP）。
4. **限時特賣與劃線原價**：**`ShopItemDto`** — **`isOnSale`**：`sale_end_at > now`；**`showSaleCountdown`**：起迄皆具且在區間內才倒數；**`hasDiscountDisplay`**：**`original_price` 有值即劃線**（與特賣時段無關）。
5. **`shop_items.image_url`**：**`database.types`** 已補；後台商品 Dialog **Cloudinary** 上傳（**`uploadAvatarToCloudinary(..., { folder: 'shop_items' })`**）；前台 **`next/image` 80×80** 有圖優先、無圖 **emoji**。
6. **購買數量 Dialog**：**`getShopDailyRemainingAction`**；**±** 與正整數輸入、小計／原價小計、餘額不足按鈕文案；**`purchaseItemAction`** 每日限購與 **`quantity`** 合併檢查（既有邏輯 **`purchased + quantity <= daily_limit`**）。
7. **跑馬燈／廣播特效**：**`system_settings`** keys **`marquee_speed_seconds`**、**`marquee_broadcast_effect`**；**`getMarqueeSettingsAction`**（**`unstable_cache` 60s `system_settings`**）；**`TavernMarquee`** 動態 **animationDuration**；首頁 **BroadcastBannerCarousel** 輪播間隔與 **glow／pulse／rainbow**（**`globals.css` `.animate-rainbow-text`**）；**`/admin/settings`** 平台規則內 **跑馬燈設定** 子區塊。
8. **裝備背包 Sheet**：**`FloatingToolbar`** 內 **裝備 `SheetContent`** 移除會蓋掉 safe-area 的 **`p-0`**，改 **`pt-[max(1.5rem,env(safe-area-inset-top))]`** 等，避免瀏海遮標題。

### Wave 3 — 動態七日獎勵、浮動工具列、裝備背包與系統資訊（2026-03-28）

1. **`streak_reward_settings` 表**：七日簽到 **EXP／幣／幣上限／特殊獎勵** 由 DB 設定；**`users.inventory_slots`**（預設 **16**，背包總格 **48**，其餘鎖定）。雲端已用 Supabase MCP 建表／補欄；**`database.types.ts`** 已對齊。
2. **`claimDailyCheckin`**：獎勵改為 **`findStreakRewardByDay`**（週期第 7 天對 **`day=7`**），失敗時 **fallback** 舊硬編碼表；**`special_reward === 'loot_box'`** 觸發盲盒。
3. **首頁七格進度條**：**`getStreakRewardSettingsAction` + `getMyStreakAction`**；標題 **⚔️ 七日連續簽到**；**`grid-cols-7 gap-2`**、每格 **`aspect-square`**：已完成 **紫格 EXP／✓／幣**、今日待簽 **紫邊＋pulse＋外光**、未來 **鋅灰字**、**Day7** **🎁** 右上角角標（**`-top-1 -right-1 text-sm`**）、格內 **EXP／幣／「盲盒」** 層級文案、完成 **琥珀格＋中央大 🎁**；其下簽到鈕／已簽 **Lock＋冷卻**；斷簽 **4h 內** **琥珀警示條**。
4. **`FloatingToolbar`**（**`src/components/layout/FloatingToolbar.tsx`**）：**`FloatingToolbarProvider`** 包 **`(app)/layout`**；主鈕 **Lucide `Sparkles`／展開 `X`**，**信件未讀 >0** 時 **外光＋`ring-violet` pulse＋紅點**（無數字）；子鈕 **圓形圖示居中**（**`Mail`／`Backpack`／`Beer`**）＋**左側獨立膠囊標籤**（**信件／裝備／酒館**）；信件 **1–9／9+** 數字角標，酒館 **新訊橘點**；展開動畫 **`translateY(20px)`→0、200ms ease-out、stagger 0／50／100ms**（**`globals.css` `.ft-toolbar-pop`**）。**`GuildTabContext`** **`requestGuildSubTab`** 等與 **`useOpenEquipmentSheet`** 不變。
5. **「⚙️ 系統資訊」**（取代 **🎁 我的獎勵** 列表）：僅顯示 **已裝備** 頭像框／**卡片外框（`card_frame`）**／稱號；廣播券可點使用；底部連結開裝備背包。
6. **裝備背包 UI**：深色 **zinc-950**、**48 格**、**`inventory_slots`** 前段開放／後段 **🔒**；道具 **reward_type + label** 堆疊 badge；滿格橘色警示；點格 **裝備／卸下**（**`equipRewardAction`／`unequipRewardAction`**）。
7. **後台 `/admin/settings`**：**master** 專區 **七日報到獎勵設定**（7 列、**Day7 特殊說明唯讀「公會盲盒」**、**儲存所有獎勵設定**）。
8. **動態數值**：前台獎勵條與簽到獎勵以 DB／快取為準；後台更新後 **`revalidateTag('streak_rewards')`**，與 **`getStreakRewardSettingsAction`** 快取聯動。

**UI 極簡升級（同日補記）**：七日報到區塊與浮動工具列對齊 **Apple／Instagram 式**留白與層次；主工具列以 **圖示＋通知狀態** 為主、子項 **膠囊標籤與圖示分離**。

### Bug 修復包（2026-03-28）— 系統資訊載入＋後台權限對齊

1. **`getMyRewardsAction`／系統資訊「無法載入狀態」**  
   - **根因**：雲端 **`user_rewards`** 曾為 **`reward_ref_id` → `loot_box_rewards`**，與應用層 **`item_ref_id` → `prize_items`**（**`effect_key`**）不一致；PostgREST 以不存在之 **`user_rewards_item_ref_id_fkey`** 嵌入會失敗。  
   - **程式**：**`rewards.repository.ts`** 之 **`findMyRewards`／`findEquippedRewardLabels`** 改為 **`user_rewards` 全欄查詢**後**批次**讀 **`prize_items(id, effect_key)`** 合併（並相容執行期若仍見 **`reward_ref_id`** 之列）；**`getMyRewardsAction`** 外層 **`try/catch`**，**`catch`** 時 **`console.error('getMyRewardsAction 失敗:', JSON.stringify(error, null, 2))`** 並回傳 **`null`**。  
   - **DB**：**`supabase/migrations/20260328203000_user_rewards_item_ref_prize_items.sql`**（若存在 **`reward_ref_id`** 則 rename 為 **`item_ref_id`** 並將 FK 改為 **`prize_items`**）；雲端已以 **Supabase MCP `apply_migration`** 套用。  
   - **UI**：**`guild-profile-home.tsx`** 系統資訊裝備列 — 有裝備顯示**名稱**，無裝備顯示 **「—」**。

2. **後台 Sidebar 10 項／細化權限 9 欄位／moderator 顯示**  
   - **`moderator_permissions` 欄位**（與 **`admin-permissions.ts`**／授權 UI checkbox 一致）：**`can_review_users`**（審核用戶 → **`/admin/users`**）、**`can_grant_exp`／`can_deduct_exp`**（**`/admin/exp`**）、**`can_handle_reports`**（**`/admin/reports`**）、**`can_manage_events`**（預留）、**`can_manage_announcements`／`can_manage_ads`**（**`/admin/publish`**）、**`can_manage_invitations`**（**`/admin/invitations`**）、**`can_view_analytics`**（儀表板統計；Sidebar **儀表板** 連結仍對所有 **staff** 顯示，細部統計可於頁內再依權限收斂）。  
   - **`admin-shell.tsx`** 導覽順序與 **`show`**：**儀表板**（永遠）→ **用戶**（**`can_review_users`**）→ **檢舉**（**`can_handle_reports`**）→ **邀請碼**（**`can_manage_invitations`**）→ **EXP**（**grant／deduct**）→ **獎池**（**master only**）→ **發布中心**（**announcements／ads**）→ **商城管理 `/admin/shop`**（**master only**）→ **系統設定** → **授權管理**。**master only** 項目不列入 moderator 細化權限 checkbox。Sidebar **不再**列出 **操作記錄**（**`/admin/audit`** 路由仍保留，可直接輸入網址；**master** 專用）。

3. **`middleware` `moderatorAllowed` 同步**  
   - **moderator** 可進入 **`/admin`** 及前綴 **`/admin/users`／`invitations`／`exp`／`publish`／`reports`**（**`pathname === prefix` 或 `pathname.startsWith(prefix + '/')`**，避免子路徑被誤擋）。  
   - **`/admin/shop`** 與 **`/admin/coins`**（財務管理）僅 **master**；與 **獎池／roles／settings／audit** 相同層級保護。

### 前台 Bug 修復紀錄（2026-03-26）

1. **`UserDetailModal` IG 區塊**：顯示條件 SSOT — 僅在 **`instagram_handle` 有值** 且（**`ig_public === true`** 或 **血盟 `allianceStatus === 'accepted'`**）時渲染；**`ig_public === false` 且非血盟**時不顯示 IG。
2. **`/guild` 信件（`MailBox`）**：通知卡片可點；**`Dialog`** 顯示詳情（發送者頭像＋暱稱、依 **`type`** 的完整文案或 **`message`**、台北時間 **`Intl` `Asia/Taipei`**）、**「查看對方資料」**（**`getMemberProfileByIdAction`** → **`UserDetailModal`**，無 **`from_user_id`** 則無按鈕）；關閉 Modal 時若未讀則 **`markNotificationReadAction(id)`** 單筆已讀並 **`mutate` SWR**。層級：**通知 Modal** **`z-[200]`／`z-[210]`**；**`UserDetailModal`** **`z-[800]`／`z-[810]`**；取消緣分底欄 **`z-[820]`**；**`LeaderToolsSheet`**（**portal `body`**，**`z-[940]`／`z-[950]`**；確認 **`z-[960]`**）；**`ChatModal`** **`z-[700]`／`z-[720]`**（**`UserDetailModal`** 自聊天內開啟時疊於其上，**`z-[800]+`**）。**`Dialog`** 的 overlay／popup 帶 **`data-no-chat-inert`**，避免 **ChatModal** 對 **`body`** 子節點設 **`inert`** 時誤傷疊加的 Dialog。**`DialogContent`** 支援可選 **`overlayClassName`**。
3. **首頁今日心情**：**`guild-profile-home.tsx`** 僅保留**一處**獨立區塊（**`placeholder="今天的心情是..."`**）；移除覆蓋式「趕快填寫…」占位層與 **`text-transparent`** 雙層視覺，避免像兩個心情區塊；樣式維持 **`rounded-3xl`**、**`border-violet-500/30`**、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、紫微 **`box-shadow`**。
4. **`UserCard`／`UserDetailModal` 完全重構（深色奢華、極簡層次）**：
   - **實作位置**：**`src/components/ui/UserCard.tsx`**（**`src/components/cards/UserCard.tsx`** 僅 re-export）；**`LevelBadge`** — **`src/components/ui/LevelBadge.tsx`**。
   - **列表卡規則（村莊／市集分開）**：**`variant="village"`** — 興趣標籤最多 **3 +N**、**無**市集技能列；**`variant="market"`** — **能教／想學**各最多 **2 +N**、**無**村莊興趣列；共通 — **頭像 56px**、**`activity_status === 'active'`** 綠點否則灰點、**`resting`** 顯示 **「💤 休息中」**、**`mood` + `mood_at` 24h 內** 顯示今日心情膠囊；市集 **命定師徒**（**`perfectMatch`**）— 琥珀光暈邊框＋右上角 **「⚔️ 命定師徒」**。**`getRoleDisplay(role)`** 仍用於皇冠／暱稱色階。
   - **`UserDetailModal`**：**永遠顯示完整資訊**（雙自白 **`bio_village`／`bio_market`**、興趣村莊**全部**標籤、技能市集分 **我能教／我想學**、IG 區塊條件不變、**master** 信譽條＋領袖工具）；版面為 **頂部英雄區（固定）**＋**可捲動內容**＋**底部固定操作**（聊聊／緣分／血盟四態／領袖工具）；頭像角標依 **`activity_status`**；等級旁 **`LEVEL_TIERS`** 稱號。
   - **Layer 2 `select` SSOT**：**`findVillageUsers`** 與 **`findMarketUsers`** 之 **`select`** 須涵蓋列表與 Modal 資料鍊所需：**`id, nickname, avatar_url, level, region, role, mood, mood_at, activity_status, interests, skills_offer, skills_want, bio_village, bio_market`**（另含 **`gender`／`orientation`／`last_seen_at`／`instagram_handle`／`ig_public`** 等既有欄位，依函式現況為準）。

### z-index 與 IG 註冊審核（2026-03-28）

- **從 `UserDetailModal` 開 `ChatModal` 被遮擋**：**`ChatModal`** 新增可選 **`zIndex`**（預設 **700**）；**`UserDetailModal`** 內傳 **`zIndex={900}`**，底層全螢幕遮罩 **zIndex−10（890）**、主面板 **900**；檢舉浮層 **zIndex+20**。**`/guild`** 等維持預設 **700**。
- **自抬高層級 `ChatModal` 再開 `UserDetailModal`（點對方頭像）**：**`UserDetailModal`** 支援 **`stackAboveChatZ`**；**`DialogContent`** 支援 **`overlayStyle`／`contentStyle`**（inline **z-index**：overlay **stack+10**、content **stack+20**），避免被 **z-900** 聊天蓋住。
- **`LeaderToolsSheet`**：**`createPortal` → `document.body`**（外層 **`data-no-chat-inert`**，避免 **ChatModal** 對 body 設 **inert** 時無法操作）；backdrop／sheet **`z-[940]`／`z-[950]`**；放逐／解除確認 **`z-[960]`**。

#### IG 人工審核（DB／Middleware／前台／後台）

- **Step 0（Supabase MCP，專案「冒險者公會」）**  
  - **`information_schema.columns`**：**`users.status`** 原 **`column_default`** 為 **`'active'::user_status`**，已執行 **`ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'pending'::user_status`**，複查為 **`'pending'::user_status`**。  
  - 遷移檔：**`supabase/migrations/20260328120500_users_status_default_pending.sql`**。  
  - **`auth.users`／`public.users`**：查無 **非內建 trigger** 自動 insert **`public.users`**。  
  - **`information_schema.routines`** 含 **`status`** 字樣之 **`public` FUNCTION**：僅 **`get_coin_stats`**（與 **`WHERE status != 'banned'`** 等相關），無寫死 **`users.status = 'active'`** 之註冊 trigger function。
- **`AuthStatus`**：**`kind: 'pending'`**。**`middleware.ts`**：**`profile.status === 'pending'`** 僅允許 **`/register/pending`**，其餘導向該頁；**`active`** 造訪 **`/register/pending`** → **`/`**。**`config.matcher`** 明列 **`/register/pending`**、**`/register/profile/:path*`**、興趣／技能等路徑＋既有廣域規則。
- **`/register/pending`**（**`'use client'`**）：**`getMyProfileAction`** 載入；有 **`instagram_handle`** → 審核中文案＋顯示 **@handle**；無 handle → 重填表單＋**`updateMyProfile({ instagram_handle })`**＋ toast「已重新提交，請等待審核」；底部 **登出**（text 樣式）。**`updateMyProfile`** 成功會 **`revalidatePath('/register/pending')`**。
- **建檔**：**`completeAdventurerProfile`** 明確 **`status: 'pending'`**（註解雙重保險）；成功後 **`router.push('/register/pending')`**。
- **Layer 3**：**`approveUserAction`**（**`metadata`: `{ target_nickname }`**、信箱歡迎文案）；**`rejectUserIgAction`**（admin 清空 **`instagram_handle`**、**`status` 仍 `pending`**、**`reject_ig`** 稽核、**`metadata.rejected_handle`**、通知「請重新填寫後等待審核」）；**`getPendingUsersCountAction`**（badge 用）；**`getUsersAction`** 的 **`status: 'pending'`** 篩選仍走 **`findUsersForAdmin`**。
- **後台 `/admin/users`**：**待審核** tab **琥珀 badge**（pending 人數）；篩選 **`pending`** 時列表欄位：**暱稱／IG／註冊時間**（＋狀態）；詳情 Sheet **📸 IG 審核**區塊、**前往 IG 確認**（**`instagram.com/{handle}`**）、**AlertDialog** 後 **通過／拒絕**（拒絕呼叫 **`rejectUserIgAction`**），成功關 Sheet 並 **mutate** 列表。  
- **儀表板**：**`pendingUsers`**＝**`COUNT(status = 'pending')`**（**`getDashboardStats`**）；統計卡點擊 **`/admin/users?filter=pending`**（既有）。

### Wave 1 — 七日報到簿＋通用抽獎引擎＋公會盲盒（2026-03-28）

- **🗄️ 四張通用表**：**`prize_pools`**（**`pool_type` UNIQUE**，活動／獎池）、**`prize_items`**（加權獎項）、**`prize_logs`**（抽獎紀錄）、**`user_rewards`**（稱號／框／廣播道具列）。**`login_streaks`**（**`user_id` UNIQUE**）存連簽與 **`last_claim_at`**（與 **`users.last_checkin_at`** 簽到冷卻分離：冷卻仍只認 **`last_checkin_at`**）。遷移檔 **`supabase/migrations/20260328120000_prize_engine_login_streaks.sql`**；雲端已用 MCP 建表者可略過重跑。
- **`src/services/prize-engine.ts`**：**`drawFromPool(poolType, userId)`** — Layer 3 純 helper（非 action），加權抽選後依 **`reward_type`** 寫入 **`creditCoins`（`source: loot_box`）**／**`insertExpLog`（觸發器累加 `total_exp`）**／**`user_rewards`**，並 **`insertPrizeLog`**。
- **簽到**：**`claimDailyCheckin`** 依 **`login_streaks`** 判斷 **48h 斷簽**／連續；**EXP／探險幣**讀 **`streak_reward_settings`**（缺列 **fallback** 舊表；**`coins_max`** 時隨機幣）；**`special_reward === 'loot_box'`**（或 fallback 第 7 天）觸發 **`drawFromPool('loot_box')`**，並 **`notifyUserMailboxSilent`**。**`getMyStreakAction`**、**`getStreakRewardSettingsAction`** 供首頁讀 streak／七格文案。
- **首頁**：**`guild-profile-home.tsx`** — 七格進度、紫系報到鈕、斷簽前 **4h** 橘色警示、成功 Dialog（**Day X／7**、EXP／幣、盲盒 **rotateY** 翻面）。
- **`/admin/prizes`** 獎池管理改為 **master only**，sidebar 對 **moderator** 隱藏。
- **後台**：**`/admin/prizes`**：**`middleware`** **`pathname.startsWith('/admin/prizes')`** 非 **master** 導向 **`/admin`**；**moderator** 前綴白名單不含獎池；**`/admin/prizes/page.tsx`**（RSC）非 **master** **`redirect('/admin')`**；**`admin.action`** 獎池六支 action 皆 **`requireRole(['master'])`**；**`AdminShell`** **🎰 獎池管理** **`show: isMaster`**（與 **商城／roles／settings** 同級）。**`coin_transactions.source`** 型別含 **`loot_box`**、**`refund`** 等（**`/shop`** 來源標籤已補）；**`/admin/coins`** 為 **財務管理**（統計＋手動調整純金），**`/admin/shop`** 為 **商城 CRUD**。**`/admin/settings`** 不再顯示簽到幣 min/max 與權重格子，改連結至獎池管理。

### Wave 2 — 獎池完整 CRUD、前台獎勵與廣播大聲公（2026-03-28）

- **`prize_items.effect_key`**（**`text` nullable**）：後台為 **頭像框／卡片外框** 獎項設定 CSS 特效識別碼；前端以 **`rewardEffectClassName()`**（**`src/lib/utils/reward-effects.ts`**）對應 **`globals.css`** 的 **`.effect-{effect_key}`**（僅允許 `[a-z0-9_-]+`）。**留空**＝無特效，僅顯示名稱。**`user_rewards`** 以 **`item_ref_id` → `prize_items`**（**`effect_key` 不在 `user_rewards`**）；**`findMyRewards`／`findEquippedRewardLabels`** 以**批次查詢 `prize_items`** 合併 **`effect_key`**（見上方 **Bug 修復包**）。**「星辰之框」** 雲端 **`effect_key = 'star_frame'`**（與 **`.effect-star_frame`** 一致）。遷移檔 **`supabase/migrations/20260328190000_prize_items_effect_key.sql`**。
- **🗄️ `broadcasts`**：**`user_id`**、**`reward_ref_id`** → **`user_rewards`**、**`message`**、**`expires_at`**（預設 **now()+24h**）、**`created_at`**。雲端已用 MCP 建表；遷移檔 **`supabase/migrations/20260328180000_broadcasts.sql`**。
- **Layer 2**：**`rewards.repository.ts`** — **`findMyRewards`**、**`equipReward`／`unequipReward`／`unequipAllOfType`**、**`markBroadcastUsed`**、**`insertBroadcast`**、**`findActiveBroadcasts`**（**JOIN** **`users.nickname`**，最多 **5** 則）、**`findEquippedRewardLabels`**（**Modal** 用）。**`prize.repository`** 補 **log 計數**、**獎池／獎項 insert/delete**、**`findPrizeItemById`**。
- **Layer 3**：**`rewards.action.ts`** — **`getMyRewardsAction`**（**titles／avatarFrames／cardFrames／broadcasts**、**`broadcastUnusedCount`、`inventorySlots`、`allRewards`**）、**`equipRewardAction`／`unequipRewardAction`**（**`revalidateTag(profileCacheTag)`**）、**`useBroadcastAction`**（訊息 **1〜50** 字、**`revalidateTag('broadcasts')`**）、**`getActiveBroadcastsAction`**（**`unstable_cache` 60s** **`tags: ['broadcasts']`**）。**`admin.action`**：**`createPrizePoolAction`／`deletePrizePoolAction`／`createPrizeItemAction`／`deletePrizeItemAction`**，**`updatePrizeItemAction`** 含 **reward_type**（含 **`card_frame`**）與 **coins/exp** 驗證；**`getPrizePoolsAction`／`getPrizeItemsAction`** 附 **`hasPrizeLogs`**；**`getStreakRewardSettingsAdminAction`／`updateStreakRewardAction`**。**`getMemberProfileByIdAction`** 回傳 **`equippedTitle`／`equippedFrame`**（僅 Modal 路徑查 **user_rewards**，列表不 JOIN）。
- **Layer 5 首頁**：**`page.tsx`** **`await getActiveBroadcastsAction()`** → **`GuildProfileHome`** **贊助橫幅與公告之間** — **廣播橫幅**（**amber** 樣式、**4s** 輪播、**`.broadcast-slide-in`**）；**「我的狀態」** 手風琴 **⚙️ 系統資訊**（已裝備頭像框／卡片外框／稱號、廣播券、連結開 **FloatingToolbar** 裝備背包）。**`UserDetailModal`** 開啟時 **`getMemberProfileByIdAction`** 補齊裝備顯示；**`UserCard`** 可選 **`equippedTitle`** 膠囊（列表資料未帶則不顯示）。
- **後台 UI**：**`prizes-client.tsx`** — 建立／刪除獎池與獎項、**AlertDialog** 刪池、有紀錄時 **停用** 導向、**reward_type** 下拉、**Promise.allSettled** 批次儲存。**`/admin/settings`**：**`isMaster`** 時才顯示 **「前往獎池管理」**（**`settings-client.tsx`** + RSC **`page.tsx`**）。
- **視覺效果待辦清單（商城完成後執行）**：首頁廣播／獎勵區可再對齊 **frontend-design skill** 做細緻動效與道具卡面；**UserCard** 若未來列表需顯示稱號需另行設計快取策略（現僅 **Modal** 查裝備）。

### 廣播訊息 50 字、橫幅全文、商城說明遷移（2026-03-30）

- **`src/lib/constants/broadcast.ts`**：**`BROADCAST_MESSAGE_MAX_LENGTH`（50）**、**`BROADCAST_MESSAGE_LENGTH_ERROR`**；**`useBroadcastAction`**、**`FloatingToolbar`**、**`guild-profile-home`** 廣播輸入與文案共用。
- **`BroadcastBanner.tsx`**：緊湊列主體為可聚焦 **`button`**（**`aria-label="查看廣播全文"`**），點擊開 **`Dialog`** 顯示暱稱與完整 **`message`**（**`whitespace-pre-wrap`**）；下架 **✕** 仍獨立。
- **🗄️ **`supabase/migrations/20260330200000_shop_broadcast_description_50.sql`**：**`shop_items`** **`item_type = 'broadcast'`** 將說明中 **「1〜30 字」／「1～30 字」／「1-30 字」** 改為 **50**；**`description`** 空白時寫入預設繁中說明（含 **1〜50 字** 與約 **24h**）。

### 酒館字數 SSOT 與氣泡斷行（2026-03-30）

- **`src/lib/utils/tavern-message-limit.ts`**：**`resolveTavernMessageMaxLength`**（預設 **50**、硬上限 **500**）；**`getMessageLimitsAction`** 之 **`tavernMax`** 與 **`sendTavernMessageAction`** 之 **`effectiveTavernMessageMax`** 共用，避免 UI 與伺服驗證漂移（後台設超過 **500** 時前台計數亦 **500**）。
- **`TavernModal.tsx`** 訊息氣泡：**`min-w-0`**、**`break-words`**、**`overflow-wrap:anywhere`**，長串數字不撐破 **flex** 版面。
- **後續**：**`sonner.tsx`** **`Toaster`** 加 **`z-[600]`**，避免錯誤 toast 被酒館全螢幕（**`z-50`**）遮住；**`handleSend`** **`try`／`finally`** 必解 **`sending`**，關閉酒館時 **`setSending(false)`** 清卡住狀態。

### Wave A 基礎修復（2026-03-27）

- **幣種文案全站更新**：UI 顯示統一改為 **探險幣**（原「免費幣」）與 **純金**（原「付費幣」）；僅改顯示文字，**DB 欄位仍維持 `free_coins`／`premium_coins`**。
- **首頁後台入口**：**`guild-profile-home.tsx`** 的「管理後台」按鈕由 **master only** 改為 **master + moderator** 可見。
- **後台 Sidebar 權限隱藏**：**`src/app/(admin)/layout.tsx`** 改為伺服器端先取 **`auth.getUser()` → `findProfileById()`**，若為 moderator 再讀 **`findModeratorPermissions()`**；導航模組依權限 `show` 後再渲染（master 全顯示，coins/roles/settings 仍 master only）。
- **標籤顯示規則更新**：**`UserCard`** 改為興趣村莊 **最多 4 +N**；技能市集 **能教最多 3 +N**、**想學最多 3 +N**。**`UserDetailModal`** 仍顯示全部標籤不截斷。
- **心情顯示規則更新**：**`UserCard`** 與 **`UserDetailModal`** 的心情文案超過 **15 字** 改為截斷顯示（`前 15 字 + ...`）並提供「展開」；點擊後以 Dialog 顯示完整內容與時間。
- **系統設定頁正式上線**：**`/admin/settings`** 由占位頁改為可編輯面板（平台規則、簽到說明＋導向獎池、Lv1-10 門檻）；平台規則／等級門檻等仍為**單項儲存**；透過 **`updateSystemSettingAction(key, value)`** 寫入並 toast 成功提示。
- **系統設定持久化修復**：更新 `updateSystemSettingAction` 成功後呼叫 **`revalidatePath('/admin/settings')`** 與 **`revalidateTag('system_settings')`**（供 **`getTagLimitsAction`／`getMessageLimitsAction`** 等快取失效），避免離開/返回後顯示舊預設值。
- **（歷史）探險幣權重 UI**：已於 **2026-03-28** 自 **`/admin/settings`** 移除；**`checkin_free_coins_*`／`checkin_weight_*`** 若仍存在於 **`system_settings`** 僅為遺留資料，**應用層不讀**。盲盒機率請改至 **`/admin/prizes`**。
- **標籤上限動態讀取**：**`src/services/system-settings.action.ts`** 之 **`getTagLimitsAction()`** 讀 **`interests_max_select`／`skills_max_select`**（缺值預設 **12／8**），**`unstable_cache`** **`revalidate: 60`**、**`tags: ['system_settings']`**。**`/register/interests`**、**`/register/skills`** 之 **`page.tsx`** 為 **async RSC**，分別將 **`interestsMax`／`skillsMax`** 傳入 **`InterestsClient`／`SkillsClient`**；**`TagSelector`** 使用 **`maxSelect`**（與既有 prop 一致）。**`/profile/edit-tags`** 同樣 **`await getTagLimitsAction()`** 傳入 **`EditTagsClient`**（興趣 **`maxSelect={interestsMax}`**；能教／想學各 **`maxSelect={skillsMax}`**）。
- **酒館／心情字數上限動態讀取**：同檔 **`getMessageLimitsAction()`** 並行讀 **`tavern_message_max_length`／`mood_max_length`**（缺值或非法預設 **50／50**），**`unstable_cache`** **`revalidate: 60`**、**`tags: ['system_settings']`**。**`(app)/layout.tsx`**（async）**`await getMessageLimitsAction()`** 將 **`tavernMax`** 傳 **`FloatingToolbarProvider` → `TavernModal`**（**`maxLength`**、輸入 **`slice`**、字數顯示）。首頁 **`page.tsx`** 為 **async RSC**，**`moodMax`** 傳 **`home-page-client.tsx` → `GuildProfileHome`**（今日心情 **textarea**、計數、同步 **`profile.mood`** 時 **`slice(0, moodMax)`**）。**Layer 3**：**`sendTavernMessageAction`** 依 **`findSystemSettingByKey('tavern_message_max_length')`** 驗證長度，**硬上限 500**（設定超過仍只允許 500）；**`updateMyProfile`** 寫入 **`mood`** 時同樣讀 **`mood_max_length`**，**硬上限 500**。
- **系統設定讀寫再修正**：`getSystemSettingsAction` 加 `noStore()` 確保每次讀 DB 最新值；`updateSystemSetting` 改為 `upsert(onConflict: key)`，若 key 尚不存在會自動補入。
- **新增/納管 system_settings keys**：
  **`interests_max_select`**、**`skills_max_select`**、**`mood_max_length`**、**`tavern_message_max_length`**、**`registration_open`**、**`maintenance_mode`**、**`like_require_mutual`**、**`checkin_free_coins_min`**、**`checkin_free_coins_max`**、**`checkin_weight_1` ~ `checkin_weight_9`**（後三者可為雲端遺留列，**後台已不再編輯**）、**`level_threshold_1` ~ `level_threshold_10`**。

### Wave B 功能與權限補強（2026-03-27）

- **管理員操作權限保護（後端）**：`src/services/admin.action.ts`、`src/services/tavern.action.ts` 新增 `checkOperationPermission`；規則為：
  - `target.role === 'master'` 且非本人時不可操作（master 僅可操作自己）
  - `operator.role === 'moderator'` 不可操作其他 `moderator`
  - `master` 可操作所有非 master 目標
- **管理員操作權限保護（前端）**：`src/app/(admin)/admin/users/users-client.tsx` 新增 `canOperate(operatorRole, targetRole)` 控制操作區顯示；不可操作時顯示灰色提示「此用戶無法被操作」；列表中的 `master` 加上 `👑` 標示。
- **用戶詳情（moderator）修復**：`getUserDetailAction` 改為 moderator 只讀 profile，不走 `auth.admin.getUserById`；email 僅 master 查詢/顯示。`users-client.tsx` 補上具體錯誤訊息與重試按鈕。
- **浮動工具列（整合 FAB）**：**`FloatingToolbar.tsx`** — 主鈕 **bottom-20 right-4**、**`z-50`**（展開 **z-[60]**），整合 **信件／裝備背包／酒館**；**`(app)/layout.tsx`** 以 **`FloatingToolbarProvider`** 包住 **Marquee／內容／Navbar**，取代 **`TavernFab` + `EquipmentFab`**。
- **酒館禁言時效**：`banTavernUserAction` 改為 `durationHours: 1 | 3 | 24`；`TavernModal` 長按他人訊息可選 `1/3/24` 小時禁言；成功 toast 顯示「已禁言 {nickname} {hours} 小時」；並寫入系統信件「🔇 你已被禁止在酒館發言 {hours} 小時，原因：{reason}」。
- **`tavern_bans.expires_at`**：Layer 2 `isTavernBanned` 改為「`expires_at IS NULL`（永久）或 `expires_at > now`（時效內）」判斷；`insertTavernBan` 寫入對應到期時間；遷移 `supabase/migrations/20260327143000_tavern_bans_expires_at.sql` 會補 `expires_at timestamptz`（若尚未存在）。
- **酒館禁言流程補強**：`TavernModal` 長按管理選單改為「先選禁言時數，再輸入必填原因後確認」；`banTavernUserAction` admin log metadata 同步為 `durationHours`，Repository 持續寫入 `expires_at` 並以未過期條件判定禁言。
- **簽到成功 UI（已由 Wave 1 取代）**：現行見上方 **「Wave 1 — 七日報到簿…」**；舊版隨機幣＋**`CHECKIN_MESSAGES`** 已移除。**後台 `/admin/settings`** 已移除簽到幣權重設定區塊，改為說明文字導向 **`/admin/prizes`**；**`checkin_free_coins_*`／`checkin_weight_*`** 可保留在 DB，**簽到邏輯不讀取**。

### Wave C 金幣統計與操作稽核（2026-03-27）

- **🗄️ `get_coin_stats` RPC（修復 PostgREST 聚合限制）**：新增 PostgreSQL function `get_coin_stats()`，回傳 `totalPremiumCoins`、`totalFreeCoins`、`totalUsers`、`totalTopupAmount`、`totalPaidOrders`。
- **Layer 2 金幣統計改為 RPC**：`src/lib/repositories/server/coin.repository.ts` 的 `getCoinStats()` 已改用 `admin.rpc('get_coin_stats')`，不再使用 `.sum()` 聚合查詢。
- **🗄️ `admin_actions.action_label` 欄位**：`public.admin_actions` 需有 `action_label text`（nullable）做「人類可讀描述」；型別已同步到 `src/types/database.types.ts`。
- **後台稽核頁**：新增 `src/app/(admin)/admin/audit/page.tsx`（master only），支援操作類型篩選、暱稱搜尋、分頁、badge 色彩與台北時間格式。
- **稽核寫入規範（action_label）**：管理操作應寫入統一描述格式，至少覆蓋 `exp_grant`、`suspend`、`ban`、`unban`、`role_change`、`coin_adjust`、`tavern_ban`、`ig_review`，metadata 需帶 `target_nickname`、`admin_nickname` 與核心欄位（如 `delta`、`coin_type`、`verdict` 等）。
- **用戶詳情操作紀錄**：`/admin/users` 用戶 Sheet 已新增最近 20 筆 `admin_actions` 折疊區塊（顯示 `action_label` + 台北時間）。

### 角色識別、探索排序與命定師徒（2026-03-26）

- **`src/lib/utils/role-display.ts`**：**`getRoleDisplay(role)`** 回傳 **`crown`** + **`nameClass`** — **`master`** → **👑**、`text-amber-300 font-semibold`；**`moderator`** → **🛡️**、`text-blue-300 font-semibold`；其餘 **`crown: null`**、`text-zinc-100`。套用：**`UserCard`**（**`src/components/ui/UserCard.tsx`**，**`cards/UserCard.tsx`** re-export）、**`UserDetailModal`**、**`TavernModal`** 訊息列、**`/guild`** 血盟（待確認／夥伴）與聊天列表暱稱。
- **興趣村莊排序**（**`getVillageUsersAction`**／**`village.service.ts`**）：**`findVillageUsers`**（同縣市）與 **`findVillageStaffUsersGlobally`**（全站 **`master`／`moderator`**）**`Map` 去重**合併。性向：**營運略過**；一般 **`isOrientationMatch`**。排序：**①** **`master` → `moderator` → 一般** → **②** 營運內 **`level` 高→低**（不比興趣分，`id` 穩定次序）→ **③** 一般：**`calcInterestScore` → `level`**。無 **`region`** 時仍可見全站營運。快取 **`village-v5-${userId}-${regionKey}`**（無地區 **`__no_region__`**）。**`select`** 欄位見 **`findVillageUsers`**／**`findVillageStaffUsersGlobally`**（與卡片／Modal 一致）。
- **技能市集排序**（**`getMarketUsersAction`**／**`market.service.ts`**）：**不做** staff 置頂 — **①** **Perfect Match**（雙向技能契合）→ **②** **互補分** → **③** **同好分** → **④** 同分 **`level` 高→低**。**`findMarketUsers`** **`select`** 同上（**`level`**、**`role`**、心情與活躍狀態等列表與詳情所需欄位）。
- **命定師徒**：市集 UI 將原「靈魂伴侶／完美匹配」文案改為 **「⚔️ 命定師徒」**（**`MarketContent.tsx`**）；**`.perfect-match-market-shell`** 高光樣式不變（**`globals.css`** 註解同步）。

### 興趣村莊：全站領袖／管理員置頂（2026-03-30）

- **目的**：領袖與管理員不受縣市限制出現在村莊列表頂部，方便使用者聯繫；不依興趣分排序營運帳號。
- **Layer 2**：**`src/lib/repositories/server/user.repository.ts`** 新增 **`findVillageStaffUsersGlobally`** — **`.in('role', ['master','moderator'])`**、**`active`**、**`activity_status !== hidden`**、排除自己；無 **`region`** 條件；**`select`** 與 **`findVillageUsers`** 相同。
- **Layer 3**：**`src/services/village.service.ts`** **`Promise.all`** 並行同縣市與全站營運查詢後合併；**`unstable_cache`** 鍵 **`village-v5-…`**。

### 列表卡等級外框特效 `LevelCardEffect`（2026-03-27）

- **元件**：**`src/components/ui/LevelCardEffect.tsx`** — 依 **`level`** 與 **`role`** 在卡片外緣套邊框動畫；**`UserCard`**（**`src/components/ui/UserCard.tsx`**）最外層已改為 **`LevelCardEffect`** 包裝，內層 **`rounded-2xl`** 與特效層一致。**`moderator`** 不套用 **master** 特效，僅 **`role === 'master'`** 使用 **`effect-master`**。
- **等級／角色對照**（**`getEffectClass`**）：

| 條件 | 邊框 CSS class | 粒子 |
|------|----------------|------|
| **`role === 'master'`** | **`effect-master`** | ✅ |
| **Lv ≥ 10** | **`effect-rainbow`** | ✅ |
| **Lv ≥ 9** | **`effect-fire`** | ✅ |
| **Lv 7–8** | **`effect-flow-purple`** | ❌ |
| **Lv 5–6** | **`effect-flow-cyan`** | ❌ |
| **Lv 3–4** | **`effect-breathe-blue`** | ❌ |
| **Lv 1–2**（一般） | Tailwind：**`border border-zinc-800/60`** | ❌ |

- **粒子**：**`ParticleEffect`** 同檔；僅 **Lv ≥ 9** 或 **master** 時渲染（**`getEffectClass(...).particles === true`**），**`pointer-events-none`**，動畫 **`fade-up-particle`**（**`globals.css`** 之 **`@keyframes fade-up-particle`** + **`.animate-fade-up-particle`**）。粒子色：**Lv 9** **`bg-orange-400/60`**；**Lv 10** **`bg-yellow-300/70`**；**master** 紫／黃交替。
- **樣式定義**：**`src/app/globals.css`** — **`effect-breathe-blue`**、**`effect-flow-cyan`**、**`effect-flow-purple`**、**`effect-fire`**、**`effect-rainbow`**、**`effect-master`** 與對應 **`@keyframes`**（**`breathe-blue`**、**`flow-cyan`**、**`flow-purple`**、**`breathe-fire`**、**`rainbow-flow`**、**`master-flow`**）。

### 廣告顯示與後台（2026-03-26 起）

- **Layer 2 `findActiveHomeAds`**：併查 **`position = banner`**（最多 **15** 則）與 **`card`**（最多 **3** 則），權重降序、**`is_active`** 與上下架時間窗與先前一致；**`getHomeAdsAction`** 仍回傳單一陣列，**UI 依 `position` 分流**（橫幅輪播／卡片橫滑互不混用）。
- **首頁 `guild-profile-home`**：**公告區塊上方**為 **Banner 輪播**（僅有 banner 時渲染；**`h-40` `rounded-2xl`**、底層漸層＋標題；**4 秒**自動切換、**`duration-500` opacity**；**多則**底部白點指示；**單則**不輪播、不顯示點；點擊有 **`link_url`** 則 **`window.open(..., '_blank')`** 並 **`recordAdClickAction`**）。**公告**：**`w-full` 滿版垂直堆疊**（置頂琥珀卡＋一般 **`space-y-2`**），**無橫向滑動**；內文 **`line-clamp-2`**，超過顯示 **「⋯ 展開」**（**`useLayoutEffect` 偵測截斷**）；點整卡開 **Dialog**。**今日心情下方「贊助」橫滑**僅 **`card`**：固定 **`min/max-w-[240px]`**、整卡 **`h-[236px]`**；有圖 **`h-32` `object-cover`**；無圖 **`h-16` `bg-zinc-800/60`** 置中標題；標題／說明 **truncate／line-clamp-2** 規格見程式。
- **後台 `/admin/publish`（廣告）**：位置 **badge／select** 使用中文對照 **`AD_POSITION_LABELS`**（橫幅／卡片／公告置頂），**DB 與 API 仍存英文 `banner`／`card`／`announcement`**。**權重**改純數字文字輸入，**送出時**驗證 **1–10**。**`/admin/exp`**（EXP **1–1000**）、**`/admin/invitations`**（批量 **1–50**、有效天數 **≥0**）同樣改 **`type="text"`** 過濾數字、**送出時 toast 驗證**。

### 通知系統（信件／`notifications`）（2026-03-26 起）

- **讀取效能**：**`getMyNotificationsAction`** 直接呼叫 **`loadNotificationsForUser`**（**不**使用 **`unstable_cache`**，避免 SWR 觸發時 Next 資料快取造成信件列表首包過慢）；通知列 **最多 50 筆**；發送者以 **`from_user_id` 去重後單次 `users.in('id', …)`** 批量載入。**寫入**後仍 **`revalidateTag(notifications-{userId})`**（常數 **`src/lib/constants/notification-cache.ts`**）。**`/guild` `MailBox`**：**`revalidateOnFocus: false`**、**`dedupingInterval: 3000`**，與全域 30s dedupe 區隔以減少不必要重打。
- **冒險團 `MailBox`**（**`guild/page.tsx`**）：載入中顯示 **3 枚** **`glass-panel` + `animate-pulse`** 骨架（圓形頭像位＋兩條橫條），避免空白。
- **寫入 API（Layer 3）**：**`insertMailboxNotificationAction`**（寫入＋**`revalidateTag`**，供領袖邀請碼等需回報錯誤）、**`notifyUserMailboxSilent`**（管理員副作用：**`catch` 僅 `console.error`**，不拋錯）。
- **`invitation_code`**：**`LeaderToolsSheet`**「產生並發送邀請碼」改為 **`generateInvitationCodeAction`** → **`insertMailboxNotificationAction`**（**`type: 'invitation_code'`**、**`from_user_id`**＝領袖、**`user_id`**＝對方），**不再**經 **`getOrCreateConversationAction`／`sendMessageAction`**。
- **管理員操作 → 信件（`type: 'system'`，皆 `notifyUserMailboxSilent`）**：**`banUserAction`／`suspendUserAction`／`unbanUserAction`／`adjustExpAction`／`adjustReputationAction`／`updateUserRoleAction`**（升 **moderator**／降 **member**）、**`reviewIgRequestFromAdminAction`**（核准／拒絕）、**`batchGrantExpAction`／`grantExpToAllAction`／`grantExpByLevelAction`**（對 **`batchGrantExp` 回傳之 `successfulUserIds`** 每人一則 **`🎁 你獲得了 +{delta} EXP！活動名稱：{source}`**，**`Promise.allSettled`** 並行寫入）。**`reviewIgRequestAction`**（**`ig-request.action.ts`**／前台審核頁）成功後同樣對申請者寫入核准／拒絕文案。**酒館**：**`banTavernUserAction`／`unbanTavernUserAction`**（**`tavern.action.ts`**，依操作權限規則）同步 **`insertAdminAction`**（**`tavern_ban`／`tavern_unban`**）與上述通知文案。

## Phase 2.1 首頁個人卡重構（完成）

---

## 逐日任務日誌（`###` 條目；檔內部分標題為 `2025-03-23` 者為舊慣例筆誤）

### 2025-03-23 — 任務 4：頂級深色 UI 與簽到／有緣分修復

- **Layer 5**：**`dialog.tsx`** 預設 **`bg-zinc-950`**、**`border-zinc-800`**、**`shadow-2xl`**、**`max-h-[85vh] overflow-y-auto`**；遮罩加深為 **`bg-black/70`**。**`globals.css`** 之 **`.glass-panel`** 改為 **`bg-zinc-950/80 backdrop-blur-xl rounded-3xl shadow-2xl`**。認證殼 **`(auth)/layout`**、**`GuildAuthShell`**、**`login-form`／`register-form`**（**`auth-styles.ts`** 共用 Input／主按鈕／Google 次按鈕樣式）與首頁 **`/(app)/page.tsx`** 置中留白。**`guild-profile-home`**：放大頭像、等級徽章、操作改為圖示橫向列表；簽到重複改 **success toast**。**`UserDetailModal`**：載入有緣分狀態、按鈕實心愛心與 Sonner 回饋。
- **Layer 2／3**：**`exp.repository`** 匯出 **`isUniqueConstraintError`** 供簽到攔截。重複簽到字串常數見 **`src/lib/constants/daily-checkin.ts`**（**`DAILY_CHECKIN_ALREADY_TODAY`**），**`daily-checkin.action`** 僅匯出 async；仍使用 **`taipeiCalendarDateKey()`**。**`like.repository`**：**`mapLikeRepositoryError`**；雲端 **`likes`** 欄位見下方 **任務 5**。**`social.action`**：**`getLikeStatusForTargetAction`**、**`toggleLikeAction`** 回傳 **`liked`** 並以友善訊息包裝 DB 錯誤。

### 2025-03-23 — 任務 5：`likes` 欄位對齊（42703）與註冊問卷深色統一

- **Layer 2／型別**：Supabase **`public.likes`** 實際欄名為 **`from_user`**、**`to_user`**（非 `from_user_id`）。已同步 **`database.types.ts`** 與 **`like.repository.ts`** 之 insert／eq／delete／互查邏輯，修正 PostgREST **42703**（未定義欄位）導致的有緣分 500。
- **Layer 3**：**`social.action.ts`** 僅透過 repository，無需解構列欄位；無程式變更需求。
- **Layer 5**：**`register/profile/profile-form.tsx`** 廢除 **`CYAN_FOCUS`**，改採 **`auth-styles.ts`**（**`guildAuthInputClass`**、**`guildAuthSelectTriggerClass`**、**`guildAuthSelectContentClass`**、**`guildAuthPrimaryButtonClass`** 等）；步驟指示、核心價值與興趣區塊使用 **`.glass-panel`**／紫色 focus，與登入／註冊 Step1 視覺一致。

### 2025-03-23 — 任務 6：膠囊認證 UI、個人頁獨立儲存與 Modal 精緻化

- **Layer 5**：**`auth-styles.ts`** 膠囊輸入（**`rounded-full`**、**`bg-zinc-900/50`**、**`placeholder:text-zinc-600`**）；**`guildAuthInputClass`**（左圖示＋**`pl-11`**）、**`guildAuthInputStandaloneClass`**（無圖示時 **Step2** 暱稱／IG）；Google 按鈕 **淺色膠囊**＋彩色 **SVG**。**`login-form`／`register-form`**（路徑：**`src/app/(auth)/…`**）內嵌 **Lucide** 圖示。**`guild-profile-home`**：編輯 Modal 順序為 **今日心情 → 自白 → IG（`Switch`）**；廢除底部整批儲存；各欄 **「確認修改」** 觸發 **`<AlertDialog>`** 後呼叫 **`updateMyProfile`**；成功 **Sonner**、**不關閉** Modal。**Accordion** 內容外層 **高亮底框**。**`UserDetailModal`**：頭像 **正圓**、標籤／技能區 **gap-3 + p-4**、底部 **膠囊按鈕**與愛心 **縮放回饋**。
- **Layer 3**：**`profile-update.action.ts`** 之 **`updateMyProfile`** 改為**可選欄位** partial update，並先 **`findProfileById`** 驗證；避免只改自介卻重設 **`mood_at`**。

### 2025-03-23 — 任務 7：登入極簡膠囊、安全區與名片按鈕對齊

- **Layer 5**：**`src/app/(auth)/login/login-form.tsx`** 為登入表單實作；**`src/components/auth/login-form.tsx`** 為同名 **re-export** 方便索引。移除 Email／密碼外顯 **Label**，改 **Placeholder**＋**`aria-label`**；密碼欄 **`Eye`／`EyeOff`**（**`right-4`**）切換顯示，**`pr-12`** 保留膠囊 **`rounded-full`**。**`/(app)/page.tsx`** 頂部 **`pt-[max(3rem,env(safe-area-inset-top,0px))]`**（至少 **pt-12**，適配瀏海／動態島）。**`guild-profile-home`** 編輯 Modal 底部「關閉」**`max-w-[80%]`** 置中（**IG 已為 `Switch`**）。**`UserDetailModal`**：內文與底部按鈕共用 **`max-w-[min(100%,22rem)]`**（**`sm:max-w-full`** 與內容等寬延展）；緣分按鈕文案 **「💖 送出緣分」**／已送出 **「已送出緣分」**。

### 2025-03-23 — 任務 11：IG 即時儲存、頭像上傳、簽到與列表體驗

- **Layer 5 — `guild-profile-home.tsx`（歷史）**：**IG** 即時寫入等見後續任務。**頭像**：已改為 **全螢幕黑底裁切 Modal**（**`react-easy-crop`**，**`aspect={1}`**、**`cropShape="round"`**、**`showGrid={false}`**，頂／底 **glass-panel**）；選圖後先裁切，**`getCroppedImg`**（**`cropImage.ts`**）輸出 **Blob** → **`File`** → **`uploadAvatarToCloudinary`** → **`updateMyProfile({ avatar_url })`**。**已移除** Supabase Storage **`avatars` bucket** 上傳路徑（**無** **`supabase.storage.from()`**）。
- **Layer 5 — 極簡導覽**：探索／市集頁移除左上角 **「返回公會大廳」**（現統一於 **`/explore`**）。**`UserCard`** 移除 **`HoverCard`**，整卡 **`role="button"`** 點擊開 **UserDetailModal**。
- **Layer 5 — `UserDetailModal`**：左 **💬 聊聊**、右 **🤍 送出緣分**／**💖 已送出緣分**（emoji＋文字，無額外 Lucide 愛心）；已送出再點先 **AlertDialog**「你確定要結束這段緣分嗎？」。
- **Layer 3 — `daily-checkin.action.ts`**：catch 時 **`console.error`** 印出完整錯誤與 **`JSON.stringify`**（含 **keys**）。
- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** 僅接受 **`{ user_id, unique_key, source }`**（**`ExpLogInsertPayload`**），**不傳 `delta_exp`**，交給 DB **DEFAULT**；錯誤時 **`logSupabaseError`**。**`database.types.ts`** 之 **`exp_logs.Insert.delta_exp`** 改為**可選**。
- **Layer 3 — `profile-update.action.ts`**：支援 **`avatar_url`**；失敗時加強 **`console.error`**。

**🗄️ 雲端建議**：若簽到 insert 報缺少 **`delta_exp`**，請為 **`public.exp_logs.delta_exp`** 設定 **DEFAULT**（例如 **`1`**）與既有 Trigger 一致。

### 2025-03-23 — 任務 12：簽到真實錯誤、台北曆日預檢與 UI 冷卻

- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`** 不再在未知錯誤時回傳固定「簽到失敗，請稍後再試」；改以 **`formatCheckinErrorForClient`** 組合 PostgREST／Postgres 的 **`code`、`message`、`details`、`hint`** 回傳至前端（便於對照 Vercel Log）。catch 內 **`console.error("❌ 簽到原始錯誤物件:", JSON.stringify(error, null, 2))`**，失敗再嘗試 **`getOwnPropertyNames`** 序列化。新增 **`getDailyCheckinCooldownInfo`**：讀取 **`findLatestDailyCheckinByUserId`**，以 **`taipeiCalendarDateKey()`** 比對 **`unique_key`** 格式 **`daily_checkin:{YYYY-MM-DD}:{user_id}`**（異常時退回 **`created_at`** 的台北曆日）；若已為今日則不進入 insert。
- **Layer 2 — `exp.repository.ts`**：新增 **`findLatestDailyCheckinByUserId`**；**`insertExpLog`** 僅以 **`{ user_id, unique_key, source }`** 物件 insert，**payload 不含 `delta_exp` 鍵**。
- **Layer 4 — `date.ts`**：**`nextTaipeiCalendarDateAfter`**、**`formatTaipeiDateKeyForDisplay`**（下次可簽日期繁中顯示）。
- **Layer 5 — `guild-profile-home.tsx`**：簽到錯誤 **`toast.error(result.error)`** 顯示真實原因；若訊息含 **`duplicate`**（不分大小寫）或常數 **`DAILY_CHECKIN_ALREADY_TODAY`**，改 **`toast.success("今日已經簽到過了喵！")`** 並同步冷卻狀態。已簽到時按鈕鎖定、**`Lock`** 圖示與「下次可簽到」文案（台北曆日切換後）。

*最後更新：2025-03-23 — **任務 14**：`exp_logs` 同時維護 **`delta`** 與 **`delta_exp`**（`insertExpLog` 預設各 **1**，避免 **23502 NOT NULL**）；簽到前以 **`findDailyCheckinForUserOnTaipeiDay`**（**`unique_key`** + **`source = daily_checkin`**）判斷當日是否已簽，回傳 **`error: DAILY_CHECKIN_ALREADY_TODAY`**；個人頁簽到鈕冷卻為深灰半透明、**`⏳ 回報冷卻中 (約 23 小時)`**，未簽到為漸層質感；成功 **toast**：「簽到成功！獲得 +1 EXP 喵！」。*

### 2025-03-23 — 任務 14：`exp_logs` **delta**／**delta_exp** 與 24H 冷卻 UI

- **🗄️ `exp_logs`**：雲端可同時存在 **`delta`** 與 **`delta_exp`**（皆 NOT NULL 時，應用層 **`insertExpLog`** 明確帶入 **1**，與 DB 預設值雙重保險）。**`database.types.ts`** 之 **`Row`**／**`Insert`** 已對齊。
- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** payload 含 **`delta`**、**`delta_exp`**（預設 **1**，可覆寫）；**`findDailyCheckinForUserOnTaipeiDay`** 以 **`daily_checkin:{YYYY-MM-DD}:{user_id}`** 之 **`unique_key`** 並 **`source = daily_checkin`** 查詢。
- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`**／**`getDailyCheckinCooldownInfo`** 依上列查詢判斷當日；已簽回傳 **`error: DAILY_CHECKIN_ALREADY_TODAY`**（常數見 **`src/lib/constants/daily-checkin.ts`**）。
- **Layer 5 — `guild-profile-home.tsx`**：今日已簽 **disabled**、深灰半透明、主文案 **⏳ 回報冷卻中 (約 23 小時)**；未簽 **漸層**按鈕；簽到成功 **`toast.success("簽到成功！獲得 +1 EXP 喵！")`**。

---

*（歷史）**任務 12**：簽到錯誤透明化、曆日預檢、冷卻 UI 與 UTF-8 友善字串（Server Action 純 JSON 可序列化物件）。*

### 2025-03-23 — 任務 14：`delta`／`delta_exp` 對齊（23502）、曆日查詢與冷卻 UI

- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** 明確送出 **`delta: 1`**、**`delta_exp: 1`**（可於 **`ExpLogInsertPayload`** 覆寫），與雲端 **`exp_logs`** 並存之 **`delta`**／**`delta_exp`** NOT NULL 對齊，避免 **23502**。改以 **`findDailyCheckinForUserOnTaipeiDay(userId, ymd)`** 依 **`unique_key === daily_checkin:{YYYY-MM-DD}:{userId}`** 查當日是否已簽（與 UNIQUE 索引一致）。
- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`**／**`getDailyCheckinCooldownInfo`** 皆以 **`taipeiCalendarDateKey()`** 與上述查詢預檢；若當日已有列則 **`error: DAILY_CHECKIN_ALREADY_TODAY`**（常數值為機讀 slug **`"DAILY_CHECKIN_ALREADY_TODAY"`**）。
- **型別 — `database.types.ts`**：**`exp_logs.Row`／`Insert`／`Update`** 補上 **`delta`** 欄位說明。
- **常數 — `daily-checkin.ts`**：**`DAILY_CHECKIN_ALREADY_TODAY`** 改為 slug **`DAILY_CHECKIN_ALREADY_TODAY`**；UI 仍以友善 **toast** 回饋，勿直接顯示該字串給使用者。
- **Layer 5 — `guild-profile-home.tsx`**：已簽到時按鈕 **disabled**、**深灰半透明**樣式、主文案 **「⏳ 回報冷卻中 (約 23 小時)」**；簽到成功 **「簽到成功！獲得 +1 EXP 喵！」**。

*最後更新：2025-03-23 — 頭像 **react-easy-crop** 全螢幕裁切＋**Cloudinary**；**`cropImage.getCroppedImg`**；**廢除 Supabase Storage 頭像上傳**；同步 **`.cursorrules`**。*

### 2025-03-24 — IG 變更申請與審核（`ig_change_requests`）

- **🗄️**：**`public.ig_change_requests`** 表 + **`users.role`**（預設 **`member`**，**`admin`**／**`leader`** 可進 **`/admin/ig-requests`**）。遷移檔 **`supabase/migrations/20260324100000_ig_change_requests_and_user_role.sql`**。
- **型別**：**`database.types.ts`** 新增 **`ig_change_requests`**、**`users.role`**。
- **Layer 2**：**`ig-request.repository.ts`** — **`insertIgChangeRequest`**、**`getPendingIgRequests`**（embed **`users!ig_change_requests_user_id_fkey`**）、**`reviewIgRequest`**（核准時先改 **`users.instagram_handle`** 再更新申請列）。
- **Layer 3**：**`ig-request.action.ts`** — **`requestIgChangeAction`**（**`instagramHandleSchema`**）、**`reviewIgRequestAction`**、**`getPendingIgRequestsAction`**。
- **Layer 5**：**`guild-profile-home`** 帳號設定 — 無 IG 直接綁定；有 IG 鎖定 + 展開輸入後送審。**`/admin/ig-requests`** 待審列表 + **核准／拒絕**。

### 2025-03-24 — 簽到冷卻改為 24h 滾動（`last_checkin_at`）

- **規格**：簽到冷卻為 **24 小時滾動**（非台北曆日切換）；**`users.last_checkin_at`** 為 SSOT。
- **廢棄**：以 **`taipeiCalendarDateKey()`**／曆日 **`unique_key`** 作為「今日是否已簽」之判斷（**`taipeiCalendarDateKey()`** 函數**保留**，供其他日曆用途）。
- **Layer 2**：**`user.repository.ts`** 新增 **`updateLastCheckinAt(userId)`**（admin 更新 **`last_checkin_at`**）。
- **Layer 3**：**`claimDailyCheckin`** 讀寫 **`last_checkin_at`**、寫入 **`exp_logs`** 時 **`unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**；冷卻內回傳 **`error: DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）及 **`remainHours`／`remainMins`**。已移除 **`getDailyCheckinCooldownInfo`**（個人頁改由 **`profile.last_checkin_at`** 推算）。
- **Layer 5**：**`guild-profile-home.tsx`** 進入頁面即以 **`profile.last_checkin_at`** 初始化冷卻 state；點擊簽到成功後**立刻**鎖定 UI 並顯示剩餘時分；**每分鐘**更新倒數。
- **🗄️**：**`supabase/migrations/20260324120000_users_last_checkin_at.sql`**（**`users.last_checkin_at`**）。
- **常數**：**`DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）；**`DAILY_CHECKIN_ALREADY_TODAY`** 為別名（相容舊引用）。

### 2025-03-24 — 註冊 UX：移除名冊內重複興趣步、指示器縮小、`TagSelector` 預設收折、卡片加寬

- **Layer 5 — `profile-form.tsx`**：移除第三步「技能與興趣」標籤區（與 **`/register/interests`** 重複）；名冊僅兩步（基本資料＋性向／線下／核心價值），**「完成並進入公會」**於第二步送出；**`completeAdventurerProfile`** 傳 **`interests: []`**。
- **Layer 3 — `adventurer-profile.action.ts`**：建檔允許 **`interests` 為空陣列**（興趣改由 Step4／**`completeRegistration`** 寫入）；仍限制最多 **12** 個。
- **Layer 5 — `registration-step-indicator.tsx`**：數字圈 **w-6 h-6**、**`text-[10px]`**、連接線 **w-4**、**`gap-1`**，外層 **px-2 py-3** 利於窄螢幕。
- **Layer 5 — `TagSelector.tsx`**：新增 **`defaultOpenCategory?: string | null`**（**`null`**＝全部分類預設收折；未傳則維持展開第一個分類）。
- **Layer 5 — `/register/interests`、`/register/skills`**：兩頁 **`TagSelector`** 皆 **`defaultOpenCategory={null}`**；外層 **max-w-xl**、**px-3**。

### 2026-03-24 — 首頁今日心情質感、標籤編輯鈕位置

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**獨立卡改為**微光紫邊框**（**`border-violet-500/30`** + **紫色柔光 `box-shadow`**）、**較矮**輸入區（**`rows={2}`**、**`py-2.5`**）、**小膠囊確認鈕**（**`text-xs`**）；標題與倒數／過期文案**左右對齊**。
- **Layer 5 — 同上**：**興趣與技能標籤**手風琴改用 **`titleRow`**：**✏️ 編輯** **`Link`** 移至標題文字**正後方**，**`e.stopPropagation()`** 避免誤觸折疊。

### 2026-03-24 — 探索頁 SSR 與 village／market 快取

- **Layer 5 — `/explore`**：**`page.tsx`** 為 **Server Component**，伺服端 **`await getVillageUsersAction()`** 預載村莊列表，傳入 **`ExploreClient`**（**`initialVillageUsers`**）；市集資料改由 **`ExploreClient`** 內 **`useSWR`** 載入（見下 **「`ExploreClient` 改用 SWR」**）。**`VillageContent`／`MarketContent`** 以 **`hidden`／`block`** 切 tab，**不 unmount**。
- **Layer 5 — `ExploreClient.tsx`**（client）：tab、**`query`**；**`useSWR(SWR_KEYS.villageUsers, …)`** ＋ **`fallbackData: initialVillageUsers`**、**`revalidateOnMount: false`**；**`useSWR(SWR_KEYS.marketUsers(query), …)`** ＋ **`keepPreviousData: true`**；**`onQueryChange`** 僅 **`setQuery`**。**`MarketContent`** 仍為搜尋 **300ms debounce**、初次載入 **6×`UserCardSkeleton`**。
- **Layer 3 — `village.service.ts`**：**`unstable_cache`** 包住村莊查詢與篩選排序，**`revalidate: 30`**，key **`village-{userId}-{region}`**。
- **Layer 3 — `market.service.ts`**：**`unstable_cache`** 包住 **`findMarketUsers`**（**`revalidate: 60`**，key **`market-{userId}`**）與 **`getCachedMySkills`**（同 TTL、**`profileCacheTag`**）；**關鍵字搜尋在列表快取回傳後篩選**；**Perfect Match** 與分數排序仍於快取回傳後計算。

### 2025-03-24 — PWA manifest 圖示與主題色 **`#0f0a1e`**

- **Layer 5／靜態**：**`public/manifest.json`** 更新 **icons**（192／512 **maskable**、180 **apple-touch**）、**`theme_color`／`background_color`** 皆 **`#0f0a1e`**。
- **Layer 5 — `app/layout.tsx`**：**`viewport.themeColor`**、**`metadata.icons.apple`**（**`/icons/apple-touch-icon.png`**），與 manifest 對齊。
- **靜態資源**：由既有 **`icons/192.png`**、**`512.png`**、**`ios/180.png`** 複製為 manifest 路徑（**`icon-192x192.png`** 等），避免 404。

### 2025-03-24 — 底欄圖示還原、今日心情紫微光、探索 safe-area、列表骨架屏

- **Layer 5 — `Navbar.tsx`**：恢復 **lucide** 圖示（**Home、Compass、Swords、Heart、ShoppingBag**）；**`w-5 h-5`**；選中 **`text-violet-400`**、未選 **`text-zinc-500`**；標籤 **`text-[10px] mt-0.5`**；**`py-2 flex-1`** 欄位；**`/`** 僅 **`pathname === '/'`** 為 active。
- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**外層改 **深紫微光**（**`bg-violet-950/40`**、**`border-violet-500/20`**、**`rounded-3xl`**、**`shadow-2xl backdrop-blur-xl`**），與其他 **`glass-panel`** 區隔。
- **Layer 5 — `/explore`**：sticky 頂欄 **`pt-[max(1rem,env(safe-area-inset-top))]`** 避 **iPhone 瀏海**。
- **Layer 5**：新增 **`UserCardSkeleton`**；**`MarketContent`**（及舊版村莊載入）載入時 **6** 枚骨架取代純文字「載入中」。（後續：村莊改 SSR 後不再使用骨架，見下「探索頁 SSR」條。）

### 2025-03-24 — 底部導航五項、`/explore`／`/guild`、舊路由 redirect

- **Layer 5 — `Navbar.tsx`**：（歷史）曾為五項純文字＋底線；現已改回 **lucide** 圖示（見上一則）。
- **Layer 5 — `/explore`**：（歷史）曾為**整頁 Client**；現已改為 **`explore/page.tsx` Server** ＋ **`ExploreClient`**（見 **2026-03-24 — 探索頁 SSR 與快取**）。頂部 **pill Switch**（🏡 興趣村莊／⚔️ 技能市集）；內容為 **`VillageContent`**、**`MarketContent`**（**`src/components/explore/`**）。
- **Layer 5 — `/guild`**：**血盟／聊天／信件** 三 tab；血盟為佔位（待 **getMyAlliancesAction** 等）；聊天／信件預留文案。（**雙人血盟已於 2026-03-24 接線**，見下則。）
- **Layer 5 — `/matchmaking`**、**`/shop`**：**glass-panel**「即將開放」預留頁。
- **路由**：**`/village`**、**`/market`** → **`redirect('/explore')`**；**`/alliances`**、**`/inbox`** → **`redirect('/guild')`**。
- **`app-shell-motion`**：底部留白改 **`pb-[calc(5.25rem+env(safe-area-inset-bottom))]`** 以配合五欄底欄。

### 2026-03-24 — 雙人血盟（`alliances`）、Modal 與冒險團

- **🗄️ SSOT**：**`public.alliances`**（**`user_a`**、**`user_b`**、**`initiated_by`**、**`status`**、`created_at`）；**`alliance.repository`** 僅 **`.from('alliances')`**；新列 **insert** 時 **`user_a`／`user_b`** 採字串字典序固定對，與雲端 **UNIQUE** 約束對齊。
- **`user_alliances`**：**廢棄**；**`20260325120000_user_alliances_pair.sql`** 僅留 **DEPRECATED** 註解與註解掉的 DDL，**勿執行**。
- **型別**：**`database.types.ts`** 之 **`alliances`** 已改為上列雙人血盟形狀；**`UserAllianceRow`／`user_alliances` 型別已移除**。
- **Layer 2**：**`alliance.repository.ts`** — **`.from('alliances')`**、成對查詢（**`and(user_a…,user_b…)` OR 反向**）；**已接受血盟**／**待確認（對方發起）** 改為**先查血盟再逐筆查 **`users`****，避免 PostgREST FK embed 問題。
- **Layer 3**：**`alliance.action.ts`** — **Modal** 用 **狀態／申請／回應／解除**；列表用 **我的血盟**／**待確認**；**`reactivateAllianceFromDissolved`** 處理 **`dissolved` → 再申請**（更新 **`initiated_by`**，型別 **`Update`** 仍僅 **`status`**，層級 2 以斷言寫入）。
- **Layer 3 — `social.action.ts`**：**`checkMutualLikeWithTargetAction`**（雙向互讚，血盟區塊前置）。
- **Layer 5 — `UserDetailModal.tsx`**：僅 **雙向互讚** 顯示血盟區；四態：**無**／**已送出**／**待確認**／**血盟夥伴**＋解除；**Instagram**：**`ig_public === true`** 或 **血盟已成立** 且 **`instagram_handle`** 有值時顯示 **@**。
- **Layer 5 — `/guild`**：**`AllianceList`** 待確認申請（接受／拒絕）＋血盟夥伴列表；**血盟** tab **角標**與列表皆 **`useSWR`**（**`pendingAlliances`／`myAlliances`**），操作成功後 **`mutate`**；**三 tab 內容**以 **`hidden`／`block`** 切換，**`AllianceList` 不隨 tab unmount**。

### 2025-03-24 — 村莊／市集：matching、Layer 2 分域、`getVillageUsersAction`／`getMarketUsersAction`

- **Layer 4**：新增 **`src/lib/utils/matching.ts`** — **`isOrientationMatch`**（雙向 **`canSee`**）、**`calcInterestScore`**、**`calcSkillScore`**（互補／同好）。
- **Layer 2**：**`findVillageUsers`**（同縣市、**`active`**、精簡 **`select`**，含 IG 欄）；**`findMarketUsers`** 改為全台 **`active`**、精簡 **`select`**（**不含** IG 欄）。
- **Layer 3**：**`getVillageUsersAction`**、**`getMarketUsersAction`**（**`'use server'`**）；村莊：**性向篩選**＋**興趣分數**排序；市集：**互補優先、同好次之**，**Perfect Match** 仍優先浮上，**暱稱／技能**關鍵字篩選。
- **Layer 5**：**`VillageContent`** 列表 **不**顯示技能（**`UserCard`** **`variant="village"`**，興趣最多 **3 +N**）；**`MarketContent`** 搜尋（**300ms debounce**）、**`variant="market"`**（**skills_offer** 琥珀、**skills_want** 天藍，各最多 **3 +N**）；兩者併入 **`/explore`**；完整技能與自白仍在 **`UserDetailModal`**。

### 2025-03-24 — 註冊條款 Modal（`terms.ts`／`TermsModal`）

- **Layer 4**：新增 **`src/lib/constants/terms.ts`**，匯出 **`TERMS_OF_SERVICE`**（傳奇公會使用者條款全文）。
- **Layer 5**：新增 **`src/components/auth/TermsModal.tsx`**（可滾動內文、關閉與「我已閱讀並同意條款」）。
- **Layer 5 — `register-form.tsx`**：條款區改為 **「我同意」**（**`label`** 連結勾選框）＋可點 **「冒險者公會使用者條款」** **`button`** 開啟 **`TermsModal`**（避免連結包在 **`label`** 內誤觸勾選）。

### 2025-03-24 — 註冊五步／Step5 Modal、性別二元、明確上一步路由

- **Layer 4 — `adventurer-questionnaire.ts`**：**`GENDER_OPTIONS`** 僅 **`male`／`female`（男／女）**；舊值 **`non_binary`／`prefer_not`** 若仍在 DB，顯示可經 **`resolveLegacyLabel`**／原字串 fallback。
- **Layer 5 — `registration-step-indicator.tsx`**：**`activeStep: 1 | 2 | 3 | 4 | 5`**，圈圈 **1—2—3—4—5**。
- **Layer 5 — `/register/interests`**：**`RegistrationStepIndicator activeStep={4}`**；僅興趣 **`TagSelector`**；完成時 **`sessionStorage.setItem('reg_interests', …)`** 後 **`router.push('/register/skills')`**；**無**完成 Modal；**上一步** **`router.push('/register/profile')`**（**不使用** **`router.back()`**）。
- **Layer 5 — `/register/skills`**：完整 **Client** 頁；讀 **`reg_interests`** 與 **`skillsOffer`／`skillsWant`**，呼叫 **`completeRegistration`**；**我能教**在上、**我想學**在下；**跳過**以空技能陣列完成；成功後**全螢幕歡迎 Modal**；**上一步** **`router.push('/register/interests')`**。
- **Layer 5 — `profile-form.tsx`**：名冊第一步之**上一步** **`router.push('/register')`**；內部步驟仍 **`goBack`**（**`setStep`**）。
- **Layer 3**：**`completeRegistration`** 仍於 Step5（或跳過）寫入 **`interests`／`skills_offer`／`skills_want`**。

### 2025-03-24 — 舊問卷資料顯示相容與遷移 SQL（待手動執行）

- **Layer 4 — `adventurer-questionnaire.ts`**：**`resolveLegacyLabel`**（新選項 → **`LEGACY_*_MAP`** → 原字串）、**`resolveOfflineOkLabel`**（**`offline_ok` boolean**）；**`LEGACY_REGION_MAP`**（含 **`island`／`islands`**）、**`LEGACY_ORIENTATION_MAP`**、**`LEGACY_OFFLINE_MAP`**。
- **Layer 5**：**`UserDetailModal`**、**`UserCard`** 之地區／線下顯示經 **`resolveLegacyLabel`**／**`resolveOfflineOkLabel`**（**不**顯示性向）；**`guild-profile-home`** 本人問卷摘要含性別・地區・性向・線下（性向僅此處展示）。
- **🗄️**：**`supabase/migrations/20260324150000_migrate_legacy_region_orientation.sql`** 已產生，**請確認後再在 Supabase 手動執行**，勿當作自動部署唯一依賴。

### 2025-03-24 — 註冊問卷 UI（Step1／2）與 UserDetailModal 緣分

- **Layer 4 — `adventurer-questionnaire.ts`**：**Step1** 性別英文 value、中文 label（**僅** **`male`／`female`（男／女）**）；**地區**改為完整台灣縣市（value／label 皆繁中），**海外（自填）**另填文字後存 **`海外・…`**；**Step2** 性向三選（**`heterosexual`／`homosexual`／`pansexual`**）；線下意願 **`in_person`／`online_only`／`both`**（**`offline_ok`**：`in_person` 或 `both` 為 **true**）。
- **Layer 5 — `profile-form.tsx`**：上一步／下一步與完成鈕 **`flex-1` + `py-4`** 統一高度；**`/register/interests` 等標籤頁**主按鈕 **`py-4`**。性別、地區、性向、線下意願為**原生 `<select>`**（iOS／Android 系統選擇器可滾動）；**`@base-ui` Select** 已移除。性別／地區另見 **「註冊五步指示器…」** 之膠囊 **`rounded-full`** 樣式與全線 **1〜5** 步指示器。
- **Layer 3 — `adventurer-profile.action.ts`**：**`questionnaire.region`** 改為 **`string`**（已解析繁中）；伺服端檢查非空與長度。
- **Layer 5 — `UserDetailModal.tsx`**：緣分鈕 **`handleToggleLike`／`confirmCancelLike`** 與 **`toggleLikeAction`**；**`AlertDialog`** 標題「確定取消緣分？」、**再想想／確定取消**（**`glass-panel`**）；初始狀態仍由 **`getLikeStatusForTargetAction`** 載入。

### 2025-03-24 — 註冊標籤三步與編輯頁（`interests`／`skills_offer`／`skills_want`）

- **Layer 4**：**`src/lib/constants/tags.ts`**（**`TagCategory`**、**`INTEREST_CATEGORIES`／`SKILL_CATEGORIES`**、**`ALL_*_TAGS`**）；**`interests.ts`／`skills.ts`** re-export。
- **Layer 5 — 註冊**（後續已拆 Step4／Step5，見下方 **2025-03-24 — 註冊五步／Step5 Modal**）：**`src/components/register/TagSelector.tsx`**；**`/register/interests`** → **`/register/skills`**；**`/register/matchmaking`**（預留）。
- **Layer 5 — 事後編輯**（歷史）：曾用 **`onboarding/TagSelector`**；已於後續改為與註冊相同之 **`register/TagSelector`**（見 **2025-03-24 — edit-tags／Git 規則**）。
- **Layer 3**：**`register.action.ts`** 之 **`completeRegistration`** 經 **`user.repository`** **`updateProfile`** 寫入 **`interests`／`skills_offer`／`skills_want`**。
- **註冊動線**：**`middleware`** 放行 **`/register/interests`**、**`/register/skills`**（完整技能頁）、**`/register/matchmaking`**，以及舊路徑 **`/register/skills-offer`／`skills-want`**（**`redirect`** 至 **`/register/interests`**）；須已登入且**已建 profile**。
- **事後修改**：**`/profile/edit-tags`** 三 Tab（興趣／能教／想學），各 Tab 獨立 **「儲存」**；首頁 **「興趣與技能標籤」** 手風琴標題旁 **✏️ 編輯**（**`Link`**、`stopPropagation`）連結至此頁。
- **Layer 3**：**`updateMyProfile`**（**`profile-update.action.ts`**）支援 **`interests`／`skills_offer`／`skills_want`**；**`revalidatePath('/profile/edit-tags')`**。
- **配對語意**：市集 **Perfect Match** 仍以 **我想要的 ∩ 對方提供的** 與 **對方想要的 ∩ 我提供的** 為基礎（**`skills_want` ↔ `skills_offer`** 互相呼應）；村莊經 **`isOrientationMatch`** 後以 **`calcInterestScore`**（興趣重疊數）排序。

### 2025-03-24 — UserDetailModal／UserCard／首頁 EXP 文案

- **Layer 5 — `UserDetailModal.tsx`**：頂部資訊區**下方**顯示**今日心情**（**`isMoodActive` + `getMoodCountdown`**，僅有效期內）；自白改為 **`bio_village`**／**`bio_market`** 雙欄，移除單一 **`bio`** 區；興趣／技能改為**雙區抬頭**（**興趣村莊**紫標、**技能市集**琥珀／天藍標籤合併）。緣分按鈕：**`getLikeStatusForTargetAction`** 載入初始狀態（**`likeLoading`**）、**`toggleLikeAction`** 更新 **已送出／送出**；已送出時再點以 **`AlertDialog`** 二次確認「你確定要結束這段緣分嗎？」後才取消。呼叫端傳入之 **`UserRow`** 須含 **`mood`、`mood_at`、`bio_village`、`bio_market`、`interests`、`skills_offer`、`skills_want`**；村莊／市集列表經 **`findVillageUsers`**／**`findMarketUsers`** 之精簡 **`select`** 已涵蓋（市集列不含 **`instagram_handle`**／**`ig_public`**，Modal 內 IG 區可能為空）。
- **Layer 5 — `UserCard.tsx`（村莊／市集共用）**：**`variant="village"`** 僅顯示興趣（最多 **3 +N**）；**`variant="market"`** 顯示 **skills_offer／skills_want**（各最多 **3 +N**）；列表頭像 **48px 正圓**；無頭像時 **首字**占位。
- **Layer 5 — `guild-profile-home.tsx`**：等級列旁數值標籤由 **`total_exp`** 改為 **`EXP`**（數值仍為 **`total_exp`**）。

### 2025-03-24 — `.cursorrules` Git 自動推送；**`/profile/edit-tags`** 統一 **`register/TagSelector`**；移除 **`onboarding/TagSelector`**

- **`.cursorrules`**：**「Git 自動推送規則」** — 任務完成／修改完畢／已實作／已更新時，預設執行 **`git add -A`** → **`git commit -m "feat/fix: …"`** → **`git push`**（使用者明令不要推送時除外）。
- **Layer 5**：**`edit-tags-client.tsx`** 改為 **`import TagSelector from '@/components/register/TagSelector'`**，分類自 **`@/lib/constants/tags`**；興趣與能教／想學皆 **`customAllowed`**、**`maxCustom={3}`**；仍 **`updateMyProfile`**。
- **移除**：**`src/components/onboarding/TagSelector.tsx`**（已無引用）。

### 2025-03-24 — 註冊標籤：`tags.ts`、`register/TagSelector`、合併 Step4 **`/register/skills`**

- **Layer 4**：新增 **`src/lib/constants/tags.ts`**（興趣／技能分類與內建標籤、**`ALL_INTEREST_TAGS`／`ALL_SKILL_TAGS`**）；**`interests.ts`／`skills.ts`** 改為自 **`tags.ts`** re-export。
- **Layer 5**：新增 **`src/components/register/TagSelector.tsx`**（已選預覽、分類手風琴、可選自訂標籤）；**`/register/interests`**（Step3，興趣暫存 **`sessionStorage.reg_interests`**）→ **`/register/skills`**（Step4，**我能教／我想學**切換）→ **`/`** 或 **`/register/matchmaking`**（月老預留頁）。
- **Layer 3**：新增 **`src/services/register.action.ts`** **`completeRegistration`**（**`updateProfile`** 一次寫入三欄位）。
- **相容**：**`/register/skills-offer`／`skills-want`** 改為 **`redirect('/register/skills')`**；**`middleware`** 補登 **`/register/skills`**、**`/register/matchmaking`**。

### 2025-03-24 — `/register/interests` 單頁合併技能；**`/register/skills`** 改轉址

- **（已由「註冊五步／Step5 Modal」取代）** 歷史：**`interests`** 曾合併技能勾選與 **`completeRegistration`**；**`/register/skills`** 曾改 **`redirect('/register/interests')`**。現行流程見上方 **2025-03-24 — 註冊五步／Step5 Modal、性別二元、明確上一步路由**。

### 2025-03-24 — `LoadingButton`、防連點與 Toast 統一

- **Layer 5 — `src/components/ui/LoadingButton.tsx`**：共用 **`LoadingButton`**（內部 **`useRef` lock** 防連點；可選 **`loading` 受控**）＋ **`PendingLabel`**（spinner + 文案，預設 **「處理中…」**）；**`active:scale-95`**，**disabled** 時 **`disabled:active:scale-100`**；可轉傳 **`aria-label`** 等 button 屬性。
- **套用處**：**`register-form`** 建立帳號；**`profile-form`** 下一步（**`LoadingButton`**）／完成（**`PendingLabel` + `loading`**）；**`/register/skills`** 完成（自管 **submitting**）；**`guild-profile-home`** 簽到列（**`PendingLabel`**）、今日心情／雙自白／帳號設定 IG／裁切確認；**`UserDetailModal`** 緣分鈕（**`LoadingButton`**，`likeLoading` 時 **disabled**）＋取消緣分 **AlertDialog** 確定鈕內 **PendingLabel**。
- **註冊名冊**：**`profile-form`** 之 **「下一步」** 以 **`LoadingButton`** 包 **`goNext()`**（**`await Promise.resolve()`** 後執行，避免同幀連點）；完成送出維持 **`<button type="submit">`** + **`PendingLabel`**。
- **Toast 規範（Sonner）**：簽到成功改以 **`guild-profile-home`** **Dialog** 呈現（**無** success **toast**）；已簽／冷卻 **「還在冷卻中，明天再來！」**（仍 **toast.success**）；送出緣分 **「💖 緣分已送出！」**（互有緣分仍保留 **🎉 互有緣分！**）；取消緣分 **「緣分已取消」**；自白成功 **「✅ 已更新」**；心情 **「今日心情已更新 ✨」**；IG 綁定 **「IG 帳號已綁定」**；IG 申請 **「申請已送出，等待管理員審核」**；上述流程之 API 失敗統一 **「❌ 操作失敗，請稍後再試」**（表單驗證類訊息仍可維持原 **toast.error** 具體文案）。

### 2025-03-24 — 性向隱私：`UserDetailModal`／`UserCard` 移除展示

- **Layer 5**：**`UserDetailModal.tsx`**、**`UserCard.tsx`** 完全移除性向列；**`guild-profile-home.tsx`** 仍顯示本人性向（見「`public.users` 與程式約定」之**性向隱私與用途**）。
- **文件**：**`HANDOFF.md`** 補充 **`orientation`** 為配對用非展示欄位、後台可篩選但前端不呈現篩選條件。

### 2025-03-24 — `users.core_values`（jsonb）與註冊問卷原生 `<select>`

- **🗄️**：**`public.users.core_values`** 為 **`jsonb`**（註冊 Step2 三題答案 slug 陣列）；與 **`completeAdventurerProfile`**／**`database.types.ts`** 對齊；雲端若缺欄請補 DDL 並 **Reload schema**。
- **Layer 5 — `profile-form.tsx`**：性別、地區、性向、線下意願四欄改為**原生 `<select>`**，避免 **Base UI Select** 在窄螢幕／iOS 選單超出畫面；框內顯示選項**中文 label**，空白為灰色 **「請選擇…」** 佔位；步進與送出前驗證必填。

### 2025-03-24 — 註冊四步指示器、帳號頁膠囊與名冊 Step2 下拉樣式

- **Layer 5 — 全線步驟語意**（五步指示器）：**`1`**＝**`/register`**；**`2`—`3`**＝**`/register/profile`** 內兩步（暱稱／問卷＋核心價值）；**`4`**＝**`/register/interests`**；**`5`**＝**`/register/skills`**。名冊內已不再含第三段興趣標籤（已移除與 Step4 重複之「技能與興趣」區）。
- **Layer 5 — `register-form.tsx`**：標題 **「加入傳奇公會」**、副標 **「建立你的冒險者帳號」**；**Email／密碼／確認密碼／IG／邀請碼** 為登入同款**膠囊原生 `input`**（**`bg-zinc-900/50`**、**`rounded-full`**、**`pl-11`**、**`text-base`**）；密碼與確認欄 **Eye／EyeOff** 切換；**送出前**檢查兩次密碼一致、**至少 6 字且含英文＋數字**（不符則 **toast**，不呼叫 **signUp**）；IG 輸入即時 **`replace` 空白**。
- **Layer 5 — `profile-form.tsx`**：性別、地區下拉改 **膠囊形原生 `<select>`**（**`rounded-full`**、**`bg-zinc-900/50`**、**`ChevronDown`** 右側裝飾、**`colorScheme: dark`**）；性向／線下維持原 **rounded-2xl** 原生選單（內容不變）。

### 2025-03-23 — iOS textarea 與帳號設定 Dialog

- **Layer 5 — `guild-profile-home.tsx`**：今日心情／興趣自白／技能自白 **textarea** 改 **`text-base`**，**`onFocus`** 內 **`setTimeout` + `scrollIntoView({ behavior: 'smooth', block: 'center' }, 300)`**。**「帳號設定」Dialog**（導覽列同文案）：移除通用 **bio** 與 **`AlertDialog`**；保留 **IG 帳號輸入**（**確認儲存**）與 **`ig_public`** 開關；說明引導至首頁區塊編輯。
- **Layer 3 — `profile-update.action.ts`**：**`updateMyProfile`** 支援 **`instagram_handle`**（**`instagramHandleSchema`**；空字串 → **null**）。
- **Layer 5 — `app/layout.tsx`**：**`export const viewport`** 增 **`maximumScale: 1`**（**不**用 **`user-scalable=no`**），與 **`text-base`** 並用抑制 iOS 聚焦縮放。

### 2025-03-23 — 首頁個人卡：今日心情獨立卡、狀態手風琴、標籤雙區

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**自「我的狀態」移出，與頭像卡同級之獨立 **`glass-panel`**，常駐展開。**我的狀態**僅含三區：**自白**、**信譽與紀錄**、**興趣與技能標籤**，皆以 **`openSection`** 手風琴呈現，預設收折。**興趣與技能標籤**改為 **興趣村莊**（紫抬頭／紫標籤）與 **技能市集**（琥珀抬頭；**`skills_offer`** 琥珀、**`skills_want`** 天藍，合併顯示）。編輯 Modal 說明同步指向「今日心情」卡片與「我的狀態」手風琴。

### 2025-03-23 — 編輯 Modal：IG 公開開關（藍色可視化）

- **Layer 5 — `guild-profile-home.tsx`**：編輯資料 Modal 內 **IG 公開** 改為 **`role="switch"`** 自訂按鈕軌道（**`bg-blue-500`**／**`bg-zinc-600`**、白球位移），取代 shadcn **`Switch`**，行為仍為 **`onIgPublicChange` → `updateMyProfile({ ig_public })`**。

### 2025-03-23 — 頭像：react-easy-crop 裁切＋Cloudinary（廢除 Storage 上傳）

- **依賴**：**`react-easy-crop`**（**`npm install react-easy-crop`**）。
- **Layer 4 Utils**：**`src/lib/utils/cropImage.ts`** — **`getCroppedImg(imageSrc, pixelCrop)`**，以 **`canvas.drawImage`** 裁切 **react-easy-crop** 之 **`croppedAreaPixels`**，**`toBlob`** 回傳 **Blob**。
- **Layer 4 Utils**：**`src/lib/utils/cloudinary.ts`** — **`uploadAvatarToCloudinary(File)`**（unsigned preset、**`folder: avatars`**）。
- **Layer 5 — `guild-profile-home.tsx`**：選圖後開啟 **fixed 全螢幕** 黑底裁切層；**膠囊按鈕**「取消」（關閉並 **`revokeObjectURL`**）、「確認裁切」（**`getCroppedImg` → File → Cloudinary → `updateMyProfile`**）；上傳中鎖定按鈕與主頭像觸發。
- **Layer 3 — `profile-update.action.ts`**：僅接受 **HTTPS** **`avatar_url`**；註解已標明**不**經 Supabase Storage。
- **專案內** **`guild-profile-home`／`updateMyProfile`** 已**無** **`supabase.storage`**／**`bucket`**／**`avatars` bucket** 上傳程式碼（**`createClient()`** 仍用於 **登出**）。

### 2026-03-24 — 效能修復 Phase 1：Middleware／RSC 重複查詢 Profile

- **Layer 1／快取**：新增 **`src/lib/supabase/get-cached-profile.ts`** — **`getCachedProfile(userId)`** 以 **`unstable_cache`** 包住 **`findProfileById`**，**`revalidate: 30`**，**`tags: [\`profile-${userId}\`]`**（與 **`revalidateTag`** 對齊）。
- **Layer 3 — `auth-status.ts`／`auth.service.ts`**：**`deriveAuthStatus`**（Middleware）僅 **`findProfileById`**；**`getAuthStatus`**（RSC）使用 **`getCachedProfile`**（**`unstable_cache` 30s**）。**禁止**在 Middleware 鏈上 import **`next/cache`**，否則 Edge 報 **`incrementalCache missing in unstable_cache`**／**`MIDDLEWARE_INVOCATION_FAILED`**。
- **Layer 3**：**`updateMyProfile`**（**`profile-update.action.ts`**）成功後 **`revalidateTag(profileCacheTag(user.id))`**；**`completeAdventurerProfile`**（**`adventurer-profile.action.ts`**）成功後同樣 **`revalidateTag`**，避免更新後仍讀舊快取。**`updateMyProfile`** 內驗證用 **`findProfileById`** 仍為即時讀取（未改為快取）。

### 2026-03-24 — 效能修復 Phase 2：頭像優化（Avatar／Cloudinary／next/image）

- **設定**：**`next.config.mjs`** 新增 **`images.remotePatterns`**：**`https://res.cloudinary.com/**`**。
- **Layer 5**：新增 **`src/components/ui/Avatar.tsx`** — **`next/image`**（**`loading="lazy"`**、**`sizes`**）；Cloudinary URL 將 **`/upload/`** 改為 **`/upload/w_{size×2},h_{size×2},c_fill,q_auto,f_auto/`**；非 Cloudinary 之 **`avatar_url`** 仍用 **`<img>`**（未列入 **`remotePatterns`** 時避免執行期錯誤）。
- **套用**：**`UserCard`**、**`UserDetailModal`**、**`/guild`** 血盟／待確認列表、**`guild-profile-home`** 首頁大頭貼（**`div` wrapper** 保留點擊上傳、**`fileInputRef`**、上傳中遮罩與桌面 **「更換」** hover）。

### 領袖頭像雷框（`master`／`MasterAvatarShell`）

- **設定檔**：**`src/lib/constants/master-avatar-frame.ts`** — **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`**（雷框 PNG）、**`MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT`**（閃電 Lottie，建議略大於框）；**`FRAME_SIZE_PERCENT`** 為框比例別名（除錯用）。
- **`Avatar.tsx`**（**`use client`**）：自設定檔 **import** **`FRAME_SIZE_PERCENT`**；首次掛載時 **`console.log('當前框框比例:', FRAME_SIZE_PERCENT)`**（全頁只印一次）；根節點 **`data-frame-size-percent`** 供 DevTools 對照；並 **re-export** 三常數。**`MasterAvatarShell`** 自 **`Avatar.tsx`** 讀取框／閃電兩個百分比。
- **裁切**：**`.glass-panel`** 在 **`globals.css`** 含 **`overflow-hidden`**，會切掉超出圓形的雷框；**`guild-profile-home`** 頂部個人區塊在 **`role === "master"`** 時加 **`!overflow-visible`** 覆蓋；頭像區外層 **`flex`** 直欄亦加 **`overflow-visible`**。**圖層**：雷框／Lottie 在 **下層**（**`z-[1]`／`z-[2]`**），**圓形照片在上層**（**`z-[10]`**），避免 PNG 壓臉；框／閃電仍可依百分比 **> 100%** 向外超出 **`size`**。上傳／「更換」遮罩仍在按鈕上 **z-20**。
- **套用點**：**`UserCard`**、**`UserDetailModal`**、**`/guild`**、**`ChatModal`**、**`TavernModal`**、**`LeaderToolsSheet`**、**`guild-profile-home`**。
- **除錯**：改常數後請**硬重新整理**或**重啟 `npm run dev`**；確認 **`role === "master"`**。

### 2026-03-24 — 效能修復 Phase 3：Modal 社交狀態合併查詢

- **Layer 3 — `social.action.ts`**：新增 **`getModalSocialStatusAction(targetUserId)`** 與型別 **`ModalSocialStatus`** — 單次 **`createClient().auth.getUser()`** 後 **`Promise.all`**：**`findLike`**（我→對方）、**`findLike`**（對方→我）、**`findAllianceBetween`**（與 **`getAllianceStatusAction`** 相同資料來源）；回傳 **`isLiked`／`isLikedByThem`／`isMutualLike`／`allianceStatus`／`allianceId`／`currentUserId`**。
- **Layer 5 — `UserDetailModal.tsx`**：移除 **`getLikeStatusForTargetAction`**、**`checkMutualLikeWithTargetAction`**、**`getAllianceStatusAction`** 與瀏覽器 **`createClient().auth.getUser()`** 等**多段** **`useEffect`**；改為 **`open` 時**一次 **`getModalSocialStatusAction`**；緣分切換、取消緣分、血盟申請／接受／解除後皆 **`getModalSocialStatusAction`** 刷新。**Modal 開啟時由多次伺服端／客戶端 auth 查詢收斂為合併 action 內 1 次 **`getUser`**（客戶端不再為 Modal 單獨拉 session）。**

### 2026-03-24 — 效能修復 Phase 4：市集搜尋快取自己的技能

- **Layer 3 — `market.service.ts`**：新增 **`getCachedMySkills(userId)`** — **`unstable_cache`** 僅查 **`skills_offer`／`skills_want`**，**`revalidate: 60`**，**`tags: [profileCacheTag(userId)]`**；**`getMarketUsersAction`** 改用它取代每次 **`users` `.select`**。**`updateMyProfile`**（及建檔 **`completeAdventurerProfile`**）既有 **`revalidateTag(profileCacheTag)`** 會一併失效此快取，無需額外 **`revalidateTag`**。

## 效能修復紀錄（Phase 1-4）

Phase 1 — Middleware Profile 快取

- **`getCachedProfile`**（**`unstable_cache` 30s**）
- **middleware** 與首頁 RSC 共用快取
- **效果**：每次換頁減少 1 次 DB 查詢

Phase 2 — 頭像優化

- **`next/image`** + Cloudinary 縮圖參數
- **Avatar** 共用元件
- **效果**：頭像從原圖縮為顯示尺寸，節省 90%+ 流量

Phase 3 — Modal 查詢合併

- **`getModalSocialStatusAction`** 一次 auth + 並行查詢
- **效果**：**`/explore` First Load -57kB**，Modal 開啟 3 次 auth → 1 次

Phase 4 — 市集搜尋快取

- **`getCachedMySkills`**（跟著 profile cache 失效）
- **效果**：搜尋不重複查自己的技能

### 2026-03-24 — Keep-alive API（`/api/ping`）

- **API**：**`src/app/api/ping/route.ts`** — **`GET /api/ping`** 回傳 **`{ ok: true, time }`**，**`time`** 為 **`new Date().toISOString()`**（UTC）；作為 keep-alive／健康檢查端點，見上表「關鍵檔案索引」。

### 2026-03-24 — Middleware：`matcher` 排除 **`api`**

- **`src/middleware.ts`**：**`export const config.matcher`** 負向先行斷言含 **`api`**（並含 **`manifest.json`**、**`icons`**、**`.*\..*`** 等），**`/api/*`** 整段不掛載 middleware，**`/api/ping`** 不經 Session／Profile 流程；函式內 **`isApiOrStatic`**（**`pathname.startsWith("/api/")`**）仍保留，雙重保險。

### 2026-03-25 — 修復 Middleware：`unstable_cache` 不可於 Edge 使用

- **現象**：Vercel **`MIDDLEWARE_INVOCATION_FAILED`**／**`Invariant: incrementalCache missing in unstable_cache`**。
- **原因**：**`deriveAuthStatus`** 經 **`getCachedProfile`** 呼叫 **`next/cache`** 之 **`unstable_cache`**；Middleware 跑在 **Edge**，無 **incremental cache**。
- **修正**：**`deriveAuthStatus`**（**`auth-status.ts`**）改為僅 **`findProfileById`**；**`getAuthStatus`**（**`auth.service.ts`**）保留 **`getCachedProfile`**。共用 **`buildAuthStatus`**。

### 2026-03-25 — 首頁今日心情卡／興趣標籤「編輯」強制重套用

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**獨立區外層已依規格重設（**`rounded-3xl`**、**`border-violet-500/30`**、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、**`p-4 space-y-3`**、**紫微光 `box-shadow`**）；標題 **✨ 今日心情** 與倒數 **還有 …**；確認鈕改為指定之紫膠囊 class。**興趣與技能標籤**手風琴標題列：**✏️ 編輯** 改為 **`Link` → `/profile/edit-tags`**（**`stopPropagation`**），與標題文字同一行左側、▼ 仍在右側。

### 2026-03-25 — Tab 切換效能：`/guild` 與 `/explore` 避免重複 API

- **Layer 5 — `guild/page.tsx`**：**血盟／聊天／信件** 改為 **`hidden`／`block`** 顯示，**`AllianceList` 單次 mount**，切 tab **不再**因切換而重打列表 API。（後續見下 **「`/guild` 改用 SWR」**：角標與列表改由 **`useSWR`**＋**`mutate`** 更新。）
- **Layer 5 — `ExploreClient.tsx`**：（後續見 **「`ExploreClient` 改用 SWR」**）以 **`useSWR`** 取代 **`useEffect` 預載市集**；**`VillageContent`／`MarketContent`** 仍 **`hidden`／`block`** 切 tab。
- **效能**：減少 **tab 往返**時之重複 **Server Action** 請求。

### 2026-03-25 — SWR 基礎架構（套件與 Provider）

- **依賴**：安裝 **`swr`** 套件（**`npm install swr`**）。
- **Layer 4**：新增 **`src/lib/swr/keys.ts`** — 匯出 **`SWR_KEYS`** 常數（**`profile`／`villageUsers`／`marketUsers(query)`／`myAlliances`／`pendingAlliances`**；後續擴充 **`conversations`／`messages(id)`／`unreadNotifications`／`notifications`**，見 **`useChat.ts`**）。
- **Layer 5／設定**：新增 **`src/lib/swr/provider.tsx`** — **`SWRConfig`** 全域預設：**`revalidateOnFocus: false`**、**`revalidateOnReconnect: true`**、**`dedupingInterval: 30000`**（30 秒內不重複請求）、**`errorRetryCount: 2`**。
- **Layer 5 — `src/app/(app)/layout.tsx`**：**`SWRProvider`** 包住 **`AppShellMotion`** 與 **children**。
- **範圍**：尚未改動任何頁面或資料抓取邏輯，僅基礎架構（Provider + keys）。

### 2026-03-25 — `ExploreClient` 改用 SWR（村莊＋市集）

- **Layer 5 — `src/components/explore/ExploreClient.tsx`**：**`useSWR(SWR_KEYS.villageUsers, () => getVillageUsersAction().then(…))`**，**`fallbackData: initialVillageUsers`**、**`revalidateOnFocus: false`**、**`revalidateOnMount: false`**（沿用 SSR 列表，進客戶端不強制重抓）。
- **市集**：**`useSWR(SWR_KEYS.marketUsers(query), () => getMarketUsersAction(query).then(…))`**，**`revalidateOnFocus: false`**、**`keepPreviousData: true`**（搜尋換 key 時保留上一筆列表，**`isLoading`** 僅無快取資料時為 true，搭配 **`MarketContent`** 可減少骨架閃爍）。
- **移除**：市集 **`useState`（列表／loading／loaded）**、**`useEffect` 預載**、**`handleMarketQueryChange` 內重複呼叫 action**；搜尋僅更新 **`query`**，由 SWR key 觸發請求。
- **`explore/page.tsx`**：維持僅伺服端預載村莊，**無** **`initialMarketUsers`**。

### 2026-03-25 — `/guild` 改用 SWR（血盟列表與角標）

- **Layer 5 — `src/app/(app)/guild/page.tsx`**：**`GuildPage`** 以 **`useSWR(SWR_KEYS.pendingAlliances, getPendingRequestsAction)`** 取得 **`pendingCount`**（角標）；**`AllianceList`** 以 **`useSWR(SWR_KEYS.myAlliances, getMyAlliancesAction)`** 與 **`useSWR(SWR_KEYS.pendingAlliances, …)`** 取得列表資料。
- **移除**：**`useState`／`useEffect`／`useCallback`** 手動載入與 **`onListsChanged`** callback。
- **更新**：接受血盟成功後 **`mutatePending()`** 與 **`mutateAlliances()`**；拒絕後 **`mutatePending()`**；與 **`GuildPage`** 共用 **`pendingAlliances`** key，角標與待確認列表一併 revalidate。
- **UI**：初次載入 **`alliancesLoading || pendingLoading`** 時仍顯示原骨架屏。

### 2026-03-25 — 首頁改為 Client Component + SWR（`useMyProfile`）

- **Layer 4 Hook**：新增 **`src/hooks/useMyProfile.ts`** — **`useSWR(SWR_KEYS.profile, () => getMyProfileAction())`**、**`revalidateOnMount: true`**；回傳 **`{ profile, isLoading, mutate }`**。
- **Layer 3**：新增 **`src/services/profile.action.ts`** — **`getMyProfileAction()`**（**`'use server'`**）：**`createClient().auth.getUser()`** → **`getCachedProfile(userId)`**，未登入回傳 **`null`**。
- **Layer 5 — `src/app/(app)/page.tsx`**：改為 **`'use client'`**；以 **`useMyProfile`** 取代原 **`getAuthStatus` SSR**；**`isLoading || !profile`** 時顯示 **`HomePageSkeleton`**（頭像卡＋心情卡＋狀態卡三組 `animate-pulse`）；`profile === null` 時 **`router.push('/login')`**（客戶端防禦；主防線仍為 **middleware**）。
- **Middleware**：matcher 仍包含 **`/`**，未登入時 Edge 端 redirect **`/login`**，**不需修改**。
- **`/` First Load JS**：**227 kB**（原 222 kB，增 ~5 kB SWR client bundle）；路由從 `ƒ Dynamic` 變 `○ Static`（殼靜態預渲染、資料客戶端載入）。
- **SWR 改造完成**：**`/`（home）**、**`/explore`**、**`/guild`** 三頁皆已改用 **`useSWR`**。

### 2026-03-25 — `AppShellMotion` 頁面切換動畫（輕量）

- **Layer 5 — `src/components/layout/app-shell-motion.tsx`**：（**已由 2026-03-26 開門動畫取代**，見下則。）曾使用 **`AnimatePresence`** **`mode="sync"`**、**`motion.div`** **opacity** **0.08s**。

### 2026-03-26 — 首頁公告滿版垂直堆疊 + 路由「開門」過場（splash 雙扇 → 簾幕由下往上）

- **Layer 5 — `guild-profile-home.tsx`**：公告改 **`w-full`** 垂直列表；置頂／一般樣式與 **`line-clamp-2`＋「⋯ 展開」**（截斷偵測）；整卡開 **Dialog**。
- **Layer 5 — `app-shell-motion.tsx`**：（**後續**）改**上下對開**：**`pathname` 變更** → 上／下扇合屏（**150ms**）→ 停 **150ms** → 上往上、下往下滑出（**1.8s**）；**`splash`** **`backgroundSize: 100% 200%`** + **`center top`／`bottom`**（**X** 中線接縫、各頁一致）；**`z-30`**、**`--nav-reserve`**。（**再後續**：改 **`fixed` 全視窗**、**時序 100ms／1s／1s**、首頁不播等 — 見檔末 **「2026-03-26 — Layer 5：過場 fixed 全視窗…」**。）
- **Layer 3 — `notification.action.ts`**：**`getMyNotificationsAction`** 移除 **`unstable_cache`**，改直接 **`loadNotificationsForUser`**（改善 **`/guild` 信件** SWR 首包體感）。
- **Layer 5 — `guild/page.tsx` `MailBox`**：**`revalidateOnFocus: false`**、**`dedupingInterval: 3000`**。

### 2026-03-25 — 首頁「今日心情」框深紫微光（規格對齊）

- **Layer 5 — `guild-profile-home.tsx`**：今日心情區最外層 **`section`** 使用 **`rounded-3xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-xl p-4 space-y-3`** 與 **`boxShadow: '0 0 20px rgba(139,92,246,0.15)'`**；標題列 **✨ 今日心情** 與 **還有 {countdown}**（**`countdown &&`**）；確認鈕為紫膠囊（**`px-5 py-1.5 rounded-full text-xs`** 等）。

### 2026-03-25 — `/profile/edit-tags` 標籤分類預設全收折

- **Layer 5 — `edit-tags-client.tsx`**：興趣／能教／想學三個 **`TagSelector`** 皆加上 **`defaultOpenCategory={null}`**，與註冊 **`/register/interests`**、**`/register/skills`** 一致，進頁時分類手風琴**預設全部收折**。

### 2026-03-25 — **`likes`** 雲端無 **`id`**／Layer 2 查詢對齊

- **🗄️**：**`public.likes`** 僅 **`from_user`**、**`to_user`**（無 **`id`**）；**`database.types.ts`** 之 **`likes.Row`／`Insert`／`Update`** 已移除 **`id`**（及多餘 **`created_at`** 型別），與實表一致。
- **Layer 2 — `like.repository.ts`**：**`insertLike`** 改為 **`Promise<void>`**，insert 後**不** `.select()`；**`findLike`**、**`checkMutualLike`** 之 **`.select('from_user, to_user')`**，避免 PostgREST 讀取不存在欄位。

### 2026-03-25 — 有緣分／血盟 UX 與 **`alliances`** 成對唯一

- **Layer 2 — `like.repository.ts`**：**`likes`** 表無 **`id`**；**`insertLike`** 僅 **insert**、**`Promise<void>`**、不讀回傳列；**`findLike`**／**`checkMutualLike`** 僅 **`.select('from_user, to_user')`**（與上則一致，避免 **42703**）。
- **Layer 5 — `UserDetailModal.tsx`**：**「申請血盟」** 按鈕 **`allianceRequesting`** 防連點、**disabled** 與轉圈 **「處理中…」**。
- **Layer 3 — `social.action.ts`**：**`toggleLikeAction`** 在 **取消愛心**（**`deleteLike`** 成功）後，若雙人血盟為 **`pending`** 或 **`accepted`**，以 **`updateAlliance(…, { status: 'dissolved' })`** 自動撤銷；失敗吞掉不影響取消緣分。
- **🗄️**：專案內新增遷移 **`supabase/migrations/20260325183000_alliances_pair_unique.sql`**（**`alliances_pair_unique`** on **`(user_a, user_b)`**）；雲端若尚無此約束，請於 Supabase SQL Editor 執行或套用遷移。

### 2026-03-25 — Layer 2 **`chat.repository`** 與聊天相關型別

- **Layer 2**：新增 **`src/lib/repositories/server/chat.repository.ts`** — **admin client**；**`getOrCreateConversation`**、**`findConversationById`**、**`getMessages`**、**`sendMessage`**、**`getMyConversations`**、**`markMessagesAsRead`**、**`blockUser`**、**`unblockUser`**、**`isBlocked`**、**`submitReport`**。
- **型別**：**`database.types.ts`** 新增 **`conversations`**、**`chat_messages`**、**`blocks`**、**`reports`** 之 **Row／Insert／Update**（及匯出 **`ConversationRow`**、**`ChatMessageRow`**、**`BlockRow`**、**`ReportRow`**）。
- **實作備註**：**`getOrCreateConversation`** 以 **`.eq(user_a).eq(user_b)`** 查既有列（字典序 **`[a,b].sort()`**）；**`sendMessage`** 更新對話 **`last_message`**／**`last_message_at`** 失敗時僅 **`console.error`**，不影響訊息寫入。
- **🗄️**：雲端須建立對應 **`public`** 表與 RLS／FK 後再接 Layer 3／UI；與既有 **`messages`**（舊式一對一訊息）表可並存至遷移完成。

### 2026-03-25 — Layer 3 **`chat.action`**／**`notification.action`**

- **Layer 3 — `src/services/chat.action.ts`**：**`getOrCreateConversationAction`**、**`getMessagesAction`**（先以 **`findConversationById`** 確認 **`user_a`／`user_b`** 含目前使用者，再 **`getMessages`**＋**`markMessagesAsRead`**）、**`sendMessageAction`**（長度 ≤500、**`trim`**）、**`getMyConversationsAction`**（附 **`partner`** **`findProfileById`**）、**`blockUserAction`**／**`unblockUserAction`**、**`submitReportAction`**（寫入 **`reports`** 後 **`blockUser`**）。**`createClient()`** 與專案一致為**同步**（無 **`await`**）。
- **Layer 2 補充**：**`chat.repository`** 新增 **`findConversationById`**，供上述權限檢查。
- **Layer 3 — `src/services/notification.action.ts`**：**`getMyNotificationsAction`**（欄位 **`kind`／`title`／`body`／`read_at`／`metadata`**，與 **`database.types`** 一致；發送者由 **`metadata.from_user`** 或 **`from_user_id`** 解析後 **`findProfileById`**）、**`markAllNotificationsReadAction`**（**`read_at`** 設為目前時間，**`.is('read_at', null)`**）、**`clearAllNotificationsAction`**、**`getUnreadNotificationCountAction`**（**`read_at` is null**）。

### 2026-03-25 — Layer 4 **`useChat`** 與 **SWR_KEYS**（聊天／通知）

- **Layer 4 — `src/hooks/useChat.ts`**（**`'use client'`**）：**`useConversations`** — **`useSWR(SWR_KEYS.conversations, getMyConversationsAction)`**、**`revalidateOnFocus: false`**；**`useMessages(conversationId)`** — key **`SWR_KEYS.messages(id)`** 或 **`null`**、**`getMessagesAction`**、**`refreshInterval: 0`**（預留 Realtime，不輪詢）；**`useUnreadNotificationCount`** — **`SWR_KEYS.unreadNotifications`**、**`getUnreadNotificationCountAction`**、**`revalidateOnFocus: true`**、**`refreshInterval: 30_000`**；回傳 **`isLoading`**／**`mutate`**（未讀數另含 **`count`**）。
- **Layer 4 — `src/lib/swr/keys.ts`**：新增 **`conversations`**、**`messages(conversationId)`**、**`unreadNotifications`**、**`notifications`**（供通知列表等後續接線）。

### 2026-03-25 — Layer 5 **`ChatModal`** 與 **`UserDetailModal`** 聊聊接線

- **Layer 5 — `src/components/chat/ChatModal.tsx`**：全螢幕私訊；**`useMessages`**（**`open`** 時才訂閱 key）；**Realtime** 監聽 **`chat_messages`** **INSERT** 後 **`mutate`**；**`sendMessageAction`** 送出與錯誤 **toast**；檢舉原因選單後 **`submitReportAction`**（後端已 **`blockUser`**）成功 **toast** 並關閉；safe-area 頂底；主層 **`z-[100]`**、檢舉層 **`z-[110]`**。
- **Layer 5 — `UserDetailModal.tsx`**：**💬 聊聊** 呼叫 **`getOrCreateConversationAction`**，成功則 **`ChatModal`**（**`targetUser`**／**`socialStatus.currentUserId`**）；關閉詳情 Modal 時重置 **`showChat`**／**`conversationId`**；開啟對話中按鈕 **disabled** 與「開啟中…」。

### 2026-03-25 — **`/guild`** 聊天／信件 Tab、血盟開聊、信件未讀紅點

- **Layer 5 — `guild/page.tsx`**：**`ChatList`** — **`useConversations`** 列表（**`last_message`／`last_message_at`**、**`partner`**），點列開 **`ChatModal`**（**`createClient().auth.getUser()`** 取 **`currentUserId`**；**`partner` 缺漏**時以 **`user_a`／`user_b`** 推導對象 id）。
- **同上 — `MailBox`**：**`useSWR(SWR_KEYS.notifications, getMyNotificationsAction)`**；**`read_at`** 判斷未讀與紫框；**`kind`** 對應文案（**`like`**、**`alliance_*`**、**`system`** 等）或退回 **`body`／`title`**；**`markAllNotificationsReadAction`**／**`clearAllNotificationsAction`** 成功後 **`mutate` 列表**＋**`useSWRConfig().mutate(SWR_KEYS.unreadNotifications)`** 同步底欄紅點。
- **同上 — `AllianceList`**：夥伴列改 **`button`**，**`getOrCreateConversationAction(partner.id)`** 後 **`ChatModal`**；**`chatOpeningId`** 防連點與「開啟中…」；失敗 **toast**。
- **同上 — `GuildPage`**：**`useUnreadNotificationCount`**；**信件** tab **紅點**（**>9** 顯示 **9+**）；**血盟** pending 角標同規則 **9+**。
- **`ChatModal`**：**Supabase Realtime** **`chat_messages`** **INSERT** 即時 **`mutate`**（與探索／詳情 Modal 行為一致）。

### 2026-03-25 — 通知寫入、取消愛心 Sheet z-index、心情過期清空

- **Layer 3 — `alliance.action.ts`**：**`requestAllianceAction`** 成功後 **`notifyAllianceRequest`**（**`insertNotification`**：**`type: "alliance_request"`**、**`from_user_id`**）；**`respondAllianceAction`** 接受後寫入 **`type: "alliance_accepted"`** 給 **`initiated_by`**（見下「通知欄位 **`type`／`from_user_id`**」）。
- **（後續已改）** 新私訊**不再**寫入 **`notifications`**，見下 **「2026-03-25 — 冒險團私訊 UX」**。
- **Layer 5 — `UserDetailModal.tsx`**：取消愛心 Sheet 容器 **`z-50`** → **`z-[100]`**，確保蓋過 Radix Dialog。
- **Layer 5 — `guild-profile-home.tsx`**：心情倒數 **`useEffect`** 過期時 **`setMoodInput("") + setMoodAt(null)`**；過期清空 **`useEffect`** 的 **`setTimeout`** 回呼同步 **`setMoodAt(null)`**。

### 2026-03-25 — 血盟／通知查詢分開查、通知欄位對齊、診斷用 **`console.error`**

- **Layer 2 — `alliance.repository.ts`**：**`findAcceptedAlliancesWithPartners`**／**`findPendingIncomingWithRequester`** 不再使用 **`users!alliances_*_fkey`** embed，改為查 **`alliances`** 後 **`Promise.all`** 查 **`users`**（待確認仍 **`neq('initiated_by', userId)`**＋**`or(user_a,user_b)`**，與字典序成對語意一致）。
- **Layer 3 — `notification.action.ts`**：**`getMyNotificationsAction`** 僅 **`select`** 通知欄位，再以 **`from_user_id`** 分查發送者；錯誤時 **`console.error('getMyNotificationsAction 失敗:', error)`**。
- **型別／寫入**：**`notifications`** 以 **`type`**（非 **`kind`**）、**`from_user_id`**（非 **`metadata.from_user`**）、**`message`**、**`is_read`** 與 DB 一致；**`alliance.action`／`chat.action`／`social.action`** 之 **`insertNotification`** 已對齊；**`/guild`** **`MailBox`** 以 **`notif.type`／`notif.is_read`** 顯示。
- **🗄️**：新增遷移 **`supabase/migrations/20260325220000_notifications_type_from_user_message.sql`**（舊表 **`kind`／`title`／`body`／`metadata`／`read_at`** → 新欄位）；雲端需執行後 **Reload schema**。
- **診斷**：**`notifyAllianceRequest`**、接受血盟後通知、**`sendMessageAction`** 內通知之靜默 **`catch`** 改為 **`console.error`**；**`getMyAlliancesAction`** **`catch`** 改為 **`getMyAlliancesAction 失敗:`**。

### 2026-03-25 — 冒險團私訊 UX：預覽、未讀、底欄紅點、血盟詳情、IG 連結

- **🗄️**：**`conversations.last_message_sender_id`**（最後一則發送者，列表 **你：／對方：**）；遷移 **`20260325230000_conversations_last_message_sender.sql`**。
- **Layer 2 — `chat.repository.ts`**：**`sendMessage`** 更新 **`last_message_sender_id`**；**`getConversationIdsWithUnreadFromOthers`**、**`countConversationsWithUnreadFromOthers`**（**`chat_messages`** **`sender_id != 我`** 且 **`is_read = false`**）。
- **Layer 3 — `chat.action.ts`**：**`getMyConversationsAction`** 回傳 **`hasUnreadFromPartner`**；**`getUnreadChatConversationsCountAction`**；**`sendMessageAction`** **不再** **`insertNotification`**（私訊僅靠聊天列表＋底欄／tab 紅點）。
- **Layer 3 — `profile.action.ts`**：**`getMemberProfileByIdAction`**（已登入讀取他人 **`UserRow`**，血盟詳情 Modal）。
- **Layer 4**：**`useUnreadChatConversationsCount`**、**`SWR_KEYS.unreadChatConversations`**；**`GuildTabProvider`**／**`useGuildTabContext`**（**`/guild`** 子 tab 同步）。
- **Layer 5 — `Navbar`**：**冒險團**圖示未讀 **紅點**＋**`drop-shadow` 發光**（**信件 ∪ 私訊**；**`/guild`＋聊天 tab** 時略過私訊未讀計入底欄）。
- **Layer 5 — `guild/page.tsx`**：血盟夥伴 → **`UserDetailModal`**；聊天列 **預覽前綴**、**未讀紅點**；**聊天／信件** tab **紅點**。
- **Layer 5 — `UserDetailModal`**：**Instagram** **https** 外連按鈕（**`lib/utils/instagram.ts`**）。
- **Layer 5 — `ChatModal`**：**SWR** 同步 **`conversations`／`unreadChatConversations`**（送出、讀取後、Realtime）。

### 2026-03-26 — 首頁 tsParticles 背景（Among Us 配方）

- **依賴**：**`tsparticles@3.0.3`**（**`loadFull`** 全套，內含原 slim／emitters 等；**不再**直接依賴 **`@tsparticles/slim`**）、**`@tsparticles/react@3.0.0`**（npm 最新即 **3.0.0**，與 **engine 3.0.3** peer 相容）、**`@tsparticles/engine@3.0.3`**、**`@tsparticles/shape-image@3.0.3`**（Among Us **`images`** 形狀）。
- **設定**：執行時優先 **`GET /particles.json`**（**`public/particles.json`**，可替換配方不必重編譯）；程式仍強制 **`fullScreen.enable: false`**；失敗時退回 **`src/config/home-particles.json`**。含 **emitters** 圖片 **`particles.js.org`** 之 cyan Among Us。
- **Layer 5**：**`HomeParticlesBackground.tsx`** — **`initParticlesEngine`**：**`loadFull(engine)`** → **`loadImageShape(engine)`**；**`initParticlesEngine(...).then(() => setEngineReady(true))`**；**`id`**：**`tsparticles-home-${useId}`**；**`fetch` + `JSON.parse`** 與 **`tryNormalizeOptions`** 防禦，失敗／無效則 **`console.error`** 並退回內建 JSON，避免首頁白屏；**`normalizeParticleOptions`** 強制 **`background.color` → `transparent`**；**`Particles`**：**`fixed inset-0 z-[1]`**、**`width/height: 100%`**、**`pointer-events-none`**。

### 2026-03-26 — `conversations` 最後訊息欄位、`useUnreadChatCount`、底欄未讀合計語意

- **🗄️**：**`public.conversations.last_message_sender_id`**（最後一則發送者 uuid，列表 **你：／對方：**）；遷移 **`supabase/migrations/20260325230000_conversations_last_message_sender.sql`**（雲端若尚未執行請補）。
- **Layer 2 — `chat.repository.ts`**：**`sendMessage`** 更新對話列時寫入 **`last_message`**、**`last_message_at`**、**`last_message_sender_id`**（**`payload.sender_id`**）。
- **Layer 4 — `useChat.ts`**：新增 **`useUnreadChatCount`**，為 **`useUnreadChatConversationsCount`** 之**別名**（同一 **SWR key**：**`SWR_KEYS.unreadChatConversations`**；仍由 **`getUnreadChatConversationsCountAction`** → **`countConversationsWithUnreadFromOthers`**，**未**另建 **`getUnreadChatCountAction`** 以免重複邏輯）。
- **Layer 5 — `guild/page.tsx`**：**`/guild`** 頂部「聊天」tab 角標使用 **`useUnreadChatCount()`**（與先前 **`useUnreadChatConversationsCount`** 行為相同）。
- **Layer 5 — `Navbar.tsx`**：**冒險團**圖示紅點／發光條件為 **`(信件未讀 + 私訊未讀對話數)`**（在 **`/guild`** 對應子分頁時略過同類重複提示）**或** **待確認血盟**（在血盟分頁時略過 pending 角標）。

### 2026-03-26 — 管理員後台 Wave 1

路由結構：
- `/admin` → 儀表板（master + moderator）
- `/admin/users` → 用戶管理（master + moderator）
- `/admin/reports` → 檢舉管理（master + moderator）
- `/admin/roles` → 授權管理（master only）
- `/admin/settings` → 系統設定（master only，Wave 2 預留）

角色 SSOT：
- **master** = 最高領袖
- **moderator** = 版主
- **member** = 一般成員
- ⚠️ 不存在 **admin** 或 **leader** 角色；後台權限判斷一律用 **`master`**／**`moderator`**

新增 DB 欄位：
- **`users.reputation_score`**（integer, default 100）
- **`users.ban_reason`**（text, nullable）
- **`users.suspended_until`**（timestamptz, nullable）
- **`users.notes`**（text, nullable）
- **`users.role`** enum 改為：`member` / `moderator` / `master`
- **`users.status`** enum 改為：`pending` / `active` / `suspended` / `banned`

新增表：**`admin_actions`** / **`moderator_permissions`** / **`system_settings`** / **`advertisements`** / **`ad_clicks`**

廢棄：**`src/app/(app)/admin/ig-requests/page.tsx`**（IG 審核整合進 `/admin/users` 用戶詳情 Sheet）

- **Layer 2**：**`src/lib/repositories/server/admin.repository.ts`** — `getDashboardStats`、`findUsersForAdmin`、`findUserDetailById`（含 email via admin auth）、`updateUserStatus`、`insertAdminAction`、`adminAdjustExp`、`adjustReputation`、`findStaffUsers`、`updateUserRole`、`findModeratorPermissions`、`upsertModeratorPermissions`、`findAllSystemSettings`、`updateSystemSetting`
- **Layer 3**：**`src/services/admin.action.ts`** — `requireRole` 權限驗證 helper → 各 action（`getDashboardStatsAction`、`getUsersAction`、`getUserDetailAction`、`banUserAction`、`suspendUserAction`、`unbanUserAction`、`adjustExpAction`、`adjustReputationAction`、`getReportsAction`、`resolveReportAction`、`getStaffUsersAction`、`updateUserRoleAction`、`getModeratorPermissionsAction`、`updateModeratorPermissionsAction`、`getSystemSettingsAction`、`updateSystemSettingAction`、`getPendingIgRequestsForUserAction`、`reviewIgRequestFromAdminAction`）
- **Layer 4**：**`src/lib/constants/admin-permissions.ts`** — `PERMISSION_LABELS`、`DEFAULT_MODERATOR_PERMISSIONS`、`SYSTEM_SETTING_LABELS`、`ADMIN_ROLES`、`MASTER_ONLY_ROLES`
- **Layer 5**：獨立 `(admin)` route group layout（白底 sidebar、violet-600 品牌色、收合式側欄；**`layout.tsx`** 根層 **`text-gray-900`**、**`[color-scheme:light]`** 避免系統深色下表單反白）；**`src/middleware.ts`** 新增 `/admin/*` 路由守衛（master/moderator 放行，moderator 限 `/admin`、`/admin/users`、`/admin/reports`）
- **ig-request.action.ts**：`isStaffRole` 改為 `master` / `moderator`（原 `admin` / `leader` 已廢棄）

### 2026-03-26 — 邀請碼管理模組（`/admin/invitations`）

- **🗄️**：**`public.invitation_codes`**（`id` uuid PK、`code` text UNIQUE、`created_by` uuid FK→users、`used_by` uuid nullable FK→users、`used_at` timestamptz nullable、`expires_at` timestamptz nullable、`is_revoked` boolean default false、`note` text nullable、`created_at` timestamptz default now()）。
- **型別**：**`database.types.ts`** 新增 **`invitation_codes`** 之 **Row／Insert／Update／Relationships**；匯出 **`InvitationCodeRow`**、**`InvitationCodeDto`**（含 **`creator`**／**`user`** 關聯用戶簡介）。
- **Layer 2**：**`src/lib/repositories/server/invitation.repository.ts`** — **`findAllInvitationCodes`**（分開查 users 避免 FK embed）、**`findInvitationByCode`**、**`insertInvitationCode`**／**`insertInvitationCodes`**（批量）、**`revokeInvitationCode`**／**`revokeUnusedInvitationCodes`**、**`claimInvitationCode`**（註冊成功後標記使用）、**`findInvitationTree`**（查 `users` 的 `invited_by` 建樹）、**`findSystemSettingByKey`**（讀取 `system_settings` 單一設定值，供邀請碼有效天數預設讀取）。
- **Layer 3**：**`admin.action.ts`** 新增 — **`getInvitationCodesAction`**、**`generateInvitationCodeAction`**（8碼英數大寫隨機碼，loop 確保唯一最多 5 次；預設有效天數從 `system_settings.invitation_expire_days` 讀取；0 = 永不過期）、**`generateBatchInvitationCodesAction`**（最多 50 張）、**`revokeInvitationCodeAction`**（已使用不可撤銷）、**`getInvitationTreeAction`**（扁平陣列 → 樹狀 DTO）、**`validateInviteCodeAction`**（註冊用：code 在表中且有效才放行，不在表中也放行保持相容）、**`claimInviteCodeAfterRegisterAction`**（註冊後靜默標記使用）。產生／撤銷皆寫入 **`insertAdminAction`**。
- **Layer 5**：**`/admin/invitations`**（`'use client'`）三 Tab — ① **邀請碼列表**（篩選：全部／未使用／已使用／已撤銷／已過期；桌面 table＋手機 card；badge 色系 emerald/blue/red/gray；操作：複製＋撤銷；**產生 Dialog** 有效天數＋備註 → 大字 font-mono 結果碼＋一鍵複製；**批量 Dialog** 數量 1–50＋列表＋全部複製）② **邀請樹狀圖**（recursive 縮排、Avatar＋暱稱＋等級 badge＋加入時間、最多 5 層）③ **使用統計**（六張數字卡：總數／使用率／未使用／已撤銷／已過期／本週新產生）。
- **Sidebar**：**`(admin)/layout.tsx`** 新增 **📨 邀請碼管理** 於「用戶管理」與「檢舉管理」之間（master + moderator）。
- **註冊整合（舊）**：~~`validateInviteCodeAction`／`claimInviteCodeAfterRegisterAction`~~ → 改見下方 **2026-03-27**。

### 2026-03-27 — 邀請碼強制驗證、多人上限與 `invitation_code_uses`

- **🗄️**：遷移 **`supabase/migrations/20260327120000_invitation_code_uses_and_claim_rpc.sql`** — **`invitation_codes.max_uses`／`use_count`**、表 **`invitation_code_uses`**、函式 **`public.claim_invitation_code(p_code text, p_user_id uuid)`**（**`SECURITY DEFINER`**、`FOR UPDATE`、插入 use 列後遞增 **`use_count`**，若 **`use_count >= max_uses`** 則 **`is_revoked = true`**）。
- **型別**：**`database.types.ts`** — **`InvitationCodeUseRow`**、**`invitation_code_uses`** 表、**`Functions.claim_invitation_code`**。
- **註冊**：**`register-form.tsx`** 邀請碼必填；**`onBlur`** **`validateInvitationCodeAction`**；送出前再驗；**`register-step1.ts`** schema **`inviteCode` min(1)**。**`completeAdventurerProfile`** 成功後依 **`user_metadata.invite_code`** 呼叫 **`claimInvitationCodeAction`**（失敗 **`console.error`** 不阻擋建檔）。
- **後台**：**`/admin/invitations`** — 產生／批量 **使用人數上限 1–100**；列表 **使用次數** 與進度條；列展開 **`getInvitationCodeUsesAction`**；樹狀圖節點顯示註冊用碼與 **tooltip**。**`LeaderToolsSheet`** 產碼帶 **`maxUses: 1`**。

### 2026-03-26 — 後台 EXP 管理（`/admin/exp`）與領袖前台快捷面板

- **Layer 2 — `admin.repository.ts`**：新增 **`batchGrantExp`**（對指定 userId 陣列 **`Promise.allSettled`** 並行發放，逐人寫 **`exp_logs`** + 更新 **`users.total_exp`**，unique_key **`admin_grant:{source}:{userId}`**）、**`grantExpToAll`**（查全 active 用戶 → `batchGrantExp`）、**`grantExpByLevel`**（查 level 範圍 active → `batchGrantExp`）、**`findExpLogsByUser`**（分頁）、**`findAdminExpGrantHistory`**（查 `exp_logs` unique_key LIKE `admin_grant:%` 依 source 分組摘要）。
- **Layer 3 — `admin.action.ts`**：**`batchGrantExpAction`**（master+moderator；上限 200 人、delta 1–1000、source 必填）、**`grantExpToAllAction`**（**master only**）、**`grantExpByLevelAction`**（master+moderator）、**`getExpLogsByUserAction`**、**`getAdminExpGrantHistoryAction`**。
- **Layer 5 — `/admin/exp`**（`'use client'`）三 Tab：① **批量發放**（名稱＋EXP 數量＋發放對象三選：勾選用戶搜尋列表 / 全體 active（master only 黃色警告） / 指定等級範圍；AlertDialog 確認摘要；執行結果成功 N / 失敗 N）② **發放紀錄**（依 source 分組展開）③ **用戶查詢**（搜尋暱稱 → 完整 exp_logs 分頁表：時間、來源、EXP 變動、unique_key）。
- **Sidebar**：新增 **🎁 EXP 管理** 於邀請碼管理之後（master + moderator）。
- **Middleware**：`moderatorAllowed` 新增 **`/admin/exp`**。
- **前台領袖快捷面板**：**`UserDetailModal.tsx`** 當 **`myProfile.role === 'master'`** 時 DialogFooter 底部顯示 **「⚡ 領袖工具」** 按鈕；點擊開啟 **`LeaderToolsSheet.tsx`**（**portal `body`**，**`z-[940]`／`z-[950]`**）；載入時 **`getMemberProfileByIdAction`** 取完整資料（含 IG）。
  - **📸 Instagram**：強制顯示 **`instagram_handle`**（不受 `ig_public` 限制）＋外連按鈕。
  - **⭐ 快速發放 EXP**：數量 1–1000 ＋理由（必填）→ **`adjustExpAction`** → toast。
  - **📨 發送邀請碼**：**`generateInvitationCodeAction`** → **`getOrCreateConversationAction`** → **`sendMessageAction`** 自動私訊邀請碼。
  - **🚫 黑名單**：active → **`banUserAction`**（AlertDialog＋理由必填）；banned → **`unbanUserAction`**；master 不能對自己操作。

### 2026-03-26 — 發布中心：公告管理＋廣告管理＋前台顯示

- **🗄️**：**`public.announcements`**（`id` uuid PK、`title` text、`content` text、`image_url` text nullable、`is_pinned` boolean default false、`is_active` boolean default true、`created_by` uuid FK→users、`created_at` timestamptz default now()、`updated_at` timestamptz default now()）。
- **型別**：**`database.types.ts`** 新增 **`announcements`** 之 **Row／Insert／Update／Relationships**；匯出 **`AnnouncementRow`**、**`AnnouncementDto`**（含 **`creator`** 關聯用戶簡介）。
- **Layer 2 — `announcement.repository.ts`**（新檔）：**`findAllAnnouncements`**（後台，含停用，分開查 users 取 creator）、**`findActiveAnnouncements`**（前台，`is_active = true`，最多 20 筆）、**`insertAnnouncement`**、**`updateAnnouncement`**、**`deleteAnnouncement`**。
- **Layer 2 — `admin.repository.ts`**（廣告）：**`findAllAdvertisements`**、**`findActiveHomeAds`**（`position='card'`、`is_active=true`、時間範圍內、最多 3 則）、**`insertAdvertisement`**、**`updateAdvertisement`**、**`deleteAdvertisement`**、**`recordAdClick`**（寫 `ad_clicks` + 更新 `click_count`）。
- **Layer 3 — `admin.action.ts`**（公告）：**`getAnnouncementsAction`**、**`createAnnouncementAction`**（標題 ≤100 字、內文 ≤2000 字）、**`updateAnnouncementAction`**、**`deleteAnnouncementAction`**、**`toggleAnnouncementPinAction`**、**`toggleAnnouncementActiveAction`**。所有 action 經 `requireRole(['master','moderator'])`。
- **Layer 3 — `admin.action.ts`**（廣告）：**`getAdvertisementsAction`**、**`createAdvertisementAction`**（權重 1–10）、**`updateAdvertisementAction`**、**`deleteAdvertisementAction`**、**`toggleAdvertisementAction`**。所有 action 經 `requireRole(['master','moderator'])`。
- **Layer 3 — `announcement.action.ts`**（前台）：**`getActiveAnnouncementsAction`**（`unstable_cache` 60s，tag `announcements`）。
- **Layer 3 — `advertisement.action.ts`**（前台）：**`getHomeAdsAction`**（`unstable_cache` 300s）、**`recordAdClickAction`**（靜默記錄點擊）。
- **Layer 5 — `/admin/publish`**（`'use client'`）兩 Tab：① **公告管理**（建立 Dialog 含標題 100 字限制＋內文 2000 字限制＋圖片預覽＋置頂 Switch；卡片式列表，置頂公告 📌 排最上；操作：置頂 toggle、啟用/停用 toggle、編輯、刪除 ConfirmDialog）② **廣告管理**（建立 Dialog 含標題＋說明＋圖片＋連結＋位置選擇＋權重 1–10＋上下架時間＋啟用 Switch；table（桌機）/card（手機）列表，位置 badge 色彩分明；操作同上）。
- **Sidebar**：新增 **📣 發布中心** 於 EXP 管理之後（master + moderator）。
- **Middleware**：`moderatorAllowed` 新增 **`/admin/publish`**。
- **前台公告區塊**（`guild-profile-home.tsx` 頁面最頂部）：置頂 **`w-full`**（**`rounded-2xl`**、**`px-4 py-3`**、**`bg-amber-950/40 border-amber-500/30`**）；一般公告 **`w-full`**（**`rounded-xl`**、**`px-4 py-3`**、**`bg-zinc-900/50 border-zinc-700/30`**），多則 **`space-y-2` 垂直堆疊**（**不**橫滑）；內文 **`line-clamp-2`**，截斷時 **「⋯ 展開」**；**點整卡**開 **Dialog**（完整內容＋圖片）；無公告時完全不顯示。
- **前台廣告區塊**（`guild-profile-home.tsx` 今日心情下方）：**`贊助`** 小標＋橫向滑動 card 廣告（**`min-w-[240px]`**，圖片 `h-32 object-cover`＋標題＋說明）；點擊開連結 + 靜默 **`recordAdClickAction`**；無廣告時完全不顯示。

### 2026-03-26 — Layer 5：過場 `fixed` 全視窗、探索 `dvh`、後台淺色語意、Sheet 瀏海、儀表板導航

- **`app-shell-motion.tsx`**：雙扇改 **`fixed top-0`／`fixed bottom-0`**、**`z-[9999]`**，與主內容同層級但疊於其上；內容包裝**移除 `overflow-hidden`**，避免裁切 fixed。首頁 **`/`** 不觸發過場。底部 **pb 預留區** **`bg-zinc-950`** 條，減輕切至 **`/explore`** 時透出外層 radial 的藍帶閃爍。外層／內容區 **`min-h-[100dvh]`**；**`ExploreClient`** 根節點 **`min-h-[100dvh]`** 與 shell 對齊。
- **`(admin)/layout.tsx`**：根節點 **`text-gray-900`** + **`[color-scheme:light]`**，系統深色模式下後台表單／checkbox 標籤不再繼承 **`body` 淺色 `foreground`** 而看不見。
- **`components/ui/sheet.tsx`**：**`SheetContent`** **`pt-[max(0.75rem,env(safe-area-inset-top,0px))]`**，全站 Sheet（含用戶詳情）避開瀏海／動態島。
- **`/admin/page.tsx`（儀表板）**：改 **`use client`**，**`useEffect`** 載入 **`getDashboardStatsAction`**；統計卡 **`cursor-pointer`**、**`hover:shadow-md hover:scale-[1.02] transition-all duration-150`**，點擊 **`router.push`**：**今日新增** → **`/admin/users?filter=today`**、**待審核** → **`?filter=pending`**、**待處理檢舉** → **`/admin/reports?filter=pending`**、**活躍** → **`?filter=active`**、**本週血盟** → **`/admin/users`**、**待處理 IG** → **`?filter=ig_pending`**。
- **`/admin/users`**：**`page.tsx`** 讀 **`searchParams.filter`**，**`pending`／`active`** 預先帶入 **`getUsersAction`** 之 **`status`**；**`UsersClient`** 接收 **`initialFilter`**：**`today`** 客戶端以台北日曆日 **`sv-SE` + `Asia/Taipei`** 比對 **`created_at` 字首**（先拉一頁較大 **`pageSize`** 再篩）；**`ig_pending`** 目前僅顯示篩選標籤與「清除篩選」，**完整「僅列有 pending `ig_change_requests` 用戶」**待 Layer 2 **`findUsersForAdmin`** 擴充。
- **`/admin/exp`**：等級範圍改 **`type="text"`** 數字過濾＋送出前 **1–10／min≤max** **`toast` 驗證**（見先前批次）。

*最後更新：2026-03-26 — **管理員後台 Wave 1**、**邀請碼／EXP／發布中心**、**過場 `fixed` 全視窗**、**後台淺色語意／Sheet safe-area**、**儀表板導航**；併 **首頁 tsParticles 背景**、**`last_message_sender_id`**、**`useUnreadChatCount`**、**Navbar 未讀**、2026-03-25 **冒險團私訊 UX** 等。*

---

[2026-03-29] — HANDOFF 雙檔架構與主檔精簡

完成項目

- 依指定區塊重寫 **`HANDOFF.md`**：標題「傳奇公會 HANDOFF.md」、五層架構、DB SSOT、關鍵檔案索引（一行一項）、**資料庫表清單**（`public` 主要表＋一行用途）、**最近完成**（僅保留最新 3 次）、**目前已知問題**、**下一步待辦**、子檔說明（**`HANDOFF_HISTORY.md` 不主動讀取**）。
- 主檔「最近完成」輪轉：原第 4 條摘要改由本條歸檔（完整 Wave 3 長文仍見本檔上方「Wave 3 — 動態七日獎勵…」等區塊）。
- **`.cursorrules`**：在任務規範區新增 **「HANDOFF 雙檔更新規範」**（讀取規則、每次任務完成後 **`HANDOFF.md` + `HANDOFF_HISTORY.md`** 更新要點、HISTORY 追加格式）；**「新對話與 HANDOFF 同步」**改為對齊主檔與該規範。讀取規則中：**DB 深查**可再讀 **`HANDOFF_DB.md`**；**功能完成度／Wave** 可讀 **`HANDOFF_FEATURES.md`**（與既有子檔並存）。

主檔已移出之「最近完成」摘要（歸檔）

- **2026-03-28 — Wave 3 七日獎勵／工具列／裝備**：`streak_reward_settings`；`FloatingToolbar`；首頁七格 UI；裝備背包；`claimDailyCheckin` 讀 DB 獎勵；另含 `user_rewards`／`prize_items` 批次合併修復、後台 Sidebar／moderator 權限與 middleware 對齊。

資料庫異動

- 無（僅文件與規範）。

需要注意

- 主檔須維持 **≤300 行**；每次任務後依規範更新「最近完成」並將第 4 條起下放到本檔。
- 預設不主動讀 **`HANDOFF_HISTORY.md`**；使用者明確要求查歷史時再讀。

Git

chore: establish HANDOFF dual-file architecture for context efficiency

（SHA 請以 `git log -1 --oneline` 查閱；同一次提交內無法寫入與自身一致的 hash。）

---

[2026-03-29] — 金幣後台完整金流、改名卡／廣播券背包、廣播與酒館跑馬燈對調

完成項目

1. **後台 `/admin/coins`（`coins-admin-client.tsx` + `page.tsx` 註解）**
   - **Tab「金幣調整」**：暱稱搜尋列表選用戶；顯示探險幣／純金餘額；幣種、數量（`type="text"` 正則）、原因（必填）；呼叫 **`adjustCoinsAction`**（即 **`adminAdjustCoinsAction`**）。
   - **Tab「金流紀錄」**：用戶暱稱（可空白）、幣種、交易類型篩選；列表台北時間、暱稱、類型／幣種 badge、正綠負紅、說明；每頁最多 100 筆分頁。
2. **Layer 3 `adminAdjustCoinsAction`**
   - **`requireRole(['master'])`**；正負數皆可；**`creditCoins`** 防止餘額負數；**`coin_transactions.source` 統一為 `admin_adjust`**（型別已寫入 **`database.types.ts`**）；**`admin_actions`**、**`notifyUserMailboxSilent`** 保留。
   - **移除四位數金幣 PIN**（與本次規格對齊；若需復活可再接回 `coin_admin_pin`）。
3. **Layer 2 `findCoinTransactionsWithFilters`**（`coin.repository.ts`）
   - 依暱稱搜尋（解析為 `user_id`）、`coin_type`、`txCategory`（對應多個 `source`）；**`created_at DESC`**；回傳列含 **`user_nickname`**。
   - Layer 3 **`getAdminCoinLedgerAction`**（master／moderator 可讀）。
4. **改名卡／廣播券背包（`getMyRewardsAction`）**
   - **`broadcast`／`rename_card`** 僅 **`used_at IS NULL`** 列入 **`broadcasts`** 與 **`allRewards`**；張數以未使用為準；用盡後格子消失。
5. **`consumeRenameCardAction`**
   - 最早一張未用卡；**`nicknameSchema`**（含不雅字）+ **`updateMyProfile({ nickname })`**；**`markUserRewardConsumed`**；**`revalidateTag(profileCacheTag)`**；回傳 **`{ ok: true, newNickname }`**。
6. **`updateMyProfile`**（`profile-update.action.ts`）支援 **`nickname`**。
7. **`FloatingToolbar` 裝備背包**
   - 裝備類：**裝備／已裝備 ✓**；**廣播**開 Dialog → **`submitBroadcastAction`**；**改名卡**開 Dialog → **`consumeRenameCardAction`** + **`mutateProfile` SWR** + 關 Sheet；**釣餌／釣竿** toast 前往釣魚頁。
8. **廣播 vs 酒館位置**
   - **`TavernMarquee`**：僅 **`getActiveBroadcastsAction`**；固定頂 **`z-[45]`**、**`bg-amber-950/80`**、輪播、**`broadcastEffect`**；無廣播不占版。
   - **`AppBroadcastChrome`** + **`AppShellMotion.broadcastExtraTopPx`**：有廣播時內容區額外 **36px**。
   - **`guild-profile-home`**：**`HomeTavernMarqueeBanner`**（**`useTavern`** 最新 5 則、CSS 跑馬燈）；移除首頁內嵌廣播輪播；**`page.tsx`／`home-page-client`** 不再傳 **`activeBroadcasts`**。
9. **商城流水標籤**：**`admin_adjust`** →「管理調整」。

資料庫異動

- 無新增遷移檔。程式使用 **`source = 'admin_adjust'`**；若雲端對 **`coin_transactions.source`** 有 **CHECK／enum** 限制，需手動補 **🗄️ DDL** 納入 **`admin_adjust`**。

需要注意

- 後台金幣調整已不再驗證 **`coin_admin_pin`**。
- 首頁頂部 padding 與固定廣播並存時，依 **`2rem + safe-area + 36px`** 計算（見 **`app-shell-motion.tsx`**）。

Git

358c6c7 fix: coins admin + rename card + broadcast consumed + marquee swap

---

[2026-03-29] — 後台金幣調整恢復 PIN

完成項目

- **`adminAdjustCoinsAction`**：參數 **`pin`**；驗證四位數並比對 **`system_settings`** 鍵 **`coin_admin_pin`**。
- **`coins-admin-client.tsx`**：調整 Dialog **`type="password"`** 四位數輸入（數字過濾）、送出前與成功後清空。

資料庫異動

- 無。

Git

130816e fix(admin): restore coin adjust PIN (coin_admin_pin)

---

[2026-03-29] — 酒館跑馬燈／廣播橫幅分離、system_settings 與後台設定

完成項目

1. **🗄️ Supabase MCP**：**`INSERT INTO system_settings`** **`tavern_marquee_mode`**、**`tavern_marquee_speed`**、**`broadcast_style`**、**`broadcast_speed`**（**`ON CONFLICT DO NOTHING`** + **`NOTIFY pgrst`**）；本機遷移 **`20260329210000_tavern_broadcast_system_settings.sql`** 同步。
2. **Layer 3 `getMarqueeAndBroadcastSettingsAction`**（**`system-settings.action.ts`**）：**`unstable_cache` 60s**、**`tags: ['system_settings']`**；回傳 **`marquee`／`broadcast`** 結構。保留舊 **`getMarqueeSettingsAction`**（**`marquee_speed_seconds`**／**`marquee_broadcast_effect`**）供相容，後台 UI 已改寫新 key。
3. **`TavernMarquee.tsx`**：僅酒館；**`useTavern`** 最新 5 則；**scroll**（**`marquee-scroll`**、**`tavern_marquee_speed` 秒**）、**fade**（opacity 循環）、**bounce**（timeout + in/out class）；**`h-8`**、**`bg-zinc-900/60`**；掛於 **`guild-profile-home.tsx`** 頂部（隨頁捲動）。
4. **`BroadcastBanner.tsx`**：**`getActiveBroadcastsAction`** + 新設定；**fixed `z-[45]`**、約 **40px** 高；**fullscreen** 全屏 **`z-[200]`** + 繼續／自動 **`broadcast_speed`** 秒；六樣式 **glow／flicker／fire／lightning／flow** 與切換動畫；**`AppBroadcastChrome`** 預留 **`BROADCAST_COMPACT_HEIGHT_PX`（40）**。
5. **`globals.css`**：**`marquee-scroll`**、**bounce**、**flicker／fire／lightning／flow-gradient**、橫幅 enter 動畫等。
6. **`(app)/layout.tsx`**：**`getActiveBroadcastsAction`** 傳 **`initialHasBroadcast`**；**`AppBroadcastChrome`** 掛 **`BroadcastBanner`**（不再掛酒館元件）。
7. **`/admin/settings`**：**🍺 酒館跑馬燈**（模式／速度分鍵儲存）、**📢 廣播橫幅**（樣式 + 速度 **`Promise.allSettled`**、預覽條）；移除原「跑馬燈設定」**`marquee_speed_seconds`**／**`marquee_broadcast_effect`** 區塊。
8. **HANDOFF.md** 索引與「最近完成」更新。

資料庫異動

- 🗄️ **`system_settings`** 四筆新 key（雲端 MCP + 遷移檔）。

需要注意

- 廣播／設定前台約 **30s／60s** 輪詢 + **`system_settings`／`broadcasts` revalidate** 後最多 **60s** 快取才更新。
- 全屏廣播首次進入 **`fullscreen`** 樣式會再顯示覆蓋層（由 **`overlayDismissed`** 控制）。

Git

41dbeb2 feat: marquee/broadcast separate styles + admin settings

---

[2026-03-29] — Google OAuth 補邀請碼流程（`/register/invite`）

完成項目

1. **新頁 `src/app/(auth)/register/invite/page.tsx`（client）**  
   - 標題／副標、`GuildAuthShell` 深色奢華風與註冊頁一致；邀請碼膠囊輸入、自動大寫去空白。  
   - **驗證並繼續**：`validateInvitationCodeAction` → 失敗 `toast.error`「邀請碼無效或已過期」；成功則 `saveInviteCodeToMetadataAction` → `router.push('/register/profile')` + `refresh`。  
   - 驗證／儲存過程 **LoadingButton**「驗證中…」。  
   - 底部 **登出**：`supabase.auth.signOut()` → `/login`。

2. **Layer 3 `saveInviteCodeToMetadataAction(code)`**（`invitation.action.ts`）  
   - `createClient()` → `getUser()` → `auth.updateUser({ data: { invite_code: normalized } })`；與既有 `normalizeInviteCode` 一致。

3. **`middleware.ts`**  
   - `inviteCodeFromUserMetadata`／`isRegisterOnboardingPath`。  
   - `needs_profile` 且 **無** `user_metadata.invite_code`：受保護路徑導向 **`/register/invite`**；`/login`、`/register`、標籤 onboarding 路徑同理。  
   - **有** invite：非 onboarding 路徑導向 **`/register/profile`**。  
   - **`/register/invite`**：未登入 → login+next；已建檔 → 首頁；needs_profile 且已有 invite → profile；否則放行。  
   - **`/register/profile`**：needs_profile 無 invite → **`/register/invite`**。  
   - **matcher** 新增 **`/register/invite`**。

4. **`completeAdventurerProfile`**（`adventurer-profile.action.ts`）  
   - 註解確認 Email signUp 與 OAuth 補碼皆依 `user_metadata.invite_code`；建檔後 **`claimInvitationCodeAction`** 邏輯不變，兩種登入皆適用。

資料庫異動

- 無。

需要注意

- `updateUser` 後依賴 cookie 刷新；頁面已 **`router.refresh()`**。  
- Email 註冊仍於 **`register-form.tsx`** signUp 帶入 `invite_code`，**不會**被導向 `/register/invite`。

Git

3e1839b fix: Google OAuth missing invite code flow

---

[2026-03-29] — Debug：Google 登入邀請碼頁未出現（查核 Step 1–6）

完成項目

- 以 Supabase MCP **`execute_sql`**（專案「冒險者公會」）抽樣：`auth.users` 與 `auth.identities`（`provider = 'google'`）LEFT JOIN **`public.users`**，比對 **`raw_user_meta_data` 是否含 `invite_code`** 與是否已有 profile。
- 核對 **`src/app/(auth)/register/invite/page.tsx`** 存在。
- 核對 **`middleware.ts`**：`inviteCodeFromUserMetadata` + `needs_profile` 時無 invite → **`NextResponse.redirect(inviteUrl)`**（受保護路徑與 `/login`／`/register` 等）；有 invite → **`isRegisterOnboardingPath`** 外導向 **`/register/profile`**；**`/register/profile`** 無 invite → **`/register/invite`**。
- 核對 **`config.matcher`** 含 **`/register/invite`**。
- **`middleware.ts` 檔首** 追加與上列 Step 對照之除錯註解（不變更執行邏輯）。

資料庫異動

- 無（僅 SELECT 查詢；未對使用者執行 UPDATE 清除 `invite_code`，避免誤改他人帳號）。

需要注意

- Step 1／5／6 若以「你的 Google 信箱」為條件，請在本機 Dashboard 或 MCP 自行替換 email 執行；代理僅能提供抽樣模式說明。
- 若 **`public.users` 已有列** 或 **metadata 已有 `invite_code`**，行為符合設計，不會顯示邀請碼頁。

Git

15b8b14 fix: debug Google invite code flow

---

[2026-03-29] — 酒館自刪訊息＋廣播提前下架（前台管理 + 橫幅快捷）

完成項目

- `TavernModal` 長按選單邏輯調整：所有人都能長按自己的訊息並看到「🗑️ 刪除這則訊息」；長按他人訊息則維持僅 `master` / `moderator` 可開啟管理選單。
- `deleteTavernMessageAction` 權限改為：本人可刪自己的訊息；`master` / `moderator` 可刪任何人的訊息；其餘拒絕。
- Layer 2 `rewards.repository.ts` 新增 `expireBroadcast(broadcastId)`，以更新 `expires_at` 立即讓廣播過期（保留資料）。
- Layer 3 `rewards.action.ts` 新增 `expireBroadcastAction(broadcastId)`：登入檢查、角色 / 本人權限判斷、呼叫 repository、`revalidateTag('broadcasts')`。
- `FloatingToolbar` 新增（master 且有有效廣播時顯示）「📢 廣播管理」子按鈕與管理 Sheet，列表顯示發送者、內容、剩餘時間，並可透過 `AlertDialog` 確認下架後即時刷新列表。
- `BroadcastBanner` 新增 master 專用右側 ✕ 快速下架按鈕，點擊後 `AlertDialog` 確認並下架當前廣播；成功後切換下一則或隱藏橫幅。

資料庫異動

- 無新增 migration 或 schema 變更。
- 🗄️ 以既有 `broadcasts.expires_at` 欄位執行更新，使廣播提前過期。

需要注意

- 廣播列表來源為「目前有效廣播」（`expires_at > now()`），下架後會自動從清單移除。
- `expireBroadcastAction` 權限目前允許：`master` / `moderator` 下架任意廣播，或廣播本人下架自己的廣播。

Git

feat: self-delete tavern message + broadcast expire by master

---

[2026-03-29] — 靜態資產架構優化＋框架 PNG 疊加＋特效預覽

完成項目

- 建立靜態資產目錄：`public/frames`、`public/cards`、`public/items`，各自新增 README 與 `.gitkeep`。
- 後台 `/admin/shop` 商品圖片改為雙模式：
  - 本地路徑（預設）輸入 `/items/...`，即時預覽與無效路徑提示。
  - Cloudinary 上傳（選填）保留既有上傳流程，並提示優先使用本地路徑。
- 後台 `/admin/prizes` 當獎項為 `avatar_frame` / `card_frame` 時，新增「框架圖片路徑」欄位與即時預覽（含特效預覽區）。
- 後台 `/admin/shop` 當商品為 `avatar_frame` / `card_frame` 時，新增特效預覽區，支援疊加圖片與 `effect_key`。
- Layer 3 / Layer 2：
  - `createPrizeItemAction` / `updatePrizeItemAction` 支援 `image_url`。
  - `findMyRewards` 回傳 `image_url`，並回查 `prize_items` + `shop_items`。
  - `findEquippedRewardLabels` 回傳 `equippedAvatarFrameImageUrl` / `equippedCardFrameImageUrl`。
  - `purchaseItemAction` 發放 `user_rewards` 時加入 `shop_item_id`。
- 前台裝備背包（`FloatingToolbar`）道具格顯示優先改為：
  1) `image_url` 圖片，2) 僅特效時顯示特效預覽底形，3) 無圖無特效顯示 emoji。
- 前台頭像框疊加：
  - `Avatar` 新增 `frameImageUrl` / `frameEffectKey`，可同時疊加 PNG 框與 CSS 特效。
  - `MasterAvatarShell` 傳遞框架 props。
  - `UserCard` / `UserDetailModal` 以會員裝備資料套用框架。
- 新增工具腳本：`scripts/resize-frame.py`（PNG 中心裁切縮放，保留透明背景）。
- 商城前台顯示補強：本地 `/...` 直接使用；Cloudinary URL 自動套縮圖參數。

資料庫異動

- 🗄️ `public.prize_items` 新增 `image_url text NULL`，並加註解。
- 🗄️ `public.user_rewards` 新增 `shop_item_id uuid NULL REFERENCES public.shop_items(id)`，並加註解。
- 🗄️ 已透過 Supabase MCP 執行 `NOTIFY pgrst, 'reload schema';`。

需要注意

- 目前框架圖片建議走 `public/frames`、`public/cards`，可明顯降低 Cloudinary 用量。
- `effect_key` 若前端未實作對應 CSS class，預覽會視為無特效。
- `scripts/resize-frame.py` 依賴 Pillow；若本機尚未安裝需自行安裝。

Git

fc3b3a6 feat: static asset architecture + frame PNG overlay + effect preview

---

[2026-03-30] — 商城頭像框對齊（frame_layout）＋後台拖曳／滑桿＋老虎框 PNG 後製

完成項目

- **資料契約**：`shop_items.metadata` 使用 **`frame_layout`**：`offsetXPercent`、`offsetYPercent`、`scalePercent`（解析時相容舊鍵 **`avatar_frame_layout`**）。
- **共用工具**：新增 **`src/lib/utils/avatar-frame-layout.ts`**（`parseShopFrameLayoutFromMetadata`、`shopFrameLayoutStyle`）。
- **Layer 2 `rewards.repository.ts`**：
  - **`findMyRewards`**：`shop_items` 併查 **`metadata`**，每筆回傳 **`frame_layout`**（僅商城來源有值；`prize_items` 無 metadata 則為 `null`）。
  - **`findEquippedRewardLabels`**：併查 shop **`metadata`**，回傳 **`equippedAvatarFrameLayout`**（頭像框來自商城時）。
- **Layer 3 `profile.action.ts`**：**`MemberProfileView`** 擴充 **`equippedAvatarFrameLayout`**。
- **UI**：**`Avatar`** 框圖 **`style`** 套用 `translate` + `scale`；**`MasterAvatarShell`** 傳 **`frameLayout`**；**`UserCard`**／**`UserDetailModal`**／**`guild-profile-home`**（大頭＋裝備框圖 URL）接線。
- **後台 `/admin/shop`（`shop-admin-client.tsx`）**：
  - 頭像框／卡框「特效預覽」外層改 **`overflow-hidden`**，與前台圓形裁切一致。
  - **水平／垂直／縮放**滑桿與數字輸入、**預覽區 pointer 拖曳**微調、一鍵重設。
  - 儲存時合併 **`frame_layout`** 至 metadata；非框類商品儲存時自 metadata **移除** `frame_layout`／`avatar_frame_layout`；表單「進階 JSON」區不顯示這兩鍵（避免雙編輯），儲存仍會寫回。
- **靜態資產**：**`scripts/process-tiger-avatar-frame.py`**（眼區挖除偏黑像素、去掉半透明暗毛邊）；**`public/frames/tiger-frame.png`** 已執行後製覆寫。

資料庫異動

- 無新增 migration。僅 **`shop_items.metadata` JSON** 內容約定擴充（既有 jsonb 欄位）。

需要注意

- 探索列表 **`UserCard`** 若後端未帶 **`equippedAvatarFrameLayout`**，對齊為預設 0／0／100%；裝備資料完整時與個人檔一致。
- 老虎腳本眼區為經驗比例矩形，若未來換構圖需改 **`process-tiger-avatar-frame.py`** 內座標或改用手動遮罩。

Git

e4f81a2 feat: shop frame_layout for avatar frames + tiger PNG post-process

---

[2026-03-30] — 商城頭像框：全角色統一鑽石金框幾何；後台預覽對齊

完成項目

- **`MasterAvatarShell`**：以「有商城框 **或** 領袖」啟用裝飾版面；外層 **size×size**、**overflow-visible**；內層圓形裁切直徑 **size × MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE**；商城框圖 **MASTER_AVATAR_FRAME_OVERLAY_PERCENT%** 置中並套用 **`shopFrameLayoutStyle(frameLayout)`**；領袖另疊 **`/frames/master-avatar-frame.png`**。無裝飾時 **`Avatar`** 僅照片＋特效，不帶 **`frameImageUrl`**（避免重疊繪製）。
- **`Avatar`**：維持獨立使用時的圓內框圖行為；re-export **`MASTER_AVATAR_*`** 常數供 shell 與他處共用。
- **`src/lib/constants/master-avatar-frame.ts`**：補充註解（洞徑與 160% 疊加關係、**FRAME_SIZE_PERCENT** 別名）。
- **後台 `shop-admin-client.tsx`**（**`item_type === "avatar_frame"`**）：
  - 預覽槽 **80×80**（**`AVATAR_FRAME_PREVIEW_SLOT_PX`**），**overflow-visible**。
  - 內灰圓直徑 **slot × MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE**；框圖 **160%** ＋ **`framePreviewStyle`**，與前台一致。
  - **`card_frame`** 為圓角矩形槽＋內層 **inset** 占位（與頭像框分流）；框圖層縮放見 **`CARD_FRAME_OVERLAY_PERCENT`**（與下方「卡框獨立…」補記）。
  - 說明文案改述「全會員同幾何；領袖另疊金框」。

資料庫異動

- 無。

需要注意

- 列表／卡片凡經 **`MasterAvatarShell`** 且帶商城框者，所見比例應與領袖「鑽石金框＋商城框」疊加時的商城層一致（僅領袖多一金框層）。
- 若未來改 **160%** 或洞徑比例，須同步 **`master-avatar-frame.ts`**、**`MasterAvatarShell`** 與 **`shop-admin-client`** 預覽常數。

Git

396143a feat: unify shop avatar frame ornament layout for all roles

---

[2026-03-30] — 裝備頭像框：探索／血盟／聊天／酒館／個人檔顯示與 overflow 修正

完成項目

- **Layer 2 `rewards.repository.ts`**：新增 **`findEquippedAvatarFramesByUserIds`**（一次查多使用者 **`user_rewards`** 已裝備 **`avatar_frame`**，併查 **`prize_items`／`shop_items`** 之 **`effect_key`／`image_url`／`metadata.frame_layout`**）。
- **`village.service.ts`／`market.service.ts`**：在 **`unstable_cache`** 內將上列三欄位併入每位候選使用者，供 **`UserCard`**（**`/explore`**）使用。
- **`alliance.action.ts`**：**`getMyAlliancesAction`／`getPendingRequestsAction`** 回傳之 **`partner`／`requester`** 型別擴充並附掛框資料；**`guild/page.tsx`** **`MasterAvatarShell`** 傳 **`frameImageUrl`／`frameEffectKey`／`frameLayout`**。
- **`chat.action.ts`**：**`ConversationPartnerDto`**；**`getMyConversationsAction`** 批次併框；**`guild/page.tsx`** 聊天列與 **`ChatModal` `targetUser`** 接線；**`UserDetailModal`** 開啟 **`ChatModal`** 時帶對方框欄位。
- **`ChatModal.tsx`**：對 **`targetUser`** 顯示框；己方氣泡頭像用 **`useSWR` + `getMyRewardsAction`** 取已裝備框。
- **`tavern.repository.ts`／`database.types.ts`**：**`TavernMessageDto.user`** 增加三框欄位並於 **`findTavernMessages`** 填入；**`TavernModal`** **`MasterAvatarShell`** 接線。
- **`guild-profile-home.tsx`**：個人檔頭像區 **`glass-panel`／外層 flex／點擊環** 改 **`overflow-visible`**（不再僅 **`role === master`**）；有框時暱稱區 **`mt-5 pt-1`**；**`MasterAvatarShell`** 加 **`frameEffectKey`**。

資料庫異動

- 無（僅 DTO 與查詢併料）。

需要注意

- 探索村莊／市集列表快取未綁 **`revalidateTag`** 至每位使用者裝備變更，裝框後其他人在探索頁可能延遲數十秒才更新；必要時可縮短 **`revalidate`** 或於 **`equipRewardAction`** 加 **`revalidatePath('/explore')`** 等策略。
- 信件通知列 **`fromUser`** 尚未附掛頭像框（與本則範圍外）。

Git

641365c fix: show equipped avatar frames across app and profile overflow

---

[2026-03-30] — 商城道具政策（贈送／刪除／回賣）、背包數量操作、頭像框 japan-01 上架

完成項目

- **資料庫**：`shop_items` 新增 **`allow_gift`／`allow_player_trade`／`allow_resell`／`resell_price`／`resell_currency_type`／`allow_delete`**（預設贈送與刪除開、回賣關）；**`coin_transactions.source`** 約束擴充含 **`shop_resell`**（並與 TS 對齊 **`loot_box`／`admin_adjust`**）。遷移檔：`20260330120000_shop_item_player_policies.sql`、`20260330121000_coin_transactions_source_shop_resell.sql`。
- **後台 `/admin/shop`**：表單區塊「玩家持有後」可勾選贈送、玩家買賣（預留）、刪除、回賣＋回收金額與幣種（空白＝沿用商品售價幣種）。
- **背包（`FloatingToolbar`）**：長按可開啟之堆疊依商品政策顯示贈送／刪除／回賣；**數量**輸入；頭像框／卡框／稱號格位 **裝備中** 顯示綠底勾勾＋文案「裝備中 ✓」；贈送／刪除改 **批次** server actions。
- **Layer 2**：**`rewards.repository`** 之 **`findMyRewards`** 併查商城 **`effect_key`／政策欄位／`currency_type`**（補齊僅商城來源時之 **`effect_key`**）；**`deleteUserRewardsForOwner`**。
- **`rewards.action`**：**`deleteUserRewardsBatchAction`／`giftUserRewardsToAlliancePartnerBatchAction`／`resellUserRewardsBatchAction`**；無 **`shop_item_id`** 時仍僅稱號／頭像框／卡框可走贈刪（舊行為）。
- **商城／幣種紀錄**：**`shop/page.tsx`** **`SOURCE_LABEL`** 加 **`shop_resell`**；**`coins-admin-client`** 分類含 **`shop_resell`** → 購買類。

資料庫異動（雲端已執行）

- **專案「冒險者公會」**（`zjaumgdypoitjhvllzen`）：已透過 Supabase MCP **`apply_migration`** 套用 **`shop_item_player_policies`**、**`coin_transactions_source_shop_resell`**；並 **`execute_sql`** **`UPSERT`** 商品 **`JAPAN_01`**（**`japan-01`**，**`/frames/japan-01.png`**，探險幣 1200、回賣 400、贈送／刪除／回賣皆開）。

資產

- **`public/frames/japan-01.png`**：**512×512**、**PNG 透明**（四角與中心黑底以 **flood fill，thresh≈42** 去背；若邊緣殘黑可再調後台或重匯）。

需要注意

- 本地 **`supabase db push`** 須含上述兩支 migration；若僅連雲端已手動套用，本地檔仍應保留以利版本一致。
- **`allow_player_trade`** 目前僅存欄位，前端尚無玩家市集流程。

Git

c680b2a feat: shop item policies (gift/delete/resell), japan-01 avatar frame, coin shop_resell；47deec9 docs: handoff entry for shop policies and japan-01

---

[2026-03-30] — 後台卡框預覽對齊個資彈窗、frames 子目錄分頭像／卡框

完成項目

- **釐清**：探索 **UserCard** 的紫色／青色光暈為 **LevelCardEffect**（依等級），**不是** `shop_items` 的 **card_frame** 圖檔；商城卡框主要套在 **UserDetailModal** 外殼（**effect_key → CSS class**）。
- **shop-admin-client.tsx**：卡片外框預覽改為 **rounded-3xl**、固定 **276×456px**（**shop-card-frame-preview.ts**），與個資彈窗比例一致；說明文案已註明與 **LevelCardEffect** 之區別；內層占位與框圖 **z-index** 微調。
- **getShopLocalImageOptionsAction**：回傳 **framesRoot／framesAvatars／framesCards／items**；**frames/** 根目錄僅列檔案（不含子資料夾內檔）。
- **後台下拉**：頭像框優先 **/frames/avatars/**、卡框優先 **/frames/cards/**，**legacy** 仍列 **/frames/*.png**。
- **public/frames/avatars/、public/frames/cards/**：新增 **.gitkeep**；**README.md** 更新目錄約定。

資料庫異動

- **無**。查詢仍依 **shop_items.item_type** 與 **image_url 完整路徑**；分資料夾僅資產整理，不影響 SQL。

Git

32f1e4b fix: align shop card frame preview with UserDetailModal; split frame asset folders

---

[2026-03-30] — 商城 card_frame PNG overlay 接線

完成項目

- card_frame 改為 **PNG overlay** 呈現，對齊 **`LevelCardEffect`** 邊界，套用到 **`/explore`** 的 **`UserCard`**、個人首頁 **glass-panel**、**`UserDetailModal`**。
- 新增 **`ShopCardFrameOverlay.tsx`**，以置中 **`object-contain`** 疊圖並套用 **`shop_items.metadata.frame_layout`**；卡框整體縮放後續獨立為 **`CARD_FRAME_OVERLAY_PERCENT`**（見下方同日補記）。
- **`findEquippedRewardLabels`** 補 **`equippedCardFrameLayout`**；新增 **`findEquippedCardFramesByUserIds`**，並接到 **village / market / alliance / chat / tavern** 批次資料流。
- **`TavernMessageDto.user`**、**`MemberProfileView`**、聊天夥伴 DTO 與探索卡片 props 補齊 card frame effect / image / layout 欄位。

資料庫異動

- 無 DB migration。

需要注意

- 探索列表與部分批次來源仍受快取影響，換裝 card_frame 後可能有短暫舊資料視窗。

Git

- 併入下方「卡框獨立 CARD_FRAME_OVERLAY_PERCENT」之 commit。

---

[2026-03-30] — 卡框獨立 CARD_FRAME_OVERLAY_PERCENT、後台預覽與前台一致、範例資產

完成項目

- **`CARD_FRAME_OVERLAY_PERCENT`**（**`src/lib/constants/shop-card-frame-preview.ts`**，預設 **100**）：與頭像框 **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`（160）** 分離；**`ShopCardFrameOverlay`** 與後台 **`shop-admin-client`** 卡框預覽共用此常數。
- 後台卡片外框預覽 **`<img>`**：由 **`inset-0` 全滿** 改為與前台相同（**置中、`width`／`height` 同百分比** + **`shopFrameLayoutStyle(framePreviewLayout)`**）。
- **`public/frames/cards/cny-money-bag-card-frame.png`**：範例卡框（736×520），中心近白區域改 **透明**，後台 **`getShopLocalImageOptionsAction`** 之 **`frames/cards/`** 可選。
- 仍套於 **`LevelCardEffect`（`/explore` UserCard）**、**`UserDetailModal`**、**`guild-profile-home`** 三處；細調可改常數或商品 **`metadata.frame_layout.scalePercent`**（50–200）。

資料庫異動

- 無。

Git

- **`feat(shop): CARD_FRAME_OVERLAY_PERCENT for card_frame overlay`**（與程式變更同一提交）

---

[2026-03-30] — 簽到冷卻改台北自然日（00:00 重置）、連簽斷簽改曆日差、首頁 UI

完成項目

- **`claimDailyCheckin`**（**`daily-checkin.action.ts`**）：冷卻由 **24h 滾動** 改為 **台北曆日** — **`todayKey = taipeiCalendarDateKey()`** 與 **`last_checkin_at`** 轉成之曆日鍵相同則 **`already_claimed`**；不再回傳 **`remainHours`／`remainMins`**。
- **連簽**：以 **`login_streaks.last_claim_at`** 之台北曆日與今日計 **`taipeiCalendarDaysBetween`**；**`> 1`** 重置為 **1**，**`= 1`**（昨天有簽）則 **`current_streak + 1`**；無紀錄視為首日 **1**。
- **`src/lib/utils/date.ts`**：新增 **`taipeiCalendarDaysBetween(earlierYmd, laterYmd)`**（**`T12:00:00+08:00`** 錨點）、**`taipeiWallClockHour(date?)`**（台北鐘點 **0–23**）。
- **`guild-profile-home.tsx`**：**`profile.last_checkin_at`** 與 **`taipeiCalendarDateKey()`** 同步 **`checkinDone`**；已簽按鈕「🔒 今日已報到」+「明天 00:00 後可再次報到」；移除每分鐘冷卻倒數 **`setInterval`**；斷簽警示改為台北 **22–23** 時、當日未簽且 **`currentStreak > 0`** 顯示「今天還沒報到，連續就快斷了！」。
- **`user.repository.ts`**、**`daily-checkin.ts`** 註解與 **`HANDOFF.md`** SSOT 說明已對齊自然日制。

資料庫異動

- 無（仍僅讀寫 **`users.last_checkin_at`**、**`login_streaks`** 既有欄位）。

需要注意

- 跨日後若使用者未重新整理頁面，**`checkinDone`** 不會自動解除（已移除定時 tick）；可 **`router.refresh()`** 或次日再開頁。

Git

- **49e5aa4** — **`feat: checkin reset to taipei natural day (00:00 daily)`**

---

[2026-03-30] — 全站文字選取、背包長按、UserDetailModal 捲軸、背包贈禮任意玩家

完成項目

- **`src/app/globals.css`**：全站 **`*`** **`user-select: none`**、**`-webkit-touch-callout: none`**；**`input, textarea, [contenteditable]`** 恢復可選取；**`[data-long-press], [role="button"], button`** **`touch-action: manipulation`** 與 **`user-select: none`**。
- **`UserDetailModal.tsx`**：移除 **`scrollTo`／`setTimeout`** 與 **`scrollContainerRef`**；可捲動內層 **`key={\`scroll-${user?.id ?? "empty"}\`}`**、**`overscrollBehavior: 'contain'`**；**`DialogContent`** 維持 **`overflow-hidden`**。
- **`rewards.repository.ts`**：**`findUserRewardById`** 改為 **JOIN `shop_items(allow_gift)`、`prize_items(reward_type)`**（內部 **`fetchJoinedUserReward`**）；新增 **`findUserRewardGiftMeta`**、**`findUsersByNickname`**（**`status = active`**、**`ILIKE`**、**`LIMIT 5`**、可排除自己）、**`GiftRecipientSearchRow`**。
- **`gift.action.ts`（Layer 3）**：**`giftItemToUserAction({ rewardId, recipientNickname })`** 驗證持有／**`used_at`**／裝備／**`allow_gift`**（商城；獎池來源預設可送）後回傳候選；**`confirmGiftAction(rewardId, recipientId)`** 先 **`insertUserReward`** 再 **`markUserRewardConsumed`**、**`notifyUserMailboxSilent`**（**`from_user_id`** 為贈送者）、**`insertAdminAction`**（**`action_type: gift_item`**，**`admin_id`** 使用贈送者 **user id** 作稽核 actor，失敗僅 **log**）。
- **`rewards.action.ts`**：**`getMyRewardsAction`** 的 **`allRewards`** 改為僅 **`used_at == null`**（不再只針對廣播／改名卡）。
- **`FloatingToolbar.tsx`**：背包格長按 **500ms**；**`data-long-press="true"`**、**`onContextMenu` preventDefault**、inline **`userSelect`／`touchAction`**；長按選單新增 **「🎁 贈送給玩家」**（暱稱搜尋 **Dialog** + **AlertDialog** 確認），保留 **「贈送給血盟夥伴」**。
- **`shop-admin-client.tsx`**：已存在 **「允許贈送」**（**`allow_gift`**），未修改。

資料庫異動

- 無（僅使用既有 **`user_rewards.used_at`**、**`shop_items.allow_gift`**、**`notifications`**、**`admin_actions`**）。

需要注意

- 贈送給玩家採 **先寫入收禮者 `user_rewards` 再標記贈送者 `used_at`**；若第二步失敗理論上可能造成短暫資料不一致，可後續改 **DB transaction**。
- **`admin_actions.admin_id`** 對 **玩家贈禮** 填贈送者 id 僅作稽核追溯，後台列表解讀時勿與「管理員」語意混淆。
- 全站禁止選取可能影響少數需複製一般文字的區塊；必要時可於該區塊加 **`select-text`** 類或 **`contenteditable`** 策略（目前未加）。

Git

**bb1f9d3** — **`feat: gift items to any user by nickname, site user-select, modal scroll reset`**
