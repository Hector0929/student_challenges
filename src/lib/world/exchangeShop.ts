import { getMarketMultiplier } from './economy';
import type { WorldResources } from './types';

export interface ExchangePriceTable {
    wood: number;
    stone: number;
    crystal: number;
}

export interface ExchangePreviewResult {
    soldResources: WorldResources;
    remainingResources: WorldResources;
    basePrices: ExchangePriceTable;
    finalUnitPrices: ExchangePriceTable;
    marketMultiplier: number;
    starsEarned: number;
}

function clampToNonNegative(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

function normalizeResources(resources: WorldResources): WorldResources {
    return {
        wood: clampToNonNegative(resources.wood),
        stone: clampToNonNegative(resources.stone),
        crystal: clampToNonNegative(resources.crystal),
    };
}

function normalizeSelectedResources(resources: WorldResources): WorldResources {
    return {
        wood: Math.floor(clampToNonNegative(resources.wood)),
        stone: Math.floor(clampToNonNegative(resources.stone)),
        crystal: Math.floor(clampToNonNegative(resources.crystal)),
    };
}

function normalizePriceTable(prices: ExchangePriceTable): ExchangePriceTable {
    return {
        wood: clampToNonNegative(prices.wood),
        stone: clampToNonNegative(prices.stone),
        crystal: clampToNonNegative(prices.crystal),
    };
}

function assertCanSell(currentResources: WorldResources, selectedResources: WorldResources) {
    const resourceKeys: Array<keyof WorldResources> = ['wood', 'stone', 'crystal'];
    for (const resourceKey of resourceKeys) {
        if (selectedResources[resourceKey] > currentResources[resourceKey]) {
            throw new Error(`賣出數量不得大於目前擁有的${resourceKey}`);
        }
    }
}

export function createDefaultExchangePriceTable(): ExchangePriceTable {
    return {
        wood: 0.025,
        stone: 0.04,
        crystal: 0.14,
    };
}

export function calculateExchangePreview({
    currentResources,
    selectedResources,
    marketLevel,
    basePrices,
}: {
    currentResources: WorldResources;
    selectedResources: WorldResources;
    marketLevel: number;
    basePrices: ExchangePriceTable;
}): ExchangePreviewResult {
    const safeCurrentResources = normalizeResources(currentResources);
    const safeSelectedResources = normalizeSelectedResources(selectedResources);
    const safeBasePrices = normalizePriceTable(basePrices);

    assertCanSell(safeCurrentResources, safeSelectedResources);

    const marketMultiplier = getMarketMultiplier(marketLevel);
    const finalUnitPrices: ExchangePriceTable = {
        wood: safeBasePrices.wood * marketMultiplier,
        stone: safeBasePrices.stone * marketMultiplier,
        crystal: safeBasePrices.crystal * marketMultiplier,
    };

    const totalValue =
        safeSelectedResources.wood * finalUnitPrices.wood +
        safeSelectedResources.stone * finalUnitPrices.stone +
        safeSelectedResources.crystal * finalUnitPrices.crystal;

    const starsEarned = Math.floor(totalValue);

    return {
        soldResources: safeSelectedResources,
        remainingResources: {
            wood: safeCurrentResources.wood - safeSelectedResources.wood,
            stone: safeCurrentResources.stone - safeSelectedResources.stone,
            crystal: safeCurrentResources.crystal - safeSelectedResources.crystal,
        },
        basePrices: safeBasePrices,
        finalUnitPrices,
        marketMultiplier,
        starsEarned,
    };
}

export function exchangeSelectedResources(args: {
    currentResources: WorldResources;
    selectedResources: WorldResources;
    marketLevel: number;
    basePrices: ExchangePriceTable;
}): ExchangePreviewResult {
    return calculateExchangePreview(args);
}