import { describe, expect, it } from 'vitest';
import {
    generateFactorsMultiplesQuestion,
    getFactors,
    getGcd,
    getLcm,
} from './factorsMultiples';

describe('factorsMultiples question generator', () => {
    it('generates an easy true/false question', () => {
        const question = generateFactorsMultiplesQuestion('easy');

        expect(question.type).toBe('true_false');
        expect(question.choices).toEqual(['是', '不是']);
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a medium factor-finding question with 4 choices', () => {
        const question = generateFactorsMultiplesQuestion('medium');

        expect(question.type).toBe('find_factor');
        expect(question.choices).toHaveLength(4);
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('generates a hard gcf/lcm question', () => {
        const question = generateFactorsMultiplesQuestion('hard');

        expect(question.type).toBe('gcf_lcm');
        expect(question.choices).toContain(question.correctAnswer);
    });

    it('returns correct factors', () => {
        expect(getFactors(12)).toEqual([1, 2, 3, 4, 6, 12]);
    });

    it('calculates gcd and lcm correctly', () => {
        expect(getGcd(12, 18)).toBe(6);
        expect(getLcm(12, 18)).toBe(36);
    });
});
