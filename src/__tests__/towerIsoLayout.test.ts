/**
 * 怪獸塔 Gen3 — 等角折返坡道排版
 *
 * 保護三件事：格子不重疊、蛇行方向正確、深度排序讓前排壓住後排。
 */

import { describe, it, expect } from 'vitest';
import {
    BOARD_COLS,
    TILE_W,
    TILE_H,
    getBoardSize,
    getRowCol,
    getTilePlacement,
    getTotalRows,
    toSvgY,
} from '../lib/towerIsoLayout';

const TOTAL = 100;

describe('getRowCol — 蛇行排列', () => {
    it('第一列由左往右', () => {
        expect(getRowCol(1)).toEqual({ row: 0, col: 0 });
        expect(getRowCol(5)).toEqual({ row: 0, col: 4 });
    });

    it('第二列折返，由右往左', () => {
        expect(getRowCol(6)).toEqual({ row: 1, col: 4 });
        expect(getRowCol(10)).toEqual({ row: 1, col: 0 });
    });

    it('第三列再折回由左往右', () => {
        expect(getRowCol(11)).toEqual({ row: 2, col: 0 });
        expect(getRowCol(15)).toEqual({ row: 2, col: 4 });
    });

    it('頂樓落在最後一列', () => {
        expect(getRowCol(100).row).toBe(getTotalRows(TOTAL) - 1);
    });
});

describe('getTilePlacement — 等角投影', () => {
    it('每一層都有唯一座標，不會兩層疊在一起', () => {
        const seen = new Set<string>();
        for (let floor = 1; floor <= TOTAL; floor += 1) {
            const { x, y } = getTilePlacement(floor, TOTAL);
            const key = `${Math.round(x)}:${Math.round(y)}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
        }
        expect(seen.size).toBe(TOTAL);
    });

    it('越高的樓層畫面上越高（y 越大代表離底部越遠）', () => {
        const low = getTilePlacement(3, TOTAL);
        const mid = getTilePlacement(53, TOTAL);
        const high = getTilePlacement(98, TOTAL);
        expect(mid.y).toBeGreaterThan(low.y);
        expect(high.y).toBeGreaterThan(mid.y);
    });

    it('同一列往右走時會往上後方退，這是等角坡道的關鍵', () => {
        // 第一列 floor 1..5 是 col 0..4
        const first = getTilePlacement(1, TOTAL);
        const last = getTilePlacement(5, TOTAL);
        expect(last.x).toBeGreaterThan(first.x); // 往右
        expect(last.y).toBeGreaterThan(first.y); // 同時往上後方退
    });

    it('所有格子都落在盤面範圍內', () => {
        const { width, height } = getBoardSize(TOTAL);
        for (let floor = 1; floor <= TOTAL; floor += 1) {
            const { x, y } = getTilePlacement(floor, TOTAL);
            expect(x - TILE_W / 2).toBeGreaterThanOrEqual(0);
            expect(x + TILE_W / 2).toBeLessThanOrEqual(width);
            expect(y - TILE_H / 2).toBeGreaterThanOrEqual(0);
            expect(y + TILE_H / 2).toBeLessThanOrEqual(height);
        }
    });
});

describe('depth — 畫家演算法排序', () => {
    it('低樓層（前排）的 depth 大於高樓層（後排），才會壓在前面', () => {
        const front = getTilePlacement(2, TOTAL);
        const back = getTilePlacement(97, TOTAL);
        expect(front.depth).toBeGreaterThan(back.depth);
    });

    it('depth 隨列數單調遞減', () => {
        let previous = Infinity;
        for (let row = 0; row < getTotalRows(TOTAL); row += 1) {
            const floor = row * BOARD_COLS + 1;
            const { depth } = getTilePlacement(floor, TOTAL);
            expect(depth).toBeLessThan(previous);
            previous = depth;
        }
    });

    it('景深縮放不會小於下限，也不會超過 1', () => {
        for (let floor = 1; floor <= TOTAL; floor += 1) {
            const { scale } = getTilePlacement(floor, TOTAL);
            expect(scale).toBeLessThanOrEqual(1);
            expect(scale).toBeGreaterThanOrEqual(0.86);
        }
    });
});

describe('toSvgY', () => {
    it('把「距底部高度」翻轉成 SVG 由上往下的座標', () => {
        const { height } = getBoardSize(TOTAL);
        expect(toSvgY(0, height)).toBe(height);
        expect(toSvgY(height, height)).toBe(0);
    });
});
