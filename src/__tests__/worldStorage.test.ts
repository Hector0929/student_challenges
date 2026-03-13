import { describe, expect, it } from 'vitest';
import { applyOfflineProduction, getStorageCapacity } from '../lib/world/storage';

describe('world storage domain rules', () => {
    it('離線收益不得超過容量上限', () => {
        const result = applyOfflineProduction({
            currentResources: { wood: 30, stone: 20, crystal: 5 },
            productionRates: { woodPerHour: 500, stonePerHour: 400, crystalPerHour: 120 },
            elapsedHours: 50,
            storageLevel: 1,
        });

        const capacity = getStorageCapacity(1);
        expect(result.resources.wood).toBeLessThanOrEqual(capacity.woodCap);
        expect(result.resources.stone).toBeLessThanOrEqual(capacity.stoneCap);
        expect(result.resources.crystal).toBeLessThanOrEqual(capacity.crystalCap);
        expect(result.appliedHours).toBeLessThanOrEqual(capacity.offlineHoursCap);
    });

    it('倉儲升級後容量增加', () => {
        const low = getStorageCapacity(1);
        const high = getStorageCapacity(5);

        expect(high.woodCap).toBeGreaterThan(low.woodCap);
        expect(high.stoneCap).toBeGreaterThan(low.stoneCap);
        expect(high.crystalCap).toBeGreaterThan(low.crystalCap);
        expect(high.offlineHoursCap).toBeGreaterThan(low.offlineHoursCap);
    });
});
