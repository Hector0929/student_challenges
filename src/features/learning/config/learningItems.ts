import { MATH_LEARNING_ITEMS } from './mathUnits';
import type { LearningItem } from '../types/learning';

export const LANGUAGE_LEARNING_ITEMS: LearningItem[] = [
    {
        id: 'spelling',
        name: '單字召喚術',
        icon: '🅰️',
        description: '拼字主題挑戰',
        subjectId: 'english',
        stageId: 'general',
        order: 1,
        enabledByDefault: true,
        status: 'active',
        launcher: {
            type: 'html',
            target: '/games/spelling_game.html',
        },
        legacyDisabledKey: 'spelling',
        accentColorToken: 'teal',
        tags: ['英文', '拼字'],
    },
    {
        id: 'pronunciation',
        name: '發音選單字',
        icon: '👂',
        description: '聽力主題挑戰',
        subjectId: 'english',
        stageId: 'general',
        order: 2,
        enabledByDefault: true,
        status: 'active',
        launcher: {
            type: 'html',
            target: '/games/pronunciation_game.html',
        },
        legacyDisabledKey: 'pronunciation',
        accentColorToken: 'indigo',
        tags: ['英文', '聽力'],
    },
    {
        id: 'sentence',
        name: '句子重組',
        icon: '📝',
        description: '英文文法挑戰',
        subjectId: 'english',
        stageId: 'general',
        order: 3,
        enabledByDefault: true,
        status: 'active',
        launcher: {
            type: 'html',
            target: '/games/sentence_game.html',
        },
        legacyDisabledKey: 'sentence',
        accentColorToken: 'pink',
        tags: ['英文', '句型'],
    },
    {
        id: 'idiom',
        name: '成語大挑戰',
        icon: '📜',
        description: '國語成語學習',
        subjectId: 'chinese',
        stageId: 'general',
        order: 1,
        enabledByDefault: true,
        status: 'active',
        launcher: {
            type: 'html',
            target: '/games/idiom_game.html',
        },
        legacyDisabledKey: 'idiom',
        accentColorToken: 'rose',
        tags: ['國語', '成語'],
    },
];

export const LEARNING_ITEMS: LearningItem[] = [
    ...LANGUAGE_LEARNING_ITEMS,
    ...MATH_LEARNING_ITEMS,
];
