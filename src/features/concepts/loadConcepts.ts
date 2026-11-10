// 依「科目＋年級」載入題庫。每個 content/<科目>/g<年級>.json 各自打包成一個檔，
// 孩子只會下載正在看的那個年級。

import { useQuery } from '@tanstack/react-query';
import type { Concept, ConceptGrade, ConceptSubject, GradeBank } from './types';

export interface SubjectInfo {
    name: string;
    icon: string;
    color: string;
}

export const CONCEPT_SUBJECTS: ConceptSubject[] = ['chinese', 'math', 'english', 'science', 'social'];

export const SUBJECT_INFO: Record<ConceptSubject, SubjectInfo> = {
    chinese: { name: '國語', icon: '📖', color: '#c0533a' },
    math: { name: '數學', icon: '📐', color: '#3b78d0' },
    english: { name: '英語', icon: '🔤', color: '#3f8f8a' },
    science: { name: '自然', icon: '🔬', color: '#2e9a66' },
    social: { name: '社會', icon: '🌏', color: '#d9822b' },
};

const FILES = import.meta.glob<GradeBank>('./content/*/g*.json', { import: 'default' });

const fileKey = (subject: ConceptSubject, grade: ConceptGrade) => `./content/${subject}/g${grade}.json`;

/** 不用下載就知道哪些年級有題目 */
export const hasGradeContent = (subject: ConceptSubject, grade: ConceptGrade) => fileKey(subject, grade) in FILES;

export async function loadGradeConcepts(subject: ConceptSubject, grade: ConceptGrade): Promise<Concept[]> {
    const load = FILES[fileKey(subject, grade)];
    if (!load) return [];
    const bank = await load();
    return bank.concepts;
}

export const useGradeConcepts = (subject: ConceptSubject, grade: ConceptGrade) =>
    useQuery({
        queryKey: ['concept_bank', subject, grade],
        queryFn: () => loadGradeConcepts(subject, grade),
        staleTime: Infinity,
    });
