import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WorldExchangeLogRow } from '../types/database';

export const useWorldExchangeLogs = (userId?: string) => {
    return useQuery({
        queryKey: ['world-exchange-logs', userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await supabase
                .from('world_exchange_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return (data ?? []) as WorldExchangeLogRow[];
        },
    });
};

export const useCreateWorldExchangeLog = (userId?: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (log: Omit<WorldExchangeLogRow, 'user_id' | 'id' | 'created_at'>) => {
            if (!userId) {
                throw new Error('No user ID found');
            }

            const { data, error } = await supabase
                .from('world_exchange_logs')
                .insert({
                    user_id: userId,
                    ...log,
                })
                .select()
                .single();

            if (error) throw error;
            return data as WorldExchangeLogRow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['world-exchange-logs', userId] });
        },
    });
};