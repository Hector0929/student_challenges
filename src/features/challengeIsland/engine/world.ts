// 六角島、程序化建築、橋與行人路網
import * as THREE from 'three';
import type { BuildingStyle, IslandDef } from '../model';

export const R = 3.2; // 六角形外接圓半徑（尖頂朝 ±z）
export const SP = 3.7; // axial 間距
export const TOP = 0.5; // 沙岸頂
export const GROUND_Y = TOP + 0.09; // 可行走地面
export const PATH_R = 2.1; // 行人環道（到邊中點）
const SLOT_R = 1.25; // 一般島的建築環
const PLAZA_D = 0.82; // 廣場島的六角格距
const SQ3 = Math.sqrt(3);
export const NEIGHBORS: Array<[number, number]> = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
];

export function mulberry(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
type Rng = () => number;

export function axialToWorld(q: number, r: number) {
    return new THREE.Vector3(SP * SQ3 * (q + r / 2), 0, SP * 1.5 * r);
}
/** 往鄰島方向的角度（Vector3(cos, 0, sin)） */
export function dirAngle(dq: number, dr: number) {
    const v = axialToWorld(dq, dr);
    return Math.atan2(v.z, v.x);
}
const polar = (a: number, r: number, y = GROUND_Y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);

/**
 * 建築位置（島的區域座標）。7 個以內用「中心 + 6 環」，超過改用廣場六角格（最多 19）。
 */
export function slotLayout(count: number): { slots: THREE.Vector3[]; scale: number; plaza: boolean } {
    if (count <= 7) {
        const ring = [0, 2, 5, 1, 4, 3].map((k) => polar(Math.PI / 6 + (k * Math.PI) / 3, SLOT_R));
        return { slots: [polar(0, 0), ...ring].slice(0, count), scale: 1, plaza: false };
    }
    const slots = [polar(0, 0)];
    for (let k = 0; k < 6; k++) slots.push(polar((k * Math.PI) / 3, PLAZA_D));
    for (let k = 0; k < 6; k++) {
        slots.push(polar((k * Math.PI) / 3, PLAZA_D * 2));
        slots.push(polar(Math.PI / 6 + (k * Math.PI) / 3, PLAZA_D * SQ3));
    }
    return { slots: slots.slice(0, Math.min(count, 19)), scale: 0.68, plaza: true };
}

// ---------- 材質 ----------
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: THREE.ColorRepresentation, opts: THREE.MeshStandardMaterialParameters = {}) {
    const key = String(color) + JSON.stringify(opts);
    let m = matCache.get(key);
    if (!m) {
        m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, ...opts });
        matCache.set(key, m);
    }
    return m;
}
/** 夜間發光材質，由 environment 依時間調整 emissiveIntensity */
export const glow = {
    window: new THREE.MeshStandardMaterial({ color: 0x5b5048, emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.4, flatShading: true }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc861, emissiveIntensity: 0, flatShading: true }),
    neonA: new THREE.MeshStandardMaterial({ color: 0xff5fae, emissive: 0xff3d9a, emissiveIntensity: 0.6, flatShading: true }),
    neonB: new THREE.MeshStandardMaterial({ color: 0x5fe3ff, emissive: 0x2fd5ff, emissiveIntensity: 0.6, flatShading: true }),
};

type Mat = THREE.Material | THREE.ColorRepresentation;
const asMat = (c: Mat, opts?: THREE.MeshStandardMaterialParameters) => (c instanceof THREE.Material ? c : mat(c, opts));
function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}
const box = (w: number, h: number, d: number, c: Mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), asMat(c), x, y + h / 2, z);
const cyl = (rt: number, rb: number, h: number, c: Mat, x = 0, y = 0, z = 0, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asMat(c), x, y + h / 2, z);
const cone = (r: number, h: number, c: Mat, x = 0, y = 0, z = 0, seg = 10) => mesh(new THREE.ConeGeometry(r, h, seg), asMat(c), x, y + h / 2, z);
const ball = (r: number, c: Mat, x = 0, y = 0, z = 0, ws = 10, hs = 8) => mesh(new THREE.SphereGeometry(r, ws, hs), asMat(c), x, y, z);

