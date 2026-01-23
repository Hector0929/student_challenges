import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Clock, Play, StopCircle } from 'lucide-react';
import { RPGDialog } from './RPGDialog';
import { RPGButton } from './RPGButton';
import { GAME_COST, GAME_DURATION_SECONDS } from '../lib/constants';

interface GameModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUrl: string;
    gameName: string;
    gameId: string;
    userId: string;
    starBalance: number;
    onSpendStars: () => Promise<boolean>;  // Returns true if successful
    onRefreshBalance: () => void;
}

type GamePhase = 'confirm' | 'playing' | 'timeup' | 'insufficient';

export const GameModal: React.FC<GameModalProps> = ({
    isOpen,
    onClose,
    gameUrl,
    gameName,
    gameId: _gameId,  // Prefixed to acknowledge intentionally unused
    userId: _userId,  // Prefixed to acknowledge intentionally unused
    starBalance,
    onSpendStars,
    onRefreshBalance
}) => {
    const [phase, setPhase] = useState<GamePhase>('confirm');
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION_SECONDS);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const hasInitialized = useRef(false);  // Track if we've initialized for this session

    // Reset state ONLY when modal opens (not when starBalance changes)
    useEffect(() => {
        if (isOpen && !hasInitialized.current) {
            // First time opening - initialize state
            hasInitialized.current = true;
            setTimeRemaining(GAME_DURATION_SECONDS);
            if (starBalance < GAME_COST) {
                setPhase('insufficient');
            } else {
                setPhase('confirm');
            }
        } else if (!isOpen) {
            // Modal closed - reset for next open
            hasInitialized.current = false;
            setPhase('confirm');
            // Clear timer when modal closes
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isOpen, starBalance]);

    // Timer countdown
    useEffect(() => {
        if (phase === 'playing' && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        setPhase('timeup');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [phase, timeRemaining]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const progressPercent = (timeRemaining / GAME_DURATION_SECONDS) * 100;

    // Handle starting/continuing the game
    const handleStartGame = async () => {
        if (starBalance < GAME_COST) {
            setPhase('insufficient');
            return;
        }

        setIsProcessing(true);
        try {
            const success = await onSpendStars();
            if (success) {
                setTimeRemaining(GAME_DURATION_SECONDS);
                setPhase('playing');
                onRefreshBalance();
            } else {
                setPhase('insufficient');
            }
        } catch (error) {
            console.error('Failed to spend stars:', error);
            alert('扣除星幣失敗，請重試');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle ending the game
    const handleEndGame = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onClose();
    };

    // Render based on phase
    const renderContent = () => {
        switch (phase) {
            case 'confirm':
                return (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎮</div>
                        <h3 className="font-pixel text-lg mb-4">{gameName}</h3>
                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6 inline-block">
                            <div className="flex items-center gap-2 justify-center text-yellow-700">
                                <Star className="text-yellow-500" fill="currentColor" size={24} />
                                <span className="font-pixel text-xl">{GAME_COST}</span>
                                <span className="text-sm">星幣 / 3分鐘</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-6">
                            <p>目前餘額: <span className="font-pixel text-yellow-600">{starBalance}</span> ⭐</p>
                            <p className="mt-2">付費後剩餘: <span className="font-pixel text-green-600">{starBalance - GAME_COST}</span> ⭐</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <RPGButton variant="secondary" onClick={handleEndGame}>
                                取消
                            </RPGButton>
                            <RPGButton onClick={handleStartGame} disabled={isProcessing}>
                                <div className="flex items-center gap-2">
                                    <Play size={16} />
                                    <span>{isProcessing ? '處理中...' : '開始遊戲'}</span>
                                </div>
                            </RPGButton>
                        </div>
                    </div>
                );

            case 'playing':
                return (
                    <>
                        {/* Game container with side timer */}
                        <div className="flex gap-3">
                            {/* Game iframe */}
                            <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '65vh' }}>
                                <iframe
                                    ref={iframeRef}
                                    src={gameUrl}
                                    className="w-full h-full border-none"
                                    title={gameName}
                                    allow="fullscreen"
                                    scrolling="no"
                                    style={{
                                        overflow: 'hidden',
                                        display: 'block',
                                    }}
                                />
                            </div>

                            {/* Vertical Timer bar on the side */}
                            <div className="flex flex-col items-center justify-between bg-gray-100 border-2 border-deep-black rounded-lg p-2 w-16">
                                {/* Time display */}
                                <div className="text-center">
                                    <Clock size={20} className={`mx-auto mb-1 ${timeRemaining <= 30 ? 'text-red-500' : 'text-blue-500'}`} />
                                    <span className={`font-pixel text-sm block ${timeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                                        {formatTime(timeRemaining)}
                                    </span>
                                </div>

                                {/* Vertical progress bar */}
                                <div className="flex-1 w-4 bg-gray-300 rounded-full border border-gray-400 overflow-hidden my-2 relative">
                                    <div
                                        className={`w-full absolute bottom-0 transition-all duration-1000 ${timeRemaining <= 30
                                                ? 'bg-gradient-to-t from-red-600 to-red-400'
                                                : 'bg-gradient-to-t from-blue-600 to-blue-400'
                                            }`}
                                        style={{ height: `${progressPercent}%` }}
                                    />
                                </div>

                                {/* End button */}
                                <button
                                    onClick={handleEndGame}
                                    className="p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded hover:bg-gray-300 transition-colors"
                                    title="提前結束"
                                >
                                    <StopCircle size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                );

            case 'timeup':
                return (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">⏰</div>
                        <h3 className="font-pixel text-xl mb-2 text-orange-600">時間到！</h3>
                        <p className="text-gray-600 mb-6">想要繼續玩嗎？</p>

                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6 inline-block">
                            <div className="flex items-center gap-2 justify-center text-yellow-700">
                                <span className="text-sm">再玩 3 分鐘</span>
                                <Star className="text-yellow-500" fill="currentColor" size={20} />
                                <span className="font-pixel text-lg">{GAME_COST}</span>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-6">
                            <p>目前餘額: <span className="font-pixel text-yellow-600">{starBalance}</span> ⭐</p>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <RPGButton variant="secondary" onClick={handleEndGame}>
                                <div className="flex items-center gap-2">
                                    <X size={16} />
                                    <span>結束遊戲</span>
                                </div>
                            </RPGButton>
                            {starBalance >= GAME_COST && (
                                <RPGButton onClick={handleStartGame} disabled={isProcessing}>
                                    <div className="flex items-center gap-2">
                                        <Star size={16} />
                                        <span>{isProcessing ? '處理中...' : `繼續 (${GAME_COST}⭐)`}</span>
                                    </div>
                                </RPGButton>
                            )}
                        </div>
                    </div>
                );

            case 'insufficient':
                return (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">😢</div>
                        <h3 className="font-pixel text-lg mb-2 text-red-600">星幣不足</h3>
                        <p className="text-gray-600 mb-4">
                            玩遊戲需要 <span className="font-pixel text-yellow-600">{GAME_COST}</span> ⭐
                        </p>
                        <p className="text-gray-600 mb-6">
                            目前餘額: <span className="font-pixel text-red-500">{starBalance}</span> ⭐
                        </p>
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                            <p className="text-blue-700 text-sm">
                                💡 完成任務可以獲得更多星幣喔！
                            </p>
                        </div>
                        <RPGButton onClick={handleEndGame}>
                            知道了
                        </RPGButton>
                    </div>
                );
        }
    };

    return (
        <RPGDialog
            isOpen={isOpen}
            onClose={phase === 'playing' ? undefined : handleEndGame}
            title={phase === 'playing' ? `🎮 ${gameName}` : '🎮 遊戲付費'}
        >
            {renderContent()}
        </RPGDialog>
    );
};
