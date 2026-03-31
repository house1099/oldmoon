# items

商城道具縮圖資產目錄。

- 建議尺寸：`256x256px`
- 格式：`PNG` / `WEBP`
- 路徑範例：`/items/gold-chest.png`
- **稱號胸章**（`item_type: title`）：建議 **64×64～72×72**、透明底，UI 顯示約 **16–20px**；範例：`/items/title-chopper-peek-72.png`、`/items/title-eagle.png`（顯示文字在後台填，如 **EAGLE**）
- **範例：LUFFY 稱號**  
  - 去背輸出：`/items/title-luffy.png`（約 **94×94**，由白底原圖經邊緣 flood-fill 去背後 **1.3×** 放大；探索 **`UserCard`** 底列與興趣／技能標籤並排、垂直置中）。  
  - 原圖備份（白底、可再製）：`source-luffy-72.png`。  
  - 後台商城／獎項新增稱號時：**名稱** `LUFFY`（或自訂），**圖** 填 **`/items/title-luffy.png`**。  
  - 重新產生去背圖：專案根目錄執行 `python scripts/process-title-luffy-png.py`（需 **`source-luffy-72.png`** 存在）。
