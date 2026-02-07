/**
 * Monster Tower V2 - Polished Playable Version
 * Switchback staircase layout with smooth hop animations
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dices, Sparkles, X, ShoppingCart, ChevronUp } from 'lucide-react';
import {
    useTowerProgress,
    useTowerEvents,
    useRollDice,
    useResetTower,
    usePurchaseDice,
    useLotteryReward
} from '../hooks/useTowerProgress';
import { useStarBalance } from '../hooks/useQuests';
import { LotteryWheel } from './LotteryWheel';
import { type Prize } from '../lib/gameConfig';
import type { TowerEvent } from '../types/database';

// ============ CONSTANTS ============
const TOTAL_TILES = 100;
const TILES_PER_ROW = 5;
const TILE_SIZE = 72;
const TILE_GAP = 8;
const ROW_HEIGHT = 90;

// V2 Image Assets
const V2_ASSETS = {
    tile: '/images/tower-v2/tile.png',
    snake: '/images/tower-v2/snake.png',
    ladder: '/images/tower-v2/ladder.png',
    player: '/images/tower-v2/player.png',
};

// ============ HELPER FUNCTIONS ============

/**
 * Switchback staircase layout
 * Rows alternate left-to-right and right-to-left
 * 1-5 goes left→right, 6-10 goes right→left, etc.
 */
const getTilePosition = (tileNum: number) => {
    const rowIndex = Math.floor((tileNum - 1) / TILES_PER_ROW);
    const posInRow = (tileNum - 1) % TILES_PER_ROW;

    // Alternate direction each row
    const isLeftToRight = rowIndex % 2 === 0;
    const col = isLeftToRight ? posInRow : (TILES_PER_ROW - 1 - posInRow);

    // Calculate total rows for vertical positioning (bottom = row 0)
    const totalRows = Math.ceil(TOTAL_TILES / TILES_PER_ROW);
    const rowFromBottom = totalRows - 1 - rowIndex;

    return {
        x: col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
        y: rowFromBottom * ROW_HEIGHT + TILE_SIZE / 2,
        row: rowIndex,
        col,
    };
};

// Board dimensions
const BOARD_WIDTH = TILES_PER_ROW * (TILE_SIZE + TILE_GAP) - TILE_GAP;
const BOARD_HEIGHT = Math.ceil(TOTAL_TILES / TILES_PER_ROW) * ROW_HEIGHT + 100;

