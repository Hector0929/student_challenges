/**
 * Monster Tower Gen3 — board composition
 *
 * `generateRandomEvents` (shared with V1/V2) only produces ladders, traps and the
 * four milestone eggs. Without extra tiles the Gen3 "輸出／破甲" role would have
 * nothing on the board to act on, so Gen3 layers monster encounter tiles on top.
 * These tests protect that, and the rule that encounters never overwrite an
 * existing ladder/trap/egg tile.
 */

import { describe, it, expect } from 'vitest';
import { generateRandomEvents } from '../hooks/useTowerProgress';
import { withEncounterTiles, GEN3_ENCOUNTER_COUNT } from '../lib/towerGen3Rules';

const SEEDS = [1, 42, 12345, 987654321, Date.now()];

describe('withEncounterTiles', () => {
    it('adds monster encounter tiles, which the base generator never produces', () => {
        const base = generateRandomEvents(42);
        expect(base.filter((e) => e.event_type === 'monster')).toHaveLength(0);

        const board = withEncounterTiles(base, 42);
        expect(board.filter((e) => e.event_type === 'monster')).toHaveLength(GEN3_ENCOUNTER_COUNT);
    });

    it('keeps every original ladder, trap and egg intact', () => {
        const base = generateRandomEvents(42);
        const board = withEncounterTiles(base, 42);

        base.forEach((original) => {
            const kept = board.find((e) => e.id === original.id);
            expect(kept).toBeDefined();
            expect(kept?.floor_number).toBe(original.floor_number);
            expect(kept?.target_floor).toBe(original.target_floor);
        });
    });

    it.each(SEEDS)('never places an encounter on an occupied floor (seed %i)', (seed) => {
        const base = generateRandomEvents(seed);
        const board = withEncounterTiles(base, seed);

        const occupied = new Set<number>();
        base.forEach((e) => {
            occupied.add(e.floor_number);
            if (e.target_floor) occupied.add(e.target_floor);
        });

        board
            .filter((e) => e.event_type === 'monster')
            .forEach((encounter) => {
                expect(occupied.has(encounter.floor_number)).toBe(false);
            });
    });

    it.each(SEEDS)('never puts two events on the same floor (seed %i)', (seed) => {
        const board = withEncounterTiles(generateRandomEvents(seed), seed);
        const floors = board.map((e) => e.floor_number);
        expect(new Set(floors).size).toBe(floors.length);
    });

    it('keeps encounters away from floor 1 and the summit', () => {
        const board = withEncounterTiles(generateRandomEvents(7), 7);
        board
            .filter((e) => e.event_type === 'monster')
            .forEach((encounter) => {
                expect(encounter.floor_number).toBeGreaterThan(1);
                expect(encounter.floor_number).toBeLessThan(100);
            });
    });

    it('returns the board sorted by floor', () => {
        const board = withEncounterTiles(generateRandomEvents(99), 99);
        const floors = board.map((e) => e.floor_number);
        expect(floors).toEqual([...floors].sort((a, b) => a - b));
    });

    it('is deterministic for a given seed, and reshuffles across seeds', () => {
        const first = withEncounterTiles(generateRandomEvents(2024), 2024)
            .filter((e) => e.event_type === 'monster')
            .map((e) => e.floor_number);
        const same = withEncounterTiles(generateRandomEvents(2024), 2024)
            .filter((e) => e.event_type === 'monster')
            .map((e) => e.floor_number);
        const different = withEncounterTiles(generateRandomEvents(2025), 2025)
            .filter((e) => e.event_type === 'monster')
            .map((e) => e.floor_number);

        expect(same).toEqual(first);
        expect(different).not.toEqual(first);
    });
});
