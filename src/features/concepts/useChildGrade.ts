import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { CONCEPT_GRADES, type ConceptGrade } from './types';

/** 孩子的年級（profiles.grade）。還沒設定或欄位尚未建立時回傳 null。 */
export const useChildGrade = (userId: string) =>
    useQuery({
        queryKey: ['child_grade', userId],
        queryFn: async (): Promise<ConceptGrade | null> => {
            const { data, error } = await supabase.from('profiles').select('grade').eq('id', userId).maybeSingle();
            if (error) {
                console.warn('profiles.grade unavailable:', error.message);
                return null;
            }
            const g = Number((data as { grade?: number | null } | null)?.grade);
            return (CONCEPT_GRADES as number[]).includes(g) ? (g as ConceptGrade) : null;
        },
        enabled: !!userId,
        staleTime: 5 * 60_000,
    });
