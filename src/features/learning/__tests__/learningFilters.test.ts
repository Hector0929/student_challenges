import { describe, expect, it } from 'vitest';
import { LEARNING_ITEMS } from '../config/learningItems';
import {
    getManageableLearningItems,
    getVisibleLearningItems,
    groupLearningItemsByStage,
    groupLearningItemsBySubject,
    isLearningItemDisabled,
} from '../utils/learningFilters';

const visibleStatuses = ['active', 'planned'] as const;

describe('learningFilters', () => {
    it('filters out disabled active learning items', () => {
        const visibleItems = getVisibleLearningItems(LEARNING_ITEMS, ['sentence']);

        expect(visibleItems.some((item) => item.id === 'sentence')).toBe(false);
        expect(visibleItems.some((item) => item.id === 'spelling')).toBe(true);
    });

    it('hides planned items by default', () => {
        const visibleItems = getVisibleLearningItems(LEARNING_ITEMS, []);

        expect(visibleItems.some((item) => item.id === 'fractions')).toBe(true);
        expect(visibleItems.some((item) => item.id === 'factors_multiples')).toBe(true);
        expect(visibleItems.some((item) => item.id === 'area')).toBe(true);
        expect(visibleItems.some((item) => item.id === 'linear_equation')).toBe(false);
    });

    it('includes planned items when explicitly requested', () => {
        const visibleItems = getVisibleLearningItems(LEARNING_ITEMS, [], [...visibleStatuses]);

        expect(visibleItems.some((item) => item.id === 'fractions')).toBe(true);
        expect(visibleItems.some((item) => item.id === 'linear_equation')).toBe(true);
    });

    it('orders manageable items by subject, stage, then item order', () => {
        const manageableItems = getManageableLearningItems(LEARNING_ITEMS, [...visibleStatuses]);
        const firstFourIds = manageableItems.slice(0, 4).map((item) => item.id);

        expect(firstFourIds).toEqual(['spelling', 'pronunciation', 'sentence', 'idiom']);
    });

    it('groups items by subject in configured order', () => {
        const visibleItems = getVisibleLearningItems(LEARNING_ITEMS, [], [...visibleStatuses]);
        const subjectGroups = groupLearningItemsBySubject(visibleItems);

        expect(subjectGroups.map((group) => group.subject.id)).toEqual(['english', 'chinese', 'math']);
        expect(subjectGroups[2].items.some((item) => item.id === 'multiplication')).toBe(true);
    });

    it('groups math items by stage in configured order', () => {
        const mathItems = getVisibleLearningItems(LEARNING_ITEMS, [], [...visibleStatuses])
            .filter((item) => item.subjectId === 'math');
        const stageGroups = groupLearningItemsByStage(mathItems);

        expect(stageGroups.map((group) => group.stage.id)).toEqual(['elementary', 'junior_high']);
        expect(stageGroups[0].items.some((item) => item.id === 'fractions')).toBe(true);
        expect(stageGroups[1].items.some((item) => item.id === 'linear_equation')).toBe(true);
    });

    it('uses legacy disabled key when checking item visibility', () => {
        const item = LEARNING_ITEMS.find((entry) => entry.id === 'multiplication');

        expect(item).toBeDefined();
        expect(isLearningItemDisabled(item!, ['multiplication'])).toBe(true);
    });
});
