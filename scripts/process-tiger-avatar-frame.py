#!/usr/bin/env python3
"""
後製商城頭像框（例：老虎）：去瞳孔黑點、淡化 JPEG/去背後的黑毛邊。

用法：
  python scripts/process-tiger-avatar-frame.py [input.png] [output.png]

預設：public/frames/tiger-frame.png -> 原地覆寫（可先備份）。
"""

from __future__ import annotations

import sys
from PIL import Image


def punch_eye_regions(
    img: Image.Image,
    w: int,
    h: int,
) -> None:
    """在上臉兩個長方形內，將偏黑的像素改透明（瞳孔）。"""
    regions = [
        (int(0.39 * w), int(0.15 * h), int(0.47 * w), int(0.24 * h)),
        (int(0.53 * w), int(0.15 * h), int(0.61 * w), int(0.24 * h)),
    ]
    px = img.load()
    for x0, y0, x1, y1 in regions:
        for y in range(max(0, y0), min(h, y1)):
            for x in range(max(0, x0), min(w, x1)):
                r, g, b, a = px[x, y]
                if a < 8:
                    continue
                if r < 78 and g < 78 and b < 78:
                    px[x, y] = (0, 0, 0, 0)


def defringe_dark_edges(img: Image.Image) -> None:
    """去掉半透明／偏黑的邊緣毛邊（不碰正常虎紋高對比黑）。"""
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            mx = max(r, g, b)
            mn = min(r, g, b)
            # 暗且帶透明度：多為抗鋸齒黑邊（不動不透明虎紋）
            if a < 250 and mx < 88 and mn < 48:
                px[x, y] = (0, 0, 0, 0)


def main() -> None:
    if len(sys.argv) >= 3:
        in_path, out_path = sys.argv[1], sys.argv[2]
    elif len(sys.argv) == 2:
        in_path = out_path = sys.argv[1]
    else:
        in_path = out_path = "public/frames/tiger-frame.png"

    im = Image.open(in_path).convert("RGBA")
    w, h = im.size
    punch_eye_regions(im, w, h)
    defringe_dark_edges(im)
    im.save(out_path, "PNG")
    print(f"done: {out_path} ({w}x{h})")


if __name__ == "__main__":
    main()
