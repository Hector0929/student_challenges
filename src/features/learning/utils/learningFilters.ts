import { LEARNING_STAGE_MAP } from '../config/learningStages';
import { LEARNING_SUBJECT_MAP } from '../config/learningSubjects';
import type {
    LearningItem,
    LearningItemStatus,
    LearningStageGroup,
    LearningSubjectGroup,
} from '../types/learning';

const DEFAULT_VISIBLE_STATUSES: LearningItemStatus[] = ['active'];

const compareByOrder = (left: LearningItem, right: LearningItem) => left.order - right.order;

export const getLearningDisabledKey = (item: LearningItem) => item.legacyDisabledKey ?? item.id;

export const isLearningItemDisabled = (item: LearningItem, disabledKeys: string[]) => {
    const disabledKey = getLearningDisabledKey(item);
    return disabledKeys.includes(disabledKey);
};

export const getVisibleLearningItems = (
    items: LearningItem[],
    disabledKeys: string[],
    visibleStatuses: LearningItemStatus[] = [...DEFAULT_VISIBLE_STATUSES],
) => items
    .filter((item) => visibleStatuses.includes(item.status))
    .filter((item) => !isLearningItemDisabled(item, disabledKeys))
    .sort(compareByOrder);

export const getManageableLearningItems = (
    items: LearningItem[],
    visibleStatuses: LearningItemStatus[] = [...DEFAULT_VISIBLE_STATUSES],
) => items
    .filter((item) => visibleStatuses.includes(item.status))
    .sort((left, right) => {
        const subjectOrder = LEARNING_SUBJECT_MAP[left.subjectId].order - LEARNING_SUBJECT_MAP[right.subjectId].order;
        if (subjectOrder !== 0) {
            return subjectOrder;
        }

        const stageOrder = LEARNING_STAGE_MAP[left.stageId].order - LEARNING_STAGE_MAP[right.stageId].order;
        if (stageOrder !== 0) {
            return stageOrder;
        }

        return compareByOrder(left, right);
    });

export const groupLearningItemsBySubject = (items: LearningItem[]): LearningSubjectGroup[] => {
    const groups = new Map<LearningSubjectGroup['subject']['id'], LearningItem[]>();

    items.forEach((item) => {
        const existingItems = groups.get(item.subjectId) ?? [];
        groups.set(item.subjectId, [...existingItems, item]);
    });

    return [...groups.entries()]
        .map(([subjectId, groupedItems]) => ({
            subject: LEARNING_SUBJECT_MAP[subjectId],
            items: groupedItems.sort(compareByOrder),
        }))
        .sort((left, right) => left.subject.order - right.subject.order);
};

export const groupLearningItemsByStage = (items: LearningItem[]): LearningStageGroup[] => {
    const groups = new Map<LearningStageGroup['stage']['id'], LearningItem[]>();

    items.forEach((item) => {
        const existingItems = groups.get(item.stageId) ?? [];
        groups.set(item.stageId, [...existingItems, item]);
    });

    return [...groups.entries()]
        .map(([stageId, groupedItems]) => ({
            stage: LEARNING_STAGE_MAP[stageId],
            items: groupedItems.sort(compareByOrder),
        }))
        .sort((left, right) => left.stage.order - right.stage.order);
};
