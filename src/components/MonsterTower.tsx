import React, { useState, useCallback } from 'react';
import { Dices, Trophy, Sparkles, X } from 'lucide-react';
import { useTowerProgress, useTowerEvents, useRollDice, useResetTower, MONSTERS, type MonsterId } from '../hooks/useTowerProgress';
import { RPGButton } from './RPGButton';
import type { TowerEvent } from '../types/database';

interface MonsterTowerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Zone info
const getZoneInfo = (floor: number) => {
    if (floor <= 25) return { name: '🌲 森林入口', monster: 'slime' as MonsterId };
    if (floor <= 50) return { name: '💎 水晶洞穴', monster: 'water_spirit' as MonsterId };
    if (floor <= 75) return { name: '🔥 熔岩地帶', monster: 'flame_bird' as MonsterId };
    return { name: '☁️ 雲端天空', monster: 'thunder_cloud' as MonsterId };
};

// Generate S-path: returns array of rows, each row has 8 tiles
// Row 0 is TOP (highest floors), last row is BOTTOM (lowest floors)
const generateVisibleTiles = (centerFloor: number): number[][] => {
    const COLS = 8;
    const ROWS = 5;
    const rows: number[][] = [];

    // Calculate which "page" we're on (each page shows 40 floors)
    const pageStart = Math.floor((centerFloor - 1) / 40) * 40 + 1;
    const pageEnd = Math.min(pageStart + 39, 100);

    // Build rows from top (high floors) to bottom (low floors)
    for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
        const rowStartFloor = pageEnd - (rowIdx * COLS);
        const isReversed = rowIdx % 2 === 1; // Odd rows go left-to-right

        const row: number[] = [];
        for (let col = 0; col < COLS; col++) {
            const floor = isReversed
                ? rowStartFloor - (COLS - 1) + col
                : rowStartFloor - col;
            if (floor >= pageStart && floor <= pageEnd && floor >= 1) {
                row.push(floor);
            }
        }
        if (row.length > 0) rows.push(row);
    }

    return rows;
};

