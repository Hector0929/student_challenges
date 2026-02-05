import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dices, Trophy, Sparkles, X, ArrowUp, ArrowDown, Move, ShoppingCart, Coins, Plus, Minus } from 'lucide-react';
import { useTowerProgress, useTowerEvents, useRollDice, useResetTower, usePurchaseDice, useLotteryReward, MONSTERS, GAME_ASSETS, type MonsterId } from '../hooks/useTowerProgress';
import { useStarBalance } from '../hooks/useQuests';
import { RPGButton } from './RPGButton';
import { LotteryWheel, type Prize } from './LotteryWheel';
import type { TowerEvent } from '../types/database';

interface MonsterTowerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Zone info
const getZoneInfo = (floor: number) => {
    if (floor <= 25) return { name: '🌲 森林入口', monster: 'slime' as MonsterId, color: 'from-green-600 to-emerald-700' };
    if (floor <= 50) return { name: '💎 水晶洞穴', monster: 'water_spirit' as MonsterId, color: 'from-blue-600 to-cyan-700' };
    if (floor <= 75) return { name: '🔥 熔岩地帶', monster: 'flame_bird' as MonsterId, color: 'from-orange-500 to-red-600' };
    return { name: '☁️ 雲端天空', monster: 'thunder_cloud' as MonsterId, color: 'from-purple-500 to-indigo-600' };
};

// Grid layout for FULL 100 floors
const COLS = 5;
const ROWS = 20;  // 5 columns x 20 rows = 100 floors
const TILE_SIZE = 44;
const COL_GAP = 4;
const ROW_GAP = 16;

// Generate FULL S-path grid for all 100 floors
const generateFullGrid = (): number[][] => {
    const rows: number[][] = [];

    for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
        const rowEndFloor = 100 - (rowIdx * COLS);
        const isReversed = rowIdx % 2 === 1;

        const row: number[] = [];
        for (let col = 0; col < COLS; col++) {
            const floor = isReversed
                ? rowEndFloor - (COLS - 1) + col
                : rowEndFloor - col;
            if (floor >= 1 && floor <= 100) {
                row.push(floor);
            }
        }
        if (row.length > 0) rows.push(row);
    }

    return rows;
};

// Get tile position on grid
const getTilePosition = (floor: number): { x: number; y: number } => {
    const rowIdx = Math.floor((100 - floor) / COLS);
    const isReversed = rowIdx % 2 === 1;
    let col: number;

    if (isReversed) {
        col = (floor - 1) % COLS;
    } else {
        col = (COLS - 1) - ((floor - 1) % COLS);
    }

    return {
        x: col * (TILE_SIZE + COL_GAP) + TILE_SIZE / 2,
        y: rowIdx * (TILE_SIZE + ROW_GAP) + TILE_SIZE / 2
    };
};

// Pre-generate the full grid
const FULL_GRID = generateFullGrid();

