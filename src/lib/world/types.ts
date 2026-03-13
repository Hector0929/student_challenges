export type PlotType = 'forest' | 'mine' | 'market' | 'academy' | 'storage' | 'adventure';

export interface WorldResources {
    wood: number;
    stone: number;
    crystal: number;
}

export interface WorldBuildingLevels {
    forest: number;
    mine: number;
    academy: number;
    market?: number;
    storage?: number;
    adventure?: number;
}

export interface ProductionRates {
    woodPerHour: number;
    stonePerHour: number;
    crystalPerHour: number;
}
