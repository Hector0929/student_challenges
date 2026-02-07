/**
 * Monster Tower V2 - Voxel Art Redesign
 * Crossy Road style vertical winding tower with floating blocks
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dices, Sparkles, X, ShoppingCart } from 'lucide-react';
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
const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;
const VERTICAL_GAP = 60; // Distance between floors vertically
const SPIRAL_RADIUS = 120; // How far tiles wind from center
const SPIRAL_SPEED = 0.5; // Angle increment per tile

// V2 Image Assets
const V2_ASSETS = {
    tile: '/images/tower-v2/tile.png',
    snake: '/images/tower-v2/snake.png',
    ladder: '/images/tower-v2/ladder.png',
    player: '/images/tower-v2/player.png',
};

// ============ HELPER FUNCTIONS ============

/**
 * Get tile position in the winding tower
 * Returns center coordinates relative to board container
 */
const getTilePosition = (tileNum: number) => {
    // Spiral winding around central axis
    const angle = tileNum * SPIRAL_SPEED;
    const x = Math.cos(angle) * SPIRAL_RADIUS;
    const y = Math.sin(angle) * (SPIRAL_RADIUS / 2); // Isometric vertical flattening

    // Vertical elevation: 1 is bottom, 100 is top
    // We want the tower to grow UPWARDS, so lower numbers have larger 'top' values
    // Board height will be around TOTAL_TILES * VERTICAL_GAP
    const elevation = (TOTAL_TILES - tileNum) * VERTICAL_GAP;

    return {
        x: x + 250, // Center offset (assuming container is ~500px wide)
        y: y + elevation + 100, // Elevation offset
        z: tileNum * 2, // Layering
    };
};

// ============ INTERFACES ============
interface MonsterTowerV2Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface DicePurchaseModalProps {
    userId: string;
    onClose: () => void;
}