function gable(w: number, h: number, d: number, c: Mat) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return mesh(g, asMat(c));
}
/** 在寬 w、深 d 的盒子 +z 面上，從高度 y 起排窗戶 */
function windows(group: THREE.Group, w: number, d: number, y: number, rows = 1, cols = 2, h = 0.09, dx = 0) {
    const gap = w / (cols + 1);
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            const m = mesh(new THREE.BoxGeometry(gap * 0.55, h, 0.02), glow.window, dx - w / 2 + gap * (c + 1), y + r * (h * 2.2) + h / 2, d / 2 + 0.005);
            m.castShadow = false;
            group.add(m);
        }
}

// ---------- 建築風格 ----------
// 原點在地面，佔地半徑約 0.5 以內
type StyleFn = (accent: number, rng: Rng, i: number) => THREE.Group;
const MONSTER_BODY = [0xf7d9cb, 0xd7ecc8, 0xd3e4f5, 0xfbe7a6, 0xe8d6f2, 0xf9d0dc];
const STYLES: Record<BuildingStyle, StyleFn> = {
    monster(accent, rng, i) {
        // 怪獸小屋：圓滾滾的屋身、尖屋頂、兩顆眼睛窗
        const g = new THREE.Group();
        const h = 0.42 + rng() * 0.12;
        g.add(box(0.62, h, 0.56, MONSTER_BODY[i % MONSTER_BODY.length]));
        const roof = gable(0.76, 0.34, 0.66, i % 3 === 0 ? accent : [0x8a5a44, 0x5b7fa8, 0x6f9c5a][i % 3]);
        roof.position.y = h;
        g.add(roof);
        for (const x of [-0.13, 0.13]) {
            const eye = mesh(new THREE.CircleGeometry(0.075, 12), glow.window, x, h * 0.62, 0.285);
            eye.castShadow = false;
            g.add(eye);
            g.add(mesh(new THREE.CircleGeometry(0.03, 8), mat(0x211d1d), x, h * 0.62, 0.29));
        }
        g.add(box(0.16, 0.2, 0.03, 0x7a5236, 0, 0, 0.285));
        // 小角
        g.add(cone(0.05, 0.14, accent, -0.2, h + 0.12, 0, 5));
        g.add(cone(0.05, 0.14, accent, 0.2, h + 0.12, 0, 5));
        return g;
    },
    library(accent, rng, i) {
        const g = new THREE.Group();
        const h = 0.45 + rng() * 0.35;
        g.add(box(0.72, h, 0.6, 0xf3e7d3));
        windows(g, 0.72, 0.6, 0.12, Math.max(1, Math.round(h / 0.25)), 3);
        const roof = gable(0.86, 0.32, 0.7, accent);
        roof.position.y = h;
        g.add(roof);
        g.add(box(0.16, 0.22, 0.04, 0x7a5236, 0, 0, 0.31));
        if (i % 2 === 0) g.add(cyl(0.05, 0.05, 0.25, 0xa8673f, 0.22, h + 0.05, -0.12, 6));
        return g;
    },
    temple(accent, rng) {
        const g = new THREE.Group();
        g.add(box(0.8, 0.1, 0.8, 0xd9cbb0));
        let y = 0.1;
        const tiers = 2 + Math.floor(rng() * 2);
        for (let t = 0; t < tiers; t++) {
            const s = 0.6 - t * 0.14;
            g.add(box(s, 0.26, s, 0xf1e4cf, 0, y, 0));
            windows(g, s, s, y + 0.08, 1, 2);
            y += 0.26;
            const roof = cone(s * 0.95, 0.18, accent, 0, y, 0, 4);
            roof.rotation.y = Math.PI / 4;
            g.add(roof);
            y += 0.1;
        }
        g.add(cyl(0.02, 0.02, 0.18, 0xe8b04a, 0, y + 0.06, 0, 5));
        return g;
    },
    tower(accent, rng, i) {
        const g = new THREE.Group();
        const h = 0.6 + rng() * 0.5 + (i === 0 ? 0.4 : 0);
        g.add(cyl(0.26, 0.3, h, 0xf3ead8, 0, 0, 0, 8));
        for (let y = 0.15; y < h - 0.1; y += 0.25) g.add(mesh(new THREE.BoxGeometry(0.1, 0.09, 0.02), glow.window, 0, y, 0.29));
        g.add(cone(0.36, 0.42, accent, 0, h, 0, 8));
        if (i === 0) {
            const face = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16), mat(0xfff8f4), 0, h - 0.18, 0.28);
            face.rotation.x = Math.PI / 2;
            g.add(face, mesh(new THREE.BoxGeometry(0.015, 0.1, 0.01), mat(0x211d1d), 0, h - 0.15, 0.3));
        }
        return g;
    },
    bakery(accent, rng) {
        // 少一角的蛋糕——分數看得見
        const g = new THREE.Group();
        const keep = Math.PI * 2 * (1 - (1 + Math.floor(rng() * 3)) / 8);
        let y = 0;
        for (const [r, h, c] of [
            [0.42, 0.22, 0xf7e2c6],
            [0.32, 0.2, 0xffffff],
            [0.22, 0.18, 0xf7e2c6],
        ]) {
            g.add(mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, false, 0, keep), mat(c, { side: THREE.DoubleSide }), 0, y + h / 2, 0));
            g.add(mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.04, 20, 1, false, 0, keep), mat(accent, { side: THREE.DoubleSide }), 0, y + h - 0.01, 0));
            y += h;
        }
        g.add(ball(0.06, 0xc8283c, 0, y + 0.05, 0));
        g.rotation.y = rng() * Math.PI * 2;
        return g;
    },
    blocks(_accent, rng, i) {
        const g = new THREE.Group();
        const palette = [0xe0a23a, 0x5a9bd8, 0xe36b5d, 0x6db37a, 0xf2f0e6];
        const pick = (k: number) => palette[(i + k) % palette.length];
        g.add(box(0.42, 0.42, 0.42, pick(0), -0.12, 0, 0.05));
        const pyr = cone(0.26, 0.4, pick(1), -0.12, 0.42, 0.05, 4);
        pyr.rotation.y = Math.PI / 4;
        g.add(pyr);
        g.add(cyl(0.14, 0.14, 0.5 + rng() * 0.3, pick(2), 0.22, 0, -0.1, 14));
        g.add(ball(0.12, pick(3), 0.22, 0.12, 0.25, 12, 10));
        windows(g, 0.42, 0.52, 0.14, 1, 2, 0.09, -0.12);
        return g;
    },
    observatory(accent, rng) {
        const g = new THREE.Group();
        g.add(cyl(0.36, 0.4, 0.42, 0xe9e6dd, 0, 0, 0, 12));
        windows(g, 0.5, 0.74, 0.16, 1, 2);
        g.add(mesh(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xcfd6dc, { metalness: 0.3, roughness: 0.4 }), 0, 0.42, 0));
        g.add(mesh(new THREE.BoxGeometry(0.08, 0.3, 0.36), mat(accent), 0, 0.6, 0.02));
        const scope = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), mat(0x3b3f5c), 0, 0.72, 0.18);
        scope.rotation.x = Math.PI / 3.2;
        g.add(scope);
        g.rotation.y = rng() * Math.PI * 2;
        return g;
    },
    castle(accent, rng, i) {
        const g = new THREE.Group();
        const h = 0.5 + rng() * 0.25;
        g.add(box(0.5, h, 0.5, 0xd8d2c4));
        windows(g, 0.5, 0.5, h * 0.45, 1, 2);
        for (const [x, z] of [
            [-0.25, -0.25],
            [0.25, -0.25],
            [-0.25, 0.25],
            [0.25, 0.25],
        ]) {
            g.add(cyl(0.09, 0.09, h + 0.18, 0xcac3b3, x, 0, z, 8));
            g.add(cone(0.12, 0.2, accent, x, h + 0.18, z, 8));
        }
        g.add(cyl(0.012, 0.012, 0.32, 0x5b5f6b, 0, h, 0, 5));
        g.add(mesh(new THREE.PlaneGeometry(0.18, 0.11), mat(i % 2 ? 0x211d1d : 0xfff8f4, { side: THREE.DoubleSide }), 0.09, h + 0.26, 0));
        return g;
    },
    stall(accent, _rng, i) {
        // 市集攤位：木櫃台 + 條紋遮雨棚
        const g = new THREE.Group();
        g.add(box(0.7, 0.32, 0.46, 0xc89a6a));
        g.add(box(0.74, 0.04, 0.5, 0x8a5a3a, 0, 0.32, 0));
        for (const x of [-0.33, 0.33]) g.add(cyl(0.025, 0.025, 0.62, 0x6b4a32, x, 0, 0.2, 5));
        const stripes = [accent, 0xfff8f4];
        for (let k = 0; k < 5; k++) {
            const strip = box(0.152, 0.05, 0.5, stripes[(k + i) % 2], -0.304 + k * 0.152, 0.6, 0.08);
            strip.rotation.x = -0.35;
            g.add(strip);
        }
        g.add(box(0.5, 0.36, 0.08, 0xf3e7d3, 0, 0.32, -0.2));
        windows(g, 0.5, 0.42, 0.42, 1, 2);
        return g;
    },
    well(accent) {
        // 許願井：石砌井口 + 小屋頂
        const g = new THREE.Group();
        g.add(cyl(0.32, 0.34, 0.26, 0xb7ad9c, 0, 0, 0, 14));
        const water = mesh(new THREE.CircleGeometry(0.26, 16), mat(0x3aa0b4), 0, 0.25, 0);
        water.rotation.x = -Math.PI / 2;
        g.add(water);
        for (const x of [-0.28, 0.28]) g.add(cyl(0.025, 0.025, 0.55, 0x6b4a32, x, 0.2, 0, 5));
        const roof = gable(0.78, 0.26, 0.5, accent);
        roof.position.y = 0.72;
        g.add(roof);
        g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), glow.lamp, 0, 0.62, 0));
        return g;
    },
    spire(accent) {
        // 迷你螺旋石塔（怪獸塔 V4 的縮小版）：石造塔身、繞塔往上的綠色階梯、紅色尖頂
        const g = new THREE.Group();
        const h = 1.7;
        g.add(box(0.46, h, 0.46, 0x9b9486));
        const stepColors = [0xa6d96a, 0xc4ecf7, 0xf5b860, 0xb9bdf6, 0xebc9f7];
        const steps = 18;
        for (let k = 0; k < steps; k++) {
            const side = Math.floor(k / 3) % 4,
                along = ((k % 3) - 1) * 0.16;
            const step = box(0.15, 0.05, 0.15, stepColors[Math.min(4, Math.floor((k / steps) * 5))]);
            const out = 0.31;
            const [x, z] = [
                [along, out],
                [out, -along],
                [-along, -out],
                [-out, along],
            ][side];
            step.position.set(x, 0.08 + (k / steps) * (h - 0.2), z);
            g.add(step);
        }
        const roof = cone(0.42, 0.55, 0xb4483a, 0, h, 0, 4);
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        g.add(cyl(0.015, 0.015, 0.36, 0xfff8f4, 0, h + 0.5, 0, 5));
        g.add(mesh(new THREE.PlaneGeometry(0.2, 0.12), mat(accent, { side: THREE.DoubleSide }), 0.1, h + 0.78, 0));
        for (const [x, z] of [
            [0.08, 0.235],
            [-0.08, 0.235],
        ])
            g.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.02), glow.window, x, h * 0.55, z));
        return g;
    },
    arcade(_accent, rng, i) {
        const g = new THREE.Group();
        const h = 0.42 + rng() * 0.2;
        g.add(box(0.7, h, 0.5, i % 2 ? 0x3a3550 : 0x2e3a4f));
        g.add(mesh(new THREE.BoxGeometry(0.72, 0.04, 0.52), i % 2 ? glow.neonA : glow.neonB, 0, h - 0.06, 0));
        g.add(mesh(new THREE.BoxGeometry(0.46, 0.18, 0.04), i % 2 ? glow.neonB : glow.neonA, 0, h + 0.14, 0.1));
        g.add(cyl(0.015, 0.015, 0.1, 0x211d1d, -0.15, h, 0.1, 4));
        g.add(cyl(0.015, 0.015, 0.1, 0x211d1d, 0.15, h, 0.1, 4));
        g.add(box(0.22, 0.24, 0.03, glow.window, 0, 0, 0.255));
        return g;
    },
};

