import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useFamilyBankSettings,
    useUpdateFamilyBankSettings,
    DEFAULT_FAMILY_BANK_SETTINGS,
} from './useFamilyShopSettings';
import { TestWrapper } from '../test/TestWrapper';

const fromMock = vi.fn();
const useUserMock = vi.fn();

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => fromMock(...args),
    },
}));

vi.mock('../contexts/UserContext', () => ({
    useUser: () => useUserMock(),
}));

describe('useFamilyShopSettings', () => {
    beforeEach(() => {
        fromMock.mockReset();
        useUserMock.mockReset();
        useUserMock.mockReturnValue({
            user: {
                id: 'parent-1',
                family_id: 'family-1',
            },
        });
    });

    it('exports bank defaults aligned with the bank domain settings', () => {
        expect(DEFAULT_FAMILY_BANK_SETTINGS).toEqual({
            demand_daily_rate: 0.002,
            time_deposit_daily_rate: 0.01,
            min_time_deposit_days: 7,
            early_withdraw_penalty_rate: 0.05,
        });
    });

    it('fetches current family bank settings', async () => {
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: {
                id: 'bank-1',
                family_id: 'family-1',
                demand_daily_rate: 0.003,
                time_deposit_daily_rate: 0.012,
                min_time_deposit_days: 10,
                early_withdraw_penalty_rate: 0.08,
                updated_at: '2025-01-01T00:00:00.000Z',
                updated_by: 'parent-1',
            },
            error: null,
        });
        const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
        const selectMock = vi.fn(() => ({ eq: eqMock }));
        fromMock.mockReturnValue({ select: selectMock });

        const { result } = renderHook(() => useFamilyBankSettings(), {
            wrapper: TestWrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(fromMock).toHaveBeenCalledWith('family_bank_settings');
        expect(eqMock).toHaveBeenCalledWith('family_id', 'family-1');
        expect(result.current.data?.min_time_deposit_days).toBe(10);
    });

    it('upserts normalized bank settings for the current family', async () => {
        const singleMock = vi.fn().mockResolvedValue({
            data: {
                id: 'bank-1',
                family_id: 'family-1',
                demand_daily_rate: 0,
                time_deposit_daily_rate: 0.015,
                min_time_deposit_days: 1,
                early_withdraw_penalty_rate: 1,
                updated_at: '2025-01-01T00:00:00.000Z',
                updated_by: 'parent-1',
            },
            error: null,
        });
        const selectMock = vi.fn(() => ({ single: singleMock }));
        const upsertMock = vi.fn(() => ({ select: selectMock }));
        fromMock.mockReturnValue({ upsert: upsertMock });

        const { result } = renderHook(() => useUpdateFamilyBankSettings(), {
            wrapper: TestWrapper,
        });

        await act(async () => {
            await result.current.mutateAsync({
                demand_daily_rate: -1,
                time_deposit_daily_rate: 0.015,
                min_time_deposit_days: 0,
                early_withdraw_penalty_rate: 2,
            });
        });

        expect(fromMock).toHaveBeenCalledWith('family_bank_settings');
        expect(upsertMock).toHaveBeenCalledWith(
            {
                family_id: 'family-1',
                demand_daily_rate: 0,
                time_deposit_daily_rate: 0.015,
                min_time_deposit_days: 1,
                early_withdraw_penalty_rate: 1,
                updated_by: 'parent-1',
            },
            {
                onConflict: 'family_id',
            }
        );
    });
});