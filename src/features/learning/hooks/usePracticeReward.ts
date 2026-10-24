import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { LearningItem } from '../types/learning';

// 練習滿時間後發星幣；學習書桌與學習挑戰群島共用，game_id 用來記錄今天練過哪一項
export const usePracticeReward = (userId: string) => {
    const queryClient = useQueryClient();

    return useCallback(
        async (item: LearningItem | null, stars: number) => {
            if (!item || stars <= 0) return;

            const { error } = await supabase.from('star_transactions').insert({
                user_id: userId,
                amount: stars,
                type: 'earn',
                description: `學習完成獎勵: ${item.name} (3分鐘)`,
                game_id: item.id,
            });

            if (error) {
                console.error('Failed to grant learning reward:', error);
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['star_balance', userId] });
            queryClient.invalidateQueries({ queryKey: ['star_transactions'] });
        },
        [queryClient, userId],
    );
};
