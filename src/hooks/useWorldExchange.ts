import type { ExchangePreviewResult } from '../lib/world/exchangeShop';
import type { WorldResources } from '../lib/world/types';
import { useCreateWorldExchangeLog, useWorldExchangeLogs } from './useWorldExchangeLogs';

interface UseWorldExchangeOptions {
    userId?: string;
    marketLevel: number;
    getExchangePreview: (selectedResources: WorldResources) => ExchangePreviewResult;
    exchangeSelectedResourcesToStars: (selectedResources: WorldResources) => Promise<{
        ok: boolean;
        error?: string;
        starsEarned?: number;
    }>;
}

interface ExchangeExecutionResult {
    ok: boolean;
    error?: string;
    starsEarned?: number;
    logSaved?: boolean;
}

export const useWorldExchange = ({
    userId,
    marketLevel,
    getExchangePreview,
    exchangeSelectedResourcesToStars,
}: UseWorldExchangeOptions) => {
    const { data: exchangeLogs = [], isLoading, error } = useWorldExchangeLogs(userId);
    const createWorldExchangeLog = useCreateWorldExchangeLog(userId);

    const exchangeResources = async (selectedResources: WorldResources): Promise<ExchangeExecutionResult> => {
        const preview = getExchangePreview(selectedResources);
        const result = await exchangeSelectedResourcesToStars(selectedResources);

        if (!result.ok) {
            return result;
        }

        if (typeof result.starsEarned !== 'number') {
            return { ok: true, logSaved: false };
        }

        try {
            await createWorldExchangeLog.mutateAsync({
                sold_wood: preview.soldResources.wood,
                sold_stone: preview.soldResources.stone,
                sold_crystal: preview.soldResources.crystal,
                market_level: marketLevel,
                market_multiplier: preview.marketMultiplier,
                base_wood_rate: preview.basePrices.wood,
                base_stone_rate: preview.basePrices.stone,
                base_crystal_rate: preview.basePrices.crystal,
                stars_earned: result.starsEarned,
            });

            return {
                ok: true,
                starsEarned: result.starsEarned,
                logSaved: true,
            };
        } catch (logError) {
            console.error('Failed to save exchange log', logError);
            return {
                ok: true,
                starsEarned: result.starsEarned,
                logSaved: false,
            };
        }
    };

    return {
        exchangeLogs,
        exchangeResources,
        isLoading,
        isSaving: createWorldExchangeLog.isPending,
        error: error ?? createWorldExchangeLog.error,
    };
};