// ---------- 裝飾 ----------
function tree(rng: Rng, x: number, z: number) {
    const g = new THREE.Group();
    const h = 0.12 + rng() * 0.1;
    g.add(cyl(0.03, 0.04, h, 0x8a6446, 0, 0, 0, 5));
    if (rng() < 0.5) g.add(cone(0.16 + rng() * 0.05, 0.38 + rng() * 0.2, [0x5f8f52, 0x6f9c5a, 0x4f7f4a][Math.floor(rng() * 3)], 0, h, 0, 6));
    else g.add(ball(0.17 + rng() * 0.06, [0x7aa65e, 0x8db86f, 0x6a9a58][Math.floor(rng() * 3)], 0, h + 0.14, 0, 7, 5));
    g.position.set(x, GROUND_Y, z);
    return g;
}
function lamp(x: number, z: number) {
    const g = new THREE.Group();
    g.add(cyl(0.012, 0.016, 0.3, 0x3d3a38, 0, 0, 0, 5));
    const bulb = mesh(new THREE.SphereGeometry(0.035, 6, 5), glow.lamp, 0, 0.32, 0);
    bulb.castShadow = false;
    g.add(bulb);
    g.position.set(x, GROUND_Y, z);
    return g;
}
/** 到邊中點的六角「半徑」 */
function hexDist(x: number, z: number) {
    let m = 0;
    for (let k = 0; k < 6; k++) m = Math.max(m, x * Math.cos((k * Math.PI) / 3) + z * Math.sin((k * Math.PI) / 3));
    return m;
}

