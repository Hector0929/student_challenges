import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameWindowController } from './useGameWindowController';

describe('useGameWindowController', () => {
    let onClose: ReturnType<typeof vi.fn>;
    let onGoHome: ReturnType<typeof vi.fn>;
    let clearTimer: ReturnType<typeof vi.fn>;
    let historyBackSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        onClose = vi.fn();
        onGoHome = vi.fn();
        clearTimer = vi.fn();

        historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    });

    afterEach(() => {
        historyBackSpy.mockRestore();
    });

    it('consumes history then closes when handleEndGame is called', () => {
        const { result } = renderHook(() =>
            useGameWindowController({
                isOpen: true,
                isImmersivePhase: true,
                onClose,
                onGoHome,
                clearTimer,
            })
        );

        act(() => {
            result.current.handleEndGame();
        });

        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(clearTimer).toHaveBeenCalledTimes(2);
        expect(historyBackSpy).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onGoHome).toHaveBeenCalledTimes(0);
    });

    it('dispatches go-home only after close', () => {
        const { result } = renderHook(() =>
            useGameWindowController({
                isOpen: true,
                isImmersivePhase: true,
                onClose,
                onGoHome,
                clearTimer,
            })
        );

        act(() => {
            result.current.handleGoHome();
        });

        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onGoHome).toHaveBeenCalledTimes(1);
        expect(clearTimer).toHaveBeenCalledTimes(2);
    });

    it('ignores rapid repeated popstate events', () => {
        renderHook(() =>
            useGameWindowController({
                isOpen: true,
                isImmersivePhase: true,
                onClose,
                onGoHome,
                clearTimer,
            })
        );

        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
