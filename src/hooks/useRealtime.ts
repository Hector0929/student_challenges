import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useRealtimeSubscription = (userId?: string) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Subscribe to changes in 'daily_logs'
        const logsSubscription = supabase
            .channel('daily_logs_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_logs',
                },
                (payload) => {
                    console.log('🔔 Daily logs changed:', payload.eventType);
                    // Invalidate all daily_logs queries
                    queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
                    // Also invalidate total points if status changed to verified
                    queryClient.invalidateQueries({ queryKey: ['total_points'] });
                }
            )
            .subscribe();

        // Subscribe to changes in 'quests'
        const questsSubscription = supabase
            .channel('quests_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quests',
                },
                (payload) => {
                    console.log('🔔 Quests changed:', payload.eventType);
                    // Invalidate quest queries
                    queryClient.invalidateQueries({ queryKey: ['quests'] });
                }
            )
            .subscribe();

        // Subscribe to changes in 'quest_assignments'
        const assignmentsSubscription = supabase
            .channel('assignments_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quest_assignments',
                },
                (payload) => {
                    console.log('🔔 Assignments changed:', payload.eventType);
                    // Invalidate quest queries (since assignments are fetched with quests)
                    queryClient.invalidateQueries({ queryKey: ['quests'] });
                }
            )
            .subscribe();

        return () => {
            logsSubscription.unsubscribe();
            questsSubscription.unsubscribe();
            assignmentsSubscription.unsubscribe();
        };
    }, [queryClient, userId]);
};
