import { describe, expect, it } from 'vitest';
import { generateAreaQuestion } from './area';

describe('area question generator', () => {
    it('generates an easy rectangle area question', () => {
        const question = generateAreaQuestion('easy');

        expect(question.type).toBe('rectangle_formula');
        expect(question.choices).toContain(question.correctAnswer);
        expect(question.prompt).toContain('長方形');
    });

    it('generates a medium grid-counting question', () => {
        const question = generateAreaQuestion('medium');

        expect(question.type).toBe('count_grid');
        expect(question.grid).toBeDefined();
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard triangle area question', () => {
        const question = generateAreaQuestion('hard');

        expect(question.type).toBe('triangle_formula');
        expect(question.prompt).toContain('三角形');
        expect(question.choices).toContain(question.correctAnswer);
    });
});
