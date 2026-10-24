/**
 * 怪獸塔 V4 — 螺旋塔排版
 *
 * 格子沿著一座方形石塔的外牆盤旋往上，一圈 4 面、每面 5 格：
 *
 *   - 一圈 20 格剛好是一個區域（草原 / 冰晶 / 熔岩 / 雲城 / 神殿），100 格繞 5 圈
 *   - 由正面（+z）往右走，逆時針（俯視）繞塔，每一格比上一格高一階
 *   - 每一格記下所在牆面的外法線，鏡頭據此轉到玩家正前方
 *
 * 純函式，不依賴 three.js，方便單元測試。
 */

export const TILES_PER_SIDE = 5;
export const TILES_PER_LAP = TILES_PER_SIDE * 4;
/** 環道（格子中心）到塔中心的距離 */
export const RING_HALF = 3.9;
/** 塔身半寬 */
export const CORE_HALF = 2.9;
/** 同一面相鄰兩格的間距 */
export const TILE_PITCH = (RING_HALF * 2) / TILES_PER_SIDE;
/** 每一格的爬升高度 */
export const RISE = 0.32;
export const LAP_HEIGHT = RISE * TILES_PER_LAP;

export interface SpiralTile {
    floor: number;
    lap: number;
    /** 0 正面(+z)、1 右面(+x)、2 背面(-z)、3 左面(-x) */
    side: number;
    /** 這一面上的第幾格（0–4，沿前進方向） */
    index: number;
    x: number;
    y: number;
    z: number;
    /** 牆面外法線 */
    nx: number;
    nz: number;
    /** 前進方向 */
    dx: number;
    dz: number;
}

// 每一面：外法線與前進方向
const SIDES = [
    { nx: 0, nz: 1, dx: 1, dz: 0 },
    { nx: 1, nz: 0, dx: 0, dz: -1 },
    { nx: 0, nz: -1, dx: -1, dz: 0 },
    { nx: -1, nz: 0, dx: 0, dz: 1 },
];

export function getSpiralTile(floor: number): SpiralTile {
    const i = floor - 1;
    const lap = Math.floor(i / TILES_PER_LAP);
    const inLap = i % TILES_PER_LAP;
    const side = Math.floor(inLap / TILES_PER_SIDE);
    const index = inLap % TILES_PER_SIDE;
    const s = SIDES[side];
    const along = -RING_HALF + (index + 0.5) * TILE_PITCH;
    return {
        floor,
        lap,
        side,
        index,
        x: s.nx * RING_HALF + s.dx * along,
        y: i * RISE,
        z: s.nz * RING_HALF + s.dz * along,
        nx: s.nx,
        nz: s.nz,
        dx: s.dx,
        dz: s.dz,
    };
}

/**
 * 鏡頭方位角（弧度，Vector3(sin, _, cos) 慣例）。連續不換行：繞一圈就加 2π，
 * 所以從背面走到左面不會整圈倒轉。同一面中央的格子正對牆面。
 */
export function cameraAzimuth(floor: number): number {
    const t = getSpiralTile(floor);
    return Math.PI * 2 * (t.lap + (t.side + (t.index + 0.5) / TILES_PER_SIDE - 0.5) / 4);
}

/** 轉角平台（每圈 4 個），高度落在前後兩格之間 */
export function getCornerLanding(lap: number, corner: number): { x: number; y: number; z: number } {
    // corner k 是第 k 面走完、轉進第 k+1 面的那個角
    const a = SIDES[corner],
        b = SIDES[(corner + 1) % 4];
    const lastFloor = lap * TILES_PER_LAP + corner * TILES_PER_SIDE + TILES_PER_SIDE;
    return {
        x: (a.nx + b.nx) * RING_HALF,
        y: (lastFloor - 1) * RISE + RISE / 2,
        z: (a.nz + b.nz) * RING_HALF,
    };
}

export function getZoneIndex(floor: number): number {
    return Math.min(4, Math.floor((floor - 1) / TILES_PER_LAP));
}
