import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChildWorldSummaryCard } from './ChildWorldSummaryCard';

const useWorldPersistenceMock = vi.fn();

vi.mock('../hooks/useWorldPersistence', () => ({
    useWorldPersistence: (...args: unknown[]) => useWorldPersistenceMock(...args),
}));

describe('ChildWorldSummaryCard', () => {
    it('renders world economy summary and opens shop street', () => {
        const onOpenShopStreet = vi.fn();
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

        render(<ChildWorldSummaryCard userId="child-1" onOpenShopStreet={onOpenShopStreet} />);

        expect(screen.getByRole('heading', { name: /世界經濟/i })).toBeInTheDocument();
        expect(screen.getByText('33')).toBeInTheDocument();
        expect(screen.getByText(/12\s*\/\s*7/)).toBeInTheDocument();
        expect(screen.getByText(/88\s*⭐/)).toBeInTheDocument();
        expect(screen.getByText(/Lv\.\s*4\s*\/\s*1\s*張/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /前往商店街/i }));
        expect(onOpenShopStreet).toHaveBeenCalledTimes(1);
    });
});