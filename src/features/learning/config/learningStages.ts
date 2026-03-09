import type { LearningStage } from '../types/learning';

export const LEARNING_STAGES: LearningStage[] = [
    {
        id: 'general',
        name: '綜合',
        description: '不特別區分學段的學習內容',
        order: 1,
    },
    {
        id: 'elementary',
        name: '國小數學',
        description: '國小階段數學單元',
        order: 2,
    },
    {
        id: 'junior_high',
        name: '國中數學',
        description: '國中階段數學單元',
        order: 3,
    },
];

export const LEARNING_STAGE_MAP = Object.fromEntries(
    LEARNING_STAGES.map((stage) => [stage.id, stage]),
) as Record<LearningStage['id'], LearningStage>;