export const MonsterTower: React.FC<MonsterTowerProps> = ({ userId, isOpen, onClose }) => {
    const { data: progress, isLoading } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [displayDice, setDisplayDice] = useState<number>(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);

    // Dice Purchase State
    const [showPurchase, setShowPurchase] = useState(false);
    // Removed unused purchaseAmount state, using local state in modal instead

    // Drag scrolling state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;

    const eventMap = new Map(events.map(e => [e.floor_number, e]));

    // Calculate board dimensions
    const boardWidth = COLS * TILE_SIZE + (COLS - 1) * COL_GAP;
    const boardHeight = ROWS * TILE_SIZE + (ROWS - 1) * ROW_GAP;

    // Scroll to player position
    const scrollToPlayer = useCallback((floor: number, smooth = true) => {
        if (!scrollContainerRef.current) return;

        const pos = getTilePosition(floor);
        const container = scrollContainerRef.current;
        const containerHeight = container.clientHeight;

        const targetScrollTop = pos.y - containerHeight / 2;

        container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: smooth ? 'smooth' : 'auto'
        });
    }, []);

    // Scroll to player on initial load
    useEffect(() => {
        if (!isLoading && scrollContainerRef.current) {
            setTimeout(() => scrollToPlayer(currentFloor, false), 100);
        }
    }, [isLoading, currentFloor, scrollToPlayer]);

    // Mouse drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isRolling || isMoving) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setScrollStart({
            x: scrollContainerRef.current?.scrollLeft || 0,
            y: scrollContainerRef.current?.scrollTop || 0
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        scrollContainerRef.current.scrollLeft = scrollStart.x - dx;
        scrollContainerRef.current.scrollTop = scrollStart.y - dy;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch drag handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isRolling || isMoving) return;
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        setScrollStart({
            x: scrollContainerRef.current?.scrollLeft || 0,
            y: scrollContainerRef.current?.scrollTop || 0
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;

        const touch = e.touches[0];
        const dx = touch.clientX - dragStart.x;
        const dy = touch.clientY - dragStart.y;

        scrollContainerRef.current.scrollLeft = scrollStart.x - dx;
        scrollContainerRef.current.scrollTop = scrollStart.y - dy;
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    // Step-by-step movement animation
    const animateMovement = useCallback(async (fromFloor: number, toFloor: number, onComplete: () => void) => {
        const steps = Math.abs(toFloor - fromFloor);
        const direction = toFloor > fromFloor ? 1 : -1;

        setIsMoving(true);

        for (let i = 0; i <= steps; i++) {
            const stepFloor = fromFloor + (i * direction);
            setAnimatingFloor(stepFloor);
            scrollToPlayer(stepFloor, true);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setIsMoving(false);
        setAnimatingFloor(null);
        onComplete();
    }, [scrollToPlayer]);

    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling || isMoving) return;

        // First, scroll to player position smoothly
        scrollToPlayer(currentFloor, true);
        await new Promise(resolve => setTimeout(resolve, 400)); // Wait for scroll

        setIsRolling(true);
        setRollResult(null);
        const startFloor = currentFloor;

        const animationInterval = setInterval(() => {
            setDisplayDice(Math.floor(Math.random() * 6) + 1);
        }, 100);

        await new Promise(resolve => setTimeout(resolve, 1200));
        clearInterval(animationInterval);

        try {
            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor: startFloor });
            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            const intermediateFloor = Math.min(startFloor + result.roll, 100);

            // Animate movement step by step
            animateMovement(startFloor, intermediateFloor, () => {
                if (result.event) {
                    setTimeout(() => setShowEvent(result.event), 400);
                }
                if (result.reachedTop) {
                    setTimeout(() => setShowVictory(true), 800);
                }
            });

        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, isMoving, rollDiceMutation, userId, currentFloor, animateMovement, scrollToPlayer]);

    // Hooks for lottery rewards
    const lotteryRewardMutation = useLotteryReward();

    const handleLotteryComplete = async (prize: Prize) => {
        // Award the prize using the lottery reward mutation
        try {
            await lotteryRewardMutation.mutateAsync({
                userId,
                prizeType: prize.type,
                prizeValue: prize.value,
                monsterId: prize.monsterId,
                prizeName: prize.name,
            });
        } catch (error) {
            console.error('Failed to award lottery prize:', error);
        }

        // Reset and continue
        setShowLotteryWheel(false);
        await resetTowerMutation.mutateAsync({ userId });
        setShowVictory(false);
        setTimeout(() => scrollToPlayer(1, true), 300);
    };

    if (!isOpen) return null;

    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];
    const displayFloor = animatingFloor ?? currentFloor;

    // Generate SVG ladder/snake connectors
    const connectorLines = events
        .filter(e => e.target_floor && (e.event_type === 'ladder' || e.event_type === 'trap'))
        .map(event => {
            const fromPos = getTilePosition(event.floor_number);
            const toPos = getTilePosition(event.target_floor!);

            return {
                id: event.id,
                type: event.event_type,
                from: fromPos,
                to: toPos
            };
        });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90" onClick={onClose} />

            {/* FIXED SIZE CONTAINER */}
            <div
                className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-600"
                style={{
                    width: '340px',
                    height: 'min(90vh, 700px)',
                    background: 'linear-gradient(180deg, #5d3a1a 0%, #3d2510 50%, #2d1a0a 100%)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >

                {/* Header */}
                <div className={`bg-gradient-to-r ${zone.color} p-3 border-b-4 border-amber-900 flex-shrink-0`}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <img src={zoneMonster.image} alt={zoneMonster.name} className="w-10 h-10 object-contain drop-shadow-lg" />
                            <div>
                                <h2 className="font-pixel text-white text-base drop-shadow-md">🏰 怪獸塔</h2>
                                <p className="text-xs text-white/80">{zone.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-black/30 rounded-full transition-colors">
                            <X className="text-white" size={20} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden border border-amber-400/50">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${displayFloor}%` }}
                            />
                        </div>
                        <span className="text-white font-bold text-sm bg-black/40 px-2 py-0.5 rounded">
                            {displayFloor}/100
                        </span>
                    </div>

                    {/* Drag hint */}
                    <div className="flex items-center justify-center gap-1 mt-1 text-white/60 text-xs">
                        <Move size={12} />
                        <span>拖曳瀏覽地圖</span>
                    </div>
                </div>

                {/* Scrollable Game Board with Drag Support */}
                <div
                    ref={scrollContainerRef}
                    className={`flex-1 overflow-auto p-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                        minHeight: 0,
                        scrollBehavior: isDragging ? 'auto' : 'smooth'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Board Container with SVG overlay */}
                    <div
                        className="relative mx-auto"
                        style={{ width: boardWidth, height: boardHeight }}
                    >

                        {/* SVG Layer for Ladder/Snake Connectors */}
                        <svg
                            className="absolute inset-0 pointer-events-none z-0"
                            width={boardWidth}
                            height={boardHeight}
                            style={{ overflow: 'visible' }}
                        >
                            {connectorLines.map((line) => {
                                const isLadder = line.type === 'ladder';
                                return (
                                    <g key={line.id}>
                                        {/* Main connector line */}
                                        <line
                                            x1={line.from.x}
                                            y1={line.from.y}
                                            x2={line.to.x}
                                            y2={line.to.y}
                                            stroke={isLadder ? '#16a34a' : '#dc2626'}
                                            strokeWidth={isLadder ? 8 : 10}
                                            strokeLinecap="round"
                                            opacity={0.8}
                                        />
                                        {/* Inner line for ladders */}
                                        {isLadder && (
                                            <line
                                                x1={line.from.x}
                                                y1={line.from.y}
                                                x2={line.to.x}
                                                y2={line.to.y}
                                                stroke="#22c55e"
                                                strokeWidth={4}
                                                strokeLinecap="round"
                                                strokeDasharray="8,8"
                                            />
                                        )}
                                        {/* Rungs for ladder */}
                                        {isLadder && Array.from({ length: Math.min(6, Math.abs(line.from.y - line.to.y) / 30) }).map((_, i, arr) => {
                                            const t = (i + 1) / (arr.length + 1);
                                            const x = line.from.x + (line.to.x - line.from.x) * t;
                                            const y = line.from.y + (line.to.y - line.from.y) * t;
                                            const angle = Math.atan2(line.to.y - line.from.y, line.to.x - line.from.x) + Math.PI / 2;
                                            const rungLen = 10;
                                            return (
                                                <line
                                                    key={i}
                                                    x1={x - Math.cos(angle) * rungLen}
                                                    y1={y - Math.sin(angle) * rungLen}
                                                    x2={x + Math.cos(angle) * rungLen}
                                                    y2={y + Math.sin(angle) * rungLen}
                                                    stroke="#16a34a"
                                                    strokeWidth={3}
                                                    strokeLinecap="round"
                                                />
                                            );
                                        })}
                                        {/* Snake markers */}
                                        {!isLadder && (
                                            <>
                                                <circle cx={line.from.x} cy={line.from.y} r={6} fill="#ef4444" />
                                                <circle cx={line.to.x} cy={line.to.y} r={6} fill="#ef4444" />
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Tiles Grid */}
                        <div
                            className="relative z-10"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${COLS}, ${TILE_SIZE}px)`,
                                columnGap: `${COL_GAP}px`,
                                rowGap: `${ROW_GAP}px`
                            }}
                        >
                            {FULL_GRID.flat().map((floor) => {
                                const isCurrentFloor = floor === displayFloor;
                                const event = eventMap.get(floor);
                                const isLadder = event?.event_type === 'ladder';
                                const isTrap = event?.event_type === 'trap';
                                const isEgg = event?.event_type === 'egg';
                                const floorZone = getZoneInfo(floor);

                                return (
                                    <div
                                        key={floor}
                                        className={`
                                            relative rounded-lg flex items-center justify-center
                                            transition-all duration-200
                                            ${isCurrentFloor ? 'animate-floor-glow z-20 scale-110' : 'hover:scale-105'}
                                        `}
                                        style={{
                                            width: TILE_SIZE,
                                            height: TILE_SIZE,
                                            backgroundImage: `url(${GAME_ASSETS.tile})`,
                                            backgroundSize: 'cover',
                                            boxShadow: !isCurrentFloor
                                                ? 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)'
                                                : undefined
                                        }}
                                    >
                                        {/* Tile Content */}
                                        {isCurrentFloor ? (
                                            <img
                                                src={GAME_ASSETS.player}
                                                alt="player"
                                                className={`w-9 h-9 object-contain drop-shadow-lg ${isMoving ? 'animate-player-hop' : ''}`}
                                            />
                                        ) : isLadder ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span className="font-bold text-amber-900 text-sm">{floor}</span>
                                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow">
                                                    <ArrowUp size={10} className="text-white" />
                                                </div>
                                            </div>
                                        ) : isTrap ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span className="font-bold text-amber-900 text-sm">{floor}</span>
                                                <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 shadow">
                                                    <ArrowDown size={10} className="text-white" />
                                                </div>
                                            </div>
                                        ) : isEgg ? (
                                            <span className="text-xl animate-star-twinkle">🥚</span>
                                        ) : floor % 25 === 0 ? (
                                            // Zone milestone markers
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span className="font-bold text-amber-900 text-sm">{floor}</span>
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-amber-600 text-white px-1 rounded">
                                                    {floorZone.name.split(' ')[0]}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-amber-900 text-sm drop-shadow-sm">{floor}</span>
                                        )}

                                        {floor === 100 && !isCurrentFloor && (
                                            <Trophy className="absolute -top-1 left-1/2 -translate-x-1/2 text-yellow-500" size={14} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="bg-gradient-to-t from-stone-900 via-stone-800 to-amber-900/50 p-4 border-t-4 border-amber-700 flex-shrink-0">
                    <div className="flex items-center gap-4 mb-3">
                        {/* Dice Display */}
                        <div className={`
                            w-16 h-16 rounded-xl bg-gradient-to-br from-white via-gray-100 to-gray-300 
                            flex items-center justify-center 
                            shadow-lg border-3 border-amber-500
                            ${isRolling ? 'animate-dice-roll' : rollResult ? 'animate-dice-shake' : ''}
                        `}
                            style={{
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.8)'
                            }}
                        >
                            <span className="text-4xl drop-shadow-lg">
                                {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][displayDice - 1] || '🎲'}
                            </span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Dices className="text-yellow-400" size={20} />
                                <span className="font-bold text-xl text-yellow-400">×{diceCount}</span>
                            </div>
                            <p className="text-amber-300 text-sm">可用骰子</p>
                            {rollResult && !isRolling && !isMoving && (
                                <p className="text-green-400 font-bold animate-pulse">+{rollResult} 步！</p>
                            )}
                            {isMoving && (
                                <p className="text-cyan-400 font-bold animate-pulse">移動中...</p>
                            )}
                        </div>
                    </div>

                    <RPGButton
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling || isMoving}
                        className="w-full"
                        variant={diceCount > 0 ? 'primary' : 'secondary'}
                    >
                        {isRolling ? '🎲 擲骰中...' : isMoving ? '🚶 移動中...' : diceCount > 0 ? '🎲 擲骰子！' : '完成任務獲得骰子'}
                    </RPGButton>

                    {/* Purchase Dice Button */}
                    <button
                        onClick={() => setShowPurchase(true)}
                        className="w-full mt-2 text-xs text-amber-300 hover:text-amber-100 flex items-center justify-center gap-1 py-1"
                    >
                        <ShoppingCart size={14} />
                        <span>沒有骰子了嗎？購買骰子</span>
                    </button>
                </div>

                {/* Purchase Modal */}
                {showPurchase && (
                    <DicePurchaseModal
                        userId={userId}
                        currentDice={diceCount}
                        onClose={() => setShowPurchase(false)}
                    />
                )}

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-30">
                        <div className={`
                            rounded-2xl p-5 text-center max-w-xs border-4 shadow-2xl animate-popup-in
                            ${showEvent.event_type === 'ladder'
                                ? 'bg-gradient-to-br from-green-500 to-emerald-700 border-green-300'
                                : showEvent.event_type === 'trap'
                                    ? 'bg-gradient-to-br from-red-500 to-rose-700 border-red-300'
                                    : 'bg-gradient-to-br from-purple-500 to-violet-700 border-purple-300'
                            }
                        `}>
                            <div className="mb-3">
                                {showEvent.event_type === 'ladder' && (
                                    <>
                                        <img src={GAME_ASSETS.ladder} alt="ladder" className="w-14 h-14 mx-auto" />
                                        <ArrowUp className="mx-auto text-white animate-bounce mt-1" size={24} />
                                    </>
                                )}
                                {showEvent.event_type === 'trap' && (
                                    <>
                                        <img src={GAME_ASSETS.snake} alt="snake" className="w-14 h-14 mx-auto" />
                                        <ArrowDown className="mx-auto text-white animate-bounce mt-1" size={24} />
                                    </>
                                )}
                                {showEvent.event_type === 'egg' && (
                                    <span className="text-4xl">🥚✨</span>
                                )}
                            </div>
                            <h3 className="font-pixel text-lg text-white mb-2 drop-shadow-lg">
                                {showEvent.event_type === 'ladder' && '發現捷徑！⬆️'}
                                {showEvent.event_type === 'trap' && '哎呀滑倒了！⬇️'}
                                {showEvent.event_type === 'egg' && '獲得怪獸蛋！'}
                            </h3>
                            <p className="text-white/90 text-sm mb-2">{showEvent.description}</p>
                            {showEvent.target_floor && (
                                <p className="text-white font-bold mb-2">
                                    {showEvent.event_type === 'ladder' ? '⬆️' : '⬇️'} 移動到第 {showEvent.target_floor} 層
                                </p>
                            )}
                            {showEvent.monster_id && MONSTERS[showEvent.monster_id as MonsterId] && (
                                <img
                                    src={MONSTERS[showEvent.monster_id as MonsterId].image}
                                    alt="monster"
                                    className="w-14 h-14 mx-auto mb-2 animate-bounce drop-shadow-lg"
                                />
                            )}
                            <RPGButton onClick={() => setShowEvent(null)} variant="primary">
                                繼續冒險！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Victory - Show Lottery Wheel */}
                {showVictory && !showLotteryWheel && (
                    <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-40">
                        <div className="text-center animate-victory-burst">
                            <Sparkles className="mx-auto text-yellow-400 mb-2 animate-star-twinkle" size={40} />
                            <h2 className="font-pixel text-xl text-yellow-400 mb-2">🎉 恭喜攻頂！</h2>
                            <p className="text-white text-sm mb-2">成功登上怪獸塔第 100 層！</p>
                            <img src={MONSTERS.rainbow_dragon.image} alt="Rainbow Dragon" className="w-24 h-24 mx-auto mb-3 animate-player-hop drop-shadow-2xl" />
                            <RPGButton onClick={() => setShowLotteryWheel(true)} variant="primary">
                                🎡 轉動抽獎輪盤！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Lottery Wheel Modal */}
                {showLotteryWheel && (
                    <LotteryWheel onComplete={handleLotteryComplete} />
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-amber-900/95 flex items-center justify-center z-50">
                        <div className="text-center">
                            <div className="text-4xl animate-bounce mb-2">🏰</div>
                            <p className="text-amber-200 font-pixel animate-pulse">載入中...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Purchase Modal Component
const DicePurchaseModal: React.FC<{ userId: string; currentDice: number; onClose: () => void }> = ({ userId, onClose }) => {
    const { data: starBalance = 0 } = useStarBalance(userId);
    const purchaseMutation = usePurchaseDice();
    const [amount, setAmount] = useState(2); // Buy in pairs: 2, 4, 6...

    const cost = (amount / 2) * 5;
    const canAfford = starBalance >= cost;

    const handlePurchase = async () => {
        if (!canAfford) return;
        try {
            await purchaseMutation.mutateAsync({ userId, diceAmount: amount });
            // Close after short delay or show success? Mutation handles toast usually or we can rely on UI update
            setTimeout(onClose, 500);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-50 animate-popup-in">
            <div className="bg-gradient-to-br from-stone-800 to-stone-900 border-4 border-amber-500 rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-white/50 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="font-pixel text-xl text-yellow-400 mb-4 flex items-center justify-center gap-2">
                    <ShoppingCart size={24} />
                    購買骰子
                </h3>

                <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 text-sm">現有星幣</span>
                        <div className="flex items-center gap-1 text-yellow-400 font-bold">
                            <Coins size={16} />
                            <span>{starBalance}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-4">
                        <button
                            onClick={() => setAmount(prev => Math.max(2, prev - 2))}
                            className="bg-stone-700 hover:bg-stone-600 w-10 h-10 rounded-full flex items-center justify-center border-2 border-stone-500 transition-colors"
                        >
                            <Minus size={20} className="text-white" />
                        </button>

                        <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-1">{amount}</div>
                            <div className="text-xs text-gray-400">顆骰子</div>
                        </div>

                        <button
                            onClick={() => setAmount(prev => prev + 2)}
                            className="bg-amber-700 hover:bg-amber-600 w-10 h-10 rounded-full flex items-center justify-center border-2 border-amber-500 transition-colors"
                        >
                            <Plus size={20} className="text-white" />
                        </button>
                    </div>

                    <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                        <span className="text-gray-300">總花費</span>
                        <div className={`flex items-center gap-1 font-bold text-xl ${canAfford ? 'text-red-400' : 'text-gray-500'}`}>
                            <Coins size={18} />
                            <span>{cost}</span>
                        </div>
                    </div>
                </div>

                <RPGButton
                    onClick={handlePurchase}
                    disabled={!canAfford || purchaseMutation.isPending}
                    variant={canAfford ? 'primary' : 'secondary'}
                    className="w-full"
                >
                    {purchaseMutation.isPending ? '購買中...' : !canAfford ? '星幣不足' : '確認購買'}
                </RPGButton>

                <p className="text-xs text-gray-500 mt-3">
                    匯率：5 星幣 = 2 顆骰子
                </p>

                {purchaseMutation.isSuccess && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl z-20">
                        <div className="text-center animate-bounce">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="text-green-400 font-bold">購買成功！</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Dashboard Preview
export const TowerPreview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const monstersCollected = progress?.monsters_collected || [];
    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];

    return (
        <button
            onClick={onClick}
            className={`w-full bg-gradient-to-r ${zone.color} rounded-xl p-4 border-2 border-white/30 shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all text-left group`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={zoneMonster.image} alt={zoneMonster.name} className="w-14 h-14 object-contain group-hover:scale-110 transition-transform drop-shadow-lg" />
                        {diceCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white animate-pulse">
                                {diceCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-pixel text-white text-lg drop-shadow-md flex items-center gap-2">
                            🏰 怪獸塔
                        </h3>
                        <p className="text-white/80 text-sm">{zone.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white drop-shadow-lg">{currentFloor}<span className="text-lg opacity-70">/100</span></div>
                    <div className="w-20 h-3 bg-black/30 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${currentFloor}%` }} />
                    </div>
                </div>
            </div>

            {/* Collected Monsters Display */}
            {monstersCollected.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-white/60 text-xs mb-2">已收集的怪獸：</p>
                    <div className="flex flex-wrap gap-1">
                        {monstersCollected.slice(0, 8).map((monsterId) => {
                            const monster = MONSTERS[monsterId as keyof typeof MONSTERS];
                            if (!monster) return null;
                            return (
                                <div
                                    key={monsterId}
                                    className="w-8 h-8 rounded-lg bg-white/20 p-0.5 border border-white/30 flex items-center justify-center"
                                    title={monster.name}
                                >
                                    <img
                                        src={monster.image}
                                        alt={monster.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            // Fallback to emoji if image not found
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            const parent = (e.target as HTMLImageElement).parentElement;
                                            if (parent) parent.textContent = monster.emoji;
                                        }}
                                    />
                                </div>
                            );
                        })}
                        {monstersCollected.length > 8 && (
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                                +{monstersCollected.length - 8}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </button>
    );
};
