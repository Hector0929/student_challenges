import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ExchangeRequest, ExchangeRequestWithChild } from '../types/database';
import { useUser } from '../contexts/UserContext';

/**
 * Fetch pending exchange requests for current family (for parent approval page)
 */
export const usePendingExchangeRequests = () => {
    const { user } = useUser();
    const familyId = user?.family_id;

    return useQuery({
        queryKey: ['exchange_requests', 'pending', familyId],
        queryFn: async () => {
            if (!familyId) return [];

            const { data, error } = await supabase
                .from('exchange_requests')
                // Use !child_id to disambiguate the profiles FK (there's also reviewed_by -> profiles)
                .select('*, profiles!child_id(id, name, avatar_url)')
                .eq('family_id', familyId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching pending exchange requests:', error);
                throw error;
            }

            return (data || []) as ExchangeRequestWithChild[];
        },
        enabled: !!familyId,
    });
};

/**
 * Fetch exchange request history for a child
 */
export const useChildExchangeHistory = (childId?: string) => {
    return useQuery({
        queryKey: ['exchange_requests', 'history', childId],
        queryFn: async () => {
            if (!childId) return [];

            const { data, error } = await supabase
                .from('exchange_requests')
                .select('*')
                .eq('child_id', childId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching exchange history:', error);
                throw error;
            }

            return (data || []) as ExchangeRequest[];
        },
        enabled: !!childId,
    });
};

/**
 * Create a new exchange request (child action)
 */
export const useCreateExchangeRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (params: {
            starAmount: number;
            twdAmount: number;
            exchangeRate: number;
        }) => {
            if (!user?.id || !user?.family_id) {
                throw new Error('用戶資訊不完整');
            }

            const { data, error } = await supabase
                .from('exchange_requests')
                .insert({
                    child_id: user.id,
                    family_id: user.family_id,
                    star_amount: params.starAmount,
                    twd_amount: params.twdAmount,
                    exchange_rate: params.exchangeRate,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating exchange request:', error);
                throw error;
            }

            return data as ExchangeRequest;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['exchange_requests'],
                refetchType: 'all',
            });
        },
    });
};

/**
 * Approve an exchange request (parent action)
 * This will also create a star_transaction to deduct stars
 */
export const useApproveExchangeRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (requestId: string) => {
            if (!user?.id) {
                throw new Error('未登入');
            }

            // 1. Get the request details
            const { data: request, error: fetchError } = await supabase
                .from('exchange_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError || !request) {
                throw new Error('找不到此兌換申請');
            }

            // 2. Update request status
            const { error: updateError } = await supabase
                .from('exchange_requests')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', requestId);

            if (updateError) {
                throw updateError;
            }

            // 3. Create star_transaction to deduct stars
            const { error: transactionError } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: request.child_id,
                    amount: -request.star_amount, // Negative = deduction
                    type: 'spend',
                    description: `兌換零用錢 ${request.twd_amount} 元`,
                    created_by: user.id,
                });

            if (transactionError) {
                console.error('Error creating star transaction:', transactionError);
                // Note: The request is already approved, but transaction failed
                // In production, this should be a database transaction
                throw new Error('星幣扣款失敗，請手動調整');
            }

            return request;
        },
        onSuccess: () => {
            // Refresh all related queries
            queryClient.invalidateQueries({ queryKey: ['exchange_requests'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['star_balance'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['star_transactions'], refetchType: 'all' });
        },
    });
};

/**
 * Reject an exchange request (parent action)
 */
export const useRejectExchangeRequest = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (params: { requestId: string; reason?: string }) => {
            if (!user?.id) {
                throw new Error('未登入');
            }

            const { error } = await supabase
                .from('exchange_requests')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    reject_reason: params.reason || '家長拒絕',
                })
                .eq('id', params.requestId);

            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['exchange_requests'],
                refetchType: 'all',
            });
        },
    });
};
