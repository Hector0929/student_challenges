import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShopModal } from './ShopModal';

vi.mock('./ChildMonsterShop', () => ({
    ChildMonsterShop: () => <div>Monster Shop Content</div>,
}));

vi.mock('./StarBank', () => ({
    StarBank: () => <div>Star Bank Content</div>,
}));

vi.mock('../hooks/useGameWindowController', () => ({
    useGameWindowController: ({ onClose, onGoHome }: { onClose: () => void; onGoHome?: () => void }) => ({
        handleEndGame: onClose,
        handleGoHome: () => onGoHome?.(),
    }),
}));

describe('ShopModal', () => {
    it('shows only the monster shop by default', () => {
        render(<ShopModal isOpen onClose={vi.fn()} onGoHome={vi.fn()} userId="child-1" starBalance={123} />);

        expect(screen.getByText('怪獸商店街')).toBeInTheDocument();
        expect(screen.getByText('Monster Shop Content')).toBeInTheDocument();
        expect(screen.queryByText('Star Bank Content')).not.toBeInTheDocument();
    });

    it('shows only the star bank in bank mode', () => {
        render(<ShopModal isOpen onClose={vi.fn()} onGoHome={vi.fn()} userId="child-1" starBalance={123} mode="bank" />);

        expect(screen.getByText('星幣銀行')).toBeInTheDocument();
        expect(screen.getByText('Star Bank Content')).toBeInTheDocument();
        expect(screen.queryByText('Monster Shop Content')).not.toBeInTheDocument();
    });
});
