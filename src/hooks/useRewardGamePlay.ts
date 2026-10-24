import { useCallback } from 'react';
import { useEarnStars, useSpendStars, useStarBalance } from './useQuests';
import { GAME_COST } from '../lib/constants';
import type { FunGame } from '../lib/gameConfig';

// 獎勵遊戲的付費與結算；儀表板「獎勵時間」與學習挑戰群島的遊戲島共用
export const useRewardGamePlay = (userId: string, game: FunGame | null) => {
    const { data: starBalance = 0, refetch: refetchBalance } = useStarBalance(userId);
    const spendStarsMutation = useSpendStars();
    const earnStarsMutation = useEarnStars();

    const spendStars = useCallback(async (): Promise<boolean> => {
        if (!game) return false;

        try {
            await spendStarsMutation.mutateAsync({
                userId,
                amount: GAME_COST,
                gameId: game.id,
                gameName: game.name,
            });
            return true;
        } catch (error) {
            console.error('Failed to spend stars:', error);
            const message = error instanceof Error ? error.message : String(error);
            // Only map true balance issues to "insufficient" flow.
            // Other failures (RLS/network/duplicate click/etc.) should be surfaced as errors.
            if (message.includes('星幣不足')) {
                return false;
            }
            throw error;
        }
    }, [game, spendStarsMutation, userId]);

    const earnStars = useCallback(async (amount: number, description?: string, gameId?: string): Promise<void> => {
        await earnStarsMutation.mutateAsync({
            userId,
            amount,
            gameId: gameId ?? game?.id ?? 'game_settlement',
            description: description ?? `遊戲結算獎勵: ${game?.name ?? '未知遊戲'}`,
        });
    }, [earnStarsMutation, game, userId]);

    return { starBalance, refetchBalance, spendStars, earnStars };
};
