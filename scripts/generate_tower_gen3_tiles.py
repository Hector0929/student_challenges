"""
怪獸塔 Gen3 — 高畫質 2.5D 等角地塊生成器 (含完美去背與平滑邊緣)

特點：
1. 精確對齊遊戲中 2.5D 等角棋盤的底座幾何 (頂面菱形 + 雙側面深度)。
2. 自動多重超取樣 (SS=4) 與 Lanczos 濾鏡，邊界 100% 純透明 (Alpha=0)，完全無視覺毛邊或溢色。
3. 豐富次表面材質：
   - 晨霧草原 (tile_grass)：立體草絲、野花花簇、泥土岩層與懸垂草邊。
   - 冰晶斷崖 (tile_ice)：多面體發光冰晶、冰川層理、極光高光與積雪粉末。
   - 熔岩工坊 (tile_lava)：黑曜石玄武岩、熔岩裂縫光暈、側壁岩漿滲流與火花微粒。
   - 機械雲城 (tile_tech)：科技金屬面板、賽博霓虹電路、能源核心反應爐、螺栓與刻線。
   - 星穹神殿 (tile_temple)：大理石紋理、黃金符文鑲嵌、星芒法陣與以太光暈。
"""

import math
import random
import sys
import os
from PIL import Image, ImageDraw, ImageFilter

SIZE = 200
SS = 4
W = SIZE * SS

# 精確等角幾何參數 (200x200 空間)
TOP_W = 158.0
TOP_H = TOP_W / 2.0  # 79.0
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

TOP_FACE = [T, R, B, L]
LEFT_FACE = [L, B, B2, L2]
RIGHT_FACE = [B, R, R2, B2]
SILHOUETTE = [T, R, R2, B2, L2, L]

OUTLINE_COLOR = (24, 18, 36, 255)


def s(pt):
    return (pt[0] * SS, pt[1] * SS)


def poly(pts):
    return [s(p) for p in pts]


def shade(color, factor):
    return (
        max(0, min(255, int(color[0] * factor))),
        max(0, min(255, int(color[1] * factor))),
        max(0, min(255, int(color[2] * factor))),
        color[3] if len(color) > 3 else 255
    )


def lerp_color(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
        int(c1[3] + (c2[3] - c1[3]) * t) if len(c1) > 3 and len(c2) > 3 else 255
    )


def face_mask(face):
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).polygon(poly(face), fill=255)
    return mask


def paint_on(img, face, painter, blur=0.0):
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    painter(ImageDraw.Draw(layer), layer)
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    # 限制在該面上，確保去背完整不外溢
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", (W, W), 0), face_mask(face)))
    img.alpha_composite(layer)


def top_point(u, v):
    """u, v ∈ [0, 1] 在等角頂面雙軸上的位置。"""
    x = L[0] + (T[0] - L[0]) * u + (B[0] - L[0]) * v
    y = L[1] + (T[1] - L[1]) * u + (B[1] - L[1]) * v
    return (x, y)


def face_point(face, fu, fv):
    """側面上的相對座標 (fu: 寬度方向, fv: 高度深度方向)。"""
    p0, p1 = face[0], face[1]
    x = p0[0] + (p1[0] - p0[0]) * fu
    y = p0[1] + (p1[1] - p0[1]) * fu + SIDE_H * fv
    return (x, y)