export const MonsterTower: React.FC<MonsterTowerProps> = ({ userId, isOpen, onClose }) => {
    const { data: progress, isLoading } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();

    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [displayDice, setDisplayDice] = useState<number>(1);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const monstersCollected = progress?.monsters_collected || [];

    // Create event map
    const eventMap = new Map(events.map(e => [e.floor_number, e]));

    // Generate visible grid
    const gridRows = generateVisibleTiles(currentFloor);

    // Handle dice roll
    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);

        const animationInterval = setInterval(() => {
            setDisplayDice(Math.floor(Math.random() * 6) + 1);
        }, 80);

        setTimeout(async () => {
            clearInterval(animationInterval);

            try {
                const result = await rollDiceMutation.mutateAsync({ userId, currentFloor });
                setRollResult(result.roll);
                setDisplayDice(result.roll);

                if (result.event) {
                    setTimeout(() => setShowEvent(result.event), 600);
                }
                if (result.reachedTop) {
                    setTimeout(() => setShowVictory(true), 1200);
                }
            } catch (error) {
                console.error('Roll failed:', error);
            } finally {
                setIsRolling(false);
            }
        }, 1000);
    }, [diceCount, isRolling, rollDiceMutation, userId, currentFloor]);

    const handleReset = async () => {
        await resetTowerMutation.mutateAsync({ userId });
        setShowVictory(false);
    };

    if (!isOpen) return null;

    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85" onClick={onClose} />

            {/* Main Container */}
            <div className="relative w-full max-w-md bg-gradient-to-b from-amber-900 via-amber-800 to-stone-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-700 max-h-[95vh] flex flex-col">

                {/* Header with progress */}
                <div className="bg-gradient-to-r from-amber-700 to-orange-700 p-3 border-b-4 border-amber-900">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <img src={zoneMonster.image} alt={zoneMonster.name} className="w-10 h-10 object-contain" />
                            <div>
                                <h2 className="font-pixel text-white text-base">🏰 怪獸塔</h2>
                                <p className="text-xs text-amber-200">{zone.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-black/30 rounded-full">
                            <X className="text-white" size={20} />
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="bg-amber-950/50 rounded-full p-1">
                        <div className="flex items-center gap-1">
                            <div className="flex-1 h-3 bg-amber-950 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
                                    style={{ width: `${currentFloor}%` }}
                                />
                            </div>
                            <span className="text-white font-bold text-sm min-w-[50px] text-right">
                                {currentFloor}/100
                            </span>
                        </div>
                    </div>

                    {/* Monster collection */}
                    <div className="flex justify-center gap-2 mt-2">
                        {Object.values(MONSTERS).slice(0, 4).map(monster => (
                            <div
                                key={monster.id}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${monstersCollected.includes(monster.id)
                                        ? 'border-yellow-400 bg-yellow-500/30 scale-110'
                                        : 'border-amber-700 bg-amber-900/50 opacity-50'
                                    }`}
                            >
                                <img
                                    src={monster.image}
                                    alt={monster.name}
                                    className={`w-6 h-6 object-contain ${!monstersCollected.includes(monster.id) ? 'grayscale' : ''}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Game Board - Brick Wall Style */}
                <div
                    className="flex-1 relative p-2 overflow-hidden"
                    style={{
                        backgroundImage: `
                            linear-gradient(to bottom, rgba(120,53,15,0.3), rgba(68,32,8,0.5)),
                            repeating-linear-gradient(
                                0deg,
                                transparent,
                                transparent 46px,
                                rgba(0,0,0,0.2) 46px,
                                rgba(0,0,0,0.2) 48px
                            ),
                            repeating-linear-gradient(
                                90deg,
                                rgba(180,83,9,0.3),
                                rgba(180,83,9,0.3) 48px,
                                rgba(146,64,14,0.3) 48px,
                                rgba(146,64,14,0.3) 96px
                            )
                        `,
                        backgroundColor: '#78350f'
                    }}
                >
                    {/* Side decorations - torches */}
                    <div className="absolute left-1 top-1/4 text-2xl animate-pulse">🔥</div>
                    <div className="absolute right-1 top-1/4 text-2xl animate-pulse">🔥</div>
                    <div className="absolute left-1 top-2/3 text-2xl animate-pulse">🔥</div>
                    <div className="absolute right-1 top-2/3 text-2xl animate-pulse">🔥</div>

                    {/* Grid of tiles */}
                    <div className="flex flex-col gap-1 px-6">
                        {gridRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center gap-1">
                                {row.map((floor) => {
                                    const isCurrentFloor = floor === currentFloor;
                                    const event = eventMap.get(floor);
                                    const isLadder = event?.event_type === 'ladder';
                                    const isTrap = event?.event_type === 'trap';
                                    const isEgg = event?.event_type === 'egg';
                                    const targetFloor = event?.target_floor;

                                    return (
                                        <div
                                            key={floor}
                                            className={`
                                                relative w-9 h-9 rounded-md flex flex-col items-center justify-center
                                                text-xs font-bold transition-all duration-300
                                                ${isCurrentFloor
                                                    ? 'bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg shadow-yellow-500/50 scale-110 z-10 ring-2 ring-white'
                                                    : 'bg-gradient-to-br from-amber-200 to-amber-300 hover:from-amber-100 hover:to-amber-200'
                                                }
                                                border-b-2 border-r-2 border-amber-600
                                            `}
                                            style={{
                                                boxShadow: isCurrentFloor ? undefined : 'inset 0 -2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {/* Floor number or player */}
                                            {isCurrentFloor ? (
                                                <div className="text-lg animate-bounce">👤</div>
                                            ) : (
                                                <span className="text-amber-800">{floor}</span>
                                            )}

                                            {/* Event indicator */}
                                            {!isCurrentFloor && isLadder && (
                                                <div className="absolute -top-1 -right-1 text-xs">⬆️</div>
                                            )}
                                            {!isCurrentFloor && isTrap && (
                                                <div className="absolute -top-1 -right-1 text-xs">⬇️</div>
                                            )}
                                            {!isCurrentFloor && isEgg && (
                                                <div className="absolute -top-1 -right-1 text-xs">🥚</div>
                                            )}

                                            {/* Ladder/Trap target indicator */}
                                            {!isCurrentFloor && (isLadder || isTrap) && targetFloor && (
                                                <div className={`absolute -bottom-0.5 text-[8px] font-normal ${isLadder ? 'text-green-700' : 'text-red-700'}`}>
                                                    →{targetFloor}
                                                </div>
                                            )}

                                            {/* Floor 100 crown */}
                                            {floor === 100 && (
                                                <Trophy className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-600" size={12} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Rope/connection visual hints */}
                    <div className="absolute inset-x-8 top-12 bottom-12 pointer-events-none">
                        {/* Decorative ropes on sides */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600 via-amber-400 to-amber-600 opacity-50"
                            style={{ backgroundSize: '100% 20px', backgroundImage: 'repeating-linear-gradient(to bottom, #d97706 0px, #fbbf24 10px, #d97706 20px)' }} />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600 via-amber-400 to-amber-600 opacity-50"
                            style={{ backgroundSize: '100% 20px', backgroundImage: 'repeating-linear-gradient(to bottom, #d97706 0px, #fbbf24 10px, #d97706 20px)' }} />
                    </div>
                </div>

                {/* Action Bar - Dice Area */}
                <div className="bg-gradient-to-t from-stone-900 to-amber-900 p-3 border-t-4 border-amber-700">
                    <div className="flex items-center gap-3 mb-3">
                        {/* Dice Display */}
                        <div className={`
                            w-16 h-16 rounded-xl bg-white flex items-center justify-center 
                            shadow-xl border-4 border-amber-600
                            ${isRolling ? 'animate-bounce' : ''}
                        `}>
                            <span className="text-4xl">
                                {isRolling ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][displayDice - 1] :
                                    rollResult ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][rollResult - 1] : '🎲'}
                            </span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-lg">
                                <Dices className="text-yellow-400" size={24} />
                                <span className="font-bold text-yellow-400">×{diceCount}</span>
                                <span className="text-amber-300 text-sm">顆骰子</span>
                            </div>
                            {rollResult && !isRolling && (
                                <p className="text-green-400 text-sm animate-pulse">
                                    擲出 {rollResult} 點！前進中...
                                </p>
                            )}
                        </div>
                    </div>

                    <RPGButton
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="w-full"
                        variant={diceCount > 0 ? 'primary' : 'secondary'}
                    >
                        {isRolling ? '🎲 擲骰中...' : diceCount > 0 ? '🎲 擲骰子！' : '完成任務獲得骰子'}
                    </RPGButton>

                    <p className="text-xs text-amber-400/70 text-center mt-2">
                        💡 完成每日任務 = 獲得 1 顆骰子
                    </p>
                </div>

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-30">
                        <div className={`
                            rounded-2xl p-5 text-center max-w-xs border-4 shadow-2xl
                            ${showEvent.event_type === 'ladder'
                                ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-400'
                                : showEvent.event_type === 'trap'
                                    ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400'
                                    : 'bg-gradient-to-br from-purple-600 to-violet-700 border-purple-400'
                            }
                        `}>
                            <div className="text-5xl mb-3">
                                {showEvent.event_type === 'ladder' && '⬆️🪜'}
                                {showEvent.event_type === 'trap' && '⬇️🕳️'}
                                {showEvent.event_type === 'egg' && '🥚✨'}
                            </div>
                            <h3 className="font-pixel text-xl text-white mb-2">
                                {showEvent.event_type === 'ladder' && '發現捷徑！'}
                                {showEvent.event_type === 'trap' && '踩到陷阱！'}
                                {showEvent.event_type === 'egg' && '怪獸蛋！'}
                            </h3>
                            <p className="text-white/90 mb-3 text-sm">{showEvent.description}</p>
                            {showEvent.monster_id && MONSTERS[showEvent.monster_id as MonsterId] && (
                                <img
                                    src={MONSTERS[showEvent.monster_id as MonsterId].image}
                                    alt="monster"
                                    className="w-16 h-16 mx-auto mb-3 animate-bounce"
                                />
                            )}
                            <RPGButton onClick={() => setShowEvent(null)} variant="primary">
                                繼續！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Victory */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-40">
                        <div className="text-center">
                            <Sparkles className="mx-auto text-yellow-400 mb-3" size={50} />
                            <h2 className="font-pixel text-2xl text-yellow-400 mb-2">🎉 恭喜攻頂！</h2>
                            <img src={MONSTERS.rainbow_dragon.image} alt="Rainbow Dragon" className="w-28 h-28 mx-auto mb-4 animate-bounce" />
                            <RPGButton onClick={handleReset} variant="primary">
                                🔄 再次挑戰 (+5 骰子)
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="absolute inset-0 bg-amber-900/95 flex items-center justify-center z-50">
                        <div className="text-center">
                            <div className="text-4xl animate-bounce mb-2">🏰</div>
                            <p className="text-amber-200 animate-pulse">載入中...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Dashboard Preview Card
export const TowerPreview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];

    return (
        <button
            onClick={onClick}
            className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-xl p-4 border-2 border-amber-400/50 shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all text-left group"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={zoneMonster.image} alt={zoneMonster.name} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" />
                        {diceCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse">
                                {diceCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-pixel text-white text-lg">🏰 怪獸塔</h3>
                        <p className="text-amber-200 text-sm">{zone.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{currentFloor}<span className="text-sm opacity-70">/100</span></div>
                    <div className="w-16 h-2 bg-amber-900 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${currentFloor}%` }} />
                    </div>
                </div>
            </div>
        </button>
    );
};
