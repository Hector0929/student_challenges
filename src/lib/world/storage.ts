import type { ProductionRates, WorldResources } from './types';

export interface StorageCapacity {
    woodCap: number;
    stoneCap: number;
    crystalCap: number;
    offlineHoursCap: number;
}

interface OfflineProductionInput {
    currentResources: WorldResources;
    productionRates: ProductionRates;
    elapsedHours: number;
    storageLevel: number;
}

export function getStorageCapacity(storageLevel: number): StorageCapacity {
    const normalizedLevel = Math.max(1, Math.floor(storageLevel));
    return {
        woodCap: 150 + normalizedLevel * 90,
        stoneCap: 120 + normalizedLevel * 75,
        crystalCap: 45 + normalizedLevel * 28,
        offlineHoursCap: 4 + normalizedLevel * 2,
    };
}

export function applyOfflineProduction({
    currentResources,
    productionRates,
    elapsedHours,
    storageLevel,
}: OfflineProductionInput) {
    const capacity = getStorageCapacity(storageLevel);
    const appliedHours = Math.max(0, Math.min(elapsedHours, capacity.offlineHoursCap));

    const nextResources = {
        wood: Math.min(capacity.woodCap, currentResources.wood + productionRates.woodPerHour * appliedHours),
        stone: Math.min(capacity.stoneCap, currentResources.stone + productionRates.stonePerHour * appliedHours),
        crystal: Math.min(capacity.crystalCap, currentResources.crystal + productionRates.crystalPerHour * appliedHours),
    };

    return {
        resources: nextResources,
        appliedHours,
        capacity,
    };
}
