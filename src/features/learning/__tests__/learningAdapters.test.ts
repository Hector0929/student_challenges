import { describe, expect, it } from 'vitest';
import { LEARNING_ITEMS } from '../config/learningItems';
import {
    getLearningItemDisplayName,
    toLearningModalPayload,
    toLegacyDisabledKeys,
} from '../utils/learningAdapters';

describe('learningAdapters', () => {
    it('builds GameModal-compatible payload from a learning item', () => {
        const item = LEARNING_ITEMS.find((entry) => entry.id === 'spelling');

        expect(item).toBeDefined();
        expect(toLearningModalPayload(item!)).toEqual({
            gameId: 'spelling',
            gameName: '單字召喚術',
            gameUrl: '/games/spelling_game.html',
        });
    });

    it('prefers shortName when generating display text', () => {
        const item = LEARNING_ITEMS.find((entry) => entry.id === 'fractions');

        expect(item).toBeDefined();
        expect(getLearningItemDisplayName(item!)).toBe('分數');
    });

    it('falls back to full name when shortName is not provided', () => {
        const item = LEARNING_ITEMS.find((entry) => entry.id === 'idiom');

        expect(item).toBeDefined();
        expect(getLearningItemDisplayName(item!)).toBe('成語大挑戰');
    });

    it('maps items to legacy disabled keys for backward compatibility', () => {
        const items = LEARNING_ITEMS.filter((entry) => ['sentence', 'division'].includes(entry.id));

        expect(toLegacyDisabledKeys(items)).toEqual(['sentence', 'division']);
    });
});
