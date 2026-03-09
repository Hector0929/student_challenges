import { describe, expect, it } from 'vitest';
import { generatePerimeterQuestion } from './perimeter';

describe('perimeter question generator', () => {
    it('generates an easy rectangle perimeter question', () => {
        const question = generatePerimeterQuestion('easy');

        expect(question.type).toBe('rectangle_formula');
        expect(question.prompt).toContain('長方形');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a medium square perimeter question', () => {
        const question = generatePerimeterQuestion('medium');

        expect(question.type).toBe('square_formula');
        expect(question.prompt).toContain('正方形');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard composite perimeter question', () => {
        const question = generatePerimeterQuestion('hard');

        expect(question.type).toBe('composite_shape');
        expect(question.prompt).toContain('L 形');
        expect(question.choices).toContain(question.correctAnswer);
    });
});
