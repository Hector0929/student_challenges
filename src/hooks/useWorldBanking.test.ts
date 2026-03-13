import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestWrapper } from '../test/TestWrapper';
import { useWorldBanking } from './useWorldBanking';

const fromMock = vi.fn();

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => fromMock(...args),
    },
}));

describe('useWorldBanking', () => {
    beforeEach(() => {
        fromMock.mockReset();
    });

    it('hydrates persisted bank account and time deposits', async () => {
        const bankAccountMaybeSingleMock = vi.fn().mockResolvedValue({
            data: {
                user_id: 'user-1',
                balance: 88,
                last_interest_at: '2026-03-11T00:00:00.000Z',
                simulated_now_at: '2026-03-15T00:00:00.000Z',
            },
            error: null,
        });
        const timeDepositsOrderMock = vi.fn().mockResolvedValue({
            data: [
                {
                    id: 'deposit-1',
                    user_id: 'user-1',
                    principal: 50,
                    daily_rate: 0.01,
                    start_at: '2026-03-10T00:00:00.000Z',
                    matures_at: '2026-03-17T00:00:00.000Z',
                    term_days: 7,
                    status: 'active',
                },
            ],
            error: null,
        });

        fromMock.mockImplementation((table: string) => {
            if (table === 'world_bank_accounts') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: bankAccountMaybeSingleMock,
                        })),
                    })),
                };
            }

            if (table === 'world_time_deposits') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: timeDepositsOrderMock,
                        })),
                    })),
                };
            }

            throw new Error(`Unexpected table ${table}`);
        });

        const { result } = renderHook(() => useWorldBanking({
            userId: 'user-1',
            starBalance: 999,
            onAdjustStars: vi.fn().mockResolvedValue(true),
            bankSettings: {
                demandDailyRate: 0.002,
                timeDepositDailyRate: 0.01,
                minTimeDepositDays: 7,
                earlyWithdrawPenaltyRate: 0.05,
            },
        }), { wrapper: TestWrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.demandDepositAccount.balance).toBe(88);
        expect(result.current.timeDeposits).toHaveLength(1);
        expect(result.current.bankNowMs).toBe(new Date('2026-03-15T00:00:00.000Z').getTime());
    });

    it('stores demand deposits through Supabase-backed persistence', async () => {
        const onAdjustStars = vi.fn().mockResolvedValue(true);
        const bankAccountMaybeSingleMock = vi.fn().mockResolvedValue({
            data: null,
            error: null,
        });
        const timeDepositsOrderMock = vi.fn().mockResolvedValue({
            data: [],
            error: null,
        });
        const bankUpsertMock = vi.fn().mockResolvedValue({ error: null });
        const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

        fromMock.mockImplementation((table: string) => {
            if (table === 'world_bank_accounts') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: bankAccountMaybeSingleMock,
                        })),
                    })),
                    upsert: bankUpsertMock,
                };
            }

            if (table === 'world_time_deposits') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: timeDepositsOrderMock,
                        })),
                    })),
                    delete: vi.fn(() => ({
                        eq: deleteEqMock,
                    })),
                    insert: vi.fn().mockResolvedValue({ error: null }),
                };
            }

            throw new Error(`Unexpected table ${table}`);
        });

        const { result } = renderHook(() => useWorldBanking({
            userId: 'user-1',
            starBalance: 999,
            onAdjustStars,
            bankSettings: {
                demandDailyRate: 0.002,
                timeDepositDailyRate: 0.01,
                minTimeDepositDays: 7,
                earlyWithdrawPenaltyRate: 0.05,
            },
        }), { wrapper: TestWrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            const response = await result.current.depositDemand(30);
            expect(response.ok).toBe(true);
        });

        expect(onAdjustStars).toHaveBeenCalledWith(-30, '銀行活存存入');
        expect(bankUpsertMock).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                balance: 30,
            }),
            { onConflict: 'user_id' }
        );
        expect(deleteEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    });
});