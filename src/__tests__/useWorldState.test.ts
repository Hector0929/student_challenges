import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorldState } from '../hooks/useWorldState';

describe('useWorldState', () => {
    it('upgrades a building and raises island level when thresholds are reached', async () => {
        const onAdjustStars = vi.fn().mockResolvedValue(true);
        const { result } = renderHook(() => useWorldState({
            active: false,
            starBalance: 9999,
            onAdjustStars,
        }));

        for (let index = 0; index < 6; index += 1) {
            await act(async () => {
                const buildingKey = (['forest', 'mine', 'academy', 'market', 'forest', 'mine'] as const)[index];
                await result.current.upgradeBuilding(buildingKey);
            });
        }

        expect(onAdjustStars).toHaveBeenCalledTimes(6);
        expect(result.current.worldLab.islandLevel).toBe(2);
    });

    it('exchanges resources into stars and clears inventory', async () => {
        const onAdjustStars = vi.fn().mockResolvedValue(true);
        const { result } = renderHook(() => useWorldState({
            active: false,
            starBalance: 9999,
            onAdjustStars,
        }));

        act(() => {
            result.current.setWorldLab((prev) => ({
                ...prev,
                resources: {
                    wood: 120,
                    stone: 80,
                    crystal: 40,
                },
            }));
        });

        let exchangeResult;
        await act(async () => {
            exchangeResult = await result.current.exchangeResourcesToStars();
        });

        expect(exchangeResult).toEqual(expect.objectContaining({ ok: true }));
        expect(onAdjustStars).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('WorldLab 資源兌換'));
        expect(result.current.worldLab.resources).toEqual({ wood: 0, stone: 0, crystal: 0 });
        expect(result.current.worldLab.heroPower).toBeGreaterThan(120);
    });

    it('uses injected exchange prices for preview calculations', () => {
        const onAdjustStars = vi.fn().mockResolvedValue(true);
        const { result } = renderHook(() => useWorldState({
            active: false,
            starBalance: 9999,
            onAdjustStars,
            exchangePriceTable: {
                wood: 1,
                stone: 2,
                crystal: 3,
            },
        }));

        act(() => {
            result.current.setWorldLab((prev) => ({
                ...prev,
                resources: {
                    wood: 10,
                    stone: 10,
                    crystal: 10,
                },
            }));
        });

        const preview = result.current.getExchangePreview({
            wood: 2,
            stone: 1,
            crystal: 1,
        });

        expect(preview.basePrices).toEqual({
            wood: 1,
            stone: 2,
            crystal: 3,
        });
        expect(preview.finalUnitPrices).toEqual({
            wood: 1.08,
            stone: 2.16,
            crystal: 3.24,
        });
        expect(preview.starsEarned).toBe(7);
    });
});