import { describe, expect, it } from 'vitest';
import { generateVolumeQuestion } from './volume';

describe('volume question generator', () => {
    it('generates an easy cuboid volume question', () => {
        const question = generateVolumeQuestion('easy');

        expect(question.type).toBe('cuboid_volume');
        expect(question.prompt).toContain('長方體');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a medium cube volume question', () => {
        const question = generateVolumeQuestion('medium');

        expect(question.type).toBe('cube_volume');
        expect(question.prompt).toContain('正方體');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard reverse-height question', () => {
        const question = generateVolumeQuestion('hard');

        expect(question.type).toBe('missing_height');
        expect(question.prompt).toContain('高是多少');
        expect(question.choices).toContain(question.correctAnswer);
    });
});
