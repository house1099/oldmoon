#!/usr/bin/env python3
"""
框架圖片尺寸調整工具
用法：python scripts/resize-frame.py <input> <output> <width> <height>

自動裁切中間區塊到目標尺寸，保留透明背景
"""

from PIL import Image
import os
import sys


def resize_frame(input_path: str, output_path: str, target_w: int, target_h: int) -> None:
    img = Image.open(input_path).convert("RGBA")
    src_w, src_h = img.size

    src_ratio = src_w / src_h
    target_ratio = target_w / target_h

    if src_ratio > target_ratio:
        new_h = src_h
        new_w = int(src_h * target_ratio)
    else:
        new_w = src_w
        new_h = int(src_w / target_ratio)

    left = (src_w - new_w) // 2
    top = (src_h - new_h) // 2
    img_cropped = img.crop((left, top, left + new_w, top + new_h))
    img_resized = img_cropped.resize((target_w, target_h), Image.LANCZOS)

    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    img_resized.save(output_path, "PNG")
    print(f"done: {output_path} ({target_w}x{target_h}px)")


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("usage: python scripts/resize-frame.py <input> <output> <width> <height>")
        sys.exit(1)
    resize_frame(sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
