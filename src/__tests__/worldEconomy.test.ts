import { describe, expect, it } from 'vitest';
import { exchangeAllResources, getMarketMultiplier } from '../lib/world/economy';

describe('world economy domain rules', () => {
    it('商業地塊等級影響兌換倍率', () => {
        const low = getMarketMultiplier(1);
        const high = getMarketMultiplier(5);

        expect(high).toBeGreaterThan(low);
    });

    it('資源為 0 時不得產生星幣', () => {
        const result = exchangeAllResources({ wood: 0, stone: 0, crystal: 0 }, 3);

        expect(result.starsEarned).toBe(0);
        expect(result.consumedResources).toEqual({ wood: 0, stone: 0, crystal: 0 });
        expect(result.remainingResources).toEqual({ wood: 0, stone: 0, crystal: 0 });
    });

    it('資源兌換後庫存清空或正確扣除', () => {
        const result = exchangeAllResources({ wood: 100, stone: 50, crystal: 20 }, 2);

        expect(result.starsEarned).toBeGreaterThan(0);
        expect(result.consumedResources).toEqual({ wood: 100, stone: 50, crystal: 20 });
        expect(result.remainingResources).toEqual({ wood: 0, stone: 0, crystal: 0 });
    });
});
