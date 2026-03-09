import type { LearningSubject } from '../types/learning';

export const LEARNING_SUBJECTS: LearningSubject[] = [
    {
        id: 'english',
        name: '英文學習',
        icon: '🔤',
        description: '單字、發音與句子練習',
        order: 1,
    },
    {
        id: 'chinese',
        name: '國語學習',
        icon: '📚',
        description: '成語與語文理解練習',
        order: 2,
    },
    {
        id: 'math',
        name: '數學學習',
        icon: '🧮',
        description: '依學段與單元分類的數學練習',
        order: 3,
    },
];

export const LEARNING_SUBJECT_MAP = Object.fromEntries(
    LEARNING_SUBJECTS.map((subject) => [subject.id, subject]),
) as Record<LearningSubject['id'], LearningSubject>;
