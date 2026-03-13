import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChildWorldShopStreet } from './ChildWorldShopStreet';

const useUserMock = vi.fn();
const useFamilyExchangeRatesMock = vi.fn();
const useFamilyBankSettingsMock = vi.fn();
const useWorldPersistenceMock = vi.fn();
const useSaveWorldPersistenceMock = vi.fn();
const useWorldBankingMock = vi.fn();
const useWorldExchangeMock = vi.fn();

vi.mock('../contexts/UserContext', () => ({
    useUser: () => useUserMock(),
}));

vi.mock('../hooks/useFamilyShopSettings', () => ({
    useFamilyExchangeRates: () => useFamilyExchangeRatesMock(),
    useFamilyBankSettings: () => useFamilyBankSettingsMock(),
    DEFAULT_FAMILY_BANK_SETTINGS: {
        demand_daily_rate: 0.002,
        time_deposit_daily_rate: 0.01,
        min_time_deposit_days: 7,
        early_withdraw_penalty_rate: 0.05,
    },
    DEFAULT_FAMILY_EXCHANGE_RATES: {
        wood_rate: 0.025,
        stone_rate: 0.04,
        crystal_rate: 0.14,
    },
}));

vi.mock('../hooks/useWorldPersistence', () => ({
    useWorldPersistence: (...args: unknown[]) => useWorldPersistenceMock(...args),
    useSaveWorldPersistence: () => useSaveWorldPersistenceMock(),
}));

vi.mock('../hooks/useWorldBanking', () => ({
    useWorldBanking: () => useWorldBankingMock(),
}));

vi.mock('../hooks/useWorldExchange', () => ({
    useWorldExchange: () => useWorldExchangeMock(),
}));

vi.mock('../lib/supabase', () => ({
    supabase: {},
}));

describe('ChildWorldShopStreet', () => {
    it('renders world resources, exchange logs, and bank panel', () => {
        const queryClient = new QueryClient();

        useUserMock.mockReturnValue({ user: { family_id: 'family-1' } });
        useFamilyExchangeRatesMock.mockReturnValue({ data: null });
        useFamilyBankSettingsMock.mockReturnValue({ data: null });
        useWorldPersistenceMock.mockReturnValue({
            isLoading: false,
            data: {
                worldLab: {
                    islandLevel: 3,
                    heroLevel: 2,
                    heroPower: 150,
                    monsterShards: 0,
                    timeOfDay: 'day',
                    buildings: { forest: 2, mine: 2, academy: 1, market: 1 },
                    resources: { wood: 20, stone: 10, crystal: 5 },
                    lastTickAt: Date.now(),
                },
                activeAdventure: null,
                lastAdventureResult: null,
            },
        });
        useSaveWorldPersistenceMock.mockReturnValue({ mutateAsync: vi.fn() });
        useWorldBankingMock.mockReturnValue({
            bankNowMs: new Date('2026-03-13T00:00:00.000Z').getTime(),
            demandDepositAccount: { balance: 44, lastInterestAt: '2026-03-12T00:00:00.000Z' },
            timeDeposits: [],
            settleDemandInterest: vi.fn(),
            depositDemand: vi.fn(),
            withdrawDemand: vi.fn(),
            createTimeDeposit: vi.fn(),
            claimTimeDeposit: vi.fn(),
            cancelTimeDeposit: vi.fn(),
            isLoading: false,
        });
        useWorldExchangeMock.mockReturnValue({
            exchangeLogs: [{
                id: 'log-1',
                sold_wood: 5,
                sold_stone: 2,
                sold_crystal: 1,
                stars_earned: 3,
                created_at: '2026-03-13T08:00:00.000Z',
            }],
            exchangeResources: vi.fn(),
        });

        render(
            <QueryClientProvider client={queryClient}>
                <ChildWorldShopStreet userId="child-1" starBalance={100} />
            </QueryClientProvider>,
        );

        expect(screen.getByText('🌲 木材：20')).toBeInTheDocument();
        expect(screen.getByText('🪨 石材：10')).toBeInTheDocument();
        expect(screen.getByText('💎 晶礦：5')).toBeInTheDocument();
        expect(screen.getByText('🧾 最近兌換紀錄')).toBeInTheDocument();
        expect(screen.getByText('+3 ⭐')).toBeInTheDocument();
        expect(screen.getByText('🏦 世界銀行')).toBeInTheDocument();
    });
});