import type { LearningStageId, LearningSubjectId } from '../types/learning';

export const LEARNING_SUBJECT_DISPLAY_ORDER: LearningSubjectId[] = [
    'english',
    'chinese',
    'math',
];

export const LEARNING_STAGE_DISPLAY_ORDER: LearningStageId[] = [
    'general',
    'elementary',
    'junior_high',
];

export const DEFAULT_VISIBLE_LEARNING_STATUSES = ['active'] as const;
