/**
 * 將商城相關 PNG 中接近白色的背景轉為透明（去背）。
 * 若圖片已有明顯 alpha（已去背），則跳過不覆寫。
 *
 * 處理目錄：public/items、public/shop、public/frames（不含 public/icons 等）
 */
import sharp from "sharp";
import { readdir, rename, unlink } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TARGET_DIRS = [
  join(ROOT, "public", "items"),
  join(ROOT, "public", "shop"),
  join(ROOT, "public", "frames"),
];

/** 已有半透明／透明像素比例超過此值則視為已去背，跳過 */
const ALREADY_TRANSPARENT_RATIO = 0.008;

/** 視為「白底」的 RGB 下限（min(r,g,b) >= whiteMin 開始淡化） */
const WHITE_MIN = 248;
const WHITE_SOFT = 14;

async function collectPngFiles(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      await collectPngFiles(p, acc);
    } else if (e.isFile() && extname(e.name).toLowerCase() === ".png") {
      acc.push(p);
    }
  }
  return acc;
}

async function processPng(absPath) {
  const pipeline = sharp(absPath).ensureAlpha();
  const { data, info } = await pipeline.clone().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    console.warn(`skip (not RGBA): ${absPath}`);
    return { path: absPath, status: "skip" };
  }

  const n = width * height;
  let lowAlpha = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 254) lowAlpha++;
  }
  if (lowAlpha / n > ALREADY_TRANSPARENT_RATIO) {
    console.log(`skip (already transparent): ${absPath}`);
    return { path: absPath, status: "skip-transparent" };
  }

  const out = Buffer.from(data);
  let changed = 0;
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    let a = out[i + 3];
    const m = Math.min(r, g, b);
    if (m >= WHITE_MIN) {
      if (a > 0) changed++;
      out[i + 3] = 0;
    } else if (m >= WHITE_MIN - WHITE_SOFT) {
      const t = WHITE_MIN - m;
      const factor = t / WHITE_SOFT;
      const na = Math.round(a * factor);
      if (na !== a) changed++;
      out[i + 3] = na;
    }
  }

  if (changed === 0) {
    console.log(`skip (no white pixels touched): ${absPath}`);
    return { path: absPath, status: "skip-noop" };
  }

  const tmpPath = `${absPath}.tmp-${Date.now()}.png`;
  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(tmpPath);
  await unlink(absPath);
  await rename(tmpPath, absPath);

  console.log(`ok: ${absPath} (pixels adjusted: ${changed})`);
  return { path: absPath, status: "ok", changed };
}

async function main() {
  const files = [];
  for (const d of TARGET_DIRS) {
    await collectPngFiles(d, files);
  }
  files.sort();
  console.log(`Found ${files.length} PNG(s) under items/shop/frames\n`);

  const summary = { ok: 0, skip: 0 };
  for (const f of files) {
    const r = await processPng(f);
    if (r.status === "ok") summary.ok++;
    else summary.skip++;
  }
  console.log(`\nDone. Written: ${summary.ok}, skipped: ${summary.skip}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