/** 封島：發光結界 + 一圈柵欄 + 漂浮的鎖 */
function lockedBarrier() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.99, R * 0.99, 2.2, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    dome.position.y = GROUND_Y + 1.1;
    dome.userData.barrier = true;
    g.add(dome);
    const rail = mat(0x5b4a6b);
    for (let k = 0; k < 6; k++) {
        const a0 = Math.PI / 6 + (k * Math.PI) / 3,
            a1 = a0 + Math.PI / 3;
        const p0 = polar(a0, R * 0.9),
            p1 = polar(a1, R * 0.9);
        for (let j = 0; j < 4; j++) {
            const post = cyl(0.03, 0.03, 0.34, rail, 0, GROUND_Y, 0, 5);
            post.position.lerpVectors(p0, p1, j / 4).setY(GROUND_Y + 0.17);
            g.add(post);
        }
        const bar = mesh(new THREE.BoxGeometry(p0.distanceTo(p1), 0.04, 0.04), rail);
        bar.position.lerpVectors(p0, p1, 0.5).setY(GROUND_Y + 0.28);
        bar.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
        g.add(bar);
    }
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
        ctx.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', 64, 72);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const lock = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    lock.scale.setScalar(1.3);
    lock.position.y = GROUND_Y + 2.6;
    lock.userData.lockSprite = true;
    g.add(lock);
    return g;
}

