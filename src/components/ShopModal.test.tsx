import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShopModal } from './ShopModal';

vi.mock('./ChildMonsterShop', () => ({
    ChildMonsterShop: () => <div>Monster Shop Content</div>,
}));

vi.mock('./ChildWorldShopStreet', () => ({
    ChildWorldShopStreet: () => <div>World Shop Street Content</div>,
}));

vi.mock('../hooks/useGameWindowController', () => ({
    useGameWindowController: ({ onClose, onGoHome }: { onClose: () => void; onGoHome?: () => void }) => ({
        handleEndGame: onClose,
        handleGoHome: () => onGoHome?.(),
    }),
}));

describe('ShopModal', () => {
    it('switches between monster shop and world shop street tabs', () => {
        render(
            <ShopModal
                isOpen
                onClose={vi.fn()}
                onGoHome={vi.fn()}
                userId="child-1"
                starBalance={123}
            />
        );

        expect(screen.getByText('Monster Shop Content')).toBeInTheDocument();
        expect(screen.queryByText('World Shop Street Content')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /世界商店街/i }));

        expect(screen.getByText('World Shop Street Content')).toBeInTheDocument();
        expect(screen.queryByText('Monster Shop Content')).not.toBeInTheDocument();
    });
});