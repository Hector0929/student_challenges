#!/usr/bin/env python3
"""怪獸圖去背：邊緣 flood-fill + 反鋸齒羽化 + 去白邊（un-premultiply）+ 裁切縮放。"""
import os
from collections import deque
from PIL import Image

SRC_DIR = "public/images/monsters"
OUT_DIR = "public/images/monsters/cutout"
OUT_SIZE = 384
# 與背景色的距離：<T_LO 全透明，>T_HI 全不透明。
# 背景極均勻（邊緣取樣落差 <4），所以閾值壓低即可，避免吃掉彩虹龍那種近白色的半透明翅膀。
T_LO, T_HI = 7.0, 26.0

TARGETS = [
    ("evolved/evolved_slime.png",         "boss_slime.png"),
    ("new/storm_lord.png",                "boss_storm.png"),
    ("evolved/evolved_flame_bird.png",    "boss_flame.png"),
    ("evolved/evolved_ufo_rider_v2.png",  "boss_ufo.png"),
    ("evolved/evolved_water_spirit.png",  "boss_water.png"),
    ("evolved/evolved_rainbow_dragon.png","boss_dragon.png"),
]


def bg_color(px, w, h):
    """取四邊像素的中位數當背景色。"""
    samples = []
    for x in range(0, w, 4):
        samples += [px[x, 0], px[x, h - 1]]
    for y in range(0, h, 4):
        samples += [px[0, y], px[w - 1, y]]
    ch = [sorted(s[i] for s in samples)[len(samples) // 2] for i in range(3)]
    return tuple(ch)


def cutout(path, out_path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = bg_color(px, w, h)

    def d2(p):
        return (p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2

    # 由四邊 flood-fill，只有「連通到畫面外緣」的近背景色像素才會被挖掉，
    # 怪獸身上的白色區塊因為不連通而保留。
    hi2 = T_HI * T_HI
    outside = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not outside[y * w + x] and d2(px[x, y]) < hi2:
                outside[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not outside[y * w + x] and d2(px[x, y]) < hi2:
                outside[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not outside[ny * w + nx]:
                if d2(px[nx, ny]) < hi2:
                    outside[ny * w + nx] = 1
                    q.append((nx, ny))

    # 依與背景色的距離給半透明，並反推原色（去掉混入的白邊）
    span = T_HI - T_LO
    for y in range(h):
        row = y * w
        for x in range(w):
            if not outside[row + x]:
                continue
            p = px[x, y]
            d = d2(p) ** 0.5
            if d <= T_LO:
                px[x, y] = (0, 0, 0, 0)
                continue
            a = (d - T_LO) / span
            # 反推原色去掉混入的背景白；alpha 很低時除法會放大雜訊，
            # 所以往原色回拉，避免半透明處出現黑斑。
            k = min(1.0, a / 0.5)
            c = []
            for i in range(3):
                un = (p[i] - (1.0 - a) * bg[i]) / a
                c.append(max(0, min(255, int(round(un * k + p[i] * (1 - k))))))
            px[x, y] = (c[0], c[1], c[2], int(round(a * 255)))

    im = im.crop(im.getbbox())
    # 置中放進正方形畫布，保持長寬比
    side = max(im.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq = sq.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    sq.save(out_path, optimize=True)
    return bg, sq.size


os.makedirs(OUT_DIR, exist_ok=True)
for src, dst in TARGETS:
    p = os.path.join(SRC_DIR, src)
    o = os.path.join(OUT_DIR, dst)
    bg, size = cutout(p, o)
    print(f"{dst:20s} bg={bg} -> {size} {os.path.getsize(o)//1024}KB")
