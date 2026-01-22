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
                .select('*, quest_assignments(*)')
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
// Pass date = null to fetch all history (e.g. for parent approval)
export const useDailyLogs = (
    userId: string,
    date: string | null = getTodayDate(),
    status?: 'pending' | 'completed' | 'verified'
) => {
    return useQuery({
        queryKey: ['daily_logs', userId, date, status],
        queryFn: async () => {
            console.log('🔍 useDailyLogs fetching...', { userId, date, status });
            let query = supabase
                .from('daily_logs')
                .select('*, quests!quest_id(*), profiles!user_id(name, student_id)');

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

            // If fetching history (no date), order by newest first
            if (!date) {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;
            console.log('📦 useDailyLogs result:', { count: data?.length, data });
            return data as DailyLog[];
        },
        enabled: !!userId,
    });
};

// Fetch total points for a child using RPC
export const useChildTotalPoints = (childId: string) => {
    return useQuery({
        queryKey: ['total_points', childId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_child_total_points', { child_id: childId });

            if (error) throw error;
            return data as number;
        },
        enabled: !!childId,
    });
};

// Calculate daily progress
export const useDailyProgress = (userId: string, date: string = getTodayDate()) => {
    const { data: allQuests } = useQuests();
    const { data: logs } = useDailyLogs(userId, date);

    // Filter quests: Show if (Global/No assignments) OR (Assigned to current user)
    const quests = allQuests?.filter(quest => {
        // If undefined or empty array, it's global
        if (!quest.quest_assignments || quest.quest_assignments.length === 0) {
            return true;
        }
        // Check if assigned to this user
        return quest.quest_assignments.some(qa => qa.child_id === userId);
    });

    const progress: DailyProgress = {
        total_quests: quests?.length || 0,
        completed_quests: logs?.filter(log => log.status === 'completed' || log.status === 'verified').length || 0,
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
        mutationFn: async ({
            userId,
            questId,
            isParentApproved = false
        }: {
            userId: string;
            questId: string;
            isParentApproved?: boolean;
        }) => {
            const today = getTodayDate();
            const targetStatus = isParentApproved ? 'verified' : 'completed';

            // Check if already exists and is verified
            const { data: existing } = await supabase
                .from('daily_logs')
                .select('id, status')
                .eq('user_id', userId)
                .eq('quest_id', questId)
                .eq('date', today)
                .maybeSingle();

            // Don't overwrite verified status
            if (existing?.status === 'verified') {
                console.log('Quest already verified, skipping update');
                return existing;
            }

            // Use upsert to avoid race condition
            // This will insert if not exists, or update if exists (but not verified)
            const { data, error } = await supabase
                .from('daily_logs')
                .upsert({
                    user_id: userId,
                    quest_id: questId,
                    status: targetStatus,
                    completed_at: new Date().toISOString(),
                    date: today,
                }, {
                    onConflict: 'user_id,quest_id,date',
                    ignoreDuplicates: false,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            console.log('✅ Quest completed successfully:', {
                userId: variables.userId,
                questId: variables.questId,
                status: data?.status
            });
            // Invalidate ALL daily_logs queries regardless of other parameters
            queryClient.invalidateQueries({
                queryKey: ['daily_logs'],
                refetchType: 'all'
            });
            queryClient.invalidateQueries({
                queryKey: ['total_points'],
                refetchType: 'all'
            });
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
            console.log('Approving quest:', logId);
            const { data, error } = await supabase
                .from('daily_logs')
                .update({ status: 'verified' })
                .eq('id', logId)
                .select()
                .single();

            if (error) throw error;
            console.log('Quest approved successfully:', logId);
            return data;
        },
        onSuccess: () => {
            // Invalidate ALL daily_logs queries to ensure UI refresh
            queryClient.invalidateQueries({
                queryKey: ['daily_logs'],
                refetchType: 'all'
            });
            queryClient.invalidateQueries({ queryKey: ['total_points'] });
        },
    });
};

// Reject a quest (change status from 'completed' back to 'pending')
export const useRejectQuest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (logId: string) => {
            console.log('Rejecting quest:', logId);
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
            console.log('Quest rejected successfully:', logId);
            return data;
        },
        onSuccess: () => {
            // Invalidate ALL daily_logs queries to ensure UI refresh
            queryClient.invalidateQueries({
                queryKey: ['daily_logs'],
                refetchType: 'all'
            });
        },
    });
};

// Update quest assignments
export const useUpdateQuestAssignments = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ questId, childIds }: { questId: string; childIds: string[] }) => {
            // First, delete all existing assignments for this quest
            const { error: deleteError } = await supabase
                .from('quest_assignments')
                .delete()
                .eq('quest_id', questId);

            if (deleteError) throw deleteError;

            // If there are childIds to assign, insert them
            if (childIds.length > 0) {
                const assignments = childIds.map(childId => ({
                    quest_id: questId,
                    child_id: childId
                }));

                const { error: insertError } = await supabase
                    .from('quest_assignments')
                    .insert(assignments);

                if (insertError) throw insertError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quests'] });
        },
    });
};
