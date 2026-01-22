import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useRealtimeSubscription = (userId?: string) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        console.log('🔌 Setting up Realtime subscriptions...');

        // Subscribe to changes in 'daily_logs'
        const logsChannel = supabase
            .channel('daily_logs_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_logs',
                },
                (payload) => {
                    console.log('🔔 Daily logs changed:', payload.eventType, payload);
                    // Invalidate ALL daily_logs queries with refetchType: 'all'
                    queryClient.invalidateQueries({
                        queryKey: ['daily_logs'],
                        refetchType: 'all'
                    });
                    // Also invalidate total points
                    queryClient.invalidateQueries({
                        queryKey: ['total_points'],
                        refetchType: 'all'
                    });
                }
            )
            .subscribe((status) => {
                console.log('📡 Daily logs subscription status:', status);
            });

        // Subscribe to changes in 'quests'
        const questsChannel = supabase
            .channel('quests_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quests',
                },
                (payload) => {
                    console.log('🔔 Quests changed:', payload.eventType, payload);
                    queryClient.invalidateQueries({
                        queryKey: ['quests'],
                        refetchType: 'all'
                    });
                }
            )
            .subscribe((status) => {
                console.log('📡 Quests subscription status:', status);
            });

        // Subscribe to changes in 'quest_assignments'
        const assignmentsChannel = supabase
            .channel('assignments_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quest_assignments',
                },
                (payload) => {
                    console.log('🔔 Assignments changed:', payload.eventType, payload);
                    queryClient.invalidateQueries({
                        queryKey: ['quests'],
                        refetchType: 'all'
                    });
                }
            )
            .subscribe((status) => {
                console.log('📡 Assignments subscription status:', status);
            });

        return () => {
            console.log('🔌 Cleaning up Realtime subscriptions...');
            supabase.removeChannel(logsChannel);
            supabase.removeChannel(questsChannel);
            supabase.removeChannel(assignmentsChannel);
        };
    }, [queryClient, userId]);
};