// ---------- 島 ----------
export interface PickInfo {
    type: 'island' | 'building' | 'walker' | 'flow';
    id: string;
}
export interface BuildingRef {
    id: string;
    island: string;
    group: THREE.Group;
    local: THREE.Vector3;
    world: THREE.Vector3;
    /** 屋頂高度（含地面） */
    height: number;
    /** 門口（島的區域座標）；null 表示行人不會進去 */
    door: THREE.Vector3 | null;
    plaza: boolean;
    /** 建築的基本縮放（滑鼠移上去會在這個基礎上放大） */
    scale: number;
}
export interface IslandRef {
    id: string;
    def: IslandDef;
    locked: boolean;
    group: THREE.Group;
    center: THREE.Vector3;
    buildings: BuildingRef[];
    flag: THREE.Group;
    cloth: THREE.Mesh;
    plaza: boolean;
}

export function buildIslands(defs: IslandDef[], scene: THREE.Object3D) {
    const islands = new Map<string, IslandRef>();
    const pickables: THREE.Object3D[] = [];
    defs.forEach((def, idx) => {
        const rng = mulberry(1000 + idx * 97);
        const group = new THREE.Group();
        const center = axialToWorld(def.axial[0], def.axial[1]);
        group.position.copy(center);
        scene.add(group);

        const cliff = mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.82, 1.6, 6), mat(0xc4ab8c), 0, TOP - 0.96, 0);
        cliff.castShadow = false;
        const sand = mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.16, 6), mat(0xeedcb8), 0, TOP - 0.08, 0);
        const ground = def.locked ? '#' + new THREE.Color(def.ground).lerp(new THREE.Color(0x6b6478), 0.45).getHexString() : def.ground;
        const top = mesh(new THREE.CylinderGeometry(R * 0.92, R * 0.93, 0.1, 6), mat(ground), 0, TOP + 0.04, 0);
        group.add(cliff, sand, top);
        for (const m of [top, sand]) {
            m.userData.pick = { type: 'island', id: def.id } satisfies PickInfo;
            pickables.push(m);
        }

        const ringGeo = new THREE.RingGeometry((PATH_R - 0.13) / Math.cos(Math.PI / 6), (PATH_R + 0.13) / Math.cos(Math.PI / 6), 6, 1, Math.PI / 6);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, mat(0xf2e6cf));
        ring.position.y = GROUND_Y + 0.003;
        ring.receiveShadow = true;
        group.add(ring);

        const { slots, scale, plaza } = slotLayout(def.challenges.length);
        const accent = new THREE.Color(def.accent).getHex();
        const buildings: BuildingRef[] = [];
        def.challenges.slice(0, slots.length).forEach((ch, i) => {
            const pos = slots[i];
            const b = STYLES[ch.style ?? def.style](accent, rng, i);
            // 功能島只有一棟（例如怪獸島的螺旋塔）時放大當地標
            const bScale = def.hub && def.challenges.length === 1 ? 1.5 : scale;
            b.scale.setScalar(bScale);
            b.position.copy(pos);
            const r = Math.hypot(pos.x, pos.z);
            const ang = Math.atan2(pos.z, pos.x);
            // 朝外面向環道；中心那棟朝 +x（門口支線從那裡出去）
            b.rotation.y += r > 0.01 ? Math.PI / 2 - ang : Math.PI / 2;
            b.traverse((o) => {
                if ((o as THREE.Mesh).isMesh) {
                    o.userData.pick = { type: 'building', id: ch.id } satisfies PickInfo;
                    pickables.push(o);
                }
            });
            // 先量高度再掛上島（未掛載時 matrixWorld 就是島的區域座標）
            const bounds = new THREE.Box3().setFromObject(b);
            group.add(b);
            // 廣場島只有最外圈有門；一般島每棟都有
            let door: THREE.Vector3 | null = null;
            if (!plaza) door = r < 0.01 ? polar(0, 0.62) : polar(ang, SLOT_R + 0.55);
            else if (r > PLAZA_D * 1.5) door = polar(ang, r + 0.35);
            buildings.push({ id: ch.id, island: def.id, group: b, local: pos.clone(), world: center.clone().add(pos), height: bounds.max.y, door, plaza, scale: bScale });
        });

        // 樹：避開建築、環道與門口
        const trees: Array<{ x: number; z: number }> = [];
        const clear = plaza ? 0.5 : 0.62;
        for (let tries = 0; trees.length < (plaza ? 7 : 11) && tries < 300; tries++) {
            const a = rng() * Math.PI * 2,
                rr = rng() * 2.6;
            const x = Math.cos(a) * rr,
                z = Math.sin(a) * rr;
            const hd = hexDist(x, z);
            if (hd > 2.55 || Math.abs(hd - PATH_R) < 0.24) continue;
            if (slots.some((s) => Math.hypot(s.x - x, s.z - z) < clear)) continue;
            if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 0.32)) continue;
            if (hd < PATH_R && buildings.some((b) => b.door && Math.hypot(b.door.x - x, b.door.z - z) < 0.35)) continue;
            if (plaza && hd < PATH_R - 0.2) continue; // 廣場內部留給建築
            trees.push({ x, z });
            group.add(tree(rng, x, z));
        }
        for (let k = 0; k < 6; k += 2) group.add(lamp(Math.cos((k * Math.PI) / 3 + 0.3) * (PATH_R + 0.24), Math.sin((k * Math.PI) / 3 + 0.3) * (PATH_R + 0.24)));

        // 完成旗（整座島完成才出現）
        const flag = new THREE.Group();
        flag.add(cyl(0.02, 0.02, 0.9, 0xfff8f4, 0, 0, 0, 6));
        const cloth = mesh(new THREE.PlaneGeometry(0.42, 0.26), mat(accent, { side: THREE.DoubleSide }), 0.21, 0.74, 0);
        flag.add(cloth);
        flag.position.copy(polar(-Math.PI / 2 - 0.35, 2.45));
        flag.visible = false;
        group.add(flag);

        if (def.locked) group.add(lockedBarrier());
        islands.set(def.id, { id: def.id, def, group, center, buildings, flag, cloth, plaza, locked: !!def.locked });
    });
    return { islands, pickables };
}

