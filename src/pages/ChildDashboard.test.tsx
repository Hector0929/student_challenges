import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestWrapper } from '../test/TestWrapper';
import { ChildDashboard } from './ChildDashboard';

const useQuestsMock = vi.fn();
const useDailyLogsMock = vi.fn();
const useDailyProgressMock = vi.fn();
const useCompleteQuestMock = vi.fn();
const useCreateQuestMock = vi.fn();
const useStarBalanceMock = vi.fn();
const useFamilySettingsMock = vi.fn();
const useUserMock = vi.fn();
const useWorldPersistenceMock = vi.fn();

vi.mock('../components/ChildDashboardWidgets', () => ({
    ParentsMessageCard: () => <div>Parents Message Widget</div>,
    ExchangeRateCard: () => <div>Exchange Rate Widget</div>,
}));

vi.mock('../components/ExchangeRequestDialog', () => ({
    ExchangeRequestDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Exchange Request Dialog</div> : null,
}));

vi.mock('../components/MonsterTowerV2', () => ({
    MonsterTowerV2: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Monster Tower Modal</div> : null,
    TowerV2Preview: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Open Tower Preview</button>,
}));

vi.mock('../components/QuestCard', () => ({
    QuestCard: () => <div>Quest Card</div>,
}));

vi.mock('../components/ProgressBar', () => ({
    ProgressBar: ({ current, total }: { current: number; total: number }) => <div>{current}/{total}</div>,
}));

vi.mock('../components/RPGDialog', () => ({
    RPGDialog: ({ isOpen, children, footer, title }: { isOpen: boolean; children?: React.ReactNode; footer?: React.ReactNode; title: string }) => isOpen ? <div><div>{title}</div>{children}{footer}</div> : null,
}));

vi.mock('../components/RPGButton', () => ({
    RPGButton: ({ children, onClick, type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) => (
        <button type={type} onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));

vi.mock('../components/RewardTime', () => ({
    RewardTime: () => <div>Reward Time</div>,
}));

vi.mock('../components/LearningArea', () => ({
    LearningArea: () => <div>Learning Area</div>,
}));

vi.mock('../components/World3D', () => ({
    World3D: () => <div>World 3D Preview</div>,
}));

vi.mock('../components/ChildMonsterShop', () => ({
    ChildMonsterShop: () => <div>Monster Shop Content</div>,
}));

vi.mock('../components/ChildWorldShopStreet', () => ({
    ChildWorldShopStreet: () => <div>World Shop Street Content</div>,
}));

vi.mock('../hooks/useGameWindowController', () => ({
    useGameWindowController: ({ onClose, onGoHome }: { onClose: () => void; onGoHome?: () => void }) => ({
        handleEndGame: onClose,
        handleGoHome: () => onGoHome?.(),
    }),
}));

vi.mock('../hooks/useQuests', () => ({
    useQuests: () => useQuestsMock(),
    useDailyLogs: (...args: unknown[]) => useDailyLogsMock(...args),
    useDailyProgress: (...args: unknown[]) => useDailyProgressMock(...args),
    useCompleteQuest: () => useCompleteQuestMock(),
    useCreateQuest: () => useCreateQuestMock(),
    useStarBalance: (...args: unknown[]) => useStarBalanceMock(...args),
}));

vi.mock('../hooks/useFamilySettings', () => ({
    useFamilySettings: () => useFamilySettingsMock(),
}));

vi.mock('../contexts/UserContext', () => ({
    useUser: () => useUserMock(),
}));

vi.mock('../hooks/useWorldPersistence', () => ({
    useWorldPersistence: (...args: unknown[]) => useWorldPersistenceMock(...args),
}));

describe('ChildDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useQuestsMock.mockReturnValue({ data: [], isLoading: false });
        useDailyLogsMock.mockReturnValue({ data: [], isLoading: false });
        useDailyProgressMock.mockReturnValue({ completed_quests: 0, total_quests: 0, earned_points: 0 });
        useCompleteQuestMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
        useCreateQuestMock.mockReturnValue({ mutateAsync: vi.fn() });
        useStarBalanceMock.mockReturnValue({ data: 120 });
        useFamilySettingsMock.mockReturnValue({
            data: {
                exchange_rate_enabled: false,
                star_to_twd_rate: 10,
            },
        });
        useUserMock.mockReturnValue({
            user: { name: '小玩家', family_id: 'family-1' },
            session: { user: { id: 'parent-1' } },
        });
        useWorldPersistenceMock.mockReturnValue({
            isLoading: false,
            data: {
                worldLab: {
                    islandLevel: 4,
                    heroLevel: 2,
                    heroPower: 150,
                    monsterShards: 0,
                    timeOfDay: 'day',
                    buildings: { forest: 2, mine: 2, academy: 1, market: 1 },
                    resources: { wood: 33, stone: 12, crystal: 7 },
                    lastTickAt: Date.now(),
                },
                demandDepositAccount: {
                    balance: 88,
                    lastInterestAt: '2026-03-13T00:00:00.000Z',
                },
                timeDeposits: [{ principal: 50 }],
            },
        });
    });

    it('opens monster shop from the widget button and world shop from the summary card', () => {
        render(
            <TestWrapper>
                <ChildDashboard userId="child-1" />
            </TestWrapper>,
        );

        fireEvent.click(screen.getByRole('button', { name: /^商店街$/i }));
        expect(screen.getByText('怪獸商店街')).toBeInTheDocument();
        expect(screen.getByText('Monster Shop Content')).toBeInTheDocument();
        expect(screen.queryByText('World Shop Street Content')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /返回/i }));
        expect(screen.queryByText('Monster Shop Content')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /前往商店街/i }));
        expect(screen.getByText('世界商店街')).toBeInTheDocument();
        expect(screen.getByText('World Shop Street Content')).toBeInTheDocument();
        expect(screen.queryByText('Monster Shop Content')).not.toBeInTheDocument();
    });
});