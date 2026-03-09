import type { LearningItem } from '../types/learning';

export interface LearningModalPayload {
    gameId: string;
    gameName: string;
    gameUrl: string;
}

export const toLearningModalPayload = (item: LearningItem): LearningModalPayload => ({
    gameId: item.id,
    gameName: item.name,
    gameUrl: item.launcher.target,
});

export const getLearningItemDisplayName = (item: LearningItem) => item.shortName ?? item.name;

export const toLegacyDisabledKeys = (items: LearningItem[]) => items.map((item) => item.legacyDisabledKey ?? item.id);