def render_base_gradient_block(top_grad, left_grad, right_grad, seed=1):
    """建立帶有光影漸層立體感的基礎地塊。"""
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)

    # 1. 繪製左側面漸層
    left_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ld = ImageDraw.Draw(left_layer)
    steps = 40
    for i in range(steps):
        v0 = i / steps
        v1 = (i + 1) / steps
        p_tl = face_point(LEFT_FACE, 0.0, v0)
        p_tr = face_point(LEFT_FACE, 1.0, v0)
        p_br = face_point(LEFT_FACE, 1.0, v1)
        p_bl = face_point(LEFT_FACE, 0.0, v1)
        c = lerp_color(left_grad[0], left_grad[1], v0)
        ld.polygon(poly([p_tl, p_tr, p_br, p_bl]), fill=c)
    left_layer.putalpha(Image.composite(left_layer.getchannel("A"), Image.new("L", (W, W), 0), face_mask(LEFT_FACE)))
    img.alpha_composite(left_layer)

    # 2. 繪製右側面漸層 (陰影側)
    right_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    rd = ImageDraw.Draw(right_layer)
    for i in range(steps):
        v0 = i / steps
        v1 = (i + 1) / steps
        p_tl = face_point(RIGHT_FACE, 0.0, v0)
        p_tr = face_point(RIGHT_FACE, 1.0, v0)
        p_br = face_point(RIGHT_FACE, 1.0, v1)
        p_bl = face_point(RIGHT_FACE, 0.0, v1)
        c = lerp_color(right_grad[0], right_grad[1], v0)
        rd.polygon(poly([p_tl, p_tr, p_br, p_bl]), fill=c)
    right_layer.putalpha(Image.composite(right_layer.getchannel("A"), Image.new("L", (W, W), 0), face_mask(RIGHT_FACE)))
    img.alpha_composite(right_layer)

    # 3. 繪製頂面漸層 (受光面)
    top_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    td = ImageDraw.Draw(top_layer)
    for i in range(steps):
        t0 = i / steps
        t1 = (i + 1) / steps
        pts = [
            top_point(t0, 0.0),
            top_point(0.0, t0),
            top_point(0.0, t1),
            top_point(t1, 0.0)
        ]
        c = lerp_color(top_grad[0], top_grad[1], t0)
        td.polygon(poly(pts), fill=c)
    top_layer.putalpha(Image.composite(top_layer.getchannel("A"), Image.new("L", (W, W), 0), face_mask(TOP_FACE)))
    img.alpha_composite(top_layer)

    # 4. 微粒雜訊細節
    def noise_painter(nd, _l):
        for _ in range(350):
            u, v = rnd.random(), rnd.random()
            x, y = top_point(u, v)
            r = rnd.uniform(0.6, 1.8) * SS
            val = rnd.randint(-25, 25)
            alpha = rnd.randint(25, 55)
            c = (128 + val, 128 + val, 128 + val, alpha)
            nd.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=c)
    paint_on(img, TOP_FACE, noise_painter)

    return img


def finish_tile(img, name, outdir, highlight_color=(255, 255, 255, 120)):
    """為地塊加上外框修飾、高光、並透過 Lanczos 抗鋸齒儲存為乾淨透明 PNG。"""
    d = ImageDraw.Draw(img)

    # 頂面受光邊界高光 (左上光照)
    d.line([s(L), s(T)], fill=highlight_color, width=int(SS * 1.8))
    d.line([s(T), s(R)], fill=(255, 255, 255, 45), width=int(SS * 1.0))

    # 內角稜線
    d.line([s(L), s(B)], fill=OUTLINE_COLOR, width=int(SS * 1.1))
    d.line([s(B), s(R)], fill=OUTLINE_COLOR, width=int(SS * 1.1))
    d.line([s(B), s(B2)], fill=OUTLINE_COLOR, width=int(SS * 1.3))

    # 外圍輪廓線
    sil = poly(SILHOUETTE)
    d.line(sil + [sil[0]], fill=OUTLINE_COLOR, width=int(SS * 1.8), joint="curve")

    # 縮小為遊戲規格 (200x200)，完全保留 Alpha 通道去背
    os.makedirs(outdir, exist_ok=True)
    out = img.resize((SIZE, SIZE), Image.LANCZOS)
    target_path = os.path.join(outdir, f"{name}.png")
    out.save(target_path, "PNG")
    print(f"Generated: {target_path} (Transparent RGBA {SIZE}x{SIZE})")
    return out


# ─────────────────────────── 五大地形風格實作 ───────────────────────────

