import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../lib/supabase';
import type { Quest, DailyLog, DailyProgress } from '../types/database';
import { useUser } from '../contexts/UserContext';

// Fetch all active quests
export const useQuests = (status: 'active' | 'pending' | 'archived' = 'active') => {
    const { user } = useUser();
    const familyId = user?.family_id;

    return useQuery({
        queryKey: ['quests', status, familyId],
        queryFn: async () => {
            console.log('🔍 useQuests fetching with status:', status, 'familyId:', familyId);

            if (!familyId) {
                console.log('⚠️ No familyId found, returning empty quests');
                return [];
            }

            // JOIN profiles to filter by family_id
            // We use !inner to enforce that the creator must belong to the same family
            let query = supabase
                .from('quests')
                .select('*, quest_assignments(*), profiles!inner(family_id)');

            try {
                // Filter by family_id through the profiles relation
                // Assuming 'created_by' is the FK to 'profiles.id'
                const { data, error } = await query
                    .eq('status', status)
                    .eq('profiles.family_id', familyId)
                    .order('created_at', { ascending: true });

                if (error) {
                    // Fallback for missing status column (backward compatibility)
                    if (error.message?.includes('column') || error.code === '42703') {
                        console.warn('⚠️ status column not found, using is_active fallback');
                        const isActive = status === 'active';

                        const fallbackQuery = await supabase
                            .from('quests')
                            .select('*, quest_assignments(*), profiles!inner(family_id)')
                            .eq('is_active', isActive)
                            .eq('profiles.family_id', familyId)
                            .order('created_at', { ascending: true });

                        if (fallbackQuery.error) throw fallbackQuery.error;
                        console.log('✅ useQuests fallback result:', { count: fallbackQuery.data?.length });
                        return fallbackQuery.data as Quest[];
                    }
                    throw error;
                }

                console.log('✅ useQuests result:', { count: data?.length });
                return data as Quest[];
            } catch (e) {
                console.error('❌ useQuests error:', e);
                throw e;
            }
        },
        enabled: !!familyId, // Only fetch if we have a familyId
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

            // Use LEFT JOIN syntax (no !) to ensure records are returned
            // even if related quest or profile is missing/deleted
            // JOIN quest and profile data for ParentApproval display
            let query = supabase
                .from('daily_logs')
                .select(`
                    *,
                    quest:quests(*),
                    profile:profiles(id, name, student_id, avatar_url)
                `);

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

            console.log('🚀 useCompleteQuest starting:', {
                userId: userId.substring(0, 8) + '...',
                questId: questId.substring(0, 8) + '...',
                isParentApproved,
                targetStatus,
                today
            });

            // CRITICAL: Verify quest exists before attempting to insert
            const { data: questExists, error: questCheckError } = await supabase
                .from('quests')
                .select('id, title')
                .eq('id', questId)
                .maybeSingle();

            if (questCheckError) {
                console.error('❌ Error checking quest existence:', questCheckError);
                throw new Error(`查询任务失败: ${questCheckError.message}`);
            }

            if (!questExists) {
                console.error('❌ Quest not found in database:', questId);
                throw new Error('任务不存在，请刷新页面重试');
            }

            console.log('✅ Quest exists:', questExists.title);

            // Check if already exists and is verified
            const { data: existing, error: checkError } = await supabase
                .from('daily_logs')
                .select('id, status')
                .eq('user_id', userId)
                .eq('quest_id', questId)
                .eq('date', today)
                .maybeSingle();

            if (checkError) {
                console.error('❌ Error checking existing log:', checkError);
            }

            console.log('🔍 Existing check result:', {
                found: !!existing,
                existingStatus: existing?.status
            });

            // Don't overwrite verified status
            if (existing?.status === 'verified') {
                console.log('⚠️ Quest already verified, skipping update');
                // Return existing data but mark that we skipped
                return { ...existing, _skipped: true };
            }

            // Use upsert to avoid race condition
            console.log('📝 Upserting with status:', targetStatus);

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

            if (error) {
                console.error('❌ Upsert error:', error);
                throw new Error(`保存失败: ${error.message}`);
            }

            console.log('✅ Upsert success:', {
                id: data?.id?.substring(0, 8) + '...',
                status: data?.status
            });

            return data;
        },
        onSuccess: async (data, variables) => {
            console.log('🎉 Mutation onSuccess:', {
                userId: variables.userId.substring(0, 8) + '...',
                questId: variables.questId.substring(0, 8) + '...',
                returnedStatus: data?.status,
                wasSkipped: (data as { _skipped?: boolean })?._skipped
            });

            // Always invalidate queries to refresh UI
            queryClient.invalidateQueries({
                queryKey: ['daily_logs'],
                refetchType: 'all'
            });
            queryClient.invalidateQueries({
                queryKey: ['total_points'],
                refetchType: 'all'
            });

            // 🎲 Award dice for Monster Tower (only if not skipped)
            if (!(data as { _skipped?: boolean })?._skipped) {
                try {
                    // Check if tower_progress exists for this user
                    const { data: progress } = await supabase
                        .from('tower_progress')
                        .select('dice_count')
                        .eq('user_id', variables.userId)
                        .maybeSingle(); // Changed from single() to avoid throwing error immediately

                    if (!progress) {
                        // No record exists, create one with 1 dice (start with 1 + default 3 = 4?) 
                        // Actually default is 3, so if we create new, maybe use default logic?
                        // Let's stick to adding 1. If row missing, create with default + 1 = 4.

                        // Check if we have a default constant available or just hardcode
                        const defaultCount = 3;

                        const { error: insertError } = await supabase
                            .from('tower_progress')
                            .insert({
                                user_id: variables.userId,
                                current_floor: 1,
                                dice_count: defaultCount + 1, // Default + reward
                                monsters_collected: [],
                                total_climbs: 0,
                                highest_floor: 1,
                            });

                        if (insertError) throw insertError;
                        console.log('🎲 Created tower_progress with reward dice');
                    } else {
                        // Update existing record
                        const currentDice = progress.dice_count || 0;
                        const { error: updateError } = await supabase
                            .from('tower_progress')
                            .update({ dice_count: currentDice + 1 })
                            .eq('user_id', variables.userId);

                        if (updateError) throw updateError;
                        console.log('🎲 Added 1 dice, new count:', currentDice + 1);
                    }

                    // Invalidate tower progress cache
                    queryClient.invalidateQueries({
                        queryKey: ['tower-progress', variables.userId],
                        refetchType: 'all'
                    });
                } catch (diceError) {
                    console.warn('⚠️ Failed to award dice (tower table may not exist):', diceError);
                }
            }

            console.log('🔄 Cache invalidated, queries should refetch');
        },
        onError: (error) => {
            console.error('❌ Mutation onError:', error);
        }
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

// ============================================
// 星幣系統 Hooks
// ============================================

// Fetch star balance for a child (earned - spent)
export const useStarBalance = (childId: string) => {
    return useQuery({
        queryKey: ['star_balance', childId],
        queryFn: async () => {
            console.log('💰 Fetching star balance for:', childId.substring(0, 8) + '...');

            // Try RPC function first (if database migration is done)
            try {
                const { data, error } = await supabase
                    .rpc('get_child_star_balance', { child_id: childId });

                if (!error && data !== null) {
                    console.log('✅ Star balance from RPC:', data);
                    return data as number;
                }
            } catch (e) {
                console.log('⚠️ RPC not available, calculating manually...');
            }

            // Fallback: Calculate manually
            // 1. Get total earned from verified quests
            const { data: totalPoints } = await supabase
                .rpc('get_child_total_points', { child_id: childId });

            const earned = totalPoints || 0;

            // 2. Get total net transactions (spend is negative, manual adjustment can be pos/neg)
            let netTransactions = 0;
            try {
                const { data: transactions } = await supabase
                    .from('star_transactions')
                    .select('amount')
                    .eq('user_id', childId);

                if (transactions) {
                    // Sum up all transactions (spend is negative, earn/adjustment can be pos/neg)
                    netTransactions = transactions.reduce((sum, t) => sum + t.amount, 0);
                }
            } catch (e) {
                console.log('⚠️ star_transactions error', e);
            }

            const balance = earned + netTransactions;
            console.log('💰 Star balance calculated:', { earned, netTransactions, balance });
            return balance;
        },
        enabled: !!childId,
    });
};

// Spend stars to play a game
export const useSpendStars = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            amount,
            gameId,
            gameName
        }: {
            userId: string;
            amount: number;
            gameId: string;
            gameName: string;
        }) => {
            console.log('💸 Spending stars:', { userId: userId.substring(0, 8) + '...', amount, gameId });

            // First verify balance is sufficient
            let currentBalance = 0;

            // Try RPC first
            try {
                const { data } = await supabase
                    .rpc('get_child_star_balance', { child_id: userId });
                if (data !== null) {
                    currentBalance = data;
                }
            } catch (e) {
                // Fallback
                const { data: totalPoints } = await supabase
                    .rpc('get_child_total_points', { child_id: userId });
                currentBalance = totalPoints || 0;
            }

            if (currentBalance < amount) {
                throw new Error(`星幣不足！需要 ${amount} 顆，目前只有 ${currentBalance} 顆`);
            }

            // 🛑 Race Condition Protection: Check for recent transactions (last 60s)
            // This prevents "Double Spending" if user has multiple tabs open or network huge lag
            const { data: recentTx } = await supabase
                .from('star_transactions')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('game_id', gameId)
                .gt('created_at', new Date(Date.now() - 60 * 1000).toISOString())
                .limit(1);

            if (recentTx && recentTx.length > 0) {
                console.warn('⚠️ Duplicate transaction detected (idempotency check)');
                // Ideally we should return the existing one, but for now throwing error is safer
                // to stop the balance deduction. 
                // However, UI will show error. Better: Just return mock success?
                // Let's throw specific error so we know.
                throw new Error('您剛剛已經支付過這個遊戲了，請勿重複點擊！');
            }

            // Record the transaction
            const { data, error } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: userId,
                    amount: -amount,  // Negative for spending
                    type: 'spend',
                    description: `玩遊戲: ${gameName}`,
                    game_id: gameId
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to record transaction:', error);
                throw new Error(`記錄交易失敗: ${error.message}`);
            }

            console.log('✅ Stars spent successfully:', data);
            return { transaction: data, newBalance: currentBalance - amount };
        },
        onSuccess: (_, variables) => {
            // Invalidate star balance queries
            queryClient.invalidateQueries({
                queryKey: ['star_balance', variables.userId],
                refetchType: 'all'
            });
            queryClient.invalidateQueries({
                queryKey: ['star_transactions'],
                refetchType: 'all'
            });
        },
        onError: (error) => {
            console.error('❌ useSpendStars error:', error);
        }
    });
};

// Manually adjust stars (Parent only)
export const useAdjustStars = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            childId,
            amount,
            description,
            parentId
        }: {
            childId: string;
            amount: number;
            description: string;
            parentId: string;
        }) => {
            console.log('👮 Parent adjusting stars:', { childId, amount });

            const { data, error } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: childId,
                    amount: amount, // Can be positive or negative
                    type: 'adjustment',
                    description: description,
                    created_by: parentId // Track who did it
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['star_balance', variables.childId] });
            queryClient.invalidateQueries({ queryKey: ['star_transactions'] });
        },
    });
};