// ---------- 橋與路網 ----------
export interface BridgeRef {
    a: string;
    b: string;
    k: number;
}

export function buildBridges(defs: IslandDef[], islands: Map<string, IslandRef>, scene: THREE.Object3D): BridgeRef[] {
    const byAxial = new Map(defs.map((d) => [d.axial.join(','), d.id]));
    const pairs: BridgeRef[] = [];
    for (const d of defs) {
        NEIGHBORS.forEach(([dq, dr], k) => {
            const other = byAxial.get([d.axial[0] + dq, d.axial[1] + dr].join(','));
            if (other && d.id < other) pairs.push({ a: d.id, b: other, k });
        });
    }
    const deck = [mat(0xb48560), mat(0xa77a55)];
    const rail = mat(0xfff8f4);
    for (const p of pairs) {
        const A = islands.get(p.a)!,
            B = islands.get(p.b)!;
        const dir = B.center.clone().sub(A.center).normalize();
        const start = A.center.clone().addScaledVector(dir, PATH_R + 0.2);
        const end = B.center.clone().addScaledVector(dir, -(PATH_R + 0.2));
        const len = start.distanceTo(end);
        const n = 9;
        const g = new THREE.Group();
        const yaw = Math.atan2(dir.x, dir.z);
        const side = new THREE.Vector3(dir.z, 0, -dir.x);
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            const pos = start.clone().lerp(end, t);
            pos.y = GROUND_Y + Math.sin(t * Math.PI) * 0.22;
            const plank = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, len / n + 0.02), deck[i % 2]);
            plank.position.copy(pos);
            plank.rotation.order = 'YXZ';
            plank.rotation.y = yaw;
            plank.rotation.x = -Math.cos(t * Math.PI) * 0.22 * (Math.PI / len);
            plank.castShadow = plank.receiveShadow = true;
            g.add(plank);
            if (i % 2 === 0) {
                for (const s of [-1, 1]) {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 5), rail);
                    post.position.copy(pos).addScaledVector(side, 0.22 * s);
                    post.position.y += 0.08;
                    post.castShadow = true;
                    g.add(post);
                }
            }
        }
        // 通往封島的橋，在封島那一端放柵欄
        if (A.locked || B.locked) {
            const at = A.locked ? start : end;
            const gate = new THREE.Group();
            for (const s of [-1, 1]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), mat(0x3d3a38));
                post.position.set(0.26 * s, 0.21, 0);
                gate.add(post);
            }
            for (let k = 0; k < 4; k++) {
                const seg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.04), mat(k % 2 ? 0xfff8f4 : 0xd23b3b));
                seg.position.set(-0.195 + k * 0.13, 0.3, 0);
                gate.add(seg);
            }
            gate.position.set(at.x, GROUND_Y + 0.02, at.z);
            gate.rotation.y = yaw;
            gate.traverse((o) => ((o as THREE.Mesh).castShadow = true));
            g.add(gate);
        }
        for (const t of [0.3, 0.7]) {
            const pos = start.clone().lerp(end, t);
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6), mat(0x8a6a4e));
            pil.position.set(pos.x, GROUND_Y - 0.3, pos.z);
            g.add(pil);
        }
        scene.add(g);
    }
    return pairs;
}