def generate_grass(outdir):
    """1~20層：晨霧草原 (草皮、露珠花朵、浮空綠意)"""
    top_g = ((135, 222, 95, 255), (85, 168, 62, 255))
    left_g = ((148, 102, 68, 255), (96, 62, 38, 255))
    right_g = ((112, 75, 48, 255), (68, 42, 24, 255))

    img = render_base_gradient_block(top_g, left_g, right_g, seed=101)
    rnd = random.Random(101)

    # 草葉與草絲細節
    def grass_details(d, _l):
        # 繪製草皮紋理
        for _ in range(120):
            u, v = rnd.random(), rnd.random()
            x, y = top_point(u, v)
            h = rnd.uniform(5, 11)
            dx = rnd.uniform(-3, 3)
            c = (rnd.randint(140, 210), rnd.randint(220, 255), rnd.randint(90, 150), 220)
            d.line([s((x, y)), s((x + dx, y - h))], fill=c, width=int(SS * 1.2))

        # 懸垂於邊緣的小草邊
        for i in range(16):
            fu = (i + 0.5) / 16.0
            p = face_point(LEFT_FACE, fu, 0.0)
            h = rnd.uniform(3, 7)
            d.polygon([
                s(p),
                s((p[0] + 2, p[1] + h)),
                s((p[0] - 2, p[1]))
            ], fill=(110, 195, 75, 240))

        # 點綴小野花 (紅、黃、白、淡藍)
        flower_colors = [
            (255, 240, 140, 255),
            (255, 255, 255, 255),
            (255, 175, 205, 255),
            (160, 225, 255, 255)
        ]
        for _ in range(10):
            x, y = top_point(rnd.uniform(0.12, 0.88), rnd.uniform(0.12, 0.88))
            fc = rnd.choice(flower_colors)
            r = rnd.uniform(2.2, 3.4) * SS
            # 花瓣
            d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=fc)
            # 花蕊
            cr = r * 0.45
            d.ellipse([x * SS - cr, y * SS - cr, x * SS + cr, y * SS + cr], fill=(255, 190, 40, 255))

    paint_on(img, TOP_FACE, grass_details)

    # 側壁泥土石塊
    for face, tone in ((LEFT_FACE, (85, 54, 32)), (RIGHT_FACE, (55, 34, 18))):
        def stone_details(d, _l, f=face, t=tone):
            for _ in range(12):
                x, y = face_point(f, rnd.uniform(0.06, 0.94), rnd.uniform(0.15, 0.85))
                rx = rnd.uniform(2.0, 4.5) * SS
                ry = rnd.uniform(1.5, 3.0) * SS
                d.ellipse([x * SS - rx, y * SS - ry, x * SS + rx, y * SS + ry], fill=t + (240,))
        paint_on(img, face, stone_details)

    return finish_tile(img, "tile_grass", outdir, (255, 255, 255, 130))


def generate_ice(outdir):
    """21~40層：冰晶斷崖 (極光積雪、發光冰晶簇、冰川斷層)"""
    top_g = ((235, 250, 255, 255), (175, 230, 252, 255))
    left_g = ((110, 190, 226, 255), (55, 130, 170, 255))
    right_g = ((65, 140, 180, 255), (32, 85, 120, 255))

    img = render_base_gradient_block(top_g, left_g, right_g, seed=202)
    rnd = random.Random(202)

    # 冰晶與發光稜鏡
    def ice_details(d, _l):
        # 冰柱立體晶體
        crystals = [
            (0.32, 0.26, 28, 9),
            (0.66, 0.42, 22, 7),
            (0.40, 0.72, 24, 8),
            (0.78, 0.22, 16, 5)
        ]
        for u, v, h, w in crystals:
            cx, cy = top_point(u, v)
            pts_top = poly([(cx, cy - h), (cx + w, cy - h * 0.4), (cx + w * 0.4, cy + 2),
                            (cx - w * 0.4, cy + 2), (cx - w, cy - h * 0.4)])
            # 發光主體
            d.polygon(pts_top, fill=(185, 240, 255, 245))
            # 晶面亮面
            d.polygon([s((cx, cy - h)), s((cx - w, cy - h * 0.4)), s((cx - w * 0.4, cy + 2))], fill=(240, 252, 255, 255))
            # 晶面暗面
            d.polygon([s((cx, cy - h)), s((cx + w, cy - h * 0.4)), s((cx + w * 0.4, cy + 2))], fill=(130, 210, 245, 255))
            # 晶稜描線
            d.line(pts_top + [pts_top[0]], fill=(50, 150, 195, 255), width=int(SS * 0.9))

        # 雪花冰霜星芒
        for _ in range(35):
            x, y = top_point(rnd.random(), rnd.random())
            r = rnd.uniform(1.0, 2.5) * SS
            d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(255, 255, 255, 230))

    paint_on(img, TOP_FACE, ice_details)

    # 冰層斷面 (極光紋理)
    for face, base_c in ((LEFT_FACE, (180, 235, 255)), (RIGHT_FACE, (130, 205, 240))):
        def ice_strata(d, _l, f=face, bc=base_c):
            for i in range(4):
                fv = 0.22 + i * 0.22
                p0 = face_point(f, 0.02, fv)
                p1 = face_point(f, 0.98, fv + rnd.uniform(-0.04, 0.04))
                d.line([s(p0), s(p1)], fill=bc + (180,), width=int(SS * 1.4))
        paint_on(img, face, ice_strata)

    return finish_tile(img, "tile_ice", outdir, (255, 255, 255, 180))


