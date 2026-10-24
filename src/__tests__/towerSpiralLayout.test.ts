/**
 * 怪獸塔 V4 — 螺旋塔排版
 *
 * 保護三件事：100 格沿塔外牆一格一格往上、相鄰格子真的相鄰；鏡頭方位角連續不倒轉；
 * 梯子與蛇不會穿過塔身。
 */

import { describe, it, expect } from 'vitest';
import {
    CORE_HALF,
    RING_HALF,
    RISE,
    TILES_PER_LAP,
    TILE_PITCH,
    cameraAzimuth,
    getCornerLanding,
    getSpiralTile,
    getZoneIndex,
} from '../lib/towerSpiralLayout';
import { slideCurve, tileTop } from '../components/tower/v4/TowerScene';
import { generateRandomEvents } from '../hooks/useTowerProgress';
import { withEncounterTiles } from '../lib/towerGen3Rules';

const FLOORS = Array.from({ length: 100 }, (_, i) => i + 1);

describe('getSpiralTile', () => {
    it('第 1 格在正面最左邊，往 +x 走', () => {
        const t = getSpiralTile(1);
        expect(t).toMatchObject({ lap: 0, side: 0, index: 0, nx: 0, nz: 1, dx: 1, dz: 0 });
        expect(t.z).toBeCloseTo(RING_HALF);
        expect(t.x).toBeCloseTo(-RING_HALF + TILE_PITCH / 2);
    });

    it('每格升高一階，一圈 20 格，繞 5 圈', () => {
        FLOORS.forEach((f) => expect(getSpiralTile(f).y).toBeCloseTo((f - 1) * RISE));
        expect(getSpiralTile(20).lap).toBe(0);
        expect(getSpiralTile(21).lap).toBe(1);
        expect(getSpiralTile(100).lap).toBe(4);
    });

    it('每格都貼在自己那一面的牆外，不會跑進塔裡', () => {
        FLOORS.forEach((f) => {
            const t = getSpiralTile(f);
            // 沿外法線的距離 = 環道半徑
            expect(t.x * t.nx + t.z * t.nz).toBeCloseTo(RING_HALF);
            expect(Math.max(Math.abs(t.x), Math.abs(t.z))).toBeGreaterThan(CORE_HALF);
        });
    });

    it('相鄰兩格水平距離不超過一格間距（轉角處更近）', () => {
        for (let f = 1; f < 100; f++) {
            const a = getSpiralTile(f),
                b = getSpiralTile(f + 1);
            const d = Math.hypot(a.x - b.x, a.z - b.z);
            expect(d).toBeGreaterThan(0.5);
            expect(d).toBeLessThanOrEqual(TILE_PITCH + 1e-9);
        }
    });

    it('同一圈裡沒有兩格疊在同一位置', () => {
        const keys = new Set(FLOORS.slice(0, TILES_PER_LAP).map((f) => `${getSpiralTile(f).x.toFixed(2)},${getSpiralTile(f).z.toFixed(2)}`));
        expect(keys.size).toBe(TILES_PER_LAP);
    });

    it('轉角平台落在兩面交會處、高度在前後兩格之間', () => {
        const c = getCornerLanding(0, 0);
        expect(c.x).toBeCloseTo(RING_HALF);
        expect(c.z).toBeCloseTo(RING_HALF);
        expect(c.y).toBeGreaterThan(getSpiralTile(5).y);
        expect(c.y).toBeLessThan(getSpiralTile(6).y);
    });

    it('區域每 20 層換一次', () => {
        expect([1, 20, 21, 40, 41, 81, 100].map(getZoneIndex)).toEqual([0, 0, 1, 1, 2, 4, 4]);
    });
});

describe('cameraAzimuth', () => {
    it('一路遞增，不會在換面時倒轉一整圈', () => {
        for (let f = 1; f < 100; f++) expect(cameraAzimuth(f + 1)).toBeGreaterThan(cameraAzimuth(f));
    });

    it('每一面中間那格正對牆面', () => {
        expect(cameraAzimuth(3)).toBeCloseTo(0);
        expect(cameraAzimuth(8)).toBeCloseTo(Math.PI / 2);
        expect(cameraAzimuth(23)).toBeCloseTo(Math.PI * 2);
    });
});

describe('slideCurve — 梯子與蛇', () => {
    const insideCore = (x: number, z: number) => Math.abs(x) < CORE_HALF + 0.05 && Math.abs(z) < CORE_HALF + 0.05;

    it.each([1, 42, 2024, 99991, 31337])('種子 %i 的所有梯子/蛇都繞在塔外，兩端接在格子上', (seed) => {
        const events = withEncounterTiles(generateRandomEvents(seed), seed).filter((e) => e.target_floor && (e.event_type === 'ladder' || e.event_type === 'trap'));
        expect(events.length).toBeGreaterThan(0);
        for (const ev of events) {
            const curve = slideCurve(ev.floor_number, ev.target_floor!, ev.event_type === 'trap' ? 0.32 : 0);
            expect(curve.getPoint(0).distanceTo(tileTop(ev.floor_number))).toBeLessThan(0.1);
            expect(curve.getPoint(1).distanceTo(tileTop(ev.target_floor!))).toBeLessThan(0.1);
            for (let i = 0; i <= 60; i++) {
                const p = curve.getPoint(i / 60);
                expect(insideCore(p.x, p.z)).toBe(false);
            }
        }
    });

    it('沿螺旋方向走，不繞遠路：轉過的角度跟格數相符', () => {
        const curve = slideCurve(7, 27); // 剛好一圈
        let turned = 0;
        let prev = Math.atan2(curve.getPoint(0).z, curve.getPoint(0).x);
        for (let i = 1; i <= 100; i++) {
            const p = curve.getPoint(i / 100);
            const a = Math.atan2(p.z, p.x);
            let d = a - prev;
            if (d > Math.PI) d -= Math.PI * 2;
            if (d < -Math.PI) d += Math.PI * 2;
            turned += d;
            prev = a;
        }
        expect(Math.abs(turned)).toBeGreaterThan(Math.PI * 1.6);
        expect(Math.abs(turned)).toBeLessThan(Math.PI * 2.4);
    });
});
