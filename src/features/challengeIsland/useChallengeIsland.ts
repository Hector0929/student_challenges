import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../../lib/supabase';
import { isQuestVisibleToChild, useDailyLogs, useQuests } from '../../hooks/useQuests';
import { DEFAULT_FAMILY_SETTINGS, useFamilySettings } from '../../hooks/useFamilySettings';
import { LEARNING_ITEMS } from '../learning/config/learningItems';
import { getVisibleLearningItems } from '../learning/utils/learningFilters';
import { FUN_GAMES } from '../../lib/gameConfig';
import { buildIslandModel, type FeatureDef, type StarTransactionLite } from './model';
import { startOfTaipeiDay } from '../englishHarbour/useWordProgress';

// 學習練習（earn）與獎勵遊戲（spend）都會帶 game_id，用來判斷今天做過哪些挑戰
export const useIslandActivity = (userId: string) => {
    return useQuery({
        // 'star_transactions' 開頭：學習書桌發星幣時的 invalidate 會一起刷新
        queryKey: ['star_transactions', 'island', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('star_transactions')
                .select('game_id, type, amount, created_at, description')
                .eq('user_id', userId)
                .not('game_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            return (data ?? []) as StarTransactionLite[];
        },
        enabled: !!userId,
    });
};

// 英文書港今天新熟悉的單字（資料表還沒建立時回傳空的）
const useFamiliarWordsToday = (userId: string) => {
    return useQuery({
        queryKey: ['word_feed', 'island', userId, getTodayDate()],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('word_progress')
                .select('word, familiar_at')
                .eq('user_id', userId)
                .eq('self_marked', false)
                .gte('familiar_at', startOfTaipeiDay())
                .order('familiar_at', { ascending: true });
            if (error) return [];
            return (data ?? []).map((r) => ({ word: r.word as string, at: r.familiar_at as string }));
        },
        enabled: !!userId,
    });
};

export const useChallengeIslandModel = (userId: string, features?: FeatureDef[]) => {
    const { data: allQuests, isLoading: questsLoading } = useQuests();
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const { data: transactions, isLoading: txLoading } = useIslandActivity(userId);
    const { data: familySettings } = useFamilySettings();
    const { data: familiarWords } = useFamiliarWordsToday(userId);

    const learningEnabled = familySettings?.learning_area_enabled ?? DEFAULT_FAMILY_SETTINGS.learning_area_enabled;
    const funEnabled = familySettings?.fun_games_enabled ?? DEFAULT_FAMILY_SETTINGS.fun_games_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    const model = useMemo(
        () =>
            buildIslandModel({
                quests: (allQuests ?? []).filter((q) => isQuestVisibleToChild(q, userId)),
                logs: logs ?? [],
                transactions: transactions ?? [],
                learningItems: learningEnabled ? getVisibleLearningItems(LEARNING_ITEMS, disabledGames) : [],
                funGames: funEnabled ? FUN_GAMES.filter((g) => !disabledGames.includes(g.id)) : [],
                today: getTodayDate(),
                features,
                familiarWords,
            }),
        [allQuests, logs, transactions, learningEnabled, funEnabled, disabledGames, userId, features, familiarWords],
    );

    return { model, isLoading: questsLoading || logsLoading || txLoading };
};
