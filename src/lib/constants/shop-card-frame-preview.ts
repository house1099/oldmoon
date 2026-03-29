/**
 * 後台商城「卡片外框」預覽槽位：對齊 {@link UserDetailModal} 外殼
 *（`max-w-sm`、直向手機彈窗、`rounded-3xl`），而非探索列表 `UserCard`。
 *
 * 探索列表卡片的紫色／青色光暈為 {@link LevelCardEffect}（依等級），
 * 與 `shop_items.item_type === "card_frame"` 的商品圖無關。
 */
export const SHOP_CARD_FRAME_PREVIEW_WIDTH_PX = 276;
export const SHOP_CARD_FRAME_PREVIEW_HEIGHT_PX = 456;

/**
 * 商城卡片外框（`card_frame`）PNG：以卡片內層容器為基準，框圖寬與高同為此百分比、置中、`object-contain`。
 * 與頭像框 `MASTER_AVATAR_FRAME_OVERLAY_PERCENT`（160）分離。
 *
 * 預設以 `public/frames/cards/cny-money-bag-card-frame.png`（736×520、中心透明）在直向槽位上對齊內容寬度為粗估；
 * 其他素材可改此常數，或搭配 `shop_items.metadata.frame_layout.scalePercent`（50–200）微調。
 */
export const CARD_FRAME_OVERLAY_PERCENT = 100;
