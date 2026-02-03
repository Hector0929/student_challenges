import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CustomSentence {
    id: string;
    en: string;
    zh: string;
}

/**
 * Fetch custom sentences for a family
 */
export const useCustomSentences = (familyId?: string) => {
    return useQuery({
        queryKey: ['custom-sentences', familyId],
        queryFn: async () => {
            if (!familyId) return [];

            const { data, error } = await supabase.rpc('get_custom_sentences', {
                p_family_id: familyId
            });

            if (error) {
                console.error('Failed to fetch custom sentences:', error);
                return [];
            }

            const sentences = (data || []) as CustomSentence[];

            // Sync to localStorage for games to read
            if (sentences.length > 0) {
                localStorage.setItem('customSentences', JSON.stringify(sentences));
            }

            return sentences;
        },
        enabled: !!familyId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

/**
 * Add a new custom sentence
 */
export const useAddCustomSentence = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            familyId: string;
            en: string;
            zh: string;
            createdBy?: string;
        }) => {
            const { data, error } = await supabase
                .from('custom_sentences')
                .insert({
                    family_id: params.familyId,
                    en: params.en.trim(),
                    zh: params.zh.trim(),
                    created_by: params.createdBy,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ['custom-sentences', params.familyId]
            });
        },
    });
};

/**
 * Delete a custom sentence
 */
export const useDeleteCustomSentence = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { id: string; familyId: string }) => {
            const { error } = await supabase
                .from('custom_sentences')
                .delete()
                .eq('id', params.id);

            if (error) throw error;
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ['custom-sentences', params.familyId]
            });
        },
    });
};

/**
 * Toggle sentence active status
 */
export const useToggleSentenceActive = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: {
            id: string;
            familyId: string;
            isActive: boolean
        }) => {
            const { error } = await supabase
                .from('custom_sentences')
                .update({ is_active: params.isActive })
                .eq('id', params.id);

            if (error) throw error;
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ['custom-sentences', params.familyId]
            });
        },
    });
};

/**
 * Play sentence using Web Speech API
 */
export const playSentence = (text: string) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Prefer high-quality voices
    const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Siri'))
        || voices.find(v => v.name.includes('Google US English'))
        || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.lang = 'en-US';
    utterance.rate = 0.85;

    window.speechSynthesis.speak(utterance);
};
