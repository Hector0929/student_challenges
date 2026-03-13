import { describe, expect, it } from 'vitest';
import {
    calculateExchangePreview,
    createDefaultExchangePriceTable,
    exchangeSelectedResources,
} from '../lib/world/exchangeShop';

describe('world exchange shop domain rules', () => {
    it('賣出數量不得大於目前持有資源', () => {
        expect(() => exchangeSelectedResources({
            currentResources: { wood: 10, stone: 5, crystal: 1 },
            selectedResources: { wood: 11, stone: 0, crystal: 0 },
            marketLevel: 1,
            basePrices: createDefaultExchangePriceTable(),
        })).toThrow(/不得大於目前擁有/);
    });

    it('不同資源價格可正確計算總星幣', () => {
        const preview = calculateExchangePreview({
            currentResources: { wood: 100, stone: 50, crystal: 20 },
            selectedResources: { wood: 40, stone: 10, crystal: 5 },
            marketLevel: 1,
            basePrices: {
                wood: 0.03,
                stone: 0.05,
                crystal: 0.2,
            },
        });

        expect(preview.marketMultiplier).toBe(1.08);
        expect(preview.starsEarned).toBe(2);
        expect(preview.soldResources).toEqual({ wood: 40, stone: 10, crystal: 5 });
        expect(preview.remainingResources).toEqual({ wood: 60, stone: 40, crystal: 15 });
    });

    it('商業地塊倍率會影響最終售價', () => {
        const low = calculateExchangePreview({
            currentResources: { wood: 0, stone: 40, crystal: 10 },
            selectedResources: { wood: 0, stone: 40, crystal: 10 },
            marketLevel: 1,
            basePrices: createDefaultExchangePriceTable(),
        });

        const high = calculateExchangePreview({
            currentResources: { wood: 0, stone: 40, crystal: 10 },
            selectedResources: { wood: 0, stone: 40, crystal: 10 },
            marketLevel: 6,
            basePrices: createDefaultExchangePriceTable(),
        });

        expect(high.marketMultiplier).toBeGreaterThan(low.marketMultiplier);
        expect(high.starsEarned).toBeGreaterThan(low.starsEarned);
    });

    it('未選擇任何資源時不得產生星幣', () => {
        const result = exchangeSelectedResources({
            currentResources: { wood: 100, stone: 50, crystal: 20 },
            selectedResources: { wood: 0, stone: 0, crystal: 0 },
            marketLevel: 3,
            basePrices: createDefaultExchangePriceTable(),
        });

        expect(result.starsEarned).toBe(0);
        expect(result.soldResources).toEqual({ wood: 0, stone: 0, crystal: 0 });
        expect(result.remainingResources).toEqual({ wood: 100, stone: 50, crystal: 20 });
    });
});