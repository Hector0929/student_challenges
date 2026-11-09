// 依科目載入題庫。每科各自打包成一個檔，用到才下載。

import { useQuery } from '@tanstack/react-query';
import type { ConceptSubject, SubjectBank } from './types';

const LOADERS: Record<ConceptSubject, () => Promise<{ default: unknown }>> = {
    chinese: () => import('./content/chinese.json'),
    math: () => import('./content/math.json'),
    english: () => import('./content/english.json'),
    science: () => import('./content/science.json'),
    social: () => import('./content/social.json'),
};

export const CONCEPT_SUBJECTS: ConceptSubject[] = ['chinese', 'math', 'english', 'science', 'social'];

export async function loadSubjectBank(subject: ConceptSubject): Promise<SubjectBank> {
    const mod = await LOADERS[subject]();
    return mod.default as SubjectBank;
}

export const useSubjectBank = (subject: ConceptSubject) =>
    useQuery({
        queryKey: ['concept_bank', subject],
        queryFn: () => loadSubjectBank(subject),
        staleTime: Infinity,
    });
