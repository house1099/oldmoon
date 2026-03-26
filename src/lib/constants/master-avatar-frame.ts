/**
 * 兩層皆以「頭像容器邊長」為 100%：數值 **> 100** 時裝飾向外超出；頭像圖層在最上層，不會被框 PNG 遮住。
 * PNG 內圈約占素材 ~70%，請依美術微調。
 */
export const MASTER_AVATAR_FRAME_OVERLAY_PERCENT = 180;

/** 閃電 Lottie；建議 ≥ 框比例，閃電略在雷框外緣 */
export const MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT = 192;
/** 除錯用別名（等同雷框比例） */
export const FRAME_SIZE_PERCENT = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;
