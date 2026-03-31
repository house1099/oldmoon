"""One-off: flood-fill near-white edge pixels to transparent for title badge PNG."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "items" / "source-luffy-72.png"
OUT = ROOT / "public" / "items" / "title-luffy.png"


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    def near_white(r: int, g: int, b: int, tol: int = 18) -> bool:
        return r >= 255 - tol and g >= 255 - tol and b >= 255 - tol

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_enqueue(x: int, y: int) -> None:
        if not (0 <= x < w and 0 <= y < h) or visited[y][x]:
            return
        r, g, b, _a = px[x, y]
        if near_white(r, g, b):
            visited[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_enqueue(x, 0)
        try_enqueue(x, h - 1)
    for y in range(h):
        try_enqueue(0, y)
        try_enqueue(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _a = px[x, y]
        if not near_white(r, g, b):
            continue
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r2, g2, b2, _a2 = px[nx, ny]
                if near_white(r2, g2, b2):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    scale = 1.3
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    out_img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    out_img.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({nw}x{nh})")


if __name__ == "__main__":
    main()
