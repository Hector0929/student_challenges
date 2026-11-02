import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../../lib/supabase';
import type { WordProgress } from './srs';

const COLUMNS = 'word, level, due_on, correct_count, wrong_count, self_marked, familiar_at, last_seen_at, created_at';

/** 台北日期 → 當天 00:00 的時間字串（查「今天」用） */
export const startOfTaipeiDay = (date = getTodayDate()) => `${date}T00:00:00+08:00`;

/** 時間字串 → 台北日期 YYYY-MM-DD */
export const taipeiDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

interface ProgressData {
    rows: WordProgress[];
    /** 資料表還沒建立（還沒執行 add_word_progress.sql） */
    missing: boolean;
}

export const useWordProgress = (userId: string) => {
    const queryClient = useQueryClient();
    const key = useMemo(() => ['word_progress', userId], [userId]);

    const query = useQuery({
        queryKey: key,
        queryFn: async (): Promise<ProgressData> => {
            const { data, error } = await supabase.from('word_progress').select(COLUMNS).eq('user_id', userId).limit(5000);
            if (error) {
                console.warn('word_progress unavailable:', error.message);
                return { rows: [], missing: true };
            }
            return { rows: (data ?? []) as WordProgress[], missing: false };
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    const map = useMemo(() => new Map((query.data?.rows ?? []).map((r) => [r.word, r])), [query.data]);

    /** 先更新畫面，再寫進資料庫；資料表不存在時只留在這次畫面上 */
    const save = useCallback(
        async (row: WordProgress) => {
            queryClient.setQueryData<ProgressData>(key, (old) => {
                const rows = (old?.rows ?? []).filter((r) => r.word !== row.word);
                const prev = old?.rows.find((r) => r.word === row.word);
                return { rows: [...rows, { ...row, created_at: prev?.created_at ?? new Date().toISOString() }], missing: old?.missing ?? false };
            });
            if (query.data?.missing) return;
            // created_at 交給資料庫預設值，不送
            const payload: Record<string, unknown> = { ...row, user_id: userId, updated_at: new Date().toISOString() };
            delete payload.created_at;
            const { error } = await supabase.from('word_progress').upsert(payload, { onConflict: 'user_id,word' });
            if (error) console.error('Failed to save word progress:', error.message);
            else queryClient.invalidateQueries({ queryKey: ['word_feed'] });
        },
        [key, query.data?.missing, queryClient, userId],
    );

    return { map, rows: query.data?.rows ?? [], missing: query.data?.missing ?? false, isLoading: query.isLoading, save };
};

export interface FamilyFeedEntry {
    userId: string;
    name: string;
    avatar: string;
    count: number;
    words: string[];
    lastAt: string;
}

/** 家人動態：今天靠作答升到「熟悉」的字，依小孩彙整（同一個家庭才看得到，由 RLS 把關） */
export const useFamilyWordFeed = () => {
    return useQuery({
        queryKey: ['word_feed', getTodayDate()],
        queryFn: async (): Promise<FamilyFeedEntry[]> => {
            const [{ data: rows, error }, { data: kids }] = await Promise.all([
                supabase
                    .from('word_progress')
                    .select('user_id, word, familiar_at')
                    .gte('familiar_at', startOfTaipeiDay())
                    .eq('self_marked', false)
                    .order('familiar_at', { ascending: true })
                    .limit(2000),
                supabase.from('profiles').select('id, name, avatar_url').eq('role', 'child'),
            ]);
            if (error || !rows) return [];
            const byId = new Map((kids ?? []).map((k) => [k.id as string, k as { id: string; name: string; avatar_url: string | null }]));
            const feed = new Map<string, FamilyFeedEntry>();
            for (const r of rows as Array<{ user_id: string; word: string; familiar_at: string }>) {
                const kid = byId.get(r.user_id);
                if (!kid) continue;
                const e = feed.get(r.user_id) ?? { userId: r.user_id, name: kid.name, avatar: kid.avatar_url || '🧒', count: 0, words: [], lastAt: r.familiar_at };
                e.count++;
                e.words.push(r.word);
                e.lastAt = r.familiar_at;
                feed.set(r.user_id, e);
            }
            return [...feed.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
        },
        staleTime: 60_000,
    });
};

export const feedText = (e: Pick<FamilyFeedEntry, 'name' | 'count'>) => `${e.name} 今天又熟悉了 ${e.count} 個新單字，好棒！`;
