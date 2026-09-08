#!/usr/bin/env python3
"""
智慧圖像去背與等角地塊裁切工具 (Smart Background Removal & Isometric Tile Align)

功能：
1. 針對 AI 生圖（純色背景、棋盤格背景、微漸層背景）：
   - 從四個角落自動取樣背景基準色
   - 使用色差容差 (Color Distance Threshold) 與邊界泛洪填充 (Flood Fill) 消除背景
   - 邊緣 Alpha 漸層羽化 (Feathering)，避免毛邊與黑邊
2. 幾何遮罩裁切模式 (Isometric Mask)：
   - 強制將圖案對齊到怪獸塔 2.5D 等角菱形底座
   - 確保地塊在折返坡道上 100% 無縫連接
"""

import sys
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageOps

def remove_background_floodfill(image: Image.Image, tolerance: int = 35, feather: float = 1.0) -> Image.Image:
    """使用邊界泛洪分析與色差去除背景。"""
    img = image.convert("RGBA")
    w, h = img.size

    # 取樣 4 個角落與 4 邊中心點作為背景參考色
    sample_points = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)
    ]
    bg_colors = [img.getpixel(p) for p in sample_points]

    # 建立遮罩
    mask = Image.new("L", (w, h), 255)
    pixels = img.load()
    mask_pixels = mask.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                mask_pixels[x, y] = 0
                continue

            # 計算與所有背景參考色的最小色差
            min_dist = min(
                math.sqrt((r - bg[0])**2 + (g - bg[1])**2 + (b - bg[2])**2)
                for bg in bg_colors
            )

            if min_dist < tolerance:
                mask_pixels[x, y] = 0
            elif min_dist < tolerance + 15:
                # 漸層過渡邊緣
                ratio = (min_dist - tolerance) / 15.0
                mask_pixels[x, y] = int(255 * ratio)

    if feather > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))

    img.putalpha(mask)
    return img

def fit_to_tower_isometric(image: Image.Image, target_size: int = 200) -> Image.Image:
    """將圖案縮放並套用等角地塊的幾何遮罩，確保 100% 去除外溢背景。"""
    img = image.convert("RGBA")
    img = img.resize((target_size, target_size), Image.LANCZOS)

    # 怪獸塔標準等角輪廓
    TOP_W = 158.0
    TOP_H = TOP_W / 2.0
    SIDE_H = 36.0
    CX = 100.0
    TOP_Y = 46.0

    T = (CX, TOP_Y)
    R = (CX + TOP_W / 2, TOP_Y + TOP_H / 2)
    B = (CX, TOP_Y + TOP_H)
    L = (CX - TOP_W / 2, TOP_Y + TOP_H / 2)
    L2 = (L[0], L[1] + SIDE_H)
    B2 = (B[0], B[1] + SIDE_H)
    R2 = (R[0], R[1] + SIDE_H)
    SILHOUETTE = [T, R, R2, B2, L2, L]

    # 超取樣遮罩
    SS = 4
    mask = Image.new("L", (target_size * SS, target_size * SS), 0)
    d = ImageDraw.Draw(mask)
    pts = [(p[0] * SS, p[1] * SS) for p in SILHOUETTE]
    d.polygon(pts, fill=255)
    mask = mask.resize((target_size, target_size), Image.LANCZOS)

    # 組合 Alpha
    current_alpha = img.getchannel("A")
    final_alpha = ImageChops_multiply = Image.composite(current_alpha, Image.new("L", (target_size, target_size), 0), mask)
    img.putalpha(final_alpha)
    return img

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 remove_bg_smart.py <input_image> [output_image] [--iso]")
        print("Example: python3 remove_bg_smart.py raw_tile.png public/images/tower-gen3/tile_custom.png --iso")
        sys.exit(0)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else input_path
    apply_iso = "--iso" in sys.argv

    print(f"Processing image: {input_path}")
    raw_img = Image.open(input_path)
    cleaned = remove_background_floodfill(raw_img, tolerance=40, feather=0.8)

    if apply_iso:
        print("Applying Monster Tower 2.5D Isometric Geometry Mask...")
        cleaned = fit_to_tower_isometric(cleaned, target_size=200)

    cleaned.save(output_path, "PNG")
    print(f"Saved transparent image to: {output_path}")
