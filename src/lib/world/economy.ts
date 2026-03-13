import type { WorldResources } from './types';

export interface ExchangeResult {
    starsEarned: number;
    consumedResources: WorldResources;
    remainingResources: WorldResources;
    marketMultiplier: number;
}

export function getMarketMultiplier(marketLevel: number): number {
    const normalizedLevel = Math.max(0, Math.floor(marketLevel));
    return 1 + normalizedLevel * 0.08;
}

export function calculateBaseResourceValue(resources: WorldResources): number {
    return resources.wood * 0.025 + resources.stone * 0.04 + resources.crystal * 0.14;
}

export function exchangeAllResources(resources: WorldResources, marketLevel: number): ExchangeResult {
    const safeResources = {
        wood: Math.max(0, resources.wood),
        stone: Math.max(0, resources.stone),
        crystal: Math.max(0, resources.crystal),
    };

    const marketMultiplier = getMarketMultiplier(marketLevel);
    const baseValue = calculateBaseResourceValue(safeResources);
    const starsEarned = Math.floor(baseValue * marketMultiplier);

    if (starsEarned <= 0) {
        return {
            starsEarned: 0,
            consumedResources: { wood: 0, stone: 0, crystal: 0 },
            remainingResources: safeResources,
            marketMultiplier,
        };
    }

    return {
        starsEarned,
        consumedResources: safeResources,
        remainingResources: { wood: 0, stone: 0, crystal: 0 },
        marketMultiplier,
    };
}
