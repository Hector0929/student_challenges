import { describe, expect, it } from 'vitest';
import {
    accrueDemandDepositInterest,
    cancelTimeDepositEarly,
    claimMaturedTimeDeposit,
    createDefaultBankSettings,
    createTimeDeposit,
    getTimeDepositStatus,
} from '../lib/world/bank';

describe('world bank domain rules', () => {
    it('活存利息會依日利率與天數正確增加', () => {
        const result = accrueDemandDepositInterest({
            account: {
                balance: 100,
                lastInterestAt: '2026-03-10T00:00:00.000Z',
            },
            now: '2026-03-13T00:00:00.000Z',
            dailyRate: 0.01,
        });

        expect(result.elapsedDays).toBe(3);
        expect(result.interestEarned).toBe(3);
        expect(result.updatedAccount.balance).toBe(103);
    });

    it('定存建立後會生成正確到期時間', () => {
        const deposit = createTimeDeposit({
            principal: 200,
            startAt: '2026-03-13T00:00:00.000Z',
            termDays: 7,
            dailyRate: 0.02,
        });

        expect(deposit.status).toBe('active');
        expect(deposit.termDays).toBe(7);
        expect(deposit.maturesAt).toBe('2026-03-20T00:00:00.000Z');
    });

    it('定存到期後可領回本金加利息', () => {
        const deposit = createTimeDeposit({
            principal: 300,
            startAt: '2026-03-01T00:00:00.000Z',
            termDays: 10,
            dailyRate: 0.01,
        });

        expect(getTimeDepositStatus(deposit, '2026-03-12T00:00:00.000Z')).toBe('matured');

        const result = claimMaturedTimeDeposit({
            deposit,
            now: '2026-03-12T00:00:00.000Z',
        });

        expect(result.interestEarned).toBe(30);
        expect(result.payout).toBe(330);
        expect(result.updatedDeposit.status).toBe('claimed');
    });

    it('提前解約會依規則扣除違約金且不給利息', () => {
        const deposit = createTimeDeposit({
            principal: 400,
            startAt: '2026-03-13T00:00:00.000Z',
            termDays: 30,
            dailyRate: createDefaultBankSettings().timeDepositDailyRate,
        });

        const result = cancelTimeDepositEarly({
            deposit,
            now: '2026-03-15T00:00:00.000Z',
            earlyWithdrawPenaltyRate: 0.05,
        });

        expect(result.interestEarned).toBe(0);
        expect(result.penaltyApplied).toBe(20);
        expect(result.payout).toBe(380);
        expect(result.updatedDeposit.status).toBe('cancelled');
    });
});