import { describe, expect, it } from 'vitest';
import {
    generateFractionQuestion,
    isEquivalentFraction,
    simplifyFraction,
} from './fractions';

describe('fractions question generator', () => {
    it('generates an easy recognition question with a valid correct answer', () => {
        const question = generateFractionQuestion('easy');

        expect(question.type).toBe('recognition');
        expect(question.correctAnswer).toMatch(/^\d+\/\d+$/);
        expect(question.choices).toContain(question.correctAnswer);
        expect(question.visualSegments).toBeGreaterThan(1);
        expect(question.visualFilled).toBeGreaterThan(0);
    });

    it('generates a medium simplify question with 4 choices', () => {
        const question = generateFractionQuestion('medium');

        expect(question.type).toBe('simplify');
        expect(question.choices).toHaveLength(4);
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard addition question with same-denominator answer', () => {
        const question = generateFractionQuestion('hard');

        expect(question.type).toBe('addition');
        expect(question.prompt).toContain('+');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('simplifies fractions correctly', () => {
        expect(simplifyFraction(6, 8)).toEqual({ numerator: 3, denominator: 4 });
    });

    it('checks equivalent fractions correctly', () => {
        expect(isEquivalentFraction(1, 2, 2, 4)).toBe(true);
        expect(isEquivalentFraction(1, 2, 3, 4)).toBe(false);
    });
});
