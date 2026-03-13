import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentSettings } from './ParentSettings';

const useUserMock = vi.fn();
const useFamilySettingsMock = vi.fn();
const useUpdateFamilySettingsMock = vi.fn();
const useFamilyExchangeRatesMock = vi.fn();
const useUpdateFamilyExchangeRatesMock = vi.fn();
const useFamilyBankSettingsMock = vi.fn();
const useUpdateFamilyBankSettingsMock = vi.fn();
const useAdjustStarsMock = vi.fn();
const useStarBalanceMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock('../contexts/UserContext', () => ({
    useUser: () => useUserMock(),
}));

vi.mock('../hooks/useFamilySettings', () => ({
    useFamilySettings: () => useFamilySettingsMock(),
    useUpdateFamilySettings: () => useUpdateFamilySettingsMock(),
    DEFAULT_FAMILY_SETTINGS: {
        parent_message_enabled: false,
        parent_message: '完成今天的任務，就離夢想更近一步喔！',
        exchange_rate_enabled: false,
        star_to_twd_rate: 1,
        fun_games_enabled: true,
        learning_area_enabled: true,
        disabled_games: [],
    },
}));

vi.mock('../hooks/useFamilyShopSettings', () => ({
    useFamilyExchangeRates: () => useFamilyExchangeRatesMock(),
    useUpdateFamilyExchangeRates: () => useUpdateFamilyExchangeRatesMock(),
    useFamilyBankSettings: () => useFamilyBankSettingsMock(),
    useUpdateFamilyBankSettings: () => useUpdateFamilyBankSettingsMock(),
    DEFAULT_FAMILY_EXCHANGE_RATES: {
        wood_rate: 0.025,
        stone_rate: 0.04,
        crystal_rate: 0.14,
    },
    DEFAULT_FAMILY_BANK_SETTINGS: {
        demand_daily_rate: 0.002,
        time_deposit_daily_rate: 0.01,
        min_time_deposit_days: 7,
        early_withdraw_penalty_rate: 0.05,
    },
}));

vi.mock('../hooks/useQuests', () => ({
    useAdjustStars: () => useAdjustStarsMock(),
    useStarBalance: () => useStarBalanceMock(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { name: '測試家庭' }, error: null }),
                })),
            })),
        })),
    },
}));

vi.mock('../components/ParentMonsterShopManager', () => ({
    ParentMonsterShopManager: () => <div>Monster Shop Manager</div>,
}));

vi.mock('../components/ClayDialog', () => ({
    ClayDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/SentenceSettingsDialog', () => ({
    SentenceSettingsDialog: () => null,
}));

describe('ParentSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useUserMock.mockReturnValue({
            user: {
                id: 'parent-1',
                family_id: 'family-1',
                name: '家長',
                pin_code: '1234',
            },
            setUser: vi.fn(),
        });

        useFamilySettingsMock.mockReturnValue({
            data: null,
        });
        useUpdateFamilySettingsMock.mockReturnValue({
            mutateAsync: vi.fn(),
        });
        useFamilyExchangeRatesMock.mockReturnValue({
            data: {
                id: 'rates-1',
                family_id: 'family-1',
                wood_rate: 0.03,
                stone_rate: 0.05,
                crystal_rate: 0.2,
                updated_at: '2025-01-01T00:00:00.000Z',
            },
        });
        useUpdateFamilyExchangeRatesMock.mockReturnValue({
            mutateAsync: vi.fn(),
        });
        useFamilyBankSettingsMock.mockReturnValue({
            data: {
                id: 'bank-1',
                family_id: 'family-1',
                demand_daily_rate: 0.003,
                time_deposit_daily_rate: 0.012,
                min_time_deposit_days: 10,
                early_withdraw_penalty_rate: 0.08,
                updated_at: '2025-01-01T00:00:00.000Z',
            },
        });
        useUpdateFamilyBankSettingsMock.mockReturnValue({
            mutateAsync: vi.fn(),
        });
        useAdjustStarsMock.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
        useStarBalanceMock.mockReturnValue({
            data: 0,
            isLoading: false,
        });
        useQueryMock.mockReturnValue({
            data: [],
        });
    });

    it('renders shop street settings using family shop hook values', async () => {
        render(<ParentSettings />);

        expect(screen.getByText('商店街設定')).toBeInTheDocument();
        expect(screen.getByText('兌換店價格')).toBeInTheDocument();
        expect(screen.getByText('銀行利率與規則')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByLabelText('木頭單價')).toHaveValue('0.03');
            expect(screen.getByLabelText('石頭單價')).toHaveValue('0.05');
            expect(screen.getByLabelText('水晶單價')).toHaveValue('0.2');
            expect(screen.getByLabelText('活存日利率')).toHaveValue('0.003');
            expect(screen.getByLabelText('定存日利率')).toHaveValue('0.012');
            expect(screen.getByLabelText('最短定存天數')).toHaveValue('10');
            expect(screen.getByLabelText('提前解約違約金比例')).toHaveValue('0.08');
        });
    });
});