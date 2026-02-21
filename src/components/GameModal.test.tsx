import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameModal } from './GameModal';

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onGoHome: vi.fn(),
    gameUrl: '/games/2048_cyber.html',
    gameName: '2048 Cyber',
    gameId: '2048_cyber',
    userId: 'test-user',
    starBalance: 100,
    onSpendStars: vi.fn(async () => true),
    onRefreshBalance: vi.fn(),
    mode: 'practice' as const,
    practiceRewardStars: 10,
    onPracticeComplete: vi.fn(),
};

describe('GameModal', () => {
    let historyBackSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    });

    afterEach(() => {
        historyBackSpy.mockRestore();
    });

    it('enters immersive mode after starting practice', async () => {
        render(<GameModal {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /開始練習/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '回首頁' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
        });
    });

    it('go-home triggers onClose and onGoHome only once even if tapped repeatedly', async () => {
        render(<GameModal {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /開始練習/i }));

        const homeBtn = await screen.findByRole('button', { name: '回首頁' });
        fireEvent.click(homeBtn);
        fireEvent.click(homeBtn);

        window.dispatchEvent(new PopStateEvent('popstate'));

        await waitFor(() => {
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
            expect(baseProps.onGoHome).toHaveBeenCalledTimes(1);
        });
    });

    it('rapid popstate events close only once', async () => {
        render(<GameModal {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /開始練習/i }));
        await screen.findByRole('button', { name: '返回' });

        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new PopStateEvent('popstate'));

        await waitFor(() => {
            expect(baseProps.onClose).toHaveBeenCalledTimes(1);
            expect(baseProps.onGoHome).toHaveBeenCalledTimes(0);
        });
    });
});
