/**
 * 怪獸塔 Gen3 — 等角折返坡道排版
 *
 * 舊版把等角磚塊排在矩形格線上（col * 寬、row * 高），所以磚塊本身雖然是等角圖，
 * 整個盤面看起來還是試算表。這裡改成真正的等角地面投影：
 *
 *   - 同一列往右走，會同時往右「並且往上後方」退（COL_DY），形成一條斜向坡道
 *   - 往上一列時整體再往左偏一點（ROW_DX），產生前後景深
 *   - 每一格算出 depth，交給畫家演算法當 z-index，讓前排壓住後排
 *   - 越後排的格子略縮小、略變暗，加強距離感
 *
 * 純函式，不依賴 React，方便單元測試。
 */

export const BOARD_COLS = 5;

/** 單一格子的佔位尺寸（磚塊圖本身的繪製大小） */
export const TILE_W = 74;
export const TILE_H = 78;

/**
 * 同一列往右一格的位移：往右 + 往上後方退。
 * COL_DX 刻意小於磚塊寬度（74），讓相鄰磚塊重疊、連成一條實心坡道，
 * 而不是一顆顆分開漂浮的菱形（試過 58 會散開，36 才會接起來）。
 */
const COL_DX = 36;
const COL_DY = 18;

/**
 * 往上一列的位移：抬高 + 往左偏（景深）。
 * 一列橫跨 5 格會爬升 4 * COL_DY = 72，ROW_DY 取 78 讓下一列剛好疊在上一列頂端之上，
 * 形成一層層往上的階地。
 */
const ROW_DX = -7;
const ROW_DY = 78;

const PAD_X = 30;
const PAD_BOTTOM = 70;
const PAD_TOP = 90;

/** 每往後一列縮小的比例，最多縮到 MIN_DEPTH_SCALE */
const DEPTH_SCALE_PER_ROW = 0.006;
const MIN_DEPTH_SCALE = 0.86;

export interface TilePlacement {
    /** 格子中心的水平座標 */
    x: number;
    /** 格子中心距離盤面底部的高度（沿用既有的 bottom 定位慣例） */
    y: number;
    row: number;
    col: number;
    /** 畫家演算法用：數字越大代表越靠近觀眾，直接當 z-index */
    depth: number;
    /** 景深縮放，越後排越小 */
    scale: number;
}

export function getTotalRows(totalFloors: number): number {
    return Math.ceil(totalFloors / BOARD_COLS);
}

/** 蛇行：偶數列由左往右，奇數列由右往左 */
export function getRowCol(floor: number): { row: number; col: number } {
    const row = Math.floor((floor - 1) / BOARD_COLS);
    const rawCol = (floor - 1) % BOARD_COLS;
    const col = row % 2 === 0 ? rawCol : BOARD_COLS - 1 - rawCol;
    return { row, col };
}

export function getBoardSize(totalFloors: number): { width: number; height: number } {
    const rows = getTotalRows(totalFloors);
    const width = PAD_X * 2 + (BOARD_COLS - 1) * COL_DX + Math.abs(ROW_DX) * (rows - 1) + TILE_W;
    const height = PAD_BOTTOM + PAD_TOP + (rows - 1) * ROW_DY + (BOARD_COLS - 1) * COL_DY + TILE_H;
    return { width, height };
}

export function getTilePlacement(floor: number, totalFloors: number): TilePlacement {
    const rows = getTotalRows(totalFloors);
    const { row, col } = getRowCol(floor);
    const { width } = getBoardSize(totalFloors);

    // 以盤面中線為基準左右展開，並讓上方列往左偏，避免座標跑到負值
    const centerX = width / 2;
    const x =
        centerX +
        (col - (BOARD_COLS - 1) / 2) * COL_DX +
        (row - (rows - 1) / 2) * ROW_DX;

    const y = PAD_BOTTOM + row * ROW_DY + col * COL_DY + TILE_H / 2;

    // 越上面、越右邊 = 越後方。depth 越大越前面，直接當 z-index 用。
    const depth = Math.round((rows - row) * 100 + (BOARD_COLS - col) * 4);
    const scale = Math.max(MIN_DEPTH_SCALE, 1 - row * DEPTH_SCALE_PER_ROW);

    return { x, y, row, col, depth, scale };
}

/** SVG 路徑用：把「距底部高度」換成 SVG 由上往下的 y 座標 */
export function toSvgY(y: number, boardHeight: number): number {
    return boardHeight - y;
}
