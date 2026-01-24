import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Clock, Play, StopCircle } from 'lucide-react';
import { RPGDialog } from './RPGDialog';
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
    gameId: _gameId,
    userId: _userId,
    starBalance,
    onSpendStars,
    onRefreshBalance
}) => {
    const [phase, setPhase] = useState<GamePhase>('confirm');
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION_SECONDS);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const hasInitialized = useRef(false);

    // 1. Body Scroll Lock & Phase Reset
    useEffect(() => {
        if (isOpen) {
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';

            if (!hasInitialized.current) {
                hasInitialized.current = true;
                setTimeRemaining(GAME_DURATION_SECONDS);
                setPhase(starBalance < GAME_COST ? 'insufficient' : 'confirm');
            }
        } else {
            // Restore background scrolling
            document.body.style.overflow = 'unset';

            hasInitialized.current = false;
            setPhase('confirm');
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOpen, starBalance]);

    // 2. Focus Management - focus iframe when playing starts
    useEffect(() => {
        if (phase === 'playing' && iframeRef.current) {
            // Include a small delay to ensure render is complete
            setTimeout(() => {
                iframeRef.current?.focus();
            }, 100);
        }
    }, [phase]);

    // 3. Timer Logic
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

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = (timeRemaining / GAME_DURATION_SECONDS) * 100;

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

    const handleEndGame = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onClose();
    };

    // Button Styles
    const btnBase = "px-6 py-3 font-pixel text-sm rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1";
    const btnPrimary = "bg-indigo-500 hover:bg-indigo-600 text-white";
    const btnSecondary = "bg-white text-indigo-900 border-2 border-indigo-100 hover:bg-indigo-50";
    const btnGreen = "bg-green-500 hover:bg-green-600 text-white";

    // Sub-components for cleaner render
    const TopHUD = () => (
        <div className="bg-white border-b-4 border-indigo-100 p-3 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                    <span className="text-2xl">🎮</span>
                </div>
                <span className="font-pixel text-indigo-900 hidden sm:inline">{gameName}</span>
            </div>

            <div className="flex items-center gap-3 bg-indigo-900 rounded-full py-2 px-4 shadow-lg transform scale-100 hover:scale-105 transition-transform">
                <Clock size={20} className={`${timeRemaining <= 30 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} />
                <div className="flex flex-col items-start w-16">
                    <span className={`font-pixel text-lg leading-none ${timeRemaining <= 30 ? 'text-red-400' : 'text-white'}`}>
                        {formatTime(timeRemaining)}
                    </span>
                </div>
                <div className="w-16 h-2 bg-indigo-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${timeRemaining <= 30 ? 'bg-red-500' : 'bg-yellow-400'
                            }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <button
                onClick={handleEndGame}
                className="group p-2 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 text-gray-400 hover:text-red-500"
            >
                <span className="font-pixel text-xs hidden sm:inline group-hover:opacity-100 opacity-0 transition-opacity">離開遊戲</span>
                <StopCircle size={24} />
            </button>
        </div>
    );

    const TimeUpOverlay = () => (
        <div className="absolute inset-0 z-50 bg-indigo-900/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border-4 border-indigo-200 max-w-lg w-full mx-4 animate-bounce-in">
                <div className="relative inline-block mb-4">
                    <div className="text-8xl animate-bounce">⏰</div>
                    <div className="absolute -bottom-2 w-full h-4 bg-black opacity-10 blur-md rounded-[100%]"></div>
                </div>

                <h3 className="font-pixel text-3xl mb-2 text-indigo-900">時間到囉！</h3>
                <p className="text-indigo-400 mb-8 font-pixel">玩得開心嗎？休息一下還是繼續挑戰？</p>

                <div className="bg-indigo-50 rounded-3xl p-6 mb-8 border-4 border-indigo-100">
                    <div className="text-sm text-indigo-400 mb-2 font-bold">再玩 3 分鐘只需要</div>
                    <div className="flex items-center justify-center gap-2">
                        <Star className="text-yellow-500" fill="currentColor" size={32} />
                        <span className="font-pixel text-4xl text-indigo-900">{GAME_COST}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-200 flex justify-between px-4 text-sm">
                        <span className="text-indigo-400">目前餘額</span>
                        <span className="font-pixel text-yellow-600">{starBalance} ⭐</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={handleEndGame} className={`${btnBase} ${btnSecondary} w-full sm:w-auto`}>
                        <div className="flex items-center justify-center gap-2">
                            <X size={20} />
                            <span>結束休息</span>
                        </div>
                    </button>

                    {starBalance >= GAME_COST ? (
                        <button onClick={handleStartGame} disabled={isProcessing} className={`${btnBase} ${btnGreen} w-full sm:w-auto`}>
                            <div className="flex items-center justify-center gap-2 px-4">
                                <Play size={20} fill="currentColor" />
                                <span className="text-lg">繼續玩 !</span>
                            </div>
                        </button>
                    ) : (
                        <button disabled className={`${btnBase} ${btnSecondary} w-full sm:w-auto opacity-50 cursor-not-allowed`}>
                            <span>餘額不足 😢</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        // Condition to render Game Area: playing OR timeup (because we want to keep iframe mounted)
        if (phase === 'playing' || phase === 'timeup') {
            return (
                <div className="flex flex-col h-[80vh] bg-indigo-50 rounded-xl overflow-hidden relative">
                    <TopHUD />

                    {/* Game Area */}
                    <div className="flex-1 bg-gray-900 relative">
                        <iframe
                            ref={iframeRef}
                            src={gameUrl}
                            className="w-full h-full border-none"
                            title={gameName}
                            allow="fullscreen"
                            // Important: disable pointer events when timeup to prevent interaction
                            style={{
                                display: 'block',
                                pointerEvents: phase === 'timeup' ? 'none' : 'auto'
                            }}
                        />
                    </div>

                    {/* Overlays */}
                    {phase === 'timeup' && <TimeUpOverlay />}

                    {/* Low Time Warning (Only when playing) */}
                    {phase === 'playing' && timeRemaining <= 10 && timeRemaining > 0 && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                            <div className="text-9xl font-pixel text-red-500 opacity-20 animate-ping">
                                {timeRemaining}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // CONFIRM & INSUFFICIENT PHASES (Standard Modal Content)
        switch (phase) {
            case 'confirm':
                return (
                    <div className="text-center py-6 px-4">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative text-7xl transform hover:scale-110 transition-transform duration-300 cursor-pointer">
                                🎮
                            </div>
                        </div>

                        <h3 className="font-pixel text-2xl mb-2 text-indigo-900">{gameName}</h3>
                        <p className="text-indigo-400 text-sm mb-8 font-pixel">準備好開始挑戰了嗎？</p>

                        <div className="bg-white rounded-3xl p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border-4 border-indigo-100 transform hover:-translate-y-1 transition-transform">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <div className="bg-yellow-400 p-2 rounded-2xl shadow-inner">
                                    <Star className="text-white" fill="currentColor" size={28} />
                                </div>
                                <span className="font-pixel text-4xl text-indigo-900">{GAME_COST}</span>
                            </div>
                            <div className="text-indigo-400 font-pixel text-sm">星幣 / 3分鐘</div>
                        </div>

                        <div className="flex justify-center gap-8 mb-8 text-sm font-bold">
                            <div className="text-center">
                                <div className="text-gray-400 text-xs mb-1">目前擁有</div>
                                <div className="font-pixel text-xl text-yellow-500">{starBalance}</div>
                            </div>
                            <div className="w-px bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-gray-400 text-xs mb-1">付費後剩餘</div>
                                <div className={`font-pixel text-xl ${starBalance - GAME_COST < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {starBalance - GAME_COST}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={handleEndGame} className={`${btnBase} ${btnSecondary}`}>
                                <span className="text-gray-500">下次再玩</span>
                            </button>
                            <button
                                onClick={handleStartGame}
                                disabled={isProcessing}
                                className={`${btnBase} ${btnPrimary} px-8 w-48`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Play size={24} fill="currentColor" />
                                    <span className="text-lg pt-1">{isProcessing ? '啟動中...' : '開始遊戲!'}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                );

            case 'insufficient':
                return (
                    <div className="text-center py-8 px-4">
                        <div className="text-8xl mb-4 grayscale opacity-80">😢</div>
                        <h3 className="font-pixel text-2xl mb-2 text-red-500">星幣不夠了...</h3>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-red-100 mb-6 mx-auto max-w-xs">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-sm">需要</span>
                                <span className="font-pixel text-red-500">{GAME_COST} ⭐</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">擁有</span>
                                <span className="font-pixel text-gray-900">{starBalance} ⭐</span>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl p-4 mb-8">
                            <h4 className="font-bold text-yellow-800 mb-2">💡 如何獲得星幣？</h4>
                            <ul className="text-left text-sm text-yellow-700 space-y-2">
                                <li className="flex items-center gap-2">
                                    <span className="text-lg">📅</span> 完成每日任務
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-lg">🧹</span> 幫忙做家事
                                </li>
                            </ul>
                        </div>

                        <button onClick={handleEndGame} className={`${btnBase} ${btnPrimary} w-full`}>
                            我知道了，去解任務！
                        </button>
                    </div>
                );
        }
    };

    return (
        <RPGDialog
            isOpen={isOpen}
            onClose={phase === 'playing' || phase === 'timeup' ? undefined : handleEndGame}
            title={phase === 'confirm' || phase === 'insufficient' ? '🎮 遊戲付費' : `🎮 ${gameName}`}
        >
            {renderContent()}
        </RPGDialog>
    );
};
