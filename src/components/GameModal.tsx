import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Clock, Play, PauseCircle } from 'lucide-react';
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
    onSpendStars: () => Promise<boolean>;
    onRefreshBalance: () => void;
    mode?: 'play' | 'practice'; // New prop
    practiceRewardStars?: number;
    onPracticeComplete?: (stars: number) => Promise<void> | void;
}

type GamePhase = 'confirm' | 'playing' | 'paused' | 'timeup' | 'insufficient';

// Helper Components (Extracted to prevent re-mounting)
const btnBase = "px-6 py-3 font-pixel text-sm rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1";
const btnPrimary = "clay-btn w-full sm:w-auto";
const btnSecondary = "clay-btn-secondary w-full sm:w-auto";
const btnGreen = "bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none";

const TopHUD = ({
    gameName,
    timeRemaining,
    progressPercent,
    onPauseGame
}: {
    gameName: string;
    timeRemaining: number;
    progressPercent: number;
    onPauseGame: () => void;
}) => {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
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
                        className={`h-full transition-all duration-1000 ${timeRemaining <= 30 ? 'bg-red-500' : 'bg-yellow-400'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <button
                onClick={onPauseGame}
                className="group p-2 hover:bg-yellow-50 rounded-xl transition-colors flex items-center gap-2 text-gray-400 hover:text-yellow-600"
            >
                <span className="font-pixel text-xs hidden sm:inline group-hover:opacity-100 opacity-0 transition-opacity">暫停</span>
                <PauseCircle size={24} />
            </button>
        </div>
    );
};

const PausedOverlay = ({
    onResume,
    onEndGame
}: {
    onResume: () => void;
    onEndGame: () => void;
}) => {
    return (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="text-center p-6 clay-card max-w-md w-full mx-4 animate-bounce-in bg-white">
                <div className="text-6xl mb-3">⏸️</div>
                <h3 className="font-pixel text-2xl mb-2" style={{ color: 'var(--color-text)' }}>已暫停</h3>
                <p className="mb-6 font-pixel text-sm" style={{ color: 'var(--color-text-light)' }}>可以繼續練習，或結束本次遊戲</p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={onEndGame} className={`${btnBase} ${btnSecondary} w-full sm:w-auto`}>
                        <div className="flex items-center justify-center gap-2">
                            <X size={18} />
                            <span>結束</span>
                        </div>
                    </button>
                    <button onClick={onResume} className={`${btnBase} ${btnGreen} w-full sm:w-auto`}>
                        <div className="flex items-center justify-center gap-2 px-2">
                            <Play size={18} fill="currentColor" />
                            <span>繼續</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TimeUpOverlay = ({
    starBalance,
    onEndGame,
    onStartGame,
    isProcessing
}: {
    starBalance: number;
    onEndGame: () => void;
    onStartGame: () => void;
    isProcessing: boolean;
}) => {
    return (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center animate-fade-in">
            <div className="text-center p-8 clay-card max-w-lg w-full mx-4 animate-bounce-in bg-white">
                <div className="relative inline-block mb-4">
                    <div className="text-8xl animate-bounce">⏰</div>
                </div>

                <h3 className="font-pixel text-3xl mb-2" style={{ color: 'var(--color-text)' }}>時間到囉！</h3>
                <p className="mb-8 font-pixel text-sm" style={{ color: 'var(--color-text-light)' }}>玩得開心嗎？休息一下還是繼續挑戰？</p>

                <div className="bg-white/50 rounded-3xl p-6 mb-8 border-4 border-indigo-100 shadow-inner">
                    <div className="text-sm mb-2 font-bold" style={{ color: 'var(--color-text-light)' }}>再玩 3 分鐘只需要</div>
                    <div className="flex items-center justify-center gap-2">
                        <Star className="text-yellow-500" fill="currentColor" size={32} />
                        <span className="font-pixel text-4xl" style={{ color: 'var(--color-text)' }}>{GAME_COST}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-100 flex justify-between px-4 text-sm">
                        <span style={{ color: 'var(--color-text-muted)' }}>目前餘額</span>
                        <span className="font-pixel text-yellow-600">{starBalance} ⭐</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={onEndGame} className={`${btnBase} ${btnSecondary} w-full sm:w-auto`}>
                        <div className="flex items-center justify-center gap-2">
                            <X size={20} />
                            <span>結束休息</span>
                        </div>
                    </button>

                    {starBalance >= GAME_COST ? (
                        <button onClick={onStartGame} disabled={isProcessing} className={`${btnBase} ${btnGreen} w-full sm:w-auto`}>
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
};

export const GameModal: React.FC<GameModalProps> = ({
    isOpen,
    onClose,
    gameUrl,
    gameName,

    // gameId and userId are unused in this component but passed in props
    starBalance,
    onSpendStars,
    onRefreshBalance,
    mode = 'play',
    practiceRewardStars = 0,
    onPracticeComplete
}) => {
    const [phase, setPhase] = useState<GamePhase>('confirm');
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION_SECONDS);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const hasInitialized = useRef(false);
    const endTimeRef = useRef<number>(0);
    const starBalanceRef = useRef(starBalance);
    const practiceRewardHandledRef = useRef(false);
    const [showRewardFx, setShowRewardFx] = useState(false);

    const playPracticeRewardSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return;

            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.2);
            });

            setTimeout(() => {
                ctx.close().catch(() => undefined);
            }, 800);
        } catch (error) {
            console.warn('Practice reward sound blocked:', error);
        }
    };

    // Keep ref in sync
    useEffect(() => {
        starBalanceRef.current = starBalance;
    }, [starBalance]);

    // 1. Body Scroll Lock & Phase Reset (Logic Cleanup Fix)
    // Removed starBalance from dependencies to prevent unintended timer cleanup on balance updates
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (!hasInitialized.current) {
                hasInitialized.current = true;
                setTimeRemaining(GAME_DURATION_SECONDS);
                practiceRewardHandledRef.current = false;

                if (mode === 'practice') {
                    setPhase('confirm'); // Go to confirm screen, but with different UI
                } else {
                    setPhase(starBalanceRef.current < GAME_COST ? 'insufficient' : 'confirm');
                }
            }
        } else {
            document.body.style.overflow = 'unset';
            hasInitialized.current = false;
            setPhase('confirm');
            if (timerRef.current) {
                console.log('[GameModal] Closing modal, clearing timer');
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            document.body.style.overflow = 'unset';
            if (timerRef.current) {
                console.log('[GameModal] Unmounting, clearing timer');
                clearInterval(timerRef.current);
            }
        };
    }, [isOpen, mode]);

    // 2. Focus Management
    useEffect(() => {
        if (phase === 'playing' && iframeRef.current) {
            setTimeout(() => {
                iframeRef.current?.focus();
            }, 100);
        }
    }, [phase]);

    // 3. Timer Logic (Wall-clock)
    useEffect(() => {
        console.log('[GameModal] Timer Effect running. Phase:', phase);
        if (phase === 'playing') {
            endTimeRef.current = Date.now() + Math.max(0, timeRemaining) * 1000;
            console.log('[GameModal] Timer started. Ends at:', new Date(endTimeRef.current).toLocaleTimeString());

            timerRef.current = setInterval(() => {
                const now = Date.now();
                const msRemaining = endTimeRef.current - now;
                const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));

                setTimeRemaining(secondsRemaining);

                if (secondsRemaining <= 0) {
                    console.log('[GameModal] Time up!');
                    setPhase('timeup');
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                }
            }, 500);
        }

        return () => {
            if (timerRef.current) {
                console.log('[GameModal] Phase change/cleanup, clearing timer');
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [phase]);

    // Practice reward: every completed 3-minute learning round gives stars
    useEffect(() => {
        if (mode !== 'practice' || phase !== 'timeup' || !onPracticeComplete || practiceRewardStars <= 0 || practiceRewardHandledRef.current) {
            return;
        }

        practiceRewardHandledRef.current = true;
        setShowRewardFx(true);
        playPracticeRewardSound();
        const fxTimer = setTimeout(() => setShowRewardFx(false), 1400);
        Promise.resolve(onPracticeComplete(practiceRewardStars)).catch((error) => {
            console.error('Failed to grant practice reward:', error);
        });
        return () => clearTimeout(fxTimer);
    }, [mode, phase, onPracticeComplete, practiceRewardStars]);

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

    const handlePauseGame = () => {
        setPhase('paused');
    };

    const handleResumeGame = () => {
        setPhase('playing');
    };

    const renderContent = () => {
        if (phase === 'playing' || phase === 'paused' || phase === 'timeup') {
            return (
                <div className="flex flex-col h-[68dvh] sm:h-[80vh] bg-indigo-50 rounded-xl overflow-hidden relative">
                    <TopHUD
                        gameName={gameName}
                        timeRemaining={timeRemaining}
                        progressPercent={progressPercent}
                        onPauseGame={handlePauseGame}
                    />

                    {phase === 'paused' && (
                        <div className="z-20 bg-amber-100 border-b-2 border-amber-300 px-3 py-2 text-center">
                            <span className="font-pixel text-xs text-amber-700">⏸ 畫面已凍結（暫停中）</span>
                        </div>
                    )}

                    {/* Game Area */}
                    <div className="flex-1 bg-gray-900 relative">
                        <iframe
                            ref={iframeRef}
                            src={gameUrl}
                            className="w-full h-full border-none"
                            title={gameName}
                            allow="fullscreen"
                            style={{
                                display: 'block',
                                pointerEvents: phase === 'playing' ? 'auto' : 'none'
                            }}
                        />
                    </div>

                    {/* Overlays */}
                    {phase === 'paused' && (
                        <PausedOverlay
                            onResume={handleResumeGame}
                            onEndGame={handleEndGame}
                        />
                    )}

                    {phase === 'timeup' && (
                        mode === 'practice' ? (
                            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center animate-fade-in">
                                <div className="text-center p-8 clay-card max-w-lg w-full mx-4 animate-bounce-in bg-white">
                                    {showRewardFx && (
                                        <>
                                            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                                                <div className="absolute left-[18%] top-[24%] text-3xl animate-bounce">⭐</div>
                                                <div className="absolute left-[50%] top-[14%] text-2xl animate-ping">✨</div>
                                                <div className="absolute right-[18%] top-[28%] text-3xl animate-bounce">🌟</div>
                                                <div className="absolute left-[32%] bottom-[24%] text-2xl animate-ping">✨</div>
                                                <div className="absolute right-[30%] bottom-[20%] text-2xl animate-bounce">⭐</div>
                                            </div>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-4 px-4 py-2 rounded-full bg-green-100 border-2 border-green-300 animate-bounce">
                                                <span className="font-pixel text-xs text-green-700">🎉 學習獎勵已發送</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="text-7xl mb-3">🎓</div>
                                    <h3 className="font-pixel text-2xl mb-2" style={{ color: 'var(--color-text)' }}>學習完成！</h3>
                                    <p className="mb-4 font-pixel text-sm" style={{ color: 'var(--color-text-light)' }}>你完成了 3 分鐘學習</p>

                                    {practiceRewardStars > 0 && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border-2 border-yellow-300 mb-6">
                                            <Star className="text-yellow-500" fill="currentColor" size={18} />
                                            <span className="font-pixel text-sm">+{practiceRewardStars} 星幣</span>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <button onClick={handleEndGame} className={`${btnBase} ${btnSecondary} w-full sm:w-auto`}>
                                            結束學習
                                        </button>
                                        <button
                                            onClick={() => {
                                                practiceRewardHandledRef.current = false;
                                                setTimeRemaining(GAME_DURATION_SECONDS);
                                                setPhase('playing');
                                            }}
                                            className={`${btnBase} ${btnGreen} w-full sm:w-auto`}
                                        >
                                            繼續學習
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <TimeUpOverlay
                                starBalance={starBalance}
                                onEndGame={handleEndGame}
                                onStartGame={handleStartGame}
                                isProcessing={isProcessing}
                            />
                        )
                    )}

                    {/* Low Time Warning */}
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

        switch (phase) {
            case 'confirm': {
                const isPractice = mode === 'practice';

                return (
                    <div className="text-center py-6 px-4">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative text-7xl transform hover:scale-110 transition-transform duration-300 cursor-pointer">
                                🎮
                            </div>
                        </div>

                        <h3 className="font-pixel text-2xl mb-2" style={{ color: 'var(--pastel-indigo-text)' }}>{gameName}</h3>
                        <p className="text-sm mb-8 font-pixel" style={{ color: 'var(--color-text-light)' }}>
                            {isPractice ? '準備好開始學習了嗎？加油！' : '準備好開始挑戰了嗎？'}
                        </p>

                        {!isPractice && (
                            <>
                                <div className="bg-white/80 rounded-3xl p-6 mb-8 shadow-clay border-4 border-indigo-100 transform hover:-translate-y-1 transition-transform">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <div className="bg-yellow-400 p-3 rounded-2xl shadow-inner">
                                            <Star className="text-white" fill="currentColor" size={28} />
                                        </div>
                                        <span className="font-pixel text-4xl" style={{ color: 'var(--color-text)' }}>{GAME_COST}</span>
                                    </div>
                                    <div className="font-pixel text-sm" style={{ color: 'var(--color-text-muted)' }}>星幣 / 3分鐘</div>
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
                            </>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button onClick={handleEndGame} className={`${btnBase} ${btnSecondary}`}>
                                <span className="text-gray-500">下次再玩</span>
                            </button>
                            {isPractice ? (
                                <button
                                    onClick={() => {
                                        practiceRewardHandledRef.current = false;
                                        setTimeRemaining(GAME_DURATION_SECONDS);
                                        setPhase('playing');
                                    }}
                                    className={`${btnBase} ${btnGreen} px-8 w-48`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Play size={24} fill="currentColor" />
                                        <span className="text-lg pt-1">開始練習!</span>
                                    </div>
                                </button>
                            ) : (
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
                            )}
                        </div>
                    </div>
                );
            }

            case 'insufficient':
                return (
                    <div className="text-center py-8 px-4">
                        <div className="text-8xl mb-4 animate-float">😢</div>
                        <h3 className="font-pixel text-2xl mb-2" style={{ color: 'var(--color-danger)' }}>星幣不夠了...</h3>

                        <div className="bg-white/90 rounded-2xl p-6 shadow-clay border-2 border-red-100 mb-6 mx-auto max-w-xs">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>需要</span>
                                <span className="font-pixel text-red-500">{GAME_COST} ⭐</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>擁有</span>
                                <span className="font-pixel" style={{ color: 'var(--color-text)' }}>{starBalance} ⭐</span>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-4 border-dashed border-yellow-200 rounded-3xl p-6 mb-8">
                            <h4 className="font-bold mb-2" style={{ color: 'var(--color-cta)' }}>💡 如何獲得星幣？</h4>
                            <ul className="text-left text-sm space-y-2" style={{ color: 'var(--color-text-light)' }}>
                                <li className="flex items-center gap-3 bg-white/50 p-2 rounded-xl">
                                    <span className="text-xl">📅</span> 完成每日任務
                                </li>
                                <li className="flex items-center gap-3 bg-white/50 p-2 rounded-xl">
                                    <span className="text-xl">🧹</span> 幫忙做家事
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
            onClose={phase === 'playing' ? undefined : handleEndGame}
            title={phase === 'confirm' || phase === 'insufficient' ? (mode === 'practice' ? '📚 學習時間' : '🎮 遊戲付費') : `🎮 ${gameName}`}
        >
            {renderContent()}
        </RPGDialog>
    );
};
