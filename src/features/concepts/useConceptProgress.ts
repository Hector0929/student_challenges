// 概念熟悉度的讀寫，作法比照英文書港的 useWordProgress。
// 資料表還沒建立（家長還沒執行 add_concept_progress.sql）時，進度只留在這次畫面上。

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../../lib/supabase';
import { applyRound, type ConceptProgress, type RoundResult } from './srs';

const COLUMNS = 'concept_id, level, due_on, correct_count, wrong_count, recent_wrong, last_seen_at';

interface ProgressData {
    rows: ConceptProgress[];
    missing: boolean;
}

export const useConceptProgress = (userId: string) => {
    const queryClient = useQueryClient();
    const key = useMemo(() => ['concept_progress', userId], [userId]);

    const query = useQuery({
        queryKey: key,
        queryFn: async (): Promise<ProgressData> => {
            const { data, error } = await supabase.from('concept_progress').select(COLUMNS).eq('user_id', userId).limit(5000);
            if (error) {
                console.warn('concept_progress unavailable:', error.message);
                return { rows: [], missing: true };
            }
            return { rows: (data ?? []) as ConceptProgress[], missing: false };
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    const map = useMemo(() => new Map((query.data?.rows ?? []).map((r) => [r.concept_id, r])), [query.data]);

    /** 一輪結束：算出新進度，先更新畫面，再寫入資料庫 */
    const recordRound = useCallback(
        async (conceptId: string, round: RoundResult): Promise<ConceptProgress> => {
            const prev = map.get(conceptId);
            const next = applyRound(prev, conceptId, round, getTodayDate(), new Date().toISOString());
            queryClient.setQueryData<ProgressData>(key, (old) => ({
                rows: [...(old?.rows ?? []).filter((r) => r.concept_id !== conceptId), next],
                missing: old?.missing ?? false,
            }));
            if (!query.data?.missing && userId) {
                const { error } = await supabase
                    .from('concept_progress')
                    .upsert({ ...next, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id,concept_id' });
                if (error) console.error('Failed to save concept progress:', error.message);
            }
            return next;
        },
        [key, map, query.data?.missing, queryClient, userId],
    );

    return { map, rows: query.data?.rows ?? [], missing: query.data?.missing ?? false, isLoading: query.isLoading, recordRound };
};
