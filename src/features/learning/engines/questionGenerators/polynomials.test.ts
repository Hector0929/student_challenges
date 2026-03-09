import { describe, expect, it } from 'vitest';
import { generatePolynomialsQuestion } from './polynomials';

describe('polynomials question generator', () => {
    it('generates an easy like-terms question', () => {
        const question = generatePolynomialsQuestion('easy');

        expect(question.type).toBe('like_terms');
        expect(question.prompt).toContain('化簡');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a medium evaluate question', () => {
        const question = generatePolynomialsQuestion('medium');

        expect(question.type).toBe('evaluate');
        expect(question.prompt).toContain('x =');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard add/subtract question', () => {
        const question = generatePolynomialsQuestion('hard');

        expect(question.type).toBe('add_subtract');
        expect(question.prompt).toContain('(');
        expect(question.choices).toContain(question.correctAnswer);
    });
});
