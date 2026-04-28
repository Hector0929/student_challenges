import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStorageCapacity } from '../lib/world/storage';
import { TestWrapper } from '../test/TestWrapper';
import { WorldIslandShopDrawer } from './WorldIslandShopDrawer';

const useUserMock = vi.fn();
const useFamilyExchangeRatesMock = vi.fn();
const useWorldPersistenceMock = vi.fn();
const useSaveWorldPersistenceMock = vi.fn();
const useWorldExchangeMock = vi.fn();

const insertMock = vi.fn();

vi.mock('../contexts/UserContext', () => ({
    useUser: () => useUserMock(),
}));

vi.mock('../hooks/useFamilyShopSettings', () => ({
    useFamilyExchangeRates: () => useFamilyExchangeRatesMock(),
    DEFAULT_FAMILY_EXCHANGE_RATES: {
        wood_rate: 0.025,
        stone_rate: 0.04,
        crystal_rate: 0.14,
    },
}));

vi.mock('../hooks/useWorldPersistence', () => ({
    useWorldPersistence: (...args: unknown[]) => useWorldPersistenceMock(...args),
    useSaveWorldPersistence: (...args: unknown[]) => useSaveWorldPersistenceMock(...args),
}));

vi.mock('../hooks/useWorldExchange', () => ({
    useWorldExchange: (...args: unknown[]) => useWorldExchangeMock(...args),
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: (table: string) => {
            if (table === 'star_transactions') {
                return {
                    insert: (...args: unknown[]) => insertMock(...args),
                };
            }
            return {
                insert: vi.fn(),
            };
        },
    },
}));

describe('WorldIslandShopDrawer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        insertMock.mockResolvedValue({ error: null });
        useUserMock.mockReturnValue({ user: { family_id: 'family-1' } });
        useFamilyExchangeRatesMock.mockReturnValue({ data: null });
    });

    it('keeps sold resources deducted after closing and reopening the island drawer', async () => {
        const now = Date.now();
        let persistedSnapshot = {
            worldLab: {
                islandLevel: 3,
                heroLevel: 2,
                heroPower: 80,
                monsterShards: 0,
                timeOfDay: 'day' as const,
                worldTheme: 'normal' as const,
                worldTerrain: 'grassland' as const,
                buildings: { forest: 1, mine: 1, crystal: 1, academy: 1, market: 1, storage: 1 },
                resources: { wood: 40, stone: 12, crystal: 4 },
                lastTickAt: now,
                placedDecorations: [],
            },
            activeAdventure: null,
            lastAdventureResult: null,
            bankNowMs: now,
            demandDepositAccount: {
                balance: 0,
                lastInterestAt: '2026-04-28T10:00:00.000Z',
            },
            timeDeposits: [],
        };

        useWorldPersistenceMock.mockImplementation(() => ({
            data: persistedSnapshot,
        }));

        const mutateAsync = vi.fn().mockImplementation(async (payload: typeof persistedSnapshot) => {
            persistedSnapshot = {
                ...persistedSnapshot,
                ...payload,
            };
            return true;
        });

        useSaveWorldPersistenceMock.mockReturnValue({
            mutateAsync,
            isPending: false,
        });

        useWorldExchangeMock.mockImplementation((options: {
            exchangeSelectedResourcesToStars: (selectedResources: { wood: number; stone: number; crystal: number }) => Promise<{ ok: boolean; error?: string; starsEarned?: number }>;
        }) => ({
            exchangeLogs: [],
            exchangeResources: async (selectedResources: { wood: number; stone: number; crystal: number }) => options.exchangeSelectedResourcesToStars(selectedResources),
            isLoading: false,
            isSaving: false,
            error: null,
        }));

        const firstRender = render(
            <TestWrapper>
                <WorldIslandShopDrawer
                    isOpen
                    onClose={() => {}}
                    userId="child-1"
                    starBalance={100}
                />
            </TestWrapper>,
        );

        fireEvent.click(screen.getByRole('button', { name: /資源兌換/i }));

        fireEvent.click(screen.getByRole('button', { name: '木材全部賣出' }));
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '💰 確認賣出資源' }));

        await waitFor(() => {
            expect(mutateAsync).toHaveBeenCalledTimes(1);
        });

        expect(persistedSnapshot.worldLab.resources.wood).toBe(0);

        firstRender.unmount();

        render(
            <TestWrapper>
                <WorldIslandShopDrawer
                    isOpen
                    onClose={() => {}}
                    userId="child-1"
                    starBalance={101}
                />
            </TestWrapper>,
        );

        fireEvent.click(screen.getByRole('button', { name: /資源兌換/i }));

        await waitFor(() => {
            const woodInput = screen.getByLabelText('木材賣出數量');
            const woodRow = woodInput.closest('.grid');
            expect(woodRow).not.toBeNull();
            expect(woodRow).toHaveTextContent('持有 0 ｜單價 0.025 ⭐');
            expect(woodInput).toHaveValue('');
        });
    });

    it('updates storage capacity immediately after upgrading storage building', async () => {
        const now = Date.now();
        let persistedSnapshot = {
            worldLab: {
                islandLevel: 3,
                heroLevel: 2,
                heroPower: 80,
                monsterShards: 0,
                timeOfDay: 'day' as const,
                worldTheme: 'normal' as const,
                worldTerrain: 'grassland' as const,
                buildings: { forest: 1, mine: 1, crystal: 1, academy: 1, market: 1, storage: 1 },
                resources: { wood: 40, stone: 12, crystal: 4 },
                lastTickAt: now,
                placedDecorations: [],
            },
            activeAdventure: null,
            lastAdventureResult: null,
            bankNowMs: now,
            demandDepositAccount: {
                balance: 0,
                lastInterestAt: '2026-04-28T10:00:00.000Z',
            },
            timeDeposits: [],
        };

        useWorldPersistenceMock.mockImplementation(() => ({
            data: persistedSnapshot,
        }));

        const mutateAsync = vi.fn().mockImplementation(async (payload: typeof persistedSnapshot) => {
            persistedSnapshot = {
                ...persistedSnapshot,
                ...payload,
            };
            return true;
        });

        useSaveWorldPersistenceMock.mockReturnValue({
            mutateAsync,
            isPending: false,
        });

        useWorldExchangeMock.mockReturnValue({
            exchangeLogs: [],
            exchangeResources: vi.fn(),
            isLoading: false,
            isSaving: false,
            error: null,
        });

        render(
            <TestWrapper>
                <WorldIslandShopDrawer
                    isOpen
                    onClose={() => {}}
                    userId="child-1"
                    starBalance={5000}
                />
            </TestWrapper>,
        );

        const capLv1 = getStorageCapacity(1);
        const capLv2 = getStorageCapacity(2);

        expect(screen.getByText((text) => text.includes(`上限 ${capLv1.woodCap}`))).toBeInTheDocument();

        const storageHint = screen.getByText('島 Lv.6 解鎖倉儲地塊。');
        const storageCard = storageHint.closest('.rounded-2xl');
        expect(storageCard).not.toBeNull();

        const upgradeButton = storageCard?.querySelector('button');
        expect(upgradeButton).not.toBeNull();
        fireEvent.click(upgradeButton as HTMLButtonElement);

        await waitFor(() => {
            expect(mutateAsync).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText((text) => text.includes(`上限 ${capLv2.woodCap}`))).toBeInTheDocument();
        });
    });
});