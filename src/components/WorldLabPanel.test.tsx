import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorldLabPanel } from './WorldLabPanel';

vi.mock('./World3D', () => ({
    World3D: () => <div data-testid="world-3d">mock-world-3d</div>,
}));

describe('WorldLabPanel', () => {
    const baseProps = {
        worldLab: {
            islandLevel: 5,
            heroLevel: 3,
            heroPower: 180,
            monsterShards: 4,
            timeOfDay: 'day' as const,
            buildings: { forest: 2, mine: 2, academy: 1, market: 1 },
            resources: { wood: 25, stone: 10, crystal: 5 },
            lastTickAt: Date.now(),
        },
        worldRates: { woodPerHour: 8, stonePerHour: 4, crystalPerHour: 1 },
        plotPreviews: [
            { key: 'forest', label: '森林地塊', unlockAt: 2, status: '伐木 Lv.2' },
            { key: 'adventure', label: '冒險地塊', unlockAt: 7, status: '角色 Lv.3 可派遣' },
        ],
        selectedPlotKey: 'forest-0',
        selectedPlot: {
            key: 'forest-0',
            label: '森林地塊',
            unlockAt: 2,
            status: '伐木 Lv.2',
            description: '提供木材。',
            workerCount: 2,
            routeText: '森林 → 主島',
            resourceText: '木材 +8/h',
        },
        isPlotUnlocked: (plotType: string) => plotType === 'forest',
        isSelectedPlotUnlocked: true,
        onSelectPlot: vi.fn(),
        onSetTimeOfDay: vi.fn(),
        selectedMissionType: 'short' as const,
        onSelectMissionType: vi.fn(),
        activeAdventure: null,
        activeAdventureStatus: 'idle' as const,
        activeAdventureRemainingMs: 0,
        lastAdventureResult: null,
        formatDuration: () => '00m 00s',
        onStartAdventure: vi.fn(),
        onFastForwardAdventure: vi.fn(),
        onClaimAdventure: vi.fn(),
        onApplyProduction: vi.fn(),
        onSyncProduction: vi.fn(),
        exchangePriceTable: { wood: 0.025, stone: 0.04, crystal: 0.14 },
        onPreviewExchange: (selectedResources: { wood: number; stone: number; crystal: number }) => ({
            soldResources: selectedResources,
            remainingResources: {
                wood: 25 - selectedResources.wood,
                stone: 10 - selectedResources.stone,
                crystal: 5 - selectedResources.crystal,
            },
            basePrices: { wood: 0.025, stone: 0.04, crystal: 0.14 },
            finalUnitPrices: { wood: 0.027, stone: 0.0432, crystal: 0.1512 },
            marketMultiplier: 1.08,
            starsEarned: selectedResources.wood > 0 ? 1 : 0,
        }),
        onExchangeResourcesToStars: vi.fn(),
        starBalance: 500,
        bankNowIso: '2026-03-13T00:00:00.000Z',
        bankSettings: {
            demandDailyRate: 0.002,
            timeDepositDailyRate: 0.01,
            minTimeDepositDays: 7,
            earlyWithdrawPenaltyRate: 0.05,
        },
        demandDepositAccount: {
            balance: 120,
            lastInterestAt: '2026-03-10T00:00:00.000Z',
        },
        timeDeposits: [],
        onDepositDemand: vi.fn(),
        onWithdrawDemand: vi.fn(),
        onSettleDemandInterest: vi.fn(),
        onCreateTimeDeposit: vi.fn(),
        onClaimTimeDeposit: vi.fn(),
        onCancelTimeDeposit: vi.fn(),
        onAdvanceBankDays: vi.fn(),
        onUpgradeBuilding: vi.fn(),
        exchangeLogs: [],
        worldPlanChecklist: [{ id: 'P1-1', title: '建立資料表', phase: 'Phase A' }],
        persistenceStatus: { isLoading: false, isSaving: false, error: null },
    };

    it('selects unlocked plot cards but ignores locked ones', () => {
        render(<WorldLabPanel {...baseProps} />);

        fireEvent.click(screen.getAllByText('森林地塊')[0]);
        fireEvent.click(screen.getByText('角色 Lv.3 可派遣'));

        expect(baseProps.onSelectPlot).toHaveBeenCalledTimes(1);
        expect(baseProps.onSelectPlot).toHaveBeenCalledWith('forest-0');
    });

    it('switches time of day and shows sync state', () => {
        render(<WorldLabPanel {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: '☀️ 白天' }));

        expect(baseProps.onSetTimeOfDay).toHaveBeenCalledWith('day');
        expect(screen.getByText('雲端已同步')).toBeInTheDocument();
        expect(screen.getByTestId('world-3d')).toBeInTheDocument();
    });

    it('renders exchange panel in production section', () => {
        render(<WorldLabPanel {...baseProps} />);

        expect(screen.getByText('🏪 兌換店')).toBeInTheDocument();
        expect(screen.getByLabelText('木材賣出數量')).toBeInTheDocument();
        expect(screen.getByText('🏦 銀行')).toBeInTheDocument();
        expect(screen.getByText('目前還沒有兌換紀錄')).toBeInTheDocument();
    });

    it('renders recent exchange logs when provided', () => {
        render(
            <WorldLabPanel
                {...baseProps}
                exchangeLogs={[
                    {
                        id: 'log-1',
                        user_id: 'user-1',
                        sold_wood: 10,
                        sold_stone: 5,
                        sold_crystal: 2,
                        market_level: 1,
                        market_multiplier: 1.08,
                        base_wood_rate: 0.025,
                        base_stone_rate: 0.04,
                        base_crystal_rate: 0.14,
                        stars_earned: 3,
                        created_at: '2026-03-13T08:00:00.000Z',
                    },
                ]}
            />
        );

        expect(screen.getByText('🧾 最近兌換紀錄')).toBeInTheDocument();
        expect(screen.getByText('+3 ⭐')).toBeInTheDocument();
        expect(screen.getByText('賣出：🌲 10 / 🪨 5 / 💎 2')).toBeInTheDocument();
    });
});