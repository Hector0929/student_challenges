import { describe, expect, it } from 'vitest';
import { generateLinearEquationQuestion } from './linearEquation';

describe('linearEquation question generator', () => {
    it('generates an easy one-step equation question', () => {
        const question = generateLinearEquationQuestion('easy');

        expect(question.type).toBe('one_step');
        expect(question.prompt).toContain('x +');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a medium two-step equation question', () => {
        const question = generateLinearEquationQuestion('medium');

        expect(question.type).toBe('two_step');
        expect(question.prompt).toContain('x +');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard distribution equation question', () => {
        const question = generateLinearEquationQuestion('hard');

        expect(question.type).toBe('distribution');
        expect(question.prompt).toContain('(');
        expect(question.choices).toContain(question.correctAnswer);
    });
});
