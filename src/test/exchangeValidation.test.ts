/**
 * Exchange Request Validation Tests
 * 測試星幣兌換的驗證邏輯
 */

import { describe, it, expect } from 'vitest';

// Business logic functions to validate exchange requests
// These are pure functions that can be tested without mocking

/**
 * Validate if a star amount is valid for exchange
 */
export function validateExchangeAmount(
    starAmount: number,
    currentBalance: number
): { valid: boolean; error?: string } {
    if (starAmount <= 0) {
        return { valid: false, error: '兌換數量必須大於 0' };
    }

    if (!Number.isInteger(starAmount)) {
        return { valid: false, error: '兌換數量必須是整數' };
    }

    if (starAmount > currentBalance) {
        return { valid: false, error: '星幣餘額不足' };
    }

    return { valid: true };
}

/**
 * Calculate TWD amount from stars
 */
export function calculateTwdAmount(starAmount: number, exchangeRate: number): number {
    return starAmount * exchangeRate;
}

describe('Exchange Request Validation', () => {
    describe('validateExchangeAmount', () => {
        it('should reject zero amount', () => {
            const result = validateExchangeAmount(0, 100);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('兌換數量必須大於 0');
        });

        it('should reject negative amount', () => {
            const result = validateExchangeAmount(-10, 100);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('兌換數量必須大於 0');
        });

        it('should reject amount exceeding balance', () => {
            const result = validateExchangeAmount(150, 100);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('星幣餘額不足');
        });

        it('should accept valid amount within balance', () => {
            const result = validateExchangeAmount(50, 100);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept amount equal to balance (全部兌換)', () => {
            const result = validateExchangeAmount(100, 100);
            expect(result.valid).toBe(true);
        });

        it('should reject decimal amounts', () => {
            const result = validateExchangeAmount(10.5, 100);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('兌換數量必須是整數');
        });
    });

    describe('calculateTwdAmount', () => {
        it('should calculate correctly with rate 1', () => {
            expect(calculateTwdAmount(50, 1)).toBe(50);
        });

        it('should calculate correctly with rate 10', () => {
            expect(calculateTwdAmount(50, 10)).toBe(500);
        });

        it('should calculate correctly with decimal rate', () => {
            expect(calculateTwdAmount(100, 0.5)).toBe(50);
        });

        it('should handle zero stars', () => {
            expect(calculateTwdAmount(0, 10)).toBe(0);
        });
    });
});

describe('Exchange Approval Logic', () => {
    /**
     * Simulate what happens when parent approves an exchange
     */
    function simulateApproval(
        currentBalance: number,
        starAmount: number
    ): { newBalance: number; transactionAmount: number } {
        const transactionAmount = -starAmount; // Negative = deduction
        const newBalance = currentBalance + transactionAmount;
        return { newBalance, transactionAmount };
    }

    /**
     * Simulate what happens when parent rejects an exchange
     */
    function simulateRejection(currentBalance: number): { newBalance: number } {
        // Balance doesn't change on rejection
        return { newBalance: currentBalance };
    }

    it('should deduct stars correctly when approved', () => {
        const result = simulateApproval(100, 30);
        expect(result.newBalance).toBe(70);
        expect(result.transactionAmount).toBe(-30);
    });

    it('should not change balance when rejected', () => {
        const result = simulateRejection(100);
        expect(result.newBalance).toBe(100);
    });

    it('should handle full balance exchange', () => {
        const result = simulateApproval(100, 100);
        expect(result.newBalance).toBe(0);
    });
});
