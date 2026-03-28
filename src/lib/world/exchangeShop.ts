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
    const safeBasePrices = normalizePriceTable(basePrices);

    // Clamp selected to what's actually available — prevents throw during React render
    // when currentResources updates (after exchange) before selectedResources resets.
    const rawSelected = normalizeSelectedResources(selectedResources);
    const safeSelectedResources: WorldResources = {
        wood: Math.min(rawSelected.wood, Math.floor(safeCurrentResources.wood)),
        stone: Math.min(rawSelected.stone, Math.floor(safeCurrentResources.stone)),
        crystal: Math.min(rawSelected.crystal, Math.floor(safeCurrentResources.crystal)),
    };

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