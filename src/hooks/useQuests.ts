import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../lib/supabase';
import type { Quest, DailyLog, DailyProgress } from '../types/database';

// Fetch all active quests
export const useQuests = (status: 'active' | 'pending' | 'archived' = 'active') => {
    return useQuery({
        queryKey: ['quests', status],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('quests')
                // .eq('is_active', true) // Legacy check
                .select('*')
                .eq('status', status)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Quest[];
        },
    });
};

// Fetch pending quests (for parents)
export const usePendingQuests = () => {
    return useQuests('pending');
};

// Fetch daily logs for a specific user and date
export const useDailyLogs = (
    userId: string,
    date: string = getTodayDate(),
    status?: 'pending' | 'completed' | 'verified'
) => {
    return useQuery({
        queryKey: ['daily_logs', userId, date, status],
        queryFn: async () => {
            let query = supabase
                .from('daily_logs')
                .select('*, quest:quests(*), profile:profiles(name, student_id)');

            // If userId is 'all', fetch all logs (for parent view)
            if (userId !== 'all') {
                query = query.eq('user_id', userId);
            }

            if (date) {
                query = query.eq('date', date);
            }

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as DailyLog[];
        },
        enabled: !!userId,
    });
};

// Calculate daily progress
export const useDailyProgress = (userId: string, date: string = getTodayDate()) => {
    const { data: quests } = useQuests();
    const { data: logs } = useDailyLogs(userId, date);

    const progress: DailyProgress = {
        total_quests: quests?.length || 0,
        completed_quests: logs?.filter(log => log.status === 'verified').length || 0,
        total_points: quests?.reduce((sum, q) => sum + q.reward_points, 0) || 0,
        earned_points: 0,
        completion_percentage: 0,
    };

    if (quests && logs) {
        // Only count verified quests for points
        const verifiedLogs = logs.filter(log => log.status === 'verified');
        progress.earned_points = verifiedLogs.reduce((sum, log) => {
            const quest = quests.find(q => q.id === log.quest_id);
            return sum + (quest?.reward_points || 0);
        }, 0);

        progress.completion_percentage = progress.total_quests > 0
            ? Math.round((progress.completed_quests / progress.total_quests) * 100)
            : 0;
    }

    return progress;
};

// Complete a quest
export const useCompleteQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, questId }: { userId: string; questId: string }) => {
            const today = getTodayDate();

            // Check if log already exists
            const { data: existing } = await supabase
                .from('daily_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('quest_id', questId)
                .eq('date', today)
                .maybeSingle();

            if (existing) {
                // Update existing log
                const { data, error } = await supabase
                    .from('daily_logs')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Insert new log
                const { data, error } = await supabase
                    .from('daily_logs')
                    .insert({
                        user_id: userId,
                        quest_id: questId,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        date: today,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['daily_logs', variables.userId] });
        },
    });
};

// Create a new quest
export const useCreateQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (quest: Omit<Quest, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('quests')
                .insert(quest)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quests'] });
        },
    });
};

// Update a quest
export const useUpdateQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Quest> & { id: string }) => {
            const { data, error } = await supabase
                .from('quests')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quests'] });
        },
    });
};

// Delete a quest
export const useDeleteQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (questId: string) => {
            const { error } = await supabase
                .from('quests')
                .delete()
                .eq('id', questId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quests'] });
        },
    });
};

// Approve a quest (change status from 'completed' to 'verified')
export const useApproveQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (logId: string) => {
            const { data, error } = await supabase
                .from('daily_logs')
                .update({ status: 'verified' })
                .eq('id', logId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
        },
    });
};

// Reject a quest (change status from 'completed' back to 'pending')
export const useRejectQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (logId: string) => {
            const { data, error } = await supabase
                .from('daily_logs')
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .eq('id', logId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
        },
    });
};
