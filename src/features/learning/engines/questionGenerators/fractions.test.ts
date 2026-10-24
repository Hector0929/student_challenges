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

    it('hard addition always finishes with 4 distinct choices, even for tiny denominators', () => {
        // 以前分母 3、4 時錯誤選項湊不滿 3 個，會無窮迴圈；跑很多次確保每種亂數組合都會結束
        for (let i = 0; i < 2000; i += 1) {
            const question = generateFractionQuestion('hard');
            expect(new Set(question.choices).size).toBe(4);
            expect(question.choices).toContain(question.correctAnswer);
        }
    });

    it('simplifies fractions correctly', () => {
        expect(simplifyFraction(6, 8)).toEqual({ numerator: 3, denominator: 4 });
    });

    it('checks equivalent fractions correctly', () => {
        expect(isEquivalentFraction(1, 2, 2, 4)).toBe(true);
        expect(isEquivalentFraction(1, 2, 3, 4)).toBe(false);
    });
});