def generate_lava(outdir):
    """41~60層：熔岩工坊 (黑曜岩、流動火紅岩漿裂縫、熔岩光暈)"""
    top_g = ((88, 62, 60, 255), (48, 34, 32, 255))
    left_g = ((105, 58, 45, 255), (60, 30, 24, 255))
    right_g = ((72, 38, 28, 255), (38, 18, 14, 255))

    img = render_base_gradient_block(top_g, left_g, right_g, seed=303)
    rnd = random.Random(303)

    def magma_cracks(d, _l):
        def draw_branch(start_u, start_v, length):
            curr_u, curr_v = start_u, start_v
            pts = [s(top_point(curr_u, curr_v))]
            for _ in range(length):
                curr_u = max(0.06, min(0.94, curr_u + rnd.uniform(-0.10, 0.12)))
                curr_v = max(0.06, min(0.94, curr_v + rnd.uniform(-0.10, 0.12)))
                pts.append(s(top_point(curr_u, curr_v)))
            if len(pts) > 1:
                # 底部外光暈 (在模糊層)
                d.line(pts, fill=(255, 75, 20, 255), width=int(SS * 3.5), joint="curve")
                # 核心高溫金黃色
                d.line(pts, fill=(255, 235, 140, 255), width=int(SS * 1.3), joint="curve")

        draw_branch(0.15, 0.35, 10)
        draw_branch(0.38, 0.12, 9)
        draw_branch(0.12, 0.68, 8)
        draw_branch(0.60, 0.50, 7)

        # 火星火花微粒
        for _ in range(25):
            x, y = top_point(rnd.random(), rnd.random())
            r = rnd.uniform(1.0, 2.2) * SS
            d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(255, 195, 60, 240))

    # 先畫光暈層再畫本體
    paint_on(img, TOP_FACE, magma_cracks, blur=SS * 2.2)
    paint_on(img, TOP_FACE, magma_cracks)

    # 側壁熔岩淌流
    for face in (LEFT_FACE, RIGHT_FACE):
        def lava_fall(d, _l, f=face):
            for i in range(3):
                fu = 0.2 + i * 0.3
                pts = [s(face_point(f, fu + rnd.uniform(-0.03, 0.03), fv))
                       for fv in (0.0, 0.28, 0.62, 0.96)]
                d.line(pts, fill=(255, 90, 25, 255), width=int(SS * 2.0), joint="curve")
                d.line(pts, fill=(255, 220, 110, 255), width=int(SS * 0.9), joint="curve")
        paint_on(img, face, lava_fall, blur=SS * 1.5)
        paint_on(img, face, lava_fall)

    return finish_tile(img, "tile_lava", outdir, (255, 175, 100, 140))


def generate_tech(outdir):
    """61~80層：機械雲城 (科技裝甲鋼板、霓虹能量導線、發光反應堆核心)"""
    top_g = ((170, 185, 220, 255), (115, 130, 165, 255))
    left_g = ((105, 115, 150, 255), (65, 75, 105, 255))
    right_g = ((75, 85, 118, 255), (45, 52, 78, 255))

    img = render_base_gradient_block(top_g, left_g, right_g, seed=404)

    def tech_circuits(d, _l):
        # 金屬切割板塊接縫
        for i in range(1, 4):
            f = i / 4.0
            d.line([s(top_point(f, 0.05)), s(top_point(f, 0.95))], fill=(85, 95, 130, 255), width=int(SS * 1.1))
            d.line([s(top_point(0.05, f)), s(top_point(0.95, f))], fill=(85, 95, 130, 255), width=int(SS * 1.1))

        # 霓虹導線
        cyan_neon = (70, 235, 255, 255)
        d.line([s(top_point(0.25, 0.1)), s(top_point(0.25, 0.5)), s(top_point(0.5, 0.5))], fill=cyan_neon, width=int(SS * 1.4))
        d.line([s(top_point(0.75, 0.9)), s(top_point(0.75, 0.5)), s(top_point(0.5, 0.5))], fill=cyan_neon, width=int(SS * 1.4))

        # 菱形反應堆能量核心
        cx, cy = top_point(0.5, 0.5)
        rw, rh = 23 * SS, 11.5 * SS
        core_pts = [
            (cx * SS, cy * SS - rh),
            (cx * SS + rw, cy * SS),
            (cx * SS, cy * SS + rh),
            (cx * SS - rw, cy * SS)
        ]
        d.polygon(core_pts, fill=(80, 225, 255, 255))
        d.line(core_pts + [core_pts[0]], fill=(255, 255, 255, 255), width=int(SS * 1.2))

        # 核心亮點
        rw2, rh2 = 11 * SS, 5.5 * SS
        d.polygon([
            (cx * SS, cy * SS - rh2),
            (cx * SS + rw2, cy * SS),
            (cx * SS, cy * SS + rh2),
            (cx * SS - rw2, cy * SS)
        ], fill=(235, 252, 255, 255))

    paint_on(img, TOP_FACE, tech_circuits, blur=SS * 1.8)
    paint_on(img, TOP_FACE, tech_circuits)

    # 側面裝甲螺栓與散熱口
    for face in (LEFT_FACE, RIGHT_FACE):
        def side_panels(d, _l, f=face):
            for i in range(4):
                x, y = face_point(f, 0.16 + i * 0.22, 0.42)
                r = 2.0 * SS
                d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(210, 225, 255, 255))
                d.ellipse([x * SS - r * 0.5, y * SS - r * 0.5, x * SS + r * 0.5, y * SS + r * 0.5], fill=(50, 60, 90, 255))
            # 能量指示燈
            for i in range(2):
                x, y = face_point(f, 0.32 + i * 0.36, 0.78)
                r = 1.8 * SS
                d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(90, 245, 220, 255))
        paint_on(img, face, side_panels)

    return finish_tile(img, "tile_tech", outdir, (215, 240, 255, 150))


