import type { PlotType, ProductionRates, WorldBuildingLevels } from './types';

const PLOT_UNLOCK_LEVELS: Record<PlotType, number> = {
    forest: 2,
    mine: 3,
    market: 4,
    academy: 5,
    storage: 6,
    adventure: 7,
};

interface ProductionInput {
    islandLevel: number;
    buildingLevels: Pick<WorldBuildingLevels, 'forest' | 'mine' | 'academy'>;
}

export interface CalculatedProductionRates extends ProductionRates {
    academyBoost: number;
    islandBoost: number;
}

export function calculateProductionRates({ islandLevel, buildingLevels }: ProductionInput): CalculatedProductionRates {
    const normalizedIslandLevel = Math.max(1, Math.floor(islandLevel));
    const forest = Math.max(0, Math.floor(buildingLevels.forest));
    const mine = Math.max(0, Math.floor(buildingLevels.mine));
    const academy = Math.max(0, Math.floor(buildingLevels.academy));

    const academyBoost = 1 + academy * 0.08;
    const islandBoost = 1 + normalizedIslandLevel * 0.05;

    return {
        academyBoost,
        islandBoost,
        woodPerHour: (14 + forest * 8) * academyBoost * islandBoost,
        stonePerHour: (10 + mine * 7) * academyBoost * islandBoost,
        crystalPerHour: (4 + normalizedIslandLevel * 2) * academyBoost,
    };
}

export function getUnlockedPlotKeys(islandLevel: number): PlotType[] {
    const normalizedIslandLevel = Math.max(1, Math.floor(islandLevel));
    return (Object.entries(PLOT_UNLOCK_LEVELS) as Array<[PlotType, number]>)
        .filter(([, unlockLevel]) => normalizedIslandLevel >= unlockLevel)
        .map(([plotKey]) => plotKey);
}
