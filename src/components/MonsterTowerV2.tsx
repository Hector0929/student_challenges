/**
 * Monster Tower V2 - Snakes and Ladders Style Board Game
 * CSS Isometric 3D style with spanning snakes and ladders
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dices, Trophy, Sparkles, X, ShoppingCart } from 'lucide-react';
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
const BOARD_COLS = 10;
const BOARD_ROWS = 10;
const TILE_SIZE = 52;
const TILE_GAP = 4;
const TOTAL_TILES = 100;

// V2 Image Assets
const V2_ASSETS = {
    player: '/images/tower-v2/player.png',
};

// ============ HELPER FUNCTIONS ============

// Get tile position in grid (snakes and ladders style: alternating rows)
const getTilePosition = (tileNum: number): { row: number; col: number } => {
    const row = Math.floor((tileNum - 1) / BOARD_COLS);
    const colInRow = (tileNum - 1) % BOARD_COLS;
    // Even rows go left to right, odd rows go right to left
    const col = row % 2 === 0 ? colInRow : (BOARD_COLS - 1 - colInRow);
    return { row: BOARD_ROWS - 1 - row, col }; // Invert row so 1 is at bottom
};

// Get pixel coordinates for a tile center
const getTileCenter = (tileNum: number): { x: number; y: number } => {
    const { row, col } = getTilePosition(tileNum);
    return {
        x: col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
        y: row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
    };
};

// Generate SVG path for snake (curved line)
const getSnakePath = (startTile: number, endTile: number): string => {
    const start = getTileCenter(startTile);
    const end = getTileCenter(endTile);
    const midX = (start.x + end.x) / 2 + (Math.random() * 60 - 30);
    const midY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
};

// Generate SVG path for ladder (straight line with rungs)
const getLadderPath = (startTile: number, endTile: number): { mainPath: string; rungs: string[] } => {
    const start = getTileCenter(startTile);
    const end = getTileCenter(endTile);
    const mainPath = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

    // Generate rungs
    const rungs: string[] = [];
    const numRungs = Math.floor(Math.abs(endTile - startTile) / 10) + 2;
    for (let i = 1; i < numRungs; i++) {
        const t = i / numRungs;
        const rx = start.x + (end.x - start.x) * t;
        const ry = start.y + (end.y - start.y) * t;
        const perpX = (end.y - start.y) / Math.hypot(end.x - start.x, end.y - start.y) * 12;
        const perpY = -(end.x - start.x) / Math.hypot(end.x - start.x, end.y - start.y) * 12;
        rungs.push(`M ${rx - perpX} ${ry - perpY} L ${rx + perpX} ${ry + perpY}`);
    }
    return { mainPath, rungs };
};

// Zone theming
const getZoneInfo = (floor: number) => {
    if (floor <= 25) return { name: '🌲 森林入口', color: 'bg-green-600', textColor: 'text-green-100' };
    if (floor <= 50) return { name: '💎 水晶洞穴', color: 'bg-emerald-600', textColor: 'text-emerald-100' };
    if (floor <= 75) return { name: '🔥 熔岩地帶', color: 'bg-teal-600', textColor: 'text-teal-100' };
    return { name: '☁️ 雲端天空', color: 'bg-green-700', textColor: 'text-green-100' };
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
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            data-testid="purchase-modal"
        >
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
                    <button
                        onClick={() => setAmount(Math.max(1, amount - 1))}
                        className="clay-btn p-2"
                    >
                        -
                    </button>
                    <span className="text-2xl font-bold">{amount}</span>
                    <button
                        onClick={() => setAmount(amount + 1)}
                        className="clay-btn p-2"
                    >
                        +
                    </button>
                </div>

                <p className="text-center mb-4">
                    總價: <span className="font-bold">{totalCost}</span> ⭐
                </p>

                <div className="flex gap-2">
                    <button onClick={onClose} className="clay-btn flex-1">
                        取消
                    </button>
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

// ============ ISOMETRIC TILE COMPONENT ============
interface IsometricTileProps {
    tileNum: number;
    row: number;
    col: number;
    isCurrentPosition: boolean;
    event?: TowerEvent;
}

const IsometricTile: React.FC<IsometricTileProps> = ({
    tileNum,
    row,
    col,
    isCurrentPosition,
    event,
}) => {
    return (
        <div
            className={`iso-tile ${isCurrentPosition ? 'iso-tile-current' : ''}`}
            style={{
                left: col * (TILE_SIZE + TILE_GAP),
                top: row * (TILE_SIZE + TILE_GAP),
                width: TILE_SIZE,
                height: TILE_SIZE,
            }}
            data-testid={`tile-${tileNum}`}
            data-event-type={event?.event_type}
        >
            {/* Top face */}
            <div className="iso-tile-top">
                <span>{tileNum}</span>
            </div>

            {/* Side faces for 3D depth */}
            <div className="iso-tile-left" />
            <div className="iso-tile-right" />

            {/* Event indicator */}
            {event && (
                <div className={event.event_type === 'ladder' ? 'iso-event-ladder' : 'iso-event-snake'}>
                    {event.event_type === 'ladder' ? '🪜' : '🐍'}
                </div>
            )}
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

    // State
    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [displayDice, setDisplayDice] = useState(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const eventMap = useMemo(() => new Map(events.map(e => [e.floor_number, e])), [events]);
    const zoneInfo = getZoneInfo(currentFloor);

    // Separate events by type for SVG rendering
    const { snakeEvents, ladderEvents } = useMemo(() => {
        const snakes: TowerEvent[] = [];
        const ladders: TowerEvent[] = [];
        events.forEach(e => {
            if (e.event_type === 'trap' && e.target_floor) snakes.push(e);
            if (e.event_type === 'ladder' && e.target_floor) ladders.push(e);
        });
        return { snakeEvents: snakes, ladderEvents: ladders };
    }, [events]);

    // Calculate board dimensions
    const boardWidth = BOARD_COLS * (TILE_SIZE + TILE_GAP) - TILE_GAP;
    const boardHeight = BOARD_ROWS * (TILE_SIZE + TILE_GAP) - TILE_GAP;

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

        // Animate dice for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const result = await rollDiceMutation.mutateAsync({
                userId,
                currentFloor,
            });

            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            // Animate movement
            const startFloor = currentFloor;
            const endFloor = result.progress.current_floor;

            for (let f = startFloor + 1; f <= Math.min(startFloor + result.roll, 100); f++) {
                setAnimatingFloor(f);
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // If there was an event (snake/ladder), animate to final position
            if (endFloor !== Math.min(startFloor + result.roll, 100)) {
                await new Promise(resolve => setTimeout(resolve, 300));
                setAnimatingFloor(endFloor);
            }

            setAnimatingFloor(null);

            // Show event if any
            if (result.event) {
                setShowEvent(result.event);
                setTimeout(() => setShowEvent(null), 2000);
            }

            // Check for victory
            if (result.reachedTop) {
                setTimeout(() => setShowVictory(true), 500);
            }
        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, currentFloor, userId, rollDiceMutation]);

    // Handle lottery wheel completion
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
            console.error('Failed to claim lottery reward:', error);
        }
        setShowLotteryWheel(false);
    }, [userId, lotteryRewardMutation]);

    // Handle tower reset (victory)
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleReset = useCallback(async () => {
        try {
            await resetTowerMutation.mutateAsync({ userId });
            setShowVictory(false);
        } catch (error) {
            console.error('Reset failed:', error);
        }
    }, [userId, resetTowerMutation]);

    // Get player position
    const playerPos = useMemo(() => {
        const floor = animatingFloor || currentFloor;
        return getTileCenter(floor);
    }, [animatingFloor, currentFloor]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="clay-dialog w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`p-4 ${zoneInfo.color} ${zoneInfo.textColor} flex justify-between items-center`}>
                    <div>
                        <h2 className="text-2xl font-bold">怪獸塔 V2</h2>
                        <p className="text-sm" data-testid="zone-name">{zoneInfo.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition"
                        data-testid="close-tower-v2"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="p-3 bg-white/90 border-b flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🎲</span>
                            <span className="font-bold" data-testid="dice-count">{diceCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">⭐</span>
                            <span className="font-bold">{starBalance}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🏰</span>
                            <span className="font-bold" data-testid="current-floor">第 {currentFloor} 層</span>
                        </div>
                    </div>

                    {rollResult && (
                        <div className="flex items-center gap-2" data-testid="dice-result">
                            <span>擲出:</span>
                            <span className="text-2xl font-bold animate-bounce">{rollResult}</span>
                        </div>
                    )}
                </div>

                {/* Game Board - Isometric Container */}
                <div className="flex-1 overflow-auto p-8 iso-forest-bg flex items-center justify-center">
                    <div
                        className="iso-board-container"
                        style={{ width: boardWidth + 100, height: boardHeight + 100 }}
                    >
                        <div
                            className="iso-board"
                            style={{ width: boardWidth, height: boardHeight }}
                            data-testid="tower-v2-board"
                        >
                            {/* SVG Layer for Snakes and Ladders */}
                            <svg
                                className="absolute inset-0 pointer-events-none"
                                width={boardWidth}
                                height={boardHeight}
                                style={{ zIndex: 5 }}
                            >
                                {/* Render Ladders */}
                                {ladderEvents.map(event => {
                                    if (!event.target_floor) return null;
                                    const { mainPath, rungs } = getLadderPath(event.floor_number, event.target_floor);
                                    return (
                                        <g key={`ladder-${event.floor_number}`}>
                                            <path d={mainPath} className="iso-ladder-path" />
                                            {rungs.map((rung, i) => (
                                                <path key={i} d={rung} className="iso-ladder-rung" />
                                            ))}
                                        </g>
                                    );
                                })}

                                {/* Render Snakes */}
                                {snakeEvents.map(event => {
                                    if (!event.target_floor) return null;
                                    const path = getSnakePath(event.floor_number, event.target_floor);
                                    return (
                                        <g key={`snake-${event.floor_number}`}>
                                            <path d={path} className="iso-snake-path" />
                                            {/* Snake head */}
                                            <circle
                                                cx={getTileCenter(event.floor_number).x}
                                                cy={getTileCenter(event.floor_number).y}
                                                r={8}
                                                className="iso-snake-head"
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Render tiles */}
                            {Array.from({ length: TOTAL_TILES }, (_, i) => {
                                const tileNum = i + 1;
                                const { row, col } = getTilePosition(tileNum);
                                const event = eventMap.get(tileNum);
                                const isCurrentPosition = tileNum === (animatingFloor || currentFloor);

                                return (
                                    <IsometricTile
                                        key={tileNum}
                                        tileNum={tileNum}
                                        row={row}
                                        col={col}
                                        isCurrentPosition={isCurrentPosition}
                                        event={event}
                                    />
                                );
                            })}

                            {/* Player Token */}
                            <img
                                src={V2_ASSETS.player}
                                alt="Player"
                                className="iso-player"
                                style={{
                                    left: playerPos.x - 20,
                                    top: playerPos.y - 40,
                                    width: 40,
                                    height: 40,
                                }}
                                data-testid="player-token"
                            />
                        </div>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="p-4 bg-white/95 border-t flex gap-3 justify-center">
                    <button
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="clay-btn clay-btn-primary px-6 py-3 text-lg font-bold flex items-center gap-2 disabled:opacity-50"
                        data-testid="roll-dice-btn"
                    >
                        <Dices size={24} className={isRolling ? 'animate-spin' : ''} />
                        {isRolling ? displayDice : '擲骰子'}
                    </button>

                    <button
                        onClick={() => setShowPurchase(true)}
                        className="clay-btn px-4 py-3 flex items-center gap-2"
                        data-testid="purchase-dice-btn"
                    >
                        <ShoppingCart size={20} />
                        購買骰子
                    </button>

                    <button
                        onClick={() => setShowLotteryWheel(true)}
                        className="clay-btn px-4 py-3 flex items-center gap-2"
                        data-testid="lottery-wheel-btn"
                    >
                        <Sparkles size={20} />
                        抽獎轉盤
                    </button>
                </div>

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`p-6 rounded-xl text-white text-center animate-bounce ${showEvent.event_type === 'ladder' ? 'bg-green-600' :
                            showEvent.event_type === 'trap' ? 'bg-red-600' :
                                'bg-yellow-500'
                            }`}>
                            <p className="text-2xl font-bold">
                                {showEvent.event_type === 'ladder' && '🪜 梯子！往上爬！'}
                                {showEvent.event_type === 'trap' && '🐍 蛇！溜下去！'}
                                {showEvent.event_type === 'egg' && '🥚 發現怪獸蛋！'}
                            </p>
                            {showEvent.target_floor && (
                                <p className="mt-2">移動到第 {showEvent.target_floor} 層</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Victory Modal */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="clay-dialog p-8 text-center">
                            <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
                            <h2 className="text-3xl font-bold mb-4">🎉 恭喜登頂！</h2>
                            <p className="mb-6">你成功攻頂了怪獸塔！</p>
                            <button onClick={handleReset} className="clay-btn clay-btn-primary px-6 py-3">
                                再挑戰一次
                            </button>
                        </div>
                    </div>
                )}

                {/* Purchase Modal */}
                {showPurchase && (
                    <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />
                )}

                {/* Lottery Wheel */}
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
    const zoneInfo = getZoneInfo(currentFloor);

    return (
        <button
            onClick={onClick}
            className="clay-card p-4 w-full text-left hover:scale-105 transition-transform"
            data-testid="monster-tower-v2-open"
        >
            <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl ${zoneInfo.color} flex items-center justify-center`}>
                    <span className="text-3xl">🏰</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold">怪獸塔 V2</h3>
                    <p className="text-sm text-gray-600">第 {currentFloor} 層 | 🎲 {diceCount}</p>
                    <p className="text-xs text-gray-500">{zoneInfo.name}</p>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerV2;