def generate_temple(outdir):
    """81~100層：星穹神殿 (紫晶大理石、黃金符文飾邊、星曜光芒)"""
    top_g = ((242, 230, 255, 255), (195, 170, 235, 255))
    left_g = ((165, 135, 210, 255), (105, 80, 155, 255))
    right_g = ((120, 95, 165, 255), (72, 50, 115, 255))

    img = render_base_gradient_block(top_g, left_g, right_g, seed=505)
    rnd = random.Random(505)

    def temple_runes(d, _l):
        # 黃金幾何外飾框
        inset = 0.14
        ring = [top_point(inset, inset), top_point(1 - inset, inset),
                top_point(1 - inset, 1 - inset), top_point(inset, 1 - inset)]
        gold_color = (255, 215, 90, 255)
        d.line(poly(ring) + [poly(ring)[0]], fill=gold_color, width=int(SS * 1.8), joint="curve")

        # 內圈小菱形
        inset2 = 0.28
        ring2 = [top_point(inset2, inset2), top_point(1 - inset2, inset2),
                 top_point(1 - inset2, 1 - inset2), top_point(inset2, 1 - inset2)]
        d.line(poly(ring2) + [poly(ring2)[0]], fill=(255, 238, 160, 220), width=int(SS * 1.1), joint="curve")

        # 中央八芒星光芒
        cx, cy = top_point(0.5, 0.5)
        for ang in range(0, 360, 45):
            rad = math.radians(ang)
            ln = 18 if ang % 90 == 0 else 10
            ex = cx + math.cos(rad) * ln
            ey = cy + math.sin(rad) * ln * 0.5
            d.line([s((cx, cy)), s((ex, ey))], fill=(255, 248, 190, 255), width=int(SS * 1.5))

        # 神秘紫晶星芒微粒
        for _ in range(22):
            x, y = top_point(rnd.uniform(0.08, 0.92), rnd.uniform(0.08, 0.92))
            r = rnd.uniform(1.2, 2.5) * SS
            d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(255, 245, 180, 240))

    paint_on(img, TOP_FACE, temple_runes, blur=SS * 2.0)
    paint_on(img, TOP_FACE, temple_runes)

    # 側面符文與神殿浮雕
    for face in (LEFT_FACE, RIGHT_FACE):
        def runes(d, _l, f=face):
            for i in range(5):
                x, y = face_point(f, 0.12 + i * 0.19, 0.48)
                r = 1.9 * SS
                d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(255, 232, 145, 255))
        paint_on(img, face, runes)

    return finish_tile(img, "tile_temple", outdir, (255, 245, 200, 160))


if __name__ == "__main__":
    out_directory = sys.argv[1] if len(sys.argv) > 1 else "public/images/tower-gen3"
    print(f"Generating Monster Tower Gen3 isometric tiles into: {out_directory}")

    tiles = [
        generate_grass(out_directory),
        generate_ice(out_directory),
        generate_lava(out_directory),
        generate_tech(out_directory),
        generate_temple(out_directory)
    ]

    # 生成預覽用的展示總覽圖 (Contact Sheet)
    sheet = Image.new("RGBA", (SIZE * 5, SIZE), (10, 12, 28, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, (i * SIZE, 0))
    contact_path = os.path.join(out_directory, "_contact_sheet.png")
    sheet.save(contact_path)
    print(f"All 5 terrain tiles + contact sheet ({contact_path}) generated successfully!")