// ============ DICE PURCHASE MODAL ============
const DicePurchaseModal: React.FC<DicePurchaseModalProps> = ({ userId, onClose }) => {
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
        } catch {
            console.error('Purchase failed');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" data-testid="purchase-modal">
            <div className="clay-dialog p-6 w-80">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart size={24} />
                    購買骰子
                </h3>
                <div className="mb-4">
                    <p className="text-sm mb-2">每顆骰子: {pricePerDice} ⭐</p>
                    <p className="text-sm mb-2">你的星幣: {starBalance} ⭐</p>
                </div>
                <div className="flex items-center justify-center gap-4 mb-4">
                    <button onClick={() => setAmount(Math.max(1, amount - 1))} className="clay-btn p-2">-</button>
                    <span className="text-2xl font-bold">{amount}</span>
                    <button onClick={() => setAmount(amount + 1)} className="clay-btn p-2">+</button>
                </div>
                <p className="text-center mb-4">總價: <span className="font-bold">{totalCost}</span> ⭐</p>
                <div className="flex gap-2">
                    <button onClick={onClose} className="clay-btn flex-1">取消</button>
                    <button
                        onClick={handlePurchase}
                        disabled={!canAfford || purchaseDiceMutation.isPending}
                        className="clay-btn clay-btn-primary flex-1 disabled:opacity-50"
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

    // Refs
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);

    // State
    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [displayDice, setDisplayDice] = useState(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);
    const [isJumping, setIsJumping] = useState(false);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const eventMap = useMemo(() => new Map(events.map(e => [e.floor_number, e])), [events]);

    // Auto-scroll to player
    useEffect(() => {
        if (isOpen && boardContainerRef.current) {
            const floor = animatingFloor || currentFloor;
            const pos = getTilePosition(floor);

            // Scroll container so player is in center
            boardContainerRef.current.scrollTo({
                top: pos.y - 300,
                behavior: 'smooth'
            });
        }
    }, [isOpen, currentFloor, animatingFloor]);

    // Dice roll animation
    useEffect(() => {
        if (isRolling) {
            const interval = setInterval(() => {
                setDisplayDice(Math.floor(Math.random() * 6) + 1);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isRolling]);

    // Handle dice roll
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);

        // Wait for roll animation
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const result = await rollDiceMutation.mutateAsync({
                userId,
                currentFloor,
            });

            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            // Animate movement step by step
            const startFloor = currentFloor;
            const targetFloor = Math.min(startFloor + result.roll, 100);

            for (let f = startFloor + 1; f <= targetFloor; f++) {
                setIsJumping(true);
                setAnimatingFloor(f);
                await new Promise(resolve => setTimeout(resolve, 300));
                setIsJumping(false);
            }

            // Handle event jump (snake/ladder)
            if (result.progress.current_floor !== targetFloor) {
                await new Promise(resolve => setTimeout(resolve, 500));

                if (result.event) {
                    setShowEvent(result.event);
                    setTimeout(() => setShowEvent(null), 2000);
                }

                setIsJumping(true);
                setAnimatingFloor(result.progress.current_floor);
                await new Promise(resolve => setTimeout(resolve, 500));
                setIsJumping(false);
            }

            setAnimatingFloor(null);

            // Check for victory
            if (result.reachedTop) {
                setTimeout(() => setShowVictory(true), 500);
            }
        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, currentFloor, userId, rollDiceMutation]);

    // Handle lottery
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleLotteryComplete = useCallback(async (prize: Prize) => {
        try {
            await lotteryRewardMutation.mutateAsync({
                userId,
                prizeType: prize.type,
                prizeValue: prize.value,
                monsterId: prize.monsterId,
                prizeName: prize.name,
            });
        } catch (error) {
            console.error('Lottery claim failed:', error);
        }
        setShowLotteryWheel(false);
    }, [userId, lotteryRewardMutation]);

    // Handle reset
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleReset = useCallback(async () => {
        try {
            await resetTowerMutation.mutateAsync({ userId });
            setShowVictory(false);
        } catch (error) {
            console.error('Reset failed:', error);
        }
    }, [userId, resetTowerMutation]);

    if (!isOpen) return null;

    const currentPlayerPos = getTilePosition(animatingFloor || currentFloor);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="clay-dialog w-full max-w-lg h-[90vh] overflow-hidden flex flex-col voxel-sky-bg shadow-2xl relative">

                {/* Voxel Clouds Background Layer */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="voxel-cloud w-24 h-8 top-[10%] left-[-10%]" style={{ animationDuration: '40s' }} />
                    <div className="voxel-cloud w-32 h-10 top-[40%] left-[-20%]" style={{ animationDuration: '60s', animationDelay: '-15s' }} />
                    <div className="voxel-cloud w-20 h-6 top-[70%] left-[-15%]" style={{ animationDuration: '35s', animationDelay: '-5s' }} />
                </div>

                {/* Header */}
                <div className="relative z-10 p-4 flex justify-between items-center bg-white/30 backdrop-blur-md border-b border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-clay flex items-center justify-center text-2xl">🏰</div>
                        <div>
                            <h2 className="font-black text-xl text-blue-900 leading-tight">怪獸塔 V2</h2>
                            <p className="text-xs font-bold text-blue-700/70" data-testid="zone-name">Voxel Winding Tower</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/40 rounded-full transition-colors" data-testid="close-tower-v2">
                        <X size={24} className="text-blue-900" />
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="relative z-10 p-3 flex justify-around items-center bg-white/50 border-b border-white/20">
                    <div className="flex flex-col items-center">
                        <span className="text-xl">🎲</span>
                        <span className="text-sm font-black text-blue-900" data-testid="dice-count">{diceCount}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl">⭐</span>
                        <span className="text-sm font-black text-blue-900">{starBalance}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl">📊</span>
                        <span className="text-sm font-black text-blue-900" data-testid="current-floor">{currentFloor} / 100</span>
                    </div>
                    {rollResult && (
                        <div className="flex flex-col items-center animate-bounce" data-testid="dice-result">
                            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Roll</span>
                            <span className="text-2xl font-black text-orange-600">{rollResult}</span>
                        </div>
                    )}
                </div>

                {/* Game Board Container */}
                <div
                    ref={boardContainerRef}
                    className="flex-1 voxel-tower-container p-4 relative"
                >
                    <div className="voxel-board" style={{ height: TOTAL_TILES * VERTICAL_GAP + 600 }}>

                        {/* Winding Tiles */}
                        {Array.from({ length: TOTAL_TILES }, (_, i) => {
                            const tileNum = i + 1;
                            const pos = getTilePosition(tileNum);
                            const event = eventMap.get(tileNum);

                            return (
                                <div
                                    key={tileNum}
                                    id={`tile-${tileNum}`}
                                    className="voxel-tile"
                                    style={{
                                        left: pos.x - TILE_WIDTH / 2,
                                        top: pos.y - TILE_HEIGHT / 2,
                                        zIndex: pos.z
                                    }}
                                    data-testid={`tile-${tileNum}`}
                                >
                                    <img src={V2_ASSETS.tile} className="voxel-tile-image" alt="tile" />
                                    <div className="voxel-tile-number">{tileNum}</div>

                                    {/* Event Markers on Tile */}
                                    {event && (
                                        <div className={`voxel-indicator ${event.event_type === 'ladder' ? 'voxel-event-ladder' : 'voxel-event-snake'}`}>
                                            {event.event_type === 'ladder' ? '🪜' : '🐍'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Player Bear */}
                        <div
                            ref={playerRef}
                            className={`voxel-player ${isJumping ? 'voxel-player-jump' : ''}`}
                            style={{
                                left: currentPlayerPos.x - 24,
                                top: currentPlayerPos.y - 48,
                                zIndex: currentPlayerPos.z + 10
                            }}
                            data-testid="player-token"
                        >
                            <img src={V2_ASSETS.player} alt="Bear" className="w-full h-full" />
                        </div>

                        {/* Connectors (Snakes & Ladders visually connecting tiles) */}
                        {events.map((event, idx) => {
                            if (!event.target_floor) return null;
                            const start = getTilePosition(event.floor_number);
                            const end = getTilePosition(event.target_floor);

                            return (
                                <div
                                    key={`connector-${idx}`}
                                    className={event.event_type === 'trap' ? 'voxel-snake-container' : 'voxel-ladder-container'}
                                    style={{
                                        left: Math.min(start.x, end.x),
                                        top: Math.min(start.y, end.y),
                                        width: Math.abs(start.x - end.x) + 32,
                                        height: Math.abs(start.y - end.y) + 32,
                                        zIndex: Math.min(start.z, end.z) - 1
                                    }}
                                >
                                    {/* Vertical lines connecting tiles as abstract snakes/ladders */}
                                    <div
                                        className="absolute w-2 voxel-connector"
                                        style={{
                                            left: '50%',
                                            height: '100%',
                                            background: event.event_type === 'trap' ? '#81C784' : '#BCAAA4',
                                            transform: `rotate(${(Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI}deg)`,
                                            transformOrigin: 'top left',
                                            opacity: 0.6,
                                            borderRadius: '9999px'
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 bg-white/80 backdrop-blur-md border-t border-white/20 flex gap-3 justify-center">
                    <button
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="clay-btn clay-btn-primary px-8 py-3 text-lg font-black flex items-center gap-2 disabled:opacity-50"
                        data-testid="roll-dice-btn"
                    >
                        <Dices size={24} className={isRolling ? 'animate-spin' : ''} />
                        {isRolling ? displayDice : '擲骰子'}
                    </button>

                    <div className="flex flex-col gap-2">
                        <button onClick={() => setShowPurchase(true)} className="clay-btn p-2 flex items-center justify-center bg-blue-100 hover:bg-blue-200" data-testid="purchase-dice-btn">
                            <ShoppingCart size={20} className="text-blue-900" />
                        </button>
                        <button onClick={() => setShowLotteryWheel(true)} className="clay-btn p-2 flex items-center justify-center bg-purple-100 hover:bg-purple-200" data-testid="lottery-wheel-btn">
                            <Sparkles size={20} className="text-purple-900" />
                        </button>
                    </div>
                </div>

                {/* Event Message Overlay */}
                {showEvent && (
                    <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none px-10">
                        <div className={`p-6 rounded-3xl shadow-2xl text-white text-center animate-bounce ${showEvent.event_type === 'ladder' ? 'bg-orange-500' : 'bg-green-500'
                            }`}>
                            <p className="text-3xl font-black mb-1">
                                {showEvent.event_type === 'ladder' ? '🪜 CLIMB UP!' : '🐍 SLIDE DOWN!'}
                            </p>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">To Floor {showEvent.target_floor}</p>
                        </div>
                    </div>
                )}

                {/* Victory Modal */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[2000]">
                        <div className="clay-dialog p-8 text-center max-w-[80%]">
                            <div className="w-24 h-24 bg-yellow-400 rounded-3xl shadow-clay mx-auto mb-6 flex items-center justify-center text-5xl">🏆</div>
                            <h2 className="text-3xl font-black mb-4 text-blue-900">第 100 層達到！</h2>
                            <p className="font-bold text-blue-800/60 mb-8">恭喜你成功挑戰怪獸塔！</p>
                            <button onClick={handleReset} className="clay-btn clay-btn-primary w-full py-4 text-xl font-black uppercase tracking-tighter">
                                再戰一次
                            </button>
                        </div>
                    </div>
                )}

                {/* Sub-modals */}
                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}
                {showLotteryWheel && (
                    <LotteryWheel
                        onComplete={(prize) => {
                            handleLotteryComplete(prize);
                            setShowLotteryWheel(false);
                        }}
                    />
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
            className="clay-card p-4 w-full text-left hover:scale-105 transition-transform group overflow-hidden relative"
            data-testid="monster-tower-v2-open"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-clay flex items-center justify-center text-3xl">🏰</div>
                <div>
                    <h3 className="text-xl font-black text-blue-900 tracking-tight">怪獸塔 V2</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg uppercase">Floor {currentFloor}</span>
                        <span className="text-xs font-black px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg uppercase">🎲 {diceCount}</span>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerV2;
