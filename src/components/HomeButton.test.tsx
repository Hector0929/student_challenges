/**
 * HomeButton Component Tests
 * 測試首頁按鈕的渲染和行為
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeButton } from '../components/HomeButton';

describe('HomeButton', () => {
    it('should render when show is true', () => {
        render(<HomeButton onClick={() => { }} show={true} />);

        const button = screen.getByRole('button', { name: /回到首頁/i });
        expect(button).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
        render(<HomeButton onClick={() => { }} show={false} />);

        const button = screen.queryByRole('button', { name: /回到首頁/i });
        expect(button).not.toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<HomeButton onClick={handleClick} show={true} />);

        const button = screen.getByRole('button', { name: /回到首頁/i });
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have correct accessibility attributes', () => {
        render(<HomeButton onClick={() => { }} show={true} />);

        const button = screen.getByRole('button', { name: /回到首頁/i });
        expect(button).toHaveAttribute('title', '回到首頁 (拖曳可移動位置)');
        expect(button).toHaveAttribute('aria-label', '回到首頁 (可拖曳移動)');
    });

    it('should have fixed positioning classes', () => {
        render(<HomeButton onClick={() => { }} show={true} />);

        const button = screen.getByRole('button', { name: /回到首頁/i });
        expect(button.className).toContain('fixed');
        expect(button.className).toContain('right-4');
        expect(button.className).toContain('z-40');
    });

    it('should hide when game modal is open', () => {
        document.body.dataset.gameModalOpen = 'true';
        render(<HomeButton onClick={() => { }} show={true} />);

        const button = screen.queryByRole('button', { name: /回到首頁/i });
        expect(button).not.toBeInTheDocument();

        delete document.body.dataset.gameModalOpen;
    });
});
