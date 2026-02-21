import { useCallback, useEffect, useRef } from 'react';

interface UseGameWindowControllerParams {
    isOpen: boolean;
    isImmersivePhase: boolean;
    onClose: () => void;
    onGoHome?: () => void;
    clearTimer?: () => void;
}

export const useGameWindowController = ({
    isOpen,
    isImmersivePhase,
    onClose,
    onGoHome,
    clearTimer,
}: UseGameWindowControllerParams) => {
    const historyPushedRef = useRef(false);
    const closingFromPopStateRef = useRef(false);
    const isClosingRef = useRef(false);
    const lastPopStateAtRef = useRef(0);
    const pendingGoHomeRef = useRef(false);

    const onCloseRef = useRef(onClose);
    const onGoHomeRef = useRef(onGoHome);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        onGoHomeRef.current = onGoHome;
    }, [onGoHome]);

    const resetGuards = useCallback(() => {
        historyPushedRef.current = false;
        closingFromPopStateRef.current = false;
        isClosingRef.current = false;
        lastPopStateAtRef.current = 0;
        pendingGoHomeRef.current = false;
    }, []);

    const finishClose = useCallback(() => {
        historyPushedRef.current = false;
        closingFromPopStateRef.current = false;

        onCloseRef.current();

        if (pendingGoHomeRef.current) {
            pendingGoHomeRef.current = false;
            onGoHomeRef.current?.();
        }
    }, []);

    const handleEndGame = useCallback(() => {
        if (isClosingRef.current) {
            return;
        }

        isClosingRef.current = true;
        clearTimer?.();

        // Consume pushed history first so hardware back closes game window.
        if (historyPushedRef.current && !closingFromPopStateRef.current) {
            window.history.back();
            isClosingRef.current = false;
            return;
        }

        finishClose();
    }, [clearTimer, finishClose]);

    const handleGoHome = useCallback(() => {
        if (isClosingRef.current) return;
        pendingGoHomeRef.current = true;
        handleEndGame();
    }, [handleEndGame]);

    // Reset guards when modal fully closes.
    useEffect(() => {
        if (!isOpen) {
            resetGuards();
        }
    }, [isOpen, resetGuards]);

    // Mobile back button support for immersive phases.
    useEffect(() => {
        if (!isOpen || !isImmersivePhase) return;

        if (!historyPushedRef.current) {
            window.history.pushState(
                { ...(window.history.state || {}), __gameModal: true },
                ''
            );
            historyPushedRef.current = true;
        }

        const handlePopState = () => {
            const now = Date.now();
            if (now - lastPopStateAtRef.current < 400) return;
            lastPopStateAtRef.current = now;

            if (!historyPushedRef.current || isClosingRef.current) return;

            closingFromPopStateRef.current = true;
            historyPushedRef.current = false;
            handleEndGame();
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, isImmersivePhase, handleEndGame]);

    return {
        handleEndGame,
        handleGoHome,
        resetGuards,
    };
};
