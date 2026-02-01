import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FamilySettings } from '../types/database';
import { useUser } from '../contexts/UserContext';

/**
 * Hook to fetch family settings for the current family
 */
export const useFamilySettings = () => {
    const { user } = useUser();
    const familyId = user?.family_id;

    return useQuery({
        queryKey: ['family_settings', familyId],
        queryFn: async () => {
            if (!familyId) return null;

            const { data, error } = await supabase
                .from('family_settings')
                .select('*')
                .eq('family_id', familyId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching family settings:', error);
                throw error;
            }

            return data as FamilySettings | null;
        },
        enabled: !!familyId,
    });
};

/**
 * Hook to update family settings (upsert)
 */
export const useUpdateFamilySettings = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (settings: Partial<FamilySettings>) => {
            if (!user?.family_id) {
                throw new Error('No family ID found');
            }

            const { data, error } = await supabase
                .from('family_settings')
                .upsert({
                    family_id: user.family_id,
                    ...settings,
                    updated_by: user.id,
                }, {
                    onConflict: 'family_id',
                })
                .select()
                .single();

            if (error) {
                console.error('Error updating family settings:', error);
                throw error;
            }

            return data as FamilySettings;
        },
        onSuccess: (_, __, ___) => {
            // Invalidate to refetch the latest data
            queryClient.invalidateQueries({
                queryKey: ['family_settings'],
                refetchType: 'all',
            });
        },
    });
};

/**
 * Default settings to use when no settings exist yet
 */
export const DEFAULT_FAMILY_SETTINGS: Omit<FamilySettings, 'id' | 'family_id' | 'updated_at' | 'updated_by'> = {
    parent_message_enabled: false,
    parent_message: '完成今天的任務，就離夢想更近一步喔！',
    exchange_rate_enabled: false,
    star_to_twd_rate: 1.00,
    // Game permissions - all enabled by default
    fun_games_enabled: true,
    learning_area_enabled: true,
    disabled_games: [],
};