export interface GraphNode {
    id: string;
    pos: THREE.Vector3;
    island: string;
    building?: string;
    links: Array<{ to: string; kind: 'path' | 'bridge' }>;
}

/** 節點：`${island}:${k}` 環道（邊中點）、`${island}:b:${id}` 建築門口 */
export function buildGraph(islands: Map<string, IslandRef>, bridges: BridgeRef[]) {
    const nodes = new Map<string, GraphNode>();
    const add = (id: string, pos: THREE.Vector3, island: string, building?: string) => nodes.set(id, { id, pos, island, building, links: [] });
    const link = (a: string, b: string, kind: 'path' | 'bridge' = 'path') => {
        nodes.get(a)!.links.push({ to: b, kind });
        nodes.get(b)!.links.push({ to: a, kind });
    };
    const ringAngles = NEIGHBORS.map(([q, r]) => dirAngle(q, r));
    for (const isl of islands.values()) {
        if (isl.locked) continue; // 封島：沒有路，小夥伴進不去
        ringAngles.forEach((a, k) => add(`${isl.id}:${k}`, isl.center.clone().add(polar(a, PATH_R)), isl.id));
        for (let k = 0; k < 6; k++) link(`${isl.id}:${k}`, `${isl.id}:${(k + 1) % 6}`);
        for (const b of isl.buildings) {
            if (!b.door) continue;
            const id = `${isl.id}:b:${b.id}`;
            add(id, isl.center.clone().add(b.door), isl.id, b.id);
            const ang = Math.atan2(b.door.z, b.door.x);
            const diffs = ringAngles
                .map((a, k) => ({ k, d: Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) }))
                .sort((x, y) => x.d - y.d);
            // 正對某個環道節點就只接那一個，否則接左右兩個
            const targets = diffs[0].d < 0.05 ? diffs.slice(0, 1) : diffs.slice(0, 2);
            targets.forEach(({ k }) => link(id, `${isl.id}:${k}`));
        }
    }
    for (const p of bridges) {
        if (islands.get(p.a)!.locked || islands.get(p.b)!.locked) continue;
        link(`${p.a}:${p.k}`, `${p.b}:${(p.k + 3) % 6}`, 'bridge');
    }
    return nodes;
}
