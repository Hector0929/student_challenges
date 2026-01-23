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

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeRemaining(GAME_DURATION_SECONDS);
            if (starBalance < GAME_COST) {
                setPhase('insufficient');
            } else {
                setPhase('confirm');
            }
        } else {
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
                        {/* Game iframe */}
                        <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ height: '60vh' }}>
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

                        {/* Timer bar */}
                        <div className="mt-4 bg-gray-100 border-2 border-deep-black rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-blue-500" />
                                    <span className="font-pixel text-sm">剩餘時間</span>
                                </div>
                                <span className={`font-pixel text-lg ${timeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-4 border border-gray-400 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${timeRemaining <= 30
                                        ? 'bg-gradient-to-r from-red-400 to-red-600'
                                        : 'bg-gradient-to-r from-blue-400 to-blue-600'
                                        }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* End game button */}
                        <div className="mt-3 text-center">
                            <button
                                onClick={handleEndGame}
                                className="px-4 py-2 bg-gray-200 text-gray-700 border-2 border-gray-400 rounded hover:bg-gray-300 transition-colors text-sm"
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    <StopCircle size={14} />
                                    <span>提前結束</span>
                                </div>
                            </button>
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
