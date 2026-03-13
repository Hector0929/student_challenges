import { describe, expect, it } from 'vitest';
import { calculateProductionRates, getUnlockedPlotKeys } from '../lib/world/production';

describe('world production domain rules', () => {
    it('forest 等級提升會提高木材產量', () => {
        const low = calculateProductionRates({
            islandLevel: 2,
            buildingLevels: { forest: 1, mine: 1, academy: 1 },
        });
        const high = calculateProductionRates({
            islandLevel: 2,
            buildingLevels: { forest: 4, mine: 1, academy: 1 },
        });

        expect(high.woodPerHour).toBeGreaterThan(low.woodPerHour);
        expect(high.stonePerHour).toBe(low.stonePerHour);
    });

    it('mine 等級提升會提高石材產量', () => {
        const low = calculateProductionRates({
            islandLevel: 2,
            buildingLevels: { forest: 1, mine: 1, academy: 1 },
        });
        const high = calculateProductionRates({
            islandLevel: 2,
            buildingLevels: { forest: 1, mine: 4, academy: 1 },
        });

        expect(high.stonePerHour).toBeGreaterThan(low.stonePerHour);
        expect(high.woodPerHour).toBe(low.woodPerHour);
    });

    it('academy 等級提升會提高全局倍率', () => {
        const low = calculateProductionRates({
            islandLevel: 3,
            buildingLevels: { forest: 2, mine: 2, academy: 1 },
        });
        const high = calculateProductionRates({
            islandLevel: 3,
            buildingLevels: { forest: 2, mine: 2, academy: 4 },
        });

        expect(high.academyBoost).toBeGreaterThan(low.academyBoost);
        expect(high.woodPerHour).toBeGreaterThan(low.woodPerHour);
        expect(high.stonePerHour).toBeGreaterThan(low.stonePerHour);
        expect(high.crystalPerHour).toBeGreaterThan(low.crystalPerHour);
    });

    it('islandLevel 提高會提高晶礦與地塊解鎖', () => {
        const low = calculateProductionRates({
            islandLevel: 1,
            buildingLevels: { forest: 1, mine: 1, academy: 1 },
        });
        const high = calculateProductionRates({
            islandLevel: 6,
            buildingLevels: { forest: 1, mine: 1, academy: 1 },
        });

        expect(high.crystalPerHour).toBeGreaterThan(low.crystalPerHour);
        expect(getUnlockedPlotKeys(6).length).toBeGreaterThan(getUnlockedPlotKeys(1).length);
        expect(getUnlockedPlotKeys(6)).toContain('storage');
    });
});
