import React, { useState, useCallback } from 'react';
import { Dices, Trophy, Sparkles, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useTowerProgress, useTowerEvents, useRollDice, useResetTower, MONSTERS, type MonsterId } from '../hooks/useTowerProgress';
import { RPGButton } from './RPGButton';
import type { TowerEvent } from '../types/database';

interface MonsterTowerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Zone colors based on floor range
const getZoneStyle = (floor: number) => {
    if (floor <= 25) return { bg: 'from-green-500 to-emerald-600', tile: 'bg-green-400', name: '🌲 森林入口' };
    if (floor <= 50) return { bg: 'from-blue-400 to-cyan-600', tile: 'bg-blue-400', name: '💎 水晶洞穴' };
    if (floor <= 75) return { bg: 'from-orange-400 to-red-500', tile: 'bg-orange-400', name: '🔥 熔岩地帶' };
    return { bg: 'from-purple-400 to-indigo-600', tile: 'bg-purple-400', name: '☁️ 雲端天空' };
};

// Get zone monster for decoration
const getZoneMonster = (floor: number): MonsterId => {
    if (floor <= 25) return 'slime';
    if (floor <= 50) return 'water_spirit';
    if (floor <= 75) return 'flame_bird';
    return 'thunder_cloud';
};

// Generate S-shaped path for Snakes & Ladders style
const generateSPath = (startFloor: number, rowCount: number = 5, colCount: number = 8): number[][] => {
    const rows: number[][] = [];
    let currentFloor = startFloor + (rowCount - 1) * colCount;

    for (let row = 0; row < rowCount; row++) {
        const rowFloors: number[] = [];
        const isReversed = row % 2 === 0; // Even rows go right-to-left (higher floors on left)

        for (let col = 0; col < colCount; col++) {
            const floor = currentFloor - col;
            if (floor >= 1 && floor <= 100) {
                if (isReversed) {
                    rowFloors.unshift(floor);
                } else {
                    rowFloors.push(floor);
                }
            }
        }

        if (rowFloors.length > 0) {
            rows.push(isReversed ? rowFloors.reverse() : rowFloors);
        }
        currentFloor -= colCount;
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

    // Create event map for quick lookup
    const eventMap = new Map(events.map(e => [e.floor_number, e]));

    // Calculate visible range - show around current floor
    const viewportStart = Math.max(1, Math.floor((currentFloor - 1) / 40) * 40 + 1);

    // Generate S-path grid
    const gridRows = generateSPath(viewportStart, 5, 8);

    // Handle dice roll
    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);

        // Animate dice rolling
        const animationInterval = setInterval(() => {
            setDisplayDice(Math.floor(Math.random() * 6) + 1);
        }, 100);

        // Actually roll after animation
        setTimeout(async () => {
            clearInterval(animationInterval);

            try {
                const result = await rollDiceMutation.mutateAsync({
                    userId,
                    currentFloor
                });

                setRollResult(result.roll);
                setDisplayDice(result.roll);

                // Show event if any
                if (result.event) {
                    setTimeout(() => {
                        setShowEvent(result.event);
                    }, 800);
                }

                // Check for victory
                if (result.reachedTop) {
                    setTimeout(() => {
                        setShowVictory(true);
                    }, 1500);
                }
            } catch (error) {
                console.error('Roll failed:', error);
            } finally {
                setIsRolling(false);
            }
        }, 1200);
    }, [diceCount, isRolling, rollDiceMutation, userId, currentFloor]);

    // Handle tower reset after victory
    const handleReset = async () => {
        await resetTowerMutation.mutateAsync({ userId });
        setShowVictory(false);
    };

    if (!isOpen) return null;

    const zone = getZoneStyle(currentFloor);
    const zoneMonster = MONSTERS[getZoneMonster(currentFloor)];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2">
            <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-600 max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className={`bg-gradient-to-r ${zone.bg} p-3 flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                        <img src={zoneMonster.image} alt={zoneMonster.name} className="w-10 h-10 object-contain drop-shadow-lg" />
                        <div>
                            <h2 className="font-pixel text-white text-lg drop-shadow-md">🏰 怪獸塔</h2>
                            <p className="text-xs text-white/80">{zone.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-1">
                            <span className="text-yellow-300 font-bold text-lg">{currentFloor}</span>
                            <span className="text-white/60 text-sm">/100</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-black/30 rounded-full transition-colors">
                            <X className="text-white" size={20} />
                        </button>
                    </div>
                </div>

                {/* Monster Collection Bar */}
                <div className="bg-slate-800/90 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
                    <span className="text-xs text-slate-400">收集:</span>
                    <div className="flex gap-1 flex-1">
                        {Object.values(MONSTERS).slice(0, 4).map(monster => (
                            <div
                                key={monster.id}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${monstersCollected.includes(monster.id)
                                        ? 'border-yellow-400 bg-yellow-400/20 scale-110'
                                        : 'border-slate-600 bg-slate-700/50 opacity-40'
                                    }`}
                            >
                                <img
                                    src={monster.image}
                                    alt={monster.name}
                                    className={`w-5 h-5 object-contain ${!monstersCollected.includes(monster.id) ? 'grayscale' : ''
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-yellow-400">{monstersCollected.length}/4</span>
                </div>

                {/* Tower Grid - Snakes & Ladders Style */}
                <div className="flex-1 overflow-hidden relative p-3 bg-gradient-to-b from-slate-900/50 to-slate-800/50">
                    {/* Navigation hint - up */}
                    {viewportStart + 40 <= 100 && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 text-white/50 animate-bounce">
                            <ArrowUp size={20} />
                        </div>
                    )}

                    {/* S-Path Grid */}
                    <div className="flex flex-col gap-1 pt-5">
                        {gridRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center gap-1">
                                {row.map((floor) => {
                                    const isCurrentFloor = floor === currentFloor;
                                    const event = eventMap.get(floor);
                                    const floorZone = getZoneStyle(floor);
                                    const isLadder = event?.event_type === 'ladder';
                                    const isTrap = event?.event_type === 'trap';
                                    const isEgg = event?.event_type === 'egg';

                                    return (
                                        <div
                                            key={floor}
                                            className={`
                                                relative w-10 h-10 rounded-lg flex items-center justify-center
                                                font-bold text-xs border-2 transition-all duration-300
                                                ${isCurrentFloor
                                                    ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/50 scale-110 z-20'
                                                    : isLadder
                                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 border-green-300'
                                                        : isTrap
                                                            ? 'bg-gradient-to-br from-red-400 to-rose-500 border-red-300'
                                                            : isEgg
                                                                ? 'bg-gradient-to-br from-purple-400 to-pink-500 border-purple-300'
                                                                : `${floorZone.tile} border-white/30`
                                                }
                                            `}
                                        >
                                            {isCurrentFloor ? (
                                                <div className="text-lg animate-bounce">👤</div>
                                            ) : isLadder ? (
                                                <img src="/images/monsters/ladder.png" alt="ladder" className="w-7 h-7 object-contain" />
                                            ) : isTrap ? (
                                                <img src="/images/monsters/trap.png" alt="trap" className="w-7 h-7 object-contain" />
                                            ) : isEgg ? (
                                                <span className="text-base">🥚</span>
                                            ) : (
                                                <span className="text-white/90 drop-shadow-sm">{floor}</span>
                                            )}

                                            {/* Floor 100 crown */}
                                            {floor === 100 && !isCurrentFloor && (
                                                <Trophy className="absolute -top-2 -right-2 text-yellow-400 drop-shadow-lg" size={14} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Navigation hint - down */}
                    {viewportStart > 1 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-white/50">
                            <ArrowDown size={20} />
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="bg-slate-800 p-3 border-t-2 border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        {/* Dice Display */}
                        <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-lg border-4 border-slate-600 ${isRolling ? 'animate-spin' : ''}`}>
                                <span className="text-3xl font-bold text-slate-800">
                                    {isRolling ? displayDice : (rollResult || '🎲')}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <Dices size={18} />
                                    <span className="font-bold text-lg">×{diceCount}</span>
                                </div>
                                <p className="text-xs text-slate-400">剩餘骰子</p>
                            </div>
                        </div>

                        {/* Roll info */}
                        {rollResult && !isRolling && (
                            <div className="text-right animate-bounce-in">
                                <p className="text-slate-400 text-xs">擲出</p>
                                <p className="text-yellow-400 font-bold text-2xl">+{rollResult}</p>
                            </div>
                        )}
                    </div>

                    <RPGButton
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="w-full"
                        variant={diceCount > 0 ? 'primary' : 'secondary'}
                    >
                        {isRolling ? (
                            <span className="flex items-center justify-center gap-2">
                                <Dices className="animate-bounce" size={20} />
                                擲骰中...
                            </span>
                        ) : diceCount > 0 ? (
                            <span className="flex items-center justify-center gap-2">
                                🎲 擲骰子！
                            </span>
                        ) : (
                            '完成任務獲得骰子'
                        )}
                    </RPGButton>

                    <p className="text-xs text-slate-500 text-center mt-2">
                        💡 完成每日任務可以獲得 1 顆骰子
                    </p>
                </div>

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-30 animate-fade-in">
                        <div className={`
                            rounded-2xl p-6 text-center max-w-xs border-4 shadow-2xl
                            ${showEvent.event_type === 'ladder'
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-300'
                                : showEvent.event_type === 'trap'
                                    ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-300'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-600 border-purple-300'
                            }
                        `}>
                            <div className="text-5xl mb-4">
                                {showEvent.event_type === 'ladder' && (
                                    <img src="/images/monsters/ladder.png" alt="ladder" className="w-16 h-16 mx-auto" />
                                )}
                                {showEvent.event_type === 'trap' && (
                                    <img src="/images/monsters/trap.png" alt="trap" className="w-16 h-16 mx-auto" />
                                )}
                                {showEvent.event_type === 'egg' && '🥚'}
                                {showEvent.event_type === 'treasure' && '💎'}
                            </div>
                            <h3 className="font-pixel text-xl text-white mb-2">
                                {showEvent.event_type === 'ladder' && '發現捷徑！'}
                                {showEvent.event_type === 'trap' && '哎呀踩空了！'}
                                {showEvent.event_type === 'egg' && '獲得怪獸蛋！'}
                                {showEvent.event_type === 'treasure' && '發現寶箱！'}
                            </h3>
                            <p className="text-white/90 mb-4 text-sm">{showEvent.description}</p>
                            {showEvent.monster_id && MONSTERS[showEvent.monster_id as MonsterId] && (
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={MONSTERS[showEvent.monster_id as MonsterId].image}
                                        alt="monster"
                                        className="w-20 h-20 object-contain animate-bounce drop-shadow-lg"
                                    />
                                </div>
                            )}
                            <RPGButton onClick={() => setShowEvent(null)} variant="primary">
                                繼續冒險！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Victory Screen */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-40">
                        <div className="text-center">
                            <Sparkles className="mx-auto text-yellow-400 mb-4 animate-pulse" size={60} />
                            <h2 className="font-pixel text-3xl text-yellow-400 mb-2 animate-bounce">🎉 恭喜攻頂！</h2>
                            <p className="text-white mb-4">你成功登上了怪獸塔第 100 層！</p>
                            <div className="flex justify-center mb-6">
                                <img
                                    src={MONSTERS.rainbow_dragon.image}
                                    alt="Rainbow Dragon"
                                    className="w-32 h-32 object-contain animate-bounce drop-shadow-2xl"
                                />
                            </div>
                            <RPGButton onClick={handleReset} variant="primary">
                                🔄 再次挑戰 (+5 骰子)
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center z-50">
                        <div className="text-center">
                            <div className="text-4xl animate-bounce mb-2">🏰</div>
                            <p className="text-white font-pixel animate-pulse">載入中...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Compact tower preview for dashboard
export const TowerPreview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const zone = getZoneStyle(currentFloor);
    const zoneMonster = MONSTERS[getZoneMonster(currentFloor)];

    // Simple progress calculation
    const progressPercent = Math.round((currentFloor / 100) * 100);

    return (
        <button
            onClick={onClick}
            className={`w-full bg-gradient-to-r ${zone.bg} rounded-xl p-4 border-2 border-white/30 shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all text-left group`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={zoneMonster.image}
                            alt={zoneMonster.name}
                            className="w-14 h-14 object-contain drop-shadow-lg group-hover:scale-110 transition-transform"
                        />
                        {diceCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-white">
                                {diceCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-pixel text-white text-lg drop-shadow-md flex items-center gap-2">
                            🏰 怪獸塔
                            {diceCount > 0 && <span className="text-yellow-300 text-sm animate-pulse">🎲</span>}
                        </h3>
                        <p className="text-white/80 text-sm">{zone.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white drop-shadow-lg">
                        {currentFloor}
                        <span className="text-base opacity-70">/100</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-20 h-2 bg-black/30 rounded-full mt-1 overflow-hidden">
                        <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        </button>
    );
};
