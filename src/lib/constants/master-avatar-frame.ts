/**
 * 框圖以「頭像容器邊長」為 100%：`MASTER_AVATAR_FRAME_OVERLAY_PERCENT` **> 100** 時裝飾向外超出容器。
 * 圓形照片直徑 = 框顯示邊長 × `MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO`（素材內透明洞約為整張 PNG 的 60–70%）。
 */
export const MASTER_AVATAR_FRAME_OVERLAY_PERCENT = 175;

/** 素材「透明圓洞直徑／整張 PNG 邊長」，用於對齊內圈與圓形頭像 */
export const MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO = 0.67;

/** 閃電 Lottie；建議 ≥ 框比例，閃電略在雷框外緣 */
export const MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT = 192;
/** 除錯用別名（等同雷框比例） */
export const FRAME_SIZE_PERCENT = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;