// ============ INTERFACES ============
interface MonsterTowerV2Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// ============ DICE PURCHASE MODAL ============
const DicePurchaseModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
    const [amount, setAmount] = useState(1);
    const purchaseDiceMutation = usePurchaseDice();
    const { data: starBalance = 0 } = useStarBalance(userId);
    const pricePerDice = 5;
    const totalCost = amount * pricePerDice;
    const canAfford = starBalance >= totalCost;

    const handlePurchase = async () => {
        try {
            await purchaseDiceMutation.mutateAsync({ userId, diceAmount: amount });
            onClose();
        } catch { console.error('Purchase failed'); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]" data-testid="purchase-modal">
            <div className="clay-dialog p-6 w-80 animate-bounce-in">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart size={24} /> 購買骰子
                </h3>
                <div className="mb-4 text-sm space-y-1">
                    <p>每顆骰子: <span className="font-bold">{pricePerDice} ⭐</span></p>
                    <p>你的星幣: <span className="font-bold">{starBalance} ⭐</span></p>
                </div>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <button onClick={() => setAmount(Math.max(1, amount - 1))} className="clay-btn w-12 h-12 text-2xl">−</button>
                    <span className="text-4xl font-black w-16 text-center">{amount}</span>
                    <button onClick={() => setAmount(amount + 1)} className="clay-btn w-12 h-12 text-2xl">+</button>
                </div>
                <p className="text-center mb-4 text-lg">總價: <span className="font-black text-2xl text-orange-600">{totalCost} ⭐</span></p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="clay-btn flex-1 py-3">取消</button>
                    <button
                        onClick={handlePurchase}
                        disabled={!canAfford || purchaseDiceMutation.isPending}
                        className="clay-btn clay-btn-primary flex-1 py-3 disabled:opacity-50"
                    >
                        {purchaseDiceMutation.isPending ? '購買中...' : '購買'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============ MAIN COMPONENT ============
export const MonsterTowerV2: React.FC<MonsterTowerV2Props> = ({ userId, isOpen, onClose }) => {
    const { data: progress } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();
    const lotteryRewardMutation = useLotteryReward();
    const { data: starBalance = 0 } = useStarBalance(userId);

    const boardContainerRef = useRef<HTMLDivElement>(null);

    // State
    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [displayDice, setDisplayDice] = useState(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);
    const [isHopping, setIsHopping] = useState(false);
    const [eventMessage, setEventMessage] = useState<string | null>(null);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const eventMap = useMemo(() => new Map(events.map(e => [e.floor_number, e])), [events]);

    // Scroll to keep player visible
    const scrollToFloor = useCallback((floor: number) => {
        if (!boardContainerRef.current) return;
        const pos = getTilePosition(floor);
        const containerHeight = boardContainerRef.current.clientHeight;
        const targetScroll = BOARD_HEIGHT - pos.y - containerHeight / 2;
        boardContainerRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }, []);

    // Initial scroll
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => scrollToFloor(currentFloor), 100);
        }
    }, [isOpen, currentFloor, scrollToFloor]);

    // Dice animation
    useEffect(() => {
        if (isRolling) {
            const interval = setInterval(() => setDisplayDice(Math.floor(Math.random() * 6) + 1), 80);
            return () => clearInterval(interval);
        }
    }, [isRolling]);

    // Handle dice roll with smooth hop animation
    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);
        setEventMessage(null);

        // Roll animation
        await new Promise(r => setTimeout(r, 800));

        try {
            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor });

            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            // Animate hop by hop
            const start = currentFloor;
            const intermediate = Math.min(start + result.roll, 100);

            for (let f = start + 1; f <= intermediate; f++) {
                setIsHopping(true);
                setAnimatingFloor(f);
                scrollToFloor(f);
                await new Promise(r => setTimeout(r, 350)); // Hop duration
                setIsHopping(false);
                await new Promise(r => setTimeout(r, 50)); // Brief pause
            }

            // Handle snake/ladder event
            const finalFloor = result.progress.current_floor;
            if (finalFloor !== intermediate && result.event) {
                // Show event message
                const isLadder = result.event.event_type === 'ladder';
                setEventMessage(isLadder ? '🪜 梯子！往上爬！' : '🐍 蛇！溜下去！');
                setShowEvent(result.event);

                await new Promise(r => setTimeout(r, 600));

                // Animate slide/climb (faster multi-hop)
                const direction = finalFloor > intermediate ? 1 : -1;
                const steps = Math.abs(finalFloor - intermediate);

                for (let i = 0; i < steps; i++) {
                    setIsHopping(true);
                    setAnimatingFloor(intermediate + (i + 1) * direction);
                    scrollToFloor(intermediate + (i + 1) * direction);
                    await new Promise(r => setTimeout(r, 150)); // Fast slide
                    setIsHopping(false);
                }

                await new Promise(r => setTimeout(r, 300));
                setEventMessage(null);
                setShowEvent(null);
            }

            setAnimatingFloor(null);

            // Victory check
            if (result.reachedTop) {
                setTimeout(() => setShowVictory(true), 400);
            }
        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, currentFloor, userId, rollDiceMutation, scrollToFloor]);

    // Lottery handler
    const handleLotteryComplete = useCallback(async (prize: Prize) => {
        try {
            await lotteryRewardMutation.mutateAsync({
                userId, prizeType: prize.type, prizeValue: prize.value,
                monsterId: prize.monsterId, prizeName: prize.name,
            });
        } catch (e) { console.error('Lottery failed:', e); }
        setShowLotteryWheel(false);
    }, [userId, lotteryRewardMutation]);

    // Reset handler
    const handleReset = useCallback(async () => {
        try {
            await resetTowerMutation.mutateAsync({ userId });
            setShowVictory(false);
        } catch (e) { console.error('Reset failed:', e); }
    }, [userId, resetTowerMutation]);

    if (!isOpen) return null;

    const displayFloor = animatingFloor ?? currentFloor;
    const playerPos = getTilePosition(displayFloor);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2">
            <div className="clay-dialog w-full max-w-md h-[92vh] overflow-hidden flex flex-col voxel-sky-bg shadow-2xl relative rounded-3xl">

                {/* Clouds */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="voxel-cloud w-20 h-6 top-[8%]" style={{ animationDuration: '60s' }} />
                    <div className="voxel-cloud w-28 h-8 top-[25%]" style={{ animationDuration: '45s', animationDelay: '-15s' }} />
                    <div className="voxel-cloud w-16 h-5 top-[50%]" style={{ animationDuration: '70s', animationDelay: '-30s' }} />
                    <div className="voxel-cloud w-24 h-7 top-[70%]" style={{ animationDuration: '55s', animationDelay: '-10s' }} />
                </div>

                {/* Header */}
                <div className="relative z-20 p-3 flex justify-between items-center bg-white/80 backdrop-blur-md border-b-2 border-white/30">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg flex items-center justify-center text-2xl">🏰</div>
                        <div>
                            <h2 className="font-black text-lg text-gray-800 leading-tight">怪獸塔 V2</h2>
                            <p className="text-xs font-bold text-green-600" data-testid="zone-name">Floor {displayFloor} / {TOTAL_TILES}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition" data-testid="close-tower-v2">
                        <X size={22} className="text-gray-600" />
                    </button>
                </div>

                {/* Stats */}
                <div className="relative z-20 px-4 py-2 flex justify-around items-center bg-white/60 border-b border-white/20">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🎲</span>
                        <span className="font-black text-lg" data-testid="dice-count">{diceCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <span className="font-black text-lg">{starBalance}</span>
                    </div>
                    {rollResult && (
                        <div className="flex items-center gap-2 animate-bounce" data-testid="dice-result">
                            <span className="text-xs font-bold text-orange-500 uppercase">Roll</span>
                            <span className="text-2xl font-black text-orange-600">{rollResult}</span>
                        </div>
                    )}
                </div>

                {/* Game Board */}
                <div ref={boardContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative" style={{ scrollBehavior: 'smooth' }}>
                    <div className="relative mx-auto" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}>

                        {/* Tiles */}
                        {Array.from({ length: TOTAL_TILES }, (_, i) => {
                            const tileNum = i + 1;
                            const pos = getTilePosition(tileNum);
                            const event = eventMap.get(tileNum);
                            const isCurrent = tileNum === displayFloor;

                            return (
                                <div
                                    key={tileNum}
                                    className={`voxel-tile ${isCurrent ? 'z-50' : ''}`}
                                    style={{
                                        left: pos.x - TILE_SIZE / 2,
                                        bottom: pos.y - TILE_SIZE / 2,
                                        width: TILE_SIZE,
                                        height: TILE_SIZE,
                                        '--tile-index': tileNum,
                                    } as React.CSSProperties}
                                    data-testid={`tile-${tileNum}`}
                                >
                                    <img src={V2_ASSETS.tile} className="voxel-tile-image" alt="" />
                                    <div className="voxel-tile-number">{tileNum}</div>

                                    {event && (
                                        <div className={`voxel-indicator ${event.event_type === 'ladder' ? 'voxel-event-ladder' : 'voxel-event-snake'}`}>
                                            {event.event_type === 'ladder' ? '🪜' : '🐍'}
                                        </div>
                                    )}

                                    {isCurrent && (
                                        <div className="absolute inset-0 rounded-lg ring-4 ring-yellow-400 ring-opacity-80 animate-pulse pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}

                        {/* Player */}
                        <div
                            className={`voxel-player ${isHopping ? 'voxel-player-jump' : ''}`}
                            style={{
                                left: playerPos.x - 24,
                                bottom: playerPos.y - 16,
                                transition: isHopping ? 'none' : 'left 0.3s ease, bottom 0.3s ease',
                            }}
                            data-testid="player-token"
                        >
                            <img src={V2_ASSETS.player} alt="Player" className="w-full h-full" />
                        </div>

                        {/* Snake/Ladder Connectors */}
                        {events.map((event) => {
                            if (!event.target_floor) return null;
                            const start = getTilePosition(event.floor_number);
                            const end = getTilePosition(event.target_floor);
                            const isLadder = event.event_type === 'ladder';
                            const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) - 90;
                            const length = Math.hypot(end.x - start.x, end.y - start.y);

                            return (
                                <div
                                    key={`connector-${event.floor_number}`}
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: start.x - 16,
                                        bottom: start.y - 16,
                                        width: 32,
                                        height: length,
                                        transformOrigin: 'top center',
                                        transform: `rotate(${angle}deg)`,
                                        zIndex: 3,
                                    }}
                                >
                                    <img
                                        src={isLadder ? V2_ASSETS.ladder : V2_ASSETS.snake}
                                        alt=""
                                        className="w-full h-full object-contain opacity-70"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Event Message Overlay */}
                {eventMessage && (
                    <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none">
                        <div className="bg-white/95 px-8 py-6 rounded-3xl shadow-2xl text-center animate-bounce">
                            <p className="text-2xl font-black text-gray-800">{eventMessage}</p>
                            {showEvent?.target_floor && (
                                <p className="text-sm font-bold text-gray-500 mt-2">
                                    <ChevronUp className="inline" size={16} /> 移動到第 {showEvent.target_floor} 層
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="relative z-20 p-4 bg-white/90 backdrop-blur-md border-t-2 border-white/30 flex gap-3 justify-center items-center">
                    <button
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="clay-btn clay-btn-primary px-10 py-4 text-xl font-black flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="roll-dice-btn"
                    >
                        <Dices size={28} className={isRolling ? 'animate-spin' : ''} />
                        {isRolling ? displayDice : '擲骰子'}
                    </button>

                    <button onClick={() => setShowPurchase(true)} className="clay-btn w-14 h-14 flex items-center justify-center bg-blue-100 hover:bg-blue-200" data-testid="purchase-dice-btn">
                        <ShoppingCart size={24} className="text-blue-700" />
                    </button>
                    <button onClick={() => setShowLotteryWheel(true)} className="clay-btn w-14 h-14 flex items-center justify-center bg-purple-100 hover:bg-purple-200" data-testid="lottery-wheel-btn">
                        <Sparkles size={24} className="text-purple-700" />
                    </button>
                </div>

                {/* Victory Modal */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[2000]">
                        <div className="clay-dialog p-8 text-center max-w-xs animate-bounce-in">
                            <div className="text-6xl mb-4">🏆</div>
                            <h2 className="text-2xl font-black mb-2 text-gray-800">登頂成功！</h2>
                            <p className="text-gray-600 mb-6">恭喜你攻克怪獸塔！</p>
                            <button onClick={handleReset} className="clay-btn clay-btn-primary w-full py-4 text-lg font-black">
                                再挑戰一次
                            </button>
                        </div>
                    </div>
                )}

                {/* Sub-modals */}
                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}
                {showLotteryWheel && (
                    <LotteryWheel onComplete={(prize) => { handleLotteryComplete(prize); setShowLotteryWheel(false); }} />
                )}
            </div>
        </div>
    );
};

// ============ PREVIEW COMPONENT ============
export const TowerV2Preview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);
    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;

    return (
        <button
            onClick={onClick}
            className="clay-card p-4 w-full text-left hover:scale-[1.02] transition-transform group"
            data-testid="monster-tower-v2-open"
        >
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🏰</div>
                <div>
                    <h3 className="text-lg font-black text-gray-800">怪獸塔 V2</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-lg">Floor {currentFloor}</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg">🎲 {diceCount}</span>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerV2;
