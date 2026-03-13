import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldExchange } from './useWorldExchange';

const useWorldExchangeLogsMock = vi.fn();
const useCreateWorldExchangeLogMock = vi.fn();

vi.mock('./useWorldExchangeLogs', () => ({
    useWorldExchangeLogs: (...args: unknown[]) => useWorldExchangeLogsMock(...args),
    useCreateWorldExchangeLog: (...args: unknown[]) => useCreateWorldExchangeLogMock(...args),
}));

describe('useWorldExchange', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useWorldExchangeLogsMock.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });
        useCreateWorldExchangeLogMock.mockReturnValue({
            mutateAsync: vi.fn().mockResolvedValue(true),
            isPending: false,
            error: null,
        });
    });

    it('executes exchange and writes exchange log metadata', async () => {
        const exchangeSelectedResourcesToStars = vi.fn().mockResolvedValue({ ok: true, starsEarned: 9 });
        const mutateAsync = vi.fn().mockResolvedValue(true);
        useCreateWorldExchangeLogMock.mockReturnValue({
            mutateAsync,
            isPending: false,
            error: null,
        });

        const { result } = renderHook(() => useWorldExchange({
            userId: 'user-1',
            marketLevel: 3,
            getExchangePreview: () => ({
                soldResources: { wood: 10, stone: 5, crystal: 1 },
                remainingResources: { wood: 0, stone: 0, crystal: 0 },
                basePrices: { wood: 0.03, stone: 0.04, crystal: 0.2 },
                finalUnitPrices: { wood: 0.04, stone: 0.05, crystal: 0.25 },
                marketMultiplier: 1.24,
                starsEarned: 9,
            }),
            exchangeSelectedResourcesToStars,
        }));

        let response;
        await act(async () => {
            response = await result.current.exchangeResources({ wood: 10, stone: 5, crystal: 1 });
        });

        expect(exchangeSelectedResourcesToStars).toHaveBeenCalledWith({ wood: 10, stone: 5, crystal: 1 });
        expect(mutateAsync).toHaveBeenCalledWith({
            sold_wood: 10,
            sold_stone: 5,
            sold_crystal: 1,
            market_level: 3,
            market_multiplier: 1.24,
            base_wood_rate: 0.03,
            base_stone_rate: 0.04,
            base_crystal_rate: 0.2,
            stars_earned: 9,
        });
        expect(response).toEqual({ ok: true, starsEarned: 9, logSaved: true });
    });

    it('returns success even if log writing fails', async () => {
        const exchangeSelectedResourcesToStars = vi.fn().mockResolvedValue({ ok: true, starsEarned: 4 });
        const mutateAsync = vi.fn().mockRejectedValue(new Error('log failed'));
        useCreateWorldExchangeLogMock.mockReturnValue({
            mutateAsync,
            isPending: false,
            error: null,
        });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const { result } = renderHook(() => useWorldExchange({
            userId: 'user-1',
            marketLevel: 1,
            getExchangePreview: () => ({
                soldResources: { wood: 4, stone: 0, crystal: 0 },
                remainingResources: { wood: 0, stone: 0, crystal: 0 },
                basePrices: { wood: 0.025, stone: 0.04, crystal: 0.14 },
                finalUnitPrices: { wood: 0.027, stone: 0.0432, crystal: 0.1512 },
                marketMultiplier: 1.08,
                starsEarned: 4,
            }),
            exchangeSelectedResourcesToStars,
        }));

        let response;
        await act(async () => {
            response = await result.current.exchangeResources({ wood: 4, stone: 0, crystal: 0 });
        });

        expect(response).toEqual({ ok: true, starsEarned: 4, logSaved: false });
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});