/**
 * 框圖以「頭像容器邊長」為 100%：`MASTER_AVATAR_FRAME_OVERLAY_PERCENT` **> 100** 時裝飾向外超出容器。
 * 鑽石金框 PNG 依此比例顯示；透明圓洞直徑（螢幕上）≈
 * `size * MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE`（應與內層圓形頭貼裁切直徑一致）。
 */
export const MASTER_AVATAR_FRAME_OVERLAY_PERCENT = 160;

/** 素材「透明圓洞直徑／整張 PNG 邊長」（此圖透明洞約占整張 65%） */
export const MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO = 0.65;

/**
 * 裝備商城頭像框時：圓形照片直徑 = `layoutSize * 此值`，使臉緣對齊 160% 框圖透明洞內緣。
 * = (MASTER_AVATAR_FRAME_OVERLAY_PERCENT / 100) * MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO
 * 例：`size=120` → 內圓約 **125px**（1.04×）。
 */
export const MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE =
  (MASTER_AVATAR_FRAME_OVERLAY_PERCENT / 100) * MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO;

/** 除錯用別名（等同框比例） */
export const FRAME_SIZE_PERCENT = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;